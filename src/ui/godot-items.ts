import { Directive, ElementRef, effect, inject, input } from "@angular/core";
import { ItemList, OptionButton } from "godot";

/**
 * 把 Angular 的数组喂给 OptionButton。
 *
 * Godot 的下拉候选项不是子节点，而是 `add_item()` 塞进内部 PopupMenu 的数据，
 * 模板里没法用 @for 声明。这里声明一个同名输入 `[items]`，Angular 就会把绑定
 * 交给指令而不是渲染器，effect 在每次数据变化后重建候选项。
 */
@Directive({ selector: "OptionButton[items]", standalone: true })
export class OptionItems {
  readonly items = input<string[]>([]);
  readonly selected = input(-1);
  private readonly el = inject<ElementRef<OptionButton>>(ElementRef);

  constructor() {
    effect(() => {
      const node = this.el.nativeElement;
      const list = this.items();
      const sel = this.selected();
      node.clear();
      for (const text of list) node.add_item(text);
      if (sel >= 0 && sel < list.length) node.select(sel);
    });
  }
}

/** 同上，作用于 ItemList。选中集是下标数组。 */
@Directive({ selector: "ItemList[items]", standalone: true })
export class ListItems {
  readonly items = input<string[]>([]);
  readonly selected = input<number[]>([]);
  private readonly el = inject<ElementRef<ItemList>>(ElementRef);

  constructor() {
    effect(() => {
      const node = this.el.nativeElement;
      const list = this.items();
      const sel = this.selected();
      node.clear();
      for (const text of list) node.add_item(text);
      node.deselect_all();
      for (const i of sel) if (i >= 0 && i < list.length) node.select(i);
    });
  }
}
