import { Location } from "@angular/common";
import { Component, NO_ERRORS_SCHEMA, inject, signal } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, TitleStrategy } from "@angular/router";
import { GodotTitleStrategy } from "godot-angular/router";
import { filter } from "rxjs";
import { UiCard, UiCode, UiKv, UiPage, UiSection } from "../../ui/kit";

const SNIPPET = `// src/main.ts
bootstrapGodotApp(App, root, [
  provideGodotRouter([
    { path: "", component: PageHome, title: "概览" },
    { path: "routing/:id", component: PageRouting, title: "路由参数" },
    { path: "**", component: PageNotFound, title: "404" },
  ]),
]);

// 只有 paramMap 的订阅能在「只改参数」时刷新——组件实例是被复用的
this.route.paramMap.subscribe((p) => this.itemId.set(p.get("id")));`;

@Component({
  selector: "page-routing",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiCard, UiKv, UiCode],
  templateUrl: "./routing.html",
})
export class PageRouting {
  readonly snippet = SNIPPET;
  readonly path = signal("/");
  readonly itemId = signal<string | null>(null);
  readonly q = signal("—");
  readonly winTitle = signal("—");
  readonly history: string[] = [];

  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly titles = inject(TitleStrategy) as GodotTitleStrategy;

  constructor() {
    this.route.paramMap.subscribe((p) => this.itemId.set(p.get("id")));
    this.route.queryParamMap.subscribe((q) => this.q.set(q.get("q") ?? "—"));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.path.set(this.location.path());
        // 路由器先 next(NavigationEnd)，下一句才调 titleStrategy.updateTitle()，
        // 同一拍里读到的一定是上一跳的值，延后一个微任务再读。
        queueMicrotask(() => this.winTitle.set(this.titles.currentTitle));
      });
    this.path.set(this.location.path());
    queueMicrotask(() => this.winTitle.set(this.titles.currentTitle));
  }

  go(...commands: unknown[]): void {
    void this.router.navigate(commands as never);
  }

  openItem(id: number): void {
    void this.router.navigate(["/routing", id], { queryParams: { q: `item-${id}` } });
  }

  withQuery(q: string): void {
    void this.router.navigate(["/routing"], { queryParams: { q } });
  }

  back(): void {
    this.location.back();
  }

  forward(): void {
    this.location.forward();
  }

  notFound(): void {
    void this.router.navigate(["/no-such-page"]);
  }
}
