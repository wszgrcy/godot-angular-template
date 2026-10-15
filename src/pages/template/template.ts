import { Component, ElementRef, NO_ERRORS_SCHEMA, computed, inject, signal, viewChild } from "@angular/core";
import { Control, Label } from "godot";
import { UiCard, UiCode, UiKv, UiPage, UiSection } from "../../ui/kit";

interface Row {
  id: number;
  text: string;
  done: boolean;
}

const SNIPPET = `@if (show()) { <Label text="真"></Label> } @else { <Label text="假"></Label> }

@for (r of rows(); track r.id) {
  <CheckBox [text]="r.text" [button_pressed]="r.done" (change)="toggle(r.id, $event)"></CheckBox>
} @empty {
  <Label text="空列表"></Label>
}

<Label [class.warn]="busy()" [style.fontSize]="28" [text]="'你好，' + name()"></Label>`;

@Component({
  selector: "page-template",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiCard, UiKv, UiCode],
  templateUrl: "./template.html",
})
export class PageTemplate {
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;
  readonly snippet = SNIPPET;

  readonly names = ["Godot", "Angular", "V8", "Control"];
  readonly nameIdx = signal(0);
  readonly name = computed(() => this.names[this.nameIdx()]);
  readonly size = signal(28);
  readonly tones = ["#4cc2ff", "#3fb950", "#d29922", "#bc8cff"];
  readonly tone = signal(0);

  readonly show = signal(true);
  readonly mode = signal<"a" | "b" | "c">("a");
  readonly busy = signal(false);

  private seq = 3;
  readonly rows = signal<Row[]>([
    { id: 1, text: "模板编译成节点树", done: true },
    { id: 2, text: "属性绑定写入节点", done: false },
    { id: 3, text: "信号连到 Godot signal", done: false },
  ]);

  readonly inputText = signal("");
  readonly lastEvent = signal("还没有事件");
  /** 模板引用变量：#tag 指向那个 Label 节点 */
  private readonly tag = viewChild.required<ElementRef<Label>>("tag");
  readonly readResult = signal("点下面的按钮读取真实节点");

  readonly toneColor = computed(() => this.tones[this.tone()]);

  rename(): void {
    this.nameIdx.update((i) => (i + 1) % this.names.length);
  }

  toggleRow(id: number, on: boolean): void {
    this.rows.update((list) => list.map((r) => (r.id === id ? { ...r, done: on } : r)));
  }

  add(): void {
    this.seq++;
    this.rows.update((list) => [...list, { id: this.seq, text: `第 ${this.seq} 项`, done: false }]);
  }

  remove(): void {
    this.rows.update((list) => list.slice(1));
  }

  clear(): void {
    this.rows.set([]);
  }

  onInput(text: string): void {
    this.inputText.set(text);
    this.lastEvent.set(`LineEdit.text_changed(new_text) → $event = "${text}"`);
  }

  onClick(): void {
    this.lastEvent.set("BaseButton.pressed() 零参数 → $event = undefined");
  }

  onSlider(v: number): void {
    this.lastEvent.set(`HSlider.value_changed(value) → $event = ${v}`);
  }

  readTag(): void {
    const node = this.tag().nativeElement;
    this.readResult.set(`nativeElement.get_class() = ${node.get_class()}，text = "${node.text}"`);
  }
}
