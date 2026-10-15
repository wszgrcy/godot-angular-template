import { Component, NO_ERRORS_SCHEMA, computed, effect, inject, linkedSignal, signal } from "@angular/core";
import { Control } from "godot";
import { Runtime } from "../../core/runtime";
import { UiCard, UiCode, UiKv, UiPage, UiSection, UiStat } from "../../ui/kit";

type Filter = "all" | "open" | "done";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const SNIPPET = `count = signal(0);
double = computed(() => this.count() * 2);   // 派生值，读的时候才算
effect(() => this.log.update((l) => [...l, 'count → ' + this.count()]));

// 普通字段不行：模板读取不到变化
plain = 0;`;

@Component({
  selector: "page-state",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiCard, UiKv, UiStat, UiCode],
  templateUrl: "./state.html",
})
export class PageState {
  readonly rt = inject(Runtime);
  readonly snippet = SNIPPET;
  readonly shrinkEnd = Control.SizeFlags.SIZE_SHRINK_END;
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;

  /* ---------- signal / computed / effect ---------- */
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);
  readonly square = computed(() => this.count() * this.count());
  readonly log = signal<string[]>([]);
  /** 反面教材：普通字段。点它界面不会动，因为没有任何 signal 被写入 */
  plain = 0;

  /* ---------- linkedSignal ---------- */
  readonly base = signal(60);
  readonly volume = linkedSignal(() => this.base());

  /* ---------- 待办 ---------- */
  private seq = 4;
  readonly draft = signal("");
  readonly filter = signal<Filter>("all");
  readonly todos = signal<Todo[]>([
    { id: 1, text: "把状态全部改成 signal", done: true },
    { id: 2, text: "用 computed 派生统计值", done: false },
    { id: 3, text: "删掉 markForCheck", done: false },
  ]);

  readonly visible = computed(() => {
    const f = this.filter();
    const all = this.todos();
    if (f === "open") return all.filter((t) => !t.done);
    if (f === "done") return all.filter((t) => t.done);
    return all;
  });
  readonly remaining = computed(() => this.todos().filter((t) => !t.done).length);
  readonly doneCount = computed(() => this.todos().length - this.remaining());

  /* ---------- 防抖 ---------- */
  readonly query = signal("");
  readonly debounced = signal("");
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // effect 由变更检测调度，写在构造函数里即可
    effect(() => {
      const v = this.count();
      this.log.update((l) => [`count → ${v}（double = ${v * 2}）`, ...l].slice(0, 6));
    });
  }

  bump(delta: number): void {
    this.count.update((n) => n + delta);
  }

  bumpPlain(): void {
    this.plain++;
  }

  addTodo(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.seq++;
    this.todos.update((list) => [...list, { id: this.seq, text, done: false }]);
    this.draft.set("");
  }

  toggleTodo(id: number, on: boolean): void {
    this.todos.update((list) => list.map((t) => (t.id === id ? { ...t, done: on } : t)));
  }

  removeTodo(id: number): void {
    this.todos.update((list) => list.filter((t) => t.id !== id));
  }

  search(v: string): void {
    this.query.set(v);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.debounced.set(v), 350);
  }

  /** 柱状图高度：把 FPS 映射到 4–92 px */
  barHeight(fps: number): number {
    const ratio = Math.max(0, Math.min(1, fps / 120));
    return Math.round(4 + ratio * 88);
  }
}
