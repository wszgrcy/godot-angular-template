import { signal } from "@angular/core";

/** 静态侧交给 Angular 侧的写通道：把一个字符串写进某个静态 Label。 */
type EchoWriter = (text: string) => void;
/** 切场景的通道：销毁 Angular 应用这件事只能由场景根脚本做，Angular 侧只能委托。 */
type Leaver = (path: string) => void;

/**
 * 静态节点 ↔ Angular 的桥。
 *
 * 两侧在同一个 JS 模块图里（hybrid.js 一个 bundle），所以模块级单例就是共享状态，
 * 不需要事件总线。方向有两个：
 *
 * - **非 NG → NG**：静态按钮的 `pressed` 里 `jsClicks.update()`，模板读同一个 signal。
 *   zoneless 认 signal 这个显式来源，写入即置脏，下一帧模板就变了。
 * - **NG → 非 NG**：组件调 `writeEcho()`，走 `echo` 通道直接改静态节点的 `text`；
 *   静态侧则在 `_process()` 里读 `ngClicks()`，把 Angular 的计数回写到另一条静态 Label。
 *
 * 用 signal 而不是回调数组：静态侧随时能读当前值，不依赖「谁先订阅」。
 */
class HybridBridge {
  /** 静态按钮累加，模板读 */
  readonly jsClicks = signal(0);
  /** Angular 累加，静态侧每帧读 */
  readonly ngClicks = signal(0);
  /** 静态侧自己的帧号与帧耗时，模板读（证明这两条栏不靠 Angular 也在跑） */
  readonly jsFrames = signal(0);
  readonly jsMs = signal(0);

  private echo: EchoWriter | null = null;
  private leave: Leaver | null = null;

  /** 由场景根脚本在 _ready() 里调用：把静态节点的写入能力交出来 */
  bindStatic(handlers: { echo: EchoWriter; leave: Leaver }): void {
    this.echo = handlers.echo;
    this.leave = handlers.leave;
  }

  /** Angular → 静态节点。返回 false 表示静态侧还没绑定（理论上不会发生）。 */
  writeEcho(text: string): boolean {
    if (!this.echo) return false;
    this.echo(text);
    return true;
  }

  /** Angular → 委托场景根脚本切场景 */
  leaveTo(path: string): boolean {
    if (!this.leave) return false;
    this.leave(path);
    return true;
  }

  bumpNg(): void {
    this.ngClicks.update((v) => v + 1);
  }

  reset(): void {
    this.jsClicks.set(0);
    this.ngClicks.set(0);
  }
}

/** 进程内唯一实例：静态侧与模板侧共享。 */
export const BRIDGE = new HybridBridge();
