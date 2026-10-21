import {
  Control,
  DisplayServer,
  Node,
  OS,
  VBoxContainer,
  Vector2,
  Vector2i,
  Window,
} from "godot";
import { bootstrapGodotApp, GodotAngularApp } from "godot-angular/core";
import { GODOT_INITIAL_URL, provideGodotRouter } from "godot-angular/router";
import { App } from "./app";
import { PageForms } from "./pages/forms/forms";
import { PageHome } from "./pages/home/home";
import { PageInterop } from "./pages/interop/interop";
import { PageNotFound } from "./pages/not-found/not-found";
import { PageRouting } from "./pages/routing/routing";
import { PageScenes } from "./pages/scenes/scenes";
import { PageState } from "./pages/state/state";
import { PageStyles } from "./pages/styles/styles";
import { PageTemplate } from "./pages/template/template";

/**
 * 起始 URL：环境变量 APP_URL=/forms（引擎没有地址栏，「从哪个页面开始」必须从外部进来）。
 * 深链、启动参数、存档恢复都是这个入口。
 */
function initialUrl(): string | null {
  const env = OS.get_environment("APP_URL");
  return env ? env : null;
}

/** Angular 的异常细节通常挂在 ngErrorMessage / ngTokenPath 上，裸 message 往往只有 “NG0201”。 */
function describeError(err: unknown): string {
  if (!err) return String(err);
  const e = err as {
    stack?: string;
    toString(): string;
    ngErrorMessage?: string;
    ngTokenPath?: unknown;
  };
  const parts = [e.stack || e.toString()];
  if (e.ngErrorMessage) parts.push(`ngErrorMessage: ${e.ngErrorMessage}`);
  if (e.ngTokenPath) parts.push(`ngTokenPath: ${String(e.ngTokenPath)}`);
  return parts.join("\n  ");
}

export default class Main extends Node {
  private app: GodotAngularApp | null = null;

  _ready(): void {
    // Angular 的挂载点。用 VBoxContainer 而不是裸 Control：容器的子节点会被铺满，
    // 根组件的宿主元素因此自动跟随窗口尺寸，不需要再给它单独设锚点。
    const root = new VBoxContainer();
    root.name = "AngularRoot";
    const win = this.get_tree().root as unknown as Window | null;
    if (OS.has_feature("headless")) {
      // 无头模式给的是一个很小的窗口，固定成常用尺寸，布局才与带窗口运行一致
      DisplayServer.window_set_size(new Vector2i(1280, 800));
    }
    if (win && win.size.x > 0 && win.size.y > 0) {
      root.set_anchors_and_offsets_preset(Control.LayoutPreset.PRESET_FULL_RECT);
    } else {
      // 没有真实窗口时给一个固定尺寸，布局不依赖窗口是否存在
      root.size = new Vector2(1600, 800);
    }
    this.add_child(root);

    const url = initialUrl();
    if (url) console.log("[demo] initial url: " + JSON.stringify(url));
    bootstrapGodotApp(App, root, [
      provideGodotRouter([
        { path: "", component: PageHome, title: "概览 · godot-angular" },
        { path: "template", component: PageTemplate, title: "模板语法 · godot-angular" },
        { path: "state", component: PageState, title: "状态与响应式 · godot-angular" },
        { path: "forms", component: PageForms, title: "表单 · godot-angular" },
        { path: "styles", component: PageStyles, title: "样式与主题 · godot-angular" },
        { path: "interop", component: PageInterop, title: "引擎互操作 · godot-angular" },
        { path: "routing", component: PageRouting, title: "路由 · godot-angular" },
        { path: "routing/:id", component: PageRouting, title: "路由参数 · godot-angular" },
        { path: "scenes", component: PageScenes, title: "场景切换 · godot-angular" },
        { path: "**", component: PageNotFound, title: "未找到 · godot-angular" },
      ]),
      ...(url ? [{ provide: GODOT_INITIAL_URL, useValue: url }] : []),
    ])
      .then((app) => {
        this.app = app;
        console.log("[demo] Angular bootstrapped");
      })
      .catch((err) => {
        console.error("[demo] Angular bootstrap failed\n  " + describeError(err));
        this.get_tree().quit(1);
      });
  }

  /** 引擎的一帧交给应用的帧驱动队列；变更检测由 Angular 自己调度。 */
  _process(delta: number): void {
    this.app?.tick(delta * 1000);
  }
}
