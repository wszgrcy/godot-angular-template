import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import { ConfigFile, DisplayServer, Engine, Performance, Time } from "godot";

/** 采样频率：每帧读引擎单例没有必要，10Hz 足够让数字看起来是活的。 */
const SAMPLE_MS = 100;
/** 柱状图每根柱子的间隔。 */
const PUSH_MS = 400;
/** 柱状图保留多少根柱子。 */
const HISTORY = 28;

function monitor(m: number): number {
  try {
    return Performance.get_monitor(m) as number;
  } catch {
    return 0;
  }
}

/**
 * 当前的界面缩放因子。
 *
 * project.godot 开了 display/window/stretch/mode=canvas_items，引擎会按
 * 「窗口尺寸 / 基准尺寸」算出一个缩放，写进根视口的 stretch transform。
 * CSS 里的 px 因此是「基准像素」，实际画出来要乘上这个因子。
 *
 * 根 Window 上同时能看到两个坐标系：size 是物理像素，get_visible_rect().size
 * 是布局用的基准像素，两者一除就是缩放。Transform2D 在这套 JS 绑定里没有
 * .scale 属性，得走 get_scale()（或直接读基向量 st.x.x）。
 */
function stretchScale(): number {
  try {
    const win = (Engine.get_main_loop() as any)?.root;
    if (!win) return 1;
    const st = win.get_stretch_transform?.();
    const s = typeof st?.get_scale === "function" ? st.get_scale().x : st?.x?.x;
    if (typeof s === "number" && s > 0) return s;
    const vis = win.get_visible_rect?.()?.size;
    return vis?.x > 0 ? win.size.x / vis.x : 1;
  } catch {
    return 1;
  }
}

/**
 * 帧驱动的运行时状态。
 *
 * 浏览器里这些数字来自 performance.now() / requestAnimationFrame；
 * 引擎里对应 Performance / Engine / OS / Time 这些单例。两边都能拿到，
 * 区别只是「谁在泵这一帧」——这里是 main.ts 的 _process() 调用 app.tick()，
 * tick() 再把 rAF 队列放行，所以本服务的采样循环和 Angular 的变更检测同源。
 */
@Injectable({ providedIn: "root" })
export class Runtime {
  readonly fps = signal(0);
  readonly frameMs = signal(0);
  readonly nodes = signal(0);
  readonly orphans = signal(0);
  readonly resources = signal(0);
  readonly memKb = signal(0);
  readonly frames = signal(0);
  readonly uptime = signal(0);
  readonly winW = signal(0);
  readonly winH = signal(0);
  /** 界面缩放因子（窗口尺寸 / 基准尺寸），见 project.godot 的 [display] 段 */
  readonly scale = signal(1);
  /** 内容区（滚动视口）的实际宽度，由 App 在 resized 时写回 */
  readonly contentW = signal(0);
  readonly mouseX = signal(0);
  readonly mouseY = signal(0);
  readonly clock = signal("");
  /** 最近若干次的 FPS 采样，用来画柱状图 */
  readonly history = signal<number[]>([]);
  readonly ticking = signal(false);

  private raf = 0;
  private readonly startedAt = Time.get_ticks_msec();
  private lastSample = 0;
  private lastPush = 0;

  readonly winText = computed(() => {
    const w = this.winW();
    const h = this.winH();
    return w > 0 && h > 0 ? `${w} × ${h}` : "无头模式";
  });

  readonly scaleText = computed(() => `×${this.scale().toFixed(2)}`);

  readonly fpsText = computed(() => this.fps().toFixed(0));
  readonly msText = computed(() => this.frameMs().toFixed(2));
  readonly memText = computed(() => `${(this.memKb() / 1024).toFixed(1)} MB`);
  readonly uptimeText = computed(() => {
    const s = this.uptime();
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} 分 ${s % 60} 秒` : `${s} 秒`;
  });

  start(): void {
    if (this.raf) return;
    this.ticking.set(true);
    const loop = () => {
      this.sample();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ticking.set(false);
  }

  private sample(): void {
    const now = Time.get_ticks_msec();
    this.mouseX.set(DisplayServer.mouse_get_position().x);
    this.mouseY.set(DisplayServer.mouse_get_position().y);
    if (now - this.lastSample < SAMPLE_MS) return;
    this.lastSample = now;

    const fps = monitor(Performance.Monitor.TIME_FPS);
    this.fps.set(Math.round(fps * 10) / 10);
    this.frameMs.set(monitor(Performance.Monitor.TIME_PROCESS) * 1000);
    this.nodes.set(monitor(Performance.Monitor.OBJECT_NODE_COUNT));
    this.orphans.set(monitor(Performance.Monitor.OBJECT_ORPHAN_NODE_COUNT));
    this.resources.set(monitor(Performance.Monitor.OBJECT_RESOURCE_COUNT));
    this.memKb.set(monitor(Performance.Monitor.MEMORY_STATIC) / 1024);
    this.frames.set(Number(Engine.get_process_frames()));
    this.uptime.set(Math.floor((now - this.startedAt) / 1000));
    this.clock.set(new Date().toLocaleTimeString("zh-CN", { hour12: false }));

    const size = DisplayServer.window_get_size();
    this.winW.set(Math.round(size.x));
    this.winH.set(Math.round(size.y));
    this.scale.set(stretchScale());

    if (now - this.lastPush >= PUSH_MS) {
      this.lastPush = now;
      this.history.update((h) => [...h, fps].slice(-HISTORY));
    }
  }
}

/**
 * 断点服务。
 *
 * CSS 的 @media 由样式运行时自动绑定窗口尺寸；但节点树结构（GridContainer 的列数、
 * @if 要不要渲染侧栏）不在 CSS 的落点范围内，只能由组件读尺寸自己决定。
 * 两者用的是同一个来源，不会出现「样式换了布局没换」。
 *
 * 列数看的是内容区宽度而不是窗口宽度：侧栏占了固定宽度，拿窗口宽度算会算出装不下的列数。
 */
@Injectable({ providedIn: "root" })
export class Breakpoints {
  private readonly rt = inject(Runtime);

  /** 内容区实际宽度（App 在 ScrollContainer 尺寸变化时写回来） */
  private readonly w = computed(() => this.rt.contentW() || this.rt.winW());

  readonly wide = computed(() => this.w() >= 900);
  readonly compact = computed(() => this.w() > 0 && this.w() < 620);
  /** 卡片网格列数 */
  readonly cols = computed(() => (this.w() >= 900 ? 3 : this.w() >= 620 ? 2 : 1));
  /** 数值块网格列数：块很矮，可以多列 */
  readonly statCols = computed(() => (this.w() >= 900 ? 4 : this.w() >= 620 ? 3 : 2));
  readonly name = computed(() =>
    this.w() < 620 ? "窄屏 <620" : this.w() < 900 ? "中屏 620–900" : "宽屏 ≥900",
  );
}

/** 用 user:// 上的 ConfigFile 记住偏好，等价于浏览器里的 localStorage。 */
@Injectable({ providedIn: "root" })
export class Prefs {
  readonly dark = signal(true);
  private readonly path = "user://godot-angular-prefs.cfg";

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.save());
  }

  toggle(): void {
    this.dark.update((v) => !v);
    this.save();
  }

  private load(): void {
    try {
      const cf = new ConfigFile();
      if (cf.load(this.path) === 0) {
        this.dark.set(Boolean(cf.get_value("ui", "dark", true)));
      }
    } catch {
      /* 首次运行没有配置文件，属正常情况 */
    }
  }

  private save(): void {
    try {
      const cf = new ConfigFile();
      cf.set_value("ui", "dark", this.dark());
      cf.save(this.path);
    } catch {
      /* 只读文件系统下放弃持久化，界面照常工作 */
    }
  }
}
