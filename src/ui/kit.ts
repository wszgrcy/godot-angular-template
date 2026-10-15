import { Component, NO_ERRORS_SCHEMA, computed, input, output } from "@angular/core";
import { Control } from "godot";

/**
 * 内容卡片：PanelContainer + VBoxContainer。
 *
 * `styles` 与 `styleUrls` 是构建期 CSS 通道的回归样本：组件级样式会被编译成带作用域标记的
 * 规则，`--card-accent` 这类自定义属性会加上命名空间前缀（%NS%），运行时再还原。
 * 注释里不要出现那个标记的字面量，否则会污染构建产物里的 grep 结果。
 */
@Component({
  selector: "ui-card",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  styleUrls: ["./card.css"],
  template: `
    <PanelContainer class="card">
      <VBoxContainer class="card-inner">
        @if (title()) {
        <Panel class="card-accent" [size_flags_horizontal]="shrink"></Panel>
        <Label class="card-title" [text]="title()"></Label>
        }
        @if (desc()) {
        <Label class="card-desc" [text]="desc()"></Label>
        }
        <ng-content select=".head"></ng-content>
        <ng-content></ng-content>
        <ng-content select=".foot"></ng-content>
      </VBoxContainer>
    </PanelContainer>
  `,
})
export class UiCard {
  readonly title = input("");
  readonly desc = input("");
  /** 强调条不能跟着 VBox 横向拉伸：Panel 不是容器，给 SHRINK 才能停在 34px 宽。 */
  readonly shrink = Control.SizeFlags.SIZE_SHRINK_BEGIN;
}

/**
 * 可点击的卡片：整块就是一个 Button。
 *
 * Button 不是 Container：挂上去的子节点不会被排版，也不会算进按钮的最小尺寸，
 * 所以不能把内容直接塞进 Button（实测会被挤成一列竖排文字）。这里的做法是：
 * PanelContainer 是 Container，由它按内容撑出尺寸；上面铺一层 flat Button 专门
 * 负责 hover / pressed / 点击，PanelContainer 会把矩形分给它每一个子节点。
 */
@Component({
  selector: "ui-tile",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <PanelContainer class="card-btn">
      <VBoxContainer class="tile-inner" [mouse_filter]="2">
        <HBoxContainer class="row">
          <Label class="card-title" [text]="title()" [size_flags_horizontal]="grow"></Label>
          @if (tag()) {
          <Label class="chip" [text]="tag()"></Label>
          }
        </HBoxContainer>
        <Label class="card-desc" [text]="desc()"></Label>
        <ng-content></ng-content>
      </VBoxContainer>
      <Button class="tile-hit" [flat]="true" (pressed)="go.emit()"></Button>
    </PanelContainer>
  `,
})
export class UiTile {
  readonly title = input("");
  readonly desc = input("");
  readonly tag = input("");
  /** Control.SIZE_EXPAND_FILL：标题撑满剩余宽度，把角标推到最右。
   *  只给 SIZE_FILL 不够：全局开了 autowrap 后 Label 的最小宽度只有 1px，
   *  不 EXPAND 就会被压成一列竖排文字。 */
  readonly grow = Control.SizeFlags.SIZE_EXPAND_FILL;
  readonly go = output<void>();
}

/** 数值块。 */
@Component({
  selector: "ui-stat",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <PanelContainer class="tile">
      <VBoxContainer class="tile-inner" [mouse_filter]="2">
        <Label class="tile-label" [text]="label()"></Label>
        <Label class="tile-value" [text]="value()"></Label>
        @if (unit()) {
        <Label class="tile-unit" [text]="unit()"></Label>
        }
      </VBoxContainer>
    </PanelContainer>
  `,
})
export class UiStat {
  readonly label = input("");
  readonly value = input<string | number>("");
  readonly unit = input("");
}

/** 键值行：左边的键拉伸，把值推到右边。 */
@Component({
  selector: "ui-kv",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <HBoxContainer class="row">
      <Label class="kv-key" [text]="k()" [size_flags_horizontal]="expand"></Label>
      <Label class="kv-val" [text]="v()"></Label>
    </HBoxContainer>
  `,
})
export class UiKv {
  readonly k = input("");
  readonly v = input<string | number>("");
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;
}

/** 小节：标题 + 说明 + 内容。 */
@Component({
  selector: "ui-section",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <VBoxContainer class="section">
      <Label class="section-title" [text]="title()"></Label>
      @if (hint()) {
      <Label class="section-hint" [text]="hint()"></Label>
      }
      <ng-content></ng-content>
    </VBoxContainer>
  `,
})
export class UiSection {
  readonly title = input("");
  readonly hint = input("");
}

/** 页面骨架：标题、说明、标签、内容。 */
@Component({
  selector: "ui-page",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <VBoxContainer class="page">
      <VBoxContainer class="page-head">
        <Label class="page-title" [text]="title()"></Label>
        <Label class="page-desc" [text]="desc()"></Label>
        <HBoxContainer class="wrap">
          @for (t of tags(); track t) {
          <Label class="chip brand" [text]="t"></Label>
          }
        </HBoxContainer>
      </VBoxContainer>
      <ng-content></ng-content>
    </VBoxContainer>
  `,
})
export class UiPage {
  readonly title = input.required<string>();
  readonly desc = input("");
  readonly tags = input<string[]>([]);
}

/** 代码块：RichTextLabel 的 [code] 段落走主题的等宽字体。 */
@Component({
  selector: "ui-code",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <RichTextLabel
      class="code"
      [bbcode_enabled]="true"
      [fit_content]="true"
      [autowrap_mode]="2"
      [text]="bb()"></RichTextLabel>
  `,
})
export class UiCode {
  readonly code = input("");
  readonly lang = input("");
  readonly bb = computed(() => `[code]${escapeBbcode(this.code())}[/code]`);
}

/** bbcode 里方括号是控制字符，展示代码时必须转义。
 * 必须逐字符扫：先替 [ 再替 ] 会把刚插进去的 [lb] 又吃一遍，
 * 变成 [lb[rb] 这种谁也不认的东西。 */
export function escapeBbcode(src: string): string {
  let out = "";
  for (const ch of src) {
    if (ch === "[") out += "[lb]";
    else if (ch === "]") out += "[rb]";
    else out += ch;
  }
  return out;
}
