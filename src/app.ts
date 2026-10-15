import { AfterViewInit, Component, ElementRef, NO_ERRORS_SCHEMA, OnInit, inject, signal, viewChild } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { Control, ScrollContainer, Vector2 } from "godot";
import { filter } from "rxjs";
import { NAV } from "./core/nav";
import { Prefs, Runtime } from "./core/runtime";

@Component({
  selector: "app-root",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [RouterOutlet],
  templateUrl: "./app.html",
})
export class App implements OnInit, AfterViewInit {
  private readonly scroller = viewChild.required<ElementRef<ScrollContainer>>("scroller");
  private readonly content = viewChild.required<ElementRef<Control>>("content");

  readonly nav = NAV;
  /** Control.SIZE_EXPAND_FILL */
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;
  /** Control.SIZE_SHRINK_BEGIN —— 在 ScrollContainer 里表示「按内容自然高度排」 */
  readonly shrink = Control.SizeFlags.SIZE_SHRINK_BEGIN;

  readonly path = signal("/");
  readonly runtime = inject(Runtime);
  readonly prefs = inject(Prefs);

  private readonly router = inject(Router);

  constructor() {
    // 帧驱动采样：requestAnimationFrame 由 main.ts 的 _process() → tick() 放行，
    // 与 Angular 的变更检测同源，不需要额外的定时器。
    this.runtime.start();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.path.set(e.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.path.set(this.router.url);
  }

  ngAfterViewInit(): void {
    this.syncWidth();
  }

  /**
   * ScrollContainer 默认按子节点的最小宽度排版，长文本会把内容顶得比窗口还宽。
   * 这里把内容容器的 custom_minimum_size.x 同步成视口宽度，「页面铺满可用宽度」就成立了；
   * 内容确实放不下时（比如 ColorPicker）横向滚动条会自己出现，而不是把整个壳子撑变形。
   *
   * (resized) 是 Control 的原生信号（Godot 4 里它叫 resized，size_changed 是 Godot 3 的
   * 名字，写错了不会报错，只会静默不连接）。事件名不在别名表里时，渲染器直接按同名信号连接。
   */
  syncWidth(): void {
    const w = Math.round(this.scroller().nativeElement.size.x);
    const content = this.content().nativeElement;
    if (w > 0 && content.custom_minimum_size.x !== w) {
      content.custom_minimum_size = new Vector2(w, 0);
    }
    this.runtime.contentW.set(w);
  }

  isActive(path: string): boolean {
    return path === "/" ? this.path() === "/" : this.path().startsWith(path);
  }

  go(path: string): void {
    void this.router.navigate([path]);
  }
}
