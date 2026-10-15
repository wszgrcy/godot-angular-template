import { AfterViewInit, Component, DestroyRef, ElementRef, NO_ERRORS_SCHEMA, inject, signal, viewChild } from "@angular/core";
import { Control, DisplayServer, Panel, Time, Tween, Vector2 } from "godot";
import { displayRows, platformRows } from "../../core/env";
import { UiCard, UiCode, UiKv, UiPage, UiSection } from "../../ui/kit";

/** 一行「浏览器 API → 在引擎里跑一下」。返回字符串表示同步出结果，返回 null 表示异步。 */
interface Try {
  name: string;
  api: string;
  run: (done: (value: string) => void) => string | null;
}

const TRIES: Try[] = [
  {
    name: "URL",
    api: 'new URL("https://docs.godotengine.org/en/4.x/search.html?q=signal")',
    run: () => {
      const u = new URL("https://docs.godotengine.org/en/4.x/search.html?q=signal#anchor");
      return `host=${u.host} path=${u.pathname} q=${u.searchParams.get("q")} hash=${u.hash}`;
    },
  },
  {
    name: "URLSearchParams",
    api: 'new URLSearchParams("mode=demo&n=3")',
    run: () => {
      const p = new URLSearchParams("mode=demo&n=3");
      return `mode=${p.get("mode")} n=${p.get("n")} toString=${p.toString()}`;
    },
  },
  {
    name: "atob",
    api: 'atob("Z29kb3QtYW5ndWxhcg==")',
    run: () => `解码 → ${atob("Z29kb3QtYW5ndWxhcg==")}`,
  },
  {
    name: "performance.now()",
    api: "performance.now() / Time.get_ticks_usec()",
    run: () => `performance.now()=${performance.now().toFixed(2)} ticks=${Time.get_ticks_usec()}`,
  },
  {
    name: "requestAnimationFrame",
    api: "rAF 由 app.tick() 放行",
    run: (done) => {
      const t0 = performance.now();
      requestAnimationFrame(() => done(`下一帧在 ${(performance.now() - t0).toFixed(2)} ms 后到来`));
      return null;
    },
  },
  {
    name: "queueMicrotask",
    api: "微任务先于下一帧",
    run: (done) => {
      queueMicrotask(() => done("微任务已执行（在同一帧内）"));
      return "已排入微任务队列…";
    },
  },
  {
    name: "setTimeout",
    api: "setTimeout(fn, 400)",
    run: (done) => {
      setTimeout(() => done("400ms 定时器到点"), 400);
      return null;
    },
  },
  {
    name: "剪贴板",
    api: "DisplayServer.clipboard_get()",
    run: () => {
      const text = DisplayServer.clipboard_get();
      return text ? `剪贴板：${text.slice(0, 40)}` : "剪贴板是空的";
    },
  },
  {
    name: "fetch",
    api: "fetch / XMLHttpRequest",
    run: () => {
      const f = (globalThis as Record<string, unknown>)["fetch"];
      if (!f) return "未提供：网络请求请改用 HTTPRequest 节点";
      return "存在";
    },
  },
  {
    name: "localStorage",
    api: "localStorage",
    run: () => {
      const ls = (globalThis as Record<string, unknown>)["localStorage"];
      if (!ls) return "未提供：改用 ConfigFile 写 user://（本页主题就是这么存的）";
      return "存在";
    },
  },
];

const SNIPPET = `// 模板引用变量 → ElementRef，nativeElement 就是引擎节点
private readonly ball = viewChild.required<ElementRef<Panel>>("ball");

requestAnimationFrame(() => {
  const node = this.ball().nativeElement;
  node.rotation = t;                       // 直接写 Godot 属性
  node.position = new Vector2(x, y);
  node.scale = new Vector2(s, s);
});

// 也可以用引擎自己的动画系统
node.create_tween()
  .tween_property(node, "scale", new Vector2(1.6, 0.6), 0.2);`;

@Component({
  selector: "page-interop",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiCard, UiKv, UiCode],
  templateUrl: "./interop.html",
})
export class PageInterop implements AfterViewInit {
  private readonly stage = viewChild.required<ElementRef<Control>>("stage");
  private readonly ball = viewChild.required<ElementRef<Panel>>("ball");
  private readonly drag = viewChild.required<ElementRef<Panel>>("drag");

  readonly tries = TRIES;
  readonly platform = platformRows();
  readonly display = displayRows();
  readonly snippet = SNIPPET;
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;

  readonly animating = signal(false);
  readonly outs = signal<string[]>([]);
  readonly lastInput = signal("把鼠标放进舞台里，拖动那个方块");
  readonly clipText = signal("godot-angular @ " + new Date().toISOString());
  readonly clipMsg = signal("还没写");

  private raf = 0;
  private t = 0;
  private dragging = false;
  private grab = new Vector2(0, 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    });
  }

  ngAfterViewInit(): void {
    const drag = this.drag().nativeElement;
    drag.position = new Vector2(120, 96);
    drag.pivot_offset = new Vector2(28, 28);
    const ball = this.ball().nativeElement;
    ball.pivot_offset = new Vector2(28, 28);
  }

  /* ---------- rAF 动画 ---------- */
  toggleAnim(): void {
    if (this.animating()) {
      this.animating.set(false);
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    this.animating.set(true);
    const node = this.ball().nativeElement;
    node.pivot_offset = new Vector2(28, 28);
    this.loop();
  }

  private loop = (): void => {
    if (!this.animating()) return;
    const stage = this.stage().nativeElement.size;
    const node = this.ball().nativeElement;
    this.t += 0.035;
    const rx = Math.max(20, stage.x / 2 - 40);
    const ry = Math.max(16, stage.y / 2 - 46);
    node.position = new Vector2(
      stage.x / 2 - 28 + Math.cos(this.t) * rx,
      stage.y / 2 - 28 + Math.sin(this.t * 1.4) * ry,
    );
    node.rotation = this.t;
    const s = 1 + Math.sin(this.t * 2) * 0.22;
    node.scale = new Vector2(s, s);
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ---------- Tween ---------- */
  bounce(): void {
    const node = this.drag().nativeElement;
    node.pivot_offset = new Vector2(28, 28);
    node.position = new Vector2(120, 90);
    const tw = node.create_tween();
    tw.set_trans(Tween.TransitionType.TRANS_BOUNCE);
    tw.set_ease(Tween.EaseType.EASE_OUT);
    tw.tween_property(node, "scale", new Vector2(1.7, 0.55), 0.18);
    tw.tween_property(node, "scale", new Vector2(1, 1), 0.5);
  }

  /* ---------- 真实 InputEvent ---------- */
  onGui(event: any): void {
    const kind = String(event.get_class());
    if (kind === "InputEventMouseButton") {
      this.dragging = Boolean(event.pressed);
      this.grab = new Vector2(event.position.x, event.position.y);
      this.lastInput.set(`MouseButton index=${event.button_index} pressed=${event.pressed}`);
    } else if (kind === "InputEventMouseMotion") {
      const p = event.position;
      this.lastInput.set(`MouseMotion ${Math.round(p.x)}, ${Math.round(p.y)} button_mask=${event.button_mask}`);
      if (this.dragging) {
        const node = this.drag().nativeElement;
        node.position = new Vector2(node.position.x + p.x - this.grab.x, node.position.y + p.y - this.grab.y);
      }
    }
  }

  /* ---------- 剪贴板 ---------- */
  copy(): void {
    DisplayServer.clipboard_set(this.clipText());
    this.clipMsg.set("已写入剪贴板");
  }

  paste(): void {
    this.clipMsg.set(`读回：${DisplayServer.clipboard_get()}`);
  }

  /* ---------- Web API 试跑 ---------- */
  run(i: number): void {
    this.setOut(i, "…");
    try {
      const sync = this.tries[i].run((v) => this.setOut(i, v));
      if (sync !== null) this.setOut(i, sync);
    } catch (err) {
      this.setOut(i, `✗ ${(err as Error)?.message ?? String(err)}`);
    }
  }

  private setOut(i: number, value: string): void {
    this.outs.update((list) => {
      const next = [...list];
      next[i] = value;
      return next;
    });
  }
}
