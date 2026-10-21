import {
  Button,
  Callable,
  Color,
  Control,
  DisplayServer,
  HBoxContainer,
  Label,
  Node,
  OS,
  Panel,
  PanelContainer,
  Performance,
  ProgressBar,
  StyleBoxFlat,
  Tween,
  VBoxContainer,
  Vector2,
  Vector2i,
} from "godot";
/** 与主应用同一套配色，只是这里靠 theme override 手搓，没有 CSS 通道。 */
const C = {
  bg: new Color("#0b0f16"),
  panel: new Color("#131c27"),
  line: new Color("#243244"),
  text: new Color("#e6edf5"),
  muted: new Color("#8fa1b5"),
  brand: new Color("#7fd1ff"),
  ok: new Color("#46d39a"),
  btn: new Color("#1d4f7d"),
  ghost: new Color("#16202c"),
};

/** 一个圆角盒子。CSS 里 background-color + border-radius + padding 那三行，在这里是这几行。 */
function box(bg: Color, radius = 8, margin = 0, border = 0, borderColor = C.line): StyleBoxFlat {
  const sb = new StyleBoxFlat();
  sb.bg_color = bg;
  sb.set_corner_radius_all(radius);
  if (margin > 0) {
    sb.content_margin_left = margin;
    sb.content_margin_right = margin;
    sb.content_margin_top = Math.max(2, margin - 4);
    sb.content_margin_bottom = Math.max(2, margin - 4);
  }
  if (border > 0) {
    sb.set_border_width_all(border);
    sb.border_color = borderColor;
  }
  return sb;
}

function label(text: string, color: Color, size: number): Label {
  const l = new Label();
  l.text = text;
  l.add_theme_color_override("font_color", color);
  l.add_theme_font_size_override("font_size", size);
  return l;
}

function button(text: string, primary: boolean, on: () => void): Button {
  const b = new Button();
  b.text = text;
  b.add_theme_stylebox_override("normal", box(primary ? C.btn : C.ghost, 6, 10, primary ? 0 : 1));
  b.add_theme_stylebox_override("hover", box(primary ? new Color("#2568a0") : new Color("#1d2a39"), 6, 10, 1));
  b.add_theme_stylebox_override("pressed", box(new Color("#0f2f4d"), 6, 10, 1));
  b.add_theme_color_override("font_color", C.text);
  b.pressed.connect(Callable.create(on));
  return b;
}

function column(gap: number): VBoxContainer {
  const v = new VBoxContainer();
  v.add_theme_constant_override("separation", gap);
  return v;
}

function row(gap: number): HBoxContainer {
  const h = new HBoxContainer();
  h.add_theme_constant_override("separation", gap);
  return h;
}

/** 撑开剩余空间的弹簧，等价于模板里那个 [size_flags_horizontal]=EXPAND_FILL 的空 Control。 */
function spring(): Control {
  const c = new Control();
  c.size_flags_horizontal = Control.SizeFlags.SIZE_EXPAND_FILL;
  return c;
}

/**
 * 纯 JS 场景 —— 第三个入口，**没有 Angular**。
 *
 * 没有模板、没有 signal、没有变更检测：节点在 `_ready()` 里 new 出来挂上去，
 * 文本在 `_process()` 里直接写，样式用 `add_theme_*_override`。构建产物里它和
 * hybrid.js 一样是个入口，但没 import godot-angular，所以 Angular 的运行时一行都没进来。
 *
 * 存在的意义是对照：同一件事（计数、动画、切场景）不用 Angular 要写多少、写出来长什么样。
 */
export default class PlainJsScene extends Node {
  private frames = 0;
  private clicks = 0;
  private t = 0;

  private count!: Label;
  private tick!: Label;
  private stat!: Label;
  private ball!: Panel;
  private stage!: Control;

  _ready(): void {
    if (OS.has_feature("headless")) DisplayServer.window_set_size(new Vector2i(1280, 800));

    const root = new VBoxContainer();
    // 读名字得用 get_name()，写名字得用 set_name()：这套绑定里 node.name 是个无效属性
    root.set_name("Root");
    root.set_anchors_and_offsets_preset(Control.LayoutPreset.PRESET_FULL_RECT);
    this.add_child(root);

    const bg = new PanelContainer();
    bg.set_name("Bg");
    bg.add_theme_stylebox_override("panel", box(C.bg, 0, 18));
    bg.size_flags_horizontal = Control.SizeFlags.SIZE_EXPAND_FILL;
    bg.size_flags_vertical = Control.SizeFlags.SIZE_EXPAND_FILL;
    root.add_child(bg);

    const col = column(14);
    col.size_flags_vertical = Control.SizeFlags.SIZE_EXPAND_FILL;
    bg.add_child(col);

    col.add_child(label("纯 JS 场景 · dist/plain-js.js", C.text, 26));
    col.add_child(
      label(
        "这个场景没有引 godot-angular：节点全部由 JS 在 _ready() 里创建，样式走 add_theme_*_override，" +
          "文本在 _process() 里直接赋值。没有模板、没有 signal、没有变更检测。",
        C.muted,
        13,
      ),
    );

    // ---- 计数：和主应用同一个交互，写法是 connect + 直接赋值 ----
    const card = new PanelContainer();
    card.add_theme_stylebox_override("panel", box(C.panel, 10, 14, 1));
    const cardCol = column(10);
    card.add_child(cardCol);
    cardCol.add_child(label("手写计数", C.brand, 17));
    const countRow = row(8);
    countRow.add_child(button("计数 +1", true, () => this.addClicks(1)));
    countRow.add_child(button("计数 +10", false, () => this.addClicks(10)));
    countRow.add_child(button("清零", false, () => this.addClicks(-this.clicks)));
    this.count = label("0", C.text, 24);
    countRow.add_child(this.count);
    countRow.add_child(spring());
    this.tick = label("帧 0", C.muted, 12);
    countRow.add_child(this.tick);
    cardCol.add_child(countRow);

    // ---- Tween：动画交给引擎，不需要每帧改 ----
    const tweenRow = row(10);
    const bar = new ProgressBar();
    bar.min_value = 0;
    bar.max_value = 100;
    bar.value = 0;
    bar.custom_minimum_size = new Vector2(320, 14);
    bar.show_percentage = false;
    bar.add_theme_stylebox_override("background", box(new Color("#1a2534"), 7));
    bar.add_theme_stylebox_override("fill", box(C.ok, 7));
    tweenRow.add_child(bar);
    tweenRow.add_child(
      label("进度条由 create_tween() 驱动，_process() 里没有它一行代码", C.muted, 12),
    );
    cardCol.add_child(tweenRow);
    const tw = bar.create_tween();
    tw.set_loops();
    tw.tween_property(bar, "value", 100, 1.6);
    tw.tween_property(bar, "value", 0, 0.9);

    // ---- 舞台：这里才用 _process 逐帧改 position ----
    const stage = new PanelContainer();
    stage.add_theme_stylebox_override("panel", box(new Color("#0e1622"), 10, 8, 1));
    stage.custom_minimum_size = new Vector2(0, 150);
    stage.size_flags_horizontal = Control.SizeFlags.SIZE_EXPAND_FILL;
    const inner = new Control();
    inner.clip_contents = true;
    stage.add_child(inner);
    this.stage = inner;
    const ball = new Panel();
    ball.custom_minimum_size = new Vector2(40, 40);
    ball.add_theme_stylebox_override("panel", box(new Color("#8a63d2"), 8));
    inner.add_child(ball);
    this.ball = ball;
    cardCol.add_child(stage);

    this.stat = label("", C.muted, 12);
    cardCol.add_child(this.stat);
    col.add_child(card);

    // ---- 场景切换 ----
    const nav = row(8);
    nav.add_child(label("切场景：", C.muted, 12));
    nav.add_child(button("主界面", false, () => this.go("res://main.tscn")));
    nav.add_child(button("混合控制", false, () => this.go("res://scenes/hybrid.tscn")));
    nav.add_child(button("GDScript 场景", false, () => this.go("res://scenes/gd_demo.tscn")));
    nav.add_child(spring());
    nav.add_child(label("这里没有应用要销毁，直接 change_scene_to_file 就行", C.muted, 12));
    col.add_child(nav);

    console.log("[plain] 纯 JS 场景就绪：节点全部由代码创建，未引入 godot-angular");
  }

  _process(delta: number): void {
    this.frames++;
    this.tick.text = `帧 ${this.frames} · ${(delta * 1000).toFixed(2)} ms`;
    this.stat.text =
      `FPS ${Performance.get_monitor(Performance.Monitor.TIME_FPS).toFixed(0)} · ` +
      `节点 ${Performance.get_monitor(Performance.Monitor.OBJECT_NODE_COUNT)}`;

    // 逐帧动画：舞台尺寸要到布局完成后才拿得到，所以每帧现读
    this.t += delta;
    const w = this.stage.size.x;
    const h = this.stage.size.y;
    if (w > 0 && h > 0) {
      this.ball.position = new Vector2(
        w / 2 - 20 + Math.cos(this.t * 1.4) * (w / 2 - 30),
        h / 2 - 20 + Math.sin(this.t * 2.1) * (h / 2 - 26),
      );
      const s = 1 + Math.sin(this.t * 3) * 0.2;
      this.ball.scale = new Vector2(s, s);
    }
  }

  private addClicks(n: number): void {
    this.clicks += n;
    this.count.text = String(this.clicks);
  }

  private go(path: string): void {
    const err = this.get_tree().change_scene_to_file(path);
    console.log(`[plain] change_scene_to_file(${path}) → ${err === 0 ? "ok" : "err " + err}`);
  }
}
