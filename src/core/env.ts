import { AudioServer, DisplayServer, Engine, OS, RenderingServer } from "godot";

/** 取一个引擎单例的静态信息；无头模式 / 平台不支持时退回占位符，绝不让界面崩掉。 */
function safe(fn: () => string): string {
  try {
    const v = fn();
    return v === null || v === undefined || v === "" ? "—" : String(v);
  } catch {
    return "—";
  }
}

/** 一行「浏览器里叫什么 → 在 Godot 里叫什么」的对照。 */
export interface EnvRow {
  /** 浏览器里的等价物，没有就写 “无对应物” */
  web: string;
  /** Godot 侧的取值表达式，直接显示给读者看 */
  api: string;
  /** 运行期真实取到的值 */
  value: string;
}

function row(web: string, api: string, fn: () => string): EnvRow {
  return { web, api, value: safe(fn) };
}

/** 引擎版本：Engine.get_version_info() 是个 Dictionary，"string" 键是人类可读的那份。 */
function engineVersion(): string {
  const info = Engine.get_version_info();
  return String(info.get("string") ?? info.get("major") ?? "");
}

function sizeText(get: () => { x: number; y: number }): string {
  const s = get();
  return `${Math.round(s.x)} × ${Math.round(s.y)}`;
}

/**
 * 运行环境对照表。
 *
 * 引擎里没有 window / navigator / screen，但 Web 开发者关心的那些问题
 * （我在什么系统上、几核 CPU、什么显卡）在这里都有等价答案，
 * 只是入口换成了 OS / DisplayServer / RenderingServer / AudioServer 这些单例。
 */
export function platformRows(): EnvRow[] {
  return [
    row("navigator.platform", "OS.get_name()", () => OS.get_name()),
    row("navigator.appVersion", "OS.get_version()", () => OS.get_version()),
    row("navigator.userAgent", 'Engine.get_version_info()["string"]', engineVersion),
    row("navigator.architecture", "Engine.get_architecture_name()", () => Engine.get_architecture_name()),
    row("navigator.hardwareConcurrency", "OS.get_processor_count()", () => String(OS.get_processor_count())),
    row("navigator.cpu", "OS.get_processor_name()", () => OS.get_processor_name()),
    row("navigator.language", "OS.get_locale()", () => OS.get_locale()),
  ];
}

/** 显示 / 图形：screen.* 与 WebGL 扩展信息的等价物。 */
export function displayRows(): EnvRow[] {
  return [
    row("window 后端", "DisplayServer.get_name()", () => DisplayServer.get_name()),
    row("screen.width × screen.height", "DisplayServer.screen_get_size()", () => sizeText(() => DisplayServer.screen_get_size())),
    row("devicePixelRatio", "DisplayServer.screen_get_dpi()", () => String(DisplayServer.screen_get_dpi())),
    row("屏幕刷新率", "DisplayServer.screen_get_refresh_rate()", () => DisplayServer.screen_get_refresh_rate().toFixed(1)),
    row("UNMASKED_RENDERER_WEBGL", "RenderingServer.get_video_adapter_name()", () => RenderingServer.get_video_adapter_name()),
    row("音频输出设备", "AudioServer.get_driver_name()", () => AudioServer.get_driver_name()),
    row("navigator.maxTouchPoints", "DisplayServer.is_touchscreen_available()", () => (DisplayServer.is_touchscreen_available() ? "yes" : "no")),
  ];
}

export { sizeText };
