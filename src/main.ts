import {
  Control,
  DirAccess,
  DisplayServer,
  InputEventMouseButton,
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
import { PageState } from "./pages/state/state";
import { PageStyles } from "./pages/styles/styles";
import { PageTemplate } from "./pages/template/template";

/** 无头模式下导出节点树快照前等待的帧数，为布局与变更检测预留时间。 */
const SNAPSHOT_AFTER_FRAMES = 8;
/** 截图模式下首屏之前等待的帧数，让首屏布局与样式级联跑完。 */
const SHOT_AFTER_FRAMES = 20;
/** 每一步（点击 → 稳定 → 截图）之间留的帧数。 */
const SHOT_SETTLE_FRAMES = 14;
/** MOUSE_BUTTON_LEFT：全局枚举在 typings 里不作为值导出，这里用字面量。 */
const MOUSE_LEFT = 1;

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

/** 递归打印节点树；无头模式下这是唯一可观察的输出。 */
function printTree(node: any, depth: number): void {
  const pad = "  ".repeat(depth);
  const size = node.size ? `${Math.round(node.size.x)}x${Math.round(node.size.y)}` : "-";
  const min = node.get_minimum_size
    ? ` min=${Math.round(node.get_minimum_size().x)}x${Math.round(node.get_minimum_size().y)}`
    : "";
  const pos = node.position ? `@${Math.round(node.position.x)},${Math.round(node.position.y)}` : "";
  const text = node.text ? ` text="${node.text}"` : "";
  console.log(`${pad}${node.get_class()} ${node.name} ${size} ${pos}${min}${text}`);
  for (let i = 0; i < node.get_child_count(); i++) printTree(node.get_child(i), depth + 1);
}

/** 按显示文本找节点，用来定位要点的按钮。 */
function findByText(node: any, text: string): any {
  if (node.text === text) return node;
  for (let i = 0; i < node.get_child_count(); i++) {
    const hit = findByText(node.get_child(i), text);
    if (hit) return hit;
  }
  return null;
}

/**
 * 往根视口推一次真实鼠标点击：走完整的 GUI 输入分发（悬停、焦点、pressed 信号），
 * 不是直接 emit_signal，因此和人手点的差别只在没有硬件队列。
 */
function clickCenter(viewport: any, target: any): void {
  const rect = target.get_global_rect();
  const at = new Vector2(rect.position.x + rect.size.x / 2, rect.position.y + rect.size.y / 2);
  for (const down of [true, false]) {
    const ev = new InputEventMouseButton();
    ev.button_index = MOUSE_LEFT;
    ev.pressed = down;
    ev.position = at;
    ev.global_position = at;
    viewport.push_input(ev);
  }
  console.log(`[demo] click "${target.text}" @${Math.round(at.x)},${Math.round(at.y)}`);
}

export default class Main extends Node {
  private app: GodotAngularApp | null = null;
  private frames = 0;
  private mode = "run";
  private rootNode: any = null;
  /** 截图模式的状态机：待点击的按钮文本、当前步、下一次存图的帧号。 */
  private clicks: string[] = [];
  private step = -1;
  private actionAt = 0;

  _ready(): void {
    this.mode = OS.get_environment("CUJ_MODE") || "run";

    // Angular 的挂载点。用 VBoxContainer 而不是裸 Control：容器的子节点会被铺满，
    // 根组件的宿主元素因此自动跟随窗口尺寸，不需要再给它单独设锚点。
    const root = new VBoxContainer();
    root.name = "AngularRoot";
    const win = this.get_tree().root as unknown as Window | null;
    if (OS.has_feature("headless")) {
      // 无头模式给的是一个很小的窗口，快照里看到的布局会和真实运行差很多，固定成常用尺寸
      DisplayServer.window_set_size(new Vector2i(1280, 800));
    }
    if (win && win.size.x > 0 && win.size.y > 0) {
      root.set_anchors_and_offsets_preset(Control.LayoutPreset.PRESET_FULL_RECT);
    } else {
      // 无头模式没有真实窗口，给一个固定尺寸，让布局断言保持稳定
      root.size = new Vector2(1600, 800);
    }
    this.add_child(root);
    this.rootNode = root;

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

  _process(delta: number): void {
    this.frames++;
    if (this.app) this.app.tick(delta * 1000);
    if (this.mode === "snapshot" && this.app && this.frames >= SNAPSHOT_AFTER_FRAMES) {
      console.log("[demo] --- node tree ---");
      printTree(this.rootNode, 0);
      this.get_tree().quit(0);
    }
    if (this.mode === "shot") this.shoot();
  }

  /**
   * 截图模式：CUJ_MODE=shot SHOT_PATH=res://shots/step.png [CLICK_TEXT=a,b,c]
   * 需要真实渲染，不能配 --headless。第 0 步是首屏，之后每一步先点一个侧栏按钮
   * （走完整 GUI 输入分发），等布局稳定后存一张图，并打印窗口标题作为路由已切换的证据。
   * 产物为 step-00.png、step-01.png …，配合 tools/inspect_shot.py 做像素体检。
   */
  private shoot(): void {
    if (!this.app) return;
    if (this.step < 0) {
      if (this.frames < SHOT_AFTER_FRAMES) return;
      const want = OS.get_environment("CLICK_TEXT");
      this.clicks = want ? want.split(",").filter((s) => s.length > 0) : [];
      this.beginStep(0);
      return;
    }
    if (this.frames < this.actionAt) return;
    this.saveShot(this.get_tree().root as any, this.step);
    this.beginStep(this.step + 1);
  }

  /** 开始第 n 步：先点击（第 0 步不点），再安排 SHOT_SETTLE_FRAMES 帧后存图。 */
  private beginStep(n: number): void {
    if (n > this.clicks.length) {
      this.get_tree().quit(0);
      return;
    }
    this.step = n;
    if (n > 0) {
      const want = this.clicks[n - 1];
      const target = findByText(this.rootNode, want);
      if (!target) console.log(`[demo] 找不到文本为 ${JSON.stringify(want)} 的节点`);
      else clickCenter(this.get_tree().root as any, target);
    }
    this.actionAt = this.frames + SHOT_SETTLE_FRAMES;
  }

  private saveShot(viewport: any, step: number): void {
    const base = OS.get_environment("SHOT_PATH") || "user://shot.png";
    const tail = "-step-" + String(step).padStart(2, "0") + ".png";
    const path = base.endsWith(".png") ? base.slice(0, -4) + tail : base + tail;
    const image = viewport.get_texture().get_image();
    if (!image || image.get_width() === 0) {
      console.log("[demo] 拿不到渲染结果，截图需要真实窗口，不能配 --headless");
      this.get_tree().quit(1);
      return;
    }
    // save_png 不会建目录，目录不存在时只报一句 Can't save PNG 然则什么都不写
    const dir = path.slice(0, path.lastIndexOf("/"));
    if (dir && dir.length > 0) DirAccess.make_dir_recursive_absolute(dir);
    const err = image.save_png(path);
    if (err !== 0) {
      console.log(`[demo] 存图失败 ${path}，返回码 ${err}`);
      this.get_tree().quit(1);
      return;
    }
    // DisplayServer.window_get_title 在本引擎的绑定里不存在，标题得从根 Window 读
    const title = (this.get_tree().root as any).title;
    console.log(
      `[demo] step ${step} → ${path}（${image.get_width()}x${image.get_height()}）` +
        ` 标题=${JSON.stringify(title)}`,
    );
  }
}
