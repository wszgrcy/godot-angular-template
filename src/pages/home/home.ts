import { Component, NO_ERRORS_SCHEMA, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { NAV } from "../../core/nav";
import { Breakpoints, Runtime } from "../../core/runtime";
import { UiCode, UiPage, UiSection, UiStat, UiTile } from "../../ui/kit";

const PIPELINE = `Angular 模板（就是 HTML 语法）
   │  ng build → godot-angular:application（AOT + zoneless）
   ▼
dist/main.js            CommonJS，被 GodotJS 的 V8 require()
   ▼
GodotRenderer           Renderer2 的 Godot 实现
   ▼
Label / Button / VBoxContainer …   真实引擎节点，不是贴图`;

@Component({
  selector: "page-home",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiStat, UiTile, UiCode],
  templateUrl: "./home.html",
})
export class PageHome {
  readonly rt = inject(Runtime);
  readonly bp = inject(Breakpoints);
  readonly tiles = NAV.slice(1);
  readonly pipeline = PIPELINE;

  private readonly router = inject(Router);

  /** 卡片网格的列数由内容区宽度决定：CSS 管不了 GridContainer.columns，只能组件自己算 */
  readonly cols = this.bp.cols;
  readonly statCols = this.bp.statCols;

  open(path: string): void {
    void this.router.navigate([path]);
  }
}
