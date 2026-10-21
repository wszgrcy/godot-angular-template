import {
  AfterViewInit,
  Component,
  ElementRef,
  NO_ERRORS_SCHEMA,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { Control } from "godot";
import { GODOT_ROOT } from "godot-angular/core";
import { BRIDGE } from "./bridge";

/**
 * 第二个 Angular 应用的根组件。
 *
 * 它的宿主不是新建的根节点，而是 scenes/hybrid.tscn 里静态定义的 `Layout/NgHost`：
 * `bootstrapGodotApp()` 的挂载点就是根组件的宿主元素，模板节点全部追加进那个静态容器。
 * 所以本组件的模板只负责中间那一块，上下两条栏它既看不见也管不着。
 *
 * 样式自带（styles 而非依赖全局样式表）：全局 CSS 由构建器塞进 polyfill，取走即置空，
 * 同一进程里第二个应用不能假设自己还能拿到它。
 */
@Component({
  selector: "hybrid-root",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: "./hybrid-app.html",
  styles: [
    `
      .hx-panel {
        background-color: #101923;
        border-color: #2f6ea8;
        border-width: 1px;
        border-radius: 10px;
        padding: 14px;
      }
      .hx-col {
        gap: 10px;
      }
      .hx-row {
        gap: 8px;
      }
      .hx-title {
        color: #7fd1ff;
        font-size: 17px;
      }
      .hx-desc {
        color: #9fb0c4;
        font-size: 13px;
      }
      .hx-mut {
        color: #7d8ea3;
        font-size: 12px;
      }
      .hx-num {
        color: #ffffff;
        font-size: 22px;
      }
      .hx-chip {
        color: #7fd1ff;
        background-color: #14304a;
        border-color: #2f6ea8;
        border-width: 1px;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
      }
      .hx-ok {
        color: #46d39a;
        font-size: 12px;
      }
      .hx-warn {
        color: #e8c26a;
        font-size: 12px;
      }
      .hx-input {
        min-width: 260px;
      }
      .hx-btn {
        background-color: #1d4f7d;
        color: #ffffff;
        border-radius: 6px;
      }
      .hx-ghost {
        background-color: #16202c;
        color: #9fb0c4;
        border-color: #2b3a4c;
        border-width: 1px;
        border-radius: 6px;
      }
    `,
  ],
})
export class HybridApp implements AfterViewInit {
  /** 桥：静态侧与模板侧共享的 signal */
  readonly bridge = BRIDGE;
  /** 模板里直接读，省一层方法调用 */
  readonly ngClicks = BRIDGE.ngClicks;
  /** Control.SIZE_EXPAND_FILL */
  readonly grow = Control.SizeFlags.SIZE_EXPAND_FILL;
  /** Control.SIZE_SHRINK_BEGIN：Panel 不是容器，不给 SHRINK 会被拉满 */
  readonly shrink = Control.SizeFlags.SIZE_SHRINK_BEGIN;

  readonly draft = signal("hello from Angular");
  readonly lastWrite = signal("还没写");
  /** 挂载点信息：证明根组件的宿主是场景里静态定义的节点 */
  readonly hostInfo = signal("计算中…");
  /** 模板自己建的节点，用来对比「谁建的节点」 */
  private readonly probe = viewChild.required<ElementRef<Control>>("probe");
  readonly probeInfo = signal("");

  private readonly host = inject(GODOT_ROOT) as any;

  readonly tags = ["第二个入口", "dist/hybrid.js", "静态挂载点", "zoneless"];

  readonly hostName = computed(() => String(this.host?.name ?? "?"));

  ngAfterViewInit(): void {
    const parent = this.host?.get_parent?.();
    const idx = this.host?.get_index?.() ?? -1;
    const total = parent ? parent.get_child_count() : 0;
    // 读名字得用 get_name()：这套 JS 绑定里 node.name 只有写入通道，读出来是 undefined
    this.hostInfo.set(
      `${this.host.get_class()} #${this.host.get_name()} · 是「${parent?.get_name()}」的第 ${idx + 1}/${total} 个子节点`,
    );
    const probe = this.probe().nativeElement as any;
    this.probeInfo.set(
      `模板建的 ${probe.get_class()} #${probe.get_name()} 也挂在 ${probe.get_parent()?.get_name()} 下`,
    );
  }

  bump(): void {
    BRIDGE.bumpNg();
  }

  reset(): void {
    BRIDGE.reset();
  }

  /** Angular 直接写静态节点：走桥上的 echo 通道，不经过任何模板绑定 */
  write(text: string): void {
    const ok = BRIDGE.writeEcho(`Angular 在 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })} 写入了：${text}`);
    this.lastWrite.set(ok ? "已写入底部静态栏" : "静态侧没绑定，写入被忽略");
  }

  push(): void {
    this.write(this.draft());
  }

  /** 切场景要销毁的就是本应用，只能委托场景根脚本执行 */
  leave(path: string): void {
    if (!BRIDGE.leaveTo(path)) this.lastWrite.set("静态侧没接管切换");
  }
}
