import { Injectable, inject } from "@angular/core";
import { Callable, Engine, SceneTreeTimer } from "godot";
import type { SceneTree } from "godot";
import { GodotAngularApp } from "godot-angular/core";

/** 一个可切换过去的场景。主应用的切换页与说明文字共用这一份清单。 */
export interface SceneEntry {
  /** res:// 路径，change_scene_to_file() 的入参 */
  path: string;
  /** 卡片标题 */
  title: string;
  /** 一句话说明 */
  desc: string;
  /** 角标 */
  tag: string;
  /** 节点由谁创建：Angular 模板 / 静态场景 + JS / 纯 JS / 纯 GDScript */
  who: string;
  /** 是不是当前这一份（主应用自己） */
  self?: boolean;
}

/**
 * 本工程的四个场景。前三项从主应用切出去，第四项（主应用自己）留在清单里当对照。
 *
 * 三个入口在 angular.json 的 entries 里声明：`dist/main.js`（本应用）、
 * `dist/hybrid.js`（第二个 Angular 应用，挂在静态场景上）、`dist/plain-js.js`
 * （不引 Angular 的纯 JS 场景）。GDScript 那份不参与构建。
 */
export const SCENES: SceneEntry[] = [
  {
    path: "res://scenes/hybrid.tscn",
    title: "混合控制",
    desc: "静态 .tscn 节点 + 第二个 Angular 入口：上下两条栏由 JS 在 _ready() 里绑定，中间整块交给模板",
    tag: "hybrid.js",
    who: "静态场景 + JS + Angular",
  },
  {
    path: "res://scenes/plain_js.tscn",
    title: "纯 JS 场景",
    desc: "不引 godot-angular，节点全部由 JS 代码创建、样式走 theme override，与 Angular 无关",
    tag: "plain.js",
    who: "纯 JS（无 Angular）",
  },
  {
    path: "res://scenes/gd_demo.tscn",
    title: "GDScript 场景",
    desc: "静态节点 + .gd 脚本，构建产物里根本没有它，Angular 侧完全不知道它存在",
    tag: "gd_demo.gd",
    who: "纯 GDScript",
  },
  {
    path: "res://main.tscn",
    title: "主界面（当前）",
    desc: "第一个入口：根节点脚本 dist/main.js，整棵树都是模板生成的",
    tag: "main.js",
    who: "Angular 模板",
    self: true,
  },
];

/**
 * 场景切换。
 *
 * 两件事必须按顺序做，反了就报错：
 *
 * 1. **先 destroy 本应用，再切场景。** `change_scene_to_file()` 是「新场景先 add_child、
 *    旧场景 queue_free」，旧场景在帧末才被释放。而渲染器销毁节点要调 `get_parent()`，
 *    节点已经跟着场景释放掉的话这里直接抛「instance already freed」。所以不能等
 *    `tree_exiting` 再收尾，必须抢在新场景入树之前把应用拆掉。
 * 2. **拆应用要等本帧过去。** 点按钮的调用栈还在 `pressed` 信号里，当场 destroy 等于
 *    在变更检测中途拆掉自己。用 SceneTreeTimer 推到下一帧，栈早就回去了。
 *
 * 帧钟（rAF 队列）是进程级单例：destroy 会停帧，新应用 start() 再恢复。顺序错了
 * （新应用先 resume、旧应用后 stop）新应用就永远不刷新了 —— 上面第 1 条同时解决了它。
 */
@Injectable({ providedIn: "root" })
export class SceneSwitch {
  /** 就是 bootstrapGodotApp() 返回的那一个实例，库把它注册进了 DI */
  private readonly app = inject(GodotAngularApp);
  /** 已排队的切换；同时充当「只切一次」的闸门 */
  private timer: SceneTreeTimer | null = null;

  /** 切到另一个场景。path 用 res:// 绝对路径。 */
  goto(path: string): void {
    if (this.timer) return;
    const tree = Engine.get_main_loop() as unknown as SceneTree | null;
    if (!tree) {
      console.log("[demo] 拿不到 SceneTree，切换取消");
      return;
    }
    // 计时器是 RefCounted：JS 侧不留引用会在触发前被释放，所以挂在字段上
    const timer = tree.create_timer(0);
    this.timer = timer;
    timer.timeout.connect(
      Callable.create(() => {
        this.timer = null;
        try {
          this.app.destroy();
        } catch (err) {
          console.log("[demo] 切换前销毁应用失败：" + String((err as Error)?.message ?? err));
        }
        const err = tree.change_scene_to_file(path);
        console.log(`[demo] change_scene_to_file(${path}) → ${err === 0 ? "ok" : "err " + err}`);
      }),
    );
  }
}
