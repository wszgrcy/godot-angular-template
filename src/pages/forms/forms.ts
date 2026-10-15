import { Component, NO_ERRORS_SCHEMA, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  GodotColorPickerValueAccessor,
  GodotItemListValueAccessor,
  GodotLineEditValueAccessor,
  GodotOptionButtonValueAccessor,
  GodotSliderValueAccessor,
  GodotSpinBoxValueAccessor,
  GodotTextEditValueAccessor,
  GodotToggleValueAccessor,
} from "godot-angular/forms";
import { Color, Control, Vector2 } from "godot";
import { ListItems, OptionItems } from "../../ui/godot-items";
import { UiCard, UiCode, UiKv, UiPage, UiSection } from "../../ui/kit";
import { AppStepper } from "../../ui/stepper";

interface Form {
  name: string;
  email: string;
  bio: string;
  volume: number;
  level: number;
  agree: boolean;
  role: number;
  tags: number[];
  color: Color;
  steps: number;
}

const ROLES = ["玩家", "开发者", "美术", "观察者"];
const TAGS = ["Godot", "Angular", "TypeScript", "V8", "Zoneless"];

const SNIPPET = `<LineEdit [ngModel]="f().name" (ngModelChange)="patch('name', $event)"
          [ngModelOptions]="{ standalone: true }"></LineEdit>

<!-- OptionButton 的值是下标，候选项由指令 add_item() 填进去 -->
<OptionButton [items]="roles" [ngModel]="f().role" (ngModelChange)="patch('role', $event)"
              [ngModelOptions]="{ standalone: true }"></OptionButton>`;

@Component({
  selector: "page-forms",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [
    FormsModule,
    GodotLineEditValueAccessor,
    GodotTextEditValueAccessor,
    GodotSliderValueAccessor,
    GodotSpinBoxValueAccessor,
    GodotToggleValueAccessor,
    GodotOptionButtonValueAccessor,
    GodotItemListValueAccessor,
    GodotColorPickerValueAccessor,
    OptionItems,
    ListItems,
    AppStepper,
    UiPage,
    UiCard,
    UiKv,
    UiCode,
    UiSection,
  ],
  templateUrl: "./forms.html",
})
export class PageForms {
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;
  /** 结构体属性直接递引擎对象，渲染器不做形状猜测 */
  readonly bigSize = new Vector2(0, 72);
  readonly listSize = new Vector2(0, 112);
  readonly roles = ROLES;
  readonly tags = TAGS;
  readonly snippet = SNIPPET;

  readonly form = signal<Form>({
    name: "godot-angular",
    email: "",
    bio: "在 Godot 里写 Angular。",
    volume: 42,
    level: 3,
    agree: true,
    role: 1,
    tags: [0, 2],
    color: new Color(0.298, 0.76, 1, 1),
    steps: 5,
  });

  readonly submitted = signal("");

  readonly nameErr = computed(() => (this.form().name.trim().length < 3 ? "名称至少 3 个字符" : ""));
  readonly emailErr = computed(() => {
    const v = this.form().email.trim();
    if (!v) return "邮箱不能为空";
    return v.includes("@") ? "" : "缺少 @";
  });
  readonly agreeErr = computed(() => (this.form().agree ? "" : "必须先勾选同意"));
  readonly valid = computed(() => !this.nameErr() && !this.emailErr() && !this.agreeErr());

  readonly colorCss = computed(() => {
    const c = this.form().color;
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${c.a.toFixed(2)})`;
  });

  readonly json = computed(() => {
    const f = this.form();
    return JSON.stringify(
      {
        name: f.name,
        email: f.email,
        bio: f.bio,
        volume: f.volume,
        level: f.level,
        agree: f.agree,
        role: ROLES[f.role] ?? "—",
        tags: f.tags.map((i) => TAGS[i]).join(" / "),
        color: this.colorCss(),
        steps: f.steps,
      },
      null,
      2,
    );
  });

  patch<K extends keyof Form>(key: K, value: Form[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  submit(): void {
    if (!this.valid()) return;
    this.submitted.set(`已提交：${this.form().name}（角色 ${ROLES[this.form().role]}）`);
  }

  reset(): void {
    this.form.update((f) => ({ ...f, name: "", email: "", bio: "", volume: 50, level: 1, agree: false, tags: [], steps: 0 }));
    this.submitted.set("已重置");
  }
}
