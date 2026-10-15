import { Component, NO_ERRORS_SCHEMA, computed, inject, signal } from "@angular/core";
import { Color, Control } from "godot";
import { Breakpoints, Prefs, Runtime } from "../../core/runtime";
import { UiCard, UiCode, UiKv, UiPage, UiSection } from "../../ui/kit";

interface PropRow {
  css: string;
  godot: string;
  level: string;
  tone: "ok" | "warn" | "danger";
}

const SUPPORT: PropRow[] = [
  { css: "color", godot: "theme 颜色 font_color", level: "等价", tone: "ok" },
  { css: "font-size", godot: "theme 字号 font_size", level: "等价", tone: "ok" },
  { css: "background-color", godot: "StyleBoxFlat.bg_color", level: "等价", tone: "ok" },
  { css: "border-color / border-width", godot: "StyleBoxFlat.border_*", level: "等价", tone: "ok" },
  { css: "border-radius", godot: "StyleBoxFlat.corner_radius_*", level: "等价", tone: "ok" },
  { css: "padding", godot: "StyleBoxFlat.content_margin_*（仅会画 stylebox 的节点）", level: "近似", tone: "warn" },
  { css: "box-shadow", godot: "StyleBoxFlat.shadow_*", level: "等价", tone: "ok" },
  { css: "opacity", godot: "CanvasItem.modulate.a", level: "等价", tone: "ok" },
  { css: "white-space", godot: "Label.autowrap_mode", level: "等价", tone: "ok" },
  { css: "gap", godot: "BoxContainer.separation", level: "近似", tone: "warn" },
  { css: "width / height", godot: "custom_minimum_size（只有下界）", level: "近似", tone: "warn" },
  { css: "justify-content", godot: "BoxContainer.alignment（三档）", level: "近似", tone: "warn" },
  { css: "flex / flex-grow", godot: "size_flags_* + stretch_ratio", level: "近似", tone: "warn" },
  { css: "text-align", godot: "horizontal_alignment", level: "近似", tone: "warn" },
  { css: "text-overflow", godot: "text_overrun_behavior", level: "近似", tone: "warn" },
  { css: ":hover :pressed :focus :checked", godot: "信号驱动，自动改用带后缀的 theme item", level: "近似", tone: "warn" },
  { css: ":disabled", godot: "无对应信号：改用 .off 类 + [class.off]", level: "忽略", tone: "danger" },
  { css: "display / position / z-index", godot: "无落点：由容器与节点顺序决定", level: "忽略", tone: "danger" },
  { css: "transform / transition", godot: "无落点：改用 Tween 或 _process", level: "忽略", tone: "danger" },
  { css: "font-family / font-weight", godot: "无落点：字体是 Font 资源", level: "忽略", tone: "danger" },
];

const SNIPPET = `/* 构建期解析，运行期写进 Theme 与 StyleBoxFlat */
.card {
  background-color: #151b25;   /* StyleBoxFlat.bg_color      */
  border: 1px solid #293546;   /* border_width_* / border_color */
  border-radius: 12px;         /* corner_radius_*            */
  padding: 18px;               /* content_margin_*           */
  gap: 10px;                   /* BoxContainer.separation    */
}
.card:hover { background-color: #1b2331; }   /* 换用 hover stylebox */

/* 单键绑定是内联层，优先级高于样式表 */
<Label [style.color]="'#ff9f45'" [style.fontSize]="20"></Label>`;

@Component({
  selector: "page-styles",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiCard, UiKv, UiCode],
  templateUrl: "./styles.html",
})
export class PageStyles {
  readonly prefs = inject(Prefs);
  readonly rt = inject(Runtime);
  readonly bp = inject(Breakpoints);
  readonly rows = SUPPORT;
  readonly snippet = SNIPPET;
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;

  readonly ink = signal(new Color(0.298, 0.76, 1, 1));
  readonly fontSize = signal(22);
  readonly gap = signal(10);
  readonly align = signal("flex-start");

  readonly inkCss = computed(() => {
    const c = this.ink();
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a.toFixed(2)})`;
  });

  readonly alignText = computed(() => {
    const a = this.align();
    return a === "flex-start" ? "BEGIN" : a === "center" ? "CENTER" : "END";
  });

  setAlign(v: string): void {
    this.align.set(v);
  }
}
