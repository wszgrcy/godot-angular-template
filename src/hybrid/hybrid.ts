import {
  Button,
  Callable,
  DisplayServer,
  Label,
  Node,
  OS,
  Vector2i,
  VBoxContainer,
} from "godot";
import { bootstrapGodotApp, GodotAngularApp } from "godot-angular/core";
import { HybridApp } from "./hybrid-app";
import { BRIDGE } from "./bridge";

/** 取静态节点；取不到就直接报错，不要静默往下跑（路径写错时后面全是假象）。 */
function pick<T>(node: any, path: string): T {
  const found = node.get_node_or_null(path);
  if (!found) throw new Error(`[hybrid] 场景里没有 ${path}，检查 scenes/hybrid.tscn`);
  return found as T;
}

/**
 * 混合场景的根脚本 —— 第二个 Angular 入口。
 *
 * 场景文件 scenes/hybrid.tscn 里，节点是**静态定义**好的：顶栏、挂载点、底栏，
 * 打开场景就能看到整棵树。本脚本只做三件事：
 *
 * 1. `_ready()` 里给静态节点**绑定**行为（`pressed` → 改 signal、切场景），
 *    这些节点从头到尾没有 Angular 参与；
 * 2. 把静态定义好的 `Layout/NgHost` 当挂载点启动 Angular —— 根组件的宿主就是它，
 *    模板节点追加进去，于是同一棵静态树里嵌进了一块模板生成的区域；
 * 3. `_process()` 里各跑各的：静态侧自己刷新读数，Angular 靠 `tick()` 驱动。
 *
 * 两侧通过 `bridge.ts` 的 signal 互通，谁都不需要轮询对方（底栏那行是静态侧读
 * signal 后直接写 Label，用来演示反方向）。
 */
export default class HybridScene extends Node {
  private app: GodotAngularApp | null = null;
  private frames = 0;
  /** 下一帧要切的场景；放在字段里而不是当场执行，是为了脱离点击信号的调用栈 */
  private pending: string | null = null;

  /* ---- 静态节点（_ready 里赋值，全部来自 .tscn） ---- */
  private jsTick!: Label;
  private jsCount!: Label;
  private ngSeen!: Label;
  private ngEcho!: Label;
  private lastNgSeen = -1;
  private lastJsCount = -1;

  _ready(): void {
    if (OS.has_feature("headless")) DisplayServer.window_set_size(new Vector2i(1280, 800));

    // ① 静态节点：Angular 一个都没参与
    const host = pick<VBoxContainer>(this, "Layout/NgHost");
    this.jsTick = pick<Label>(this, "Layout/TopBar/TopRow/JsTick");
    this.jsCount = pick<Label>(this, "Layout/TopBar/TopRow/JsCount");
    this.ngSeen = pick<Label>(this, "Layout/TopBar/TopRow/NgSeen");
    this.ngEcho = pick<Label>(this, "Layout/BottomBar/BottomRow/NgEcho");

    // ② 绑定：静态按钮 → 引擎信号 → 改 signal（Angular 模板读同一个 signal）
    pick<Button>(this, "Layout/TopBar/TopRow/JsBtn").pressed.connect(
      Callable.create(() => BRIDGE.jsClicks.update((v) => v + 1)),
    );
    pick<Button>(this, "Layout/TopBar/TopRow/ResetBtn").pressed.connect(Callable.create(() => BRIDGE.reset()));
    pick<Button>(this, "Layout/TopBar/TopRow/ToMain").pressed.connect(Callable.create(() => this.leaveTo("res://main.tscn")));
    pick<Button>(this, "Layout/BottomBar/BottomRow/ToPlain").pressed.connect(
      Callable.create(() => this.leaveTo("res://scenes/plain_js.tscn")),
    );
    pick<Button>(this, "Layout/BottomBar/BottomRow/ToGd").pressed.connect(
      Callable.create(() => this.leaveTo("res://scenes/gd_demo.tscn")),
    );

    // ③ 交钥匙：静态侧把「写静态节点」和「切场景」两个能力交给 Angular
    BRIDGE.bindStatic({
      echo: (text) => {
        this.ngEcho.text = text;
      },
      leave: (path) => this.leaveTo(path),
    });

    // ④ 挂载 Angular：宿主是静态节点 NgHost，模板节点会追加进它里面
    bootstrapGodotApp(HybridApp, host)
      .then((app) => {
        this.app = app;
        console.log("[hybrid] 第二个 Angular 应用已挂到静态节点 Layout/NgHost 上");
      })
      .catch((err) => console.log("[hybrid] Angular 启动失败：" + String((err as Error)?.message ?? err)));

    console.log("[hybrid] 静态节点绑定完成：顶栏/底栏归 JS，NgHost 归 Angular");
  }

  _process(delta: number): void {
    this.frames++;

    // 切场景排在下一帧：此刻点击的调用栈已经回去了，可以安全拆掉应用
    if (this.pending) {
      const path = this.pending;
      this.pending = null;
      this.app?.destroy();
      this.app = null;
      const err = this.get_tree().change_scene_to_file(path);
      console.log(`[hybrid] change_scene_to_file(${path}) → ${err === 0 ? "ok" : "err " + err}`);
      return;
    }

    // 静态侧自己的读数：完全不经过 Angular
    this.jsTick.text = `JS 帧 ${this.frames} · ${(delta * 1000).toFixed(2)} ms`;
    BRIDGE.jsFrames.set(this.frames);
    BRIDGE.jsMs.set(delta * 1000);

    const js = BRIDGE.jsClicks();
    if (js !== this.lastJsCount) {
      this.lastJsCount = js;
      this.jsCount.text = `JS 计数 ${js}`;
    }
    // 反方向：读 Angular 写的 signal，回写到静态 Label
    const ng = BRIDGE.ngClicks();
    if (ng !== this.lastNgSeen) {
      this.lastNgSeen = ng;
      this.ngSeen.text = `静态侧读到 NG ${ng}`;
    }

    this.app?.tick(delta * 1000);
  }

  /** 委托到下一帧执行，避免在 pressed / 变更检测中途拆掉应用 */
  private leaveTo(path: string): void {
    if (!this.pending) this.pending = path;
  }
}
