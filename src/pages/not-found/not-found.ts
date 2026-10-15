import { Component, NO_ERRORS_SCHEMA, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Control } from "godot";

@Component({
  selector: "page-not-found",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <VBoxContainer class="page">
      <!-- 卡片横向不拉伸：右侧那个 Control 负责吃掉剩余宽度。
           PanelContainer 若跟着拉伸，里面那条 autowrap 的 Label 最小宽度只有 1px，
           窄窗口下会被压成一列竖排文字，宽窗口下按钮又会被拉成一条横幅。 -->
      <HBoxContainer class="row">
        <PanelContainer class="panel notfound" [size_flags_horizontal]="shrink">
          <VBoxContainer class="section">
            <Label class="h1" text="404"></Label>
            <Label
              class="body"
              text="路由表里没有匹配这条 URL 的组件。wildcard 路由 ** 会接住它，和浏览器里的行为一致。"
              [autowrap_mode]="2"></Label>
            <Button
              class="primary"
              text="回首页"
              [size_flags_horizontal]="shrink"
              (click)="home()"></Button>
          </VBoxContainer>
        </PanelContainer>
        <Control [size_flags_horizontal]="expand"></Control>
      </HBoxContainer>
    </VBoxContainer>
  `,
})
export class PageNotFound {
  /** Control.SIZE_SHRINK_BEGIN：卡片按内容宽度排，不跟着内容区拉伸 */
  readonly shrink = Control.SizeFlags.SIZE_SHRINK_BEGIN;

  private readonly router = inject(Router);

  home(): void {
    void this.router.navigate(["/"]);
  }
}
