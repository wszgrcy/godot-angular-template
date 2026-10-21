import { Component, NO_ERRORS_SCHEMA, inject } from "@angular/core";
import { Breakpoints } from "../../core/runtime";
import { SCENES, SceneSwitch } from "../../core/switcher";
import { UiCode, UiPage, UiSection, UiTile } from "../../ui/kit";

const MAPPING = `src/main.ts            → dist/main.js       主场景根脚本（本页就是它渲染的）
src/hybrid/hybrid.ts   → dist/hybrid.js     混合场景根脚本，第二个 Angular 应用
src/plain/plain-js.ts  → dist/plain-js.js   纯 JS 场景，没 import godot-angular
scripts/gd_demo.gd     → 不经构建            GDScript 场景，构建产物里根本没有它`;

const SNIPPET = `// angular.json：一个工作区产出三个入口，共享同一份运行时与全局样式
"entries": ["src/main.ts", "src/hybrid/hybrid.ts", "src/plain/plain-js.ts"]
// → dist/main.js  dist/hybrid.js  dist/plain-js.js（+ dist/chunks/ 共享分块）

// 切换：先拆掉本应用，再让引擎换场景
private readonly app = inject(GodotAngularApp);   // 就是 bootstrapGodotApp() 返回的那个

goto(path: string): void {
  const timer = Engine.get_main_loop().create_timer(0);   // 下一帧，脱离本次点击的调用栈
  timer.timeout.connect(Callable.create(() => {
    this.app.destroy();                    // ① 停帧钟 + 释放模板建的节点
    Engine.get_main_loop().change_scene_to_file(path);   // ② 新场景入树，旧场景帧末释放
  }));
}`;

const HYBRID_SNIPPET = `# scenes/hybrid.tscn —— 节点全部静态定义，脚本是第二个 Angular 入口
[node name="Hybrid" type="Node"]
├─ Layout (VBoxContainer)
│   ├─ TopBar   ← JS 在 _ready() 里连 pressed / 每帧写 text，Angular 看不见这两条栏
│   ├─ NgHost   ← bootstrapGodotApp(HybridApp, NgHost)：模板节点追加在它里面
│   └─ BottomBar← Angular 反过来写它的 Label

// src/hybrid/hybrid.ts
_ready(): void {
  const host = this.get_node("Layout/NgHost");        // 静态节点当挂载点
  this.get_node("Layout/TopBar/Row/JsBtn").pressed
      .connect(Callable.create(() => BRIDGE.jsClicks.update(v => v + 1)));
  BRIDGE.bindStatic({ echo: (t) => { this.echo.text = t; }, leave: (p) => this.leaveTo(p) });
  bootstrapGodotApp(HybridApp, host).then((app) => (this.app = app));
}
_process(delta): void { this.app?.tick(delta * 1000); }   // 只有中间那块归 Angular`;

@Component({
  selector: "page-scenes",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [UiPage, UiSection, UiTile, UiCode],
  templateUrl: "./scenes.html",
})
export class PageScenes {
  readonly scenes = SCENES;
  readonly mapping = MAPPING;
  readonly snippet = SNIPPET;
  readonly hybrid = HYBRID_SNIPPET;
  readonly bp = inject(Breakpoints);
  readonly cols = this.bp.cols;

  private readonly switcher = inject(SceneSwitch);

  go(path: string): void {
    this.switcher.goto(path);
  }
}
