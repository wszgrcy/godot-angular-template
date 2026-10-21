# godot-angular-template

[godot-angular](https://github.com/wszgrcy/godot-angular) 的模板工程。Angular 组件模板编译为
Godot 的 `Control` 节点树，不引入 WebView，不需要 GDScript 界面代码，也不依赖任何浏览器全局对象。

本文件说明模板的构建、运行方式与内容构成。模板语法、CSS 属性支持范围、组件与路由的行为定义、
样式级联规则以及引擎绑定限制，均由库文档说明：<https://github.com/wszgrcy/godot-angular>。

## 环境要求

| 项 | 要求 |
| --- | --- |
| 引擎 | GodotJS 构建的 Godot 4.6.1，需编辑器构建 |
| Node.js | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` |
| Angular | `^22.0.0` |

## 构建与运行

```bash
npm install
npm run build         # 构建三个入口到 dist/
npm run typecheck     # ng build 不执行类型检查，需单独执行
npm test              # 用例在引擎内运行，模板自带一份冒烟用例
```

引擎从 <https://github.com/godotjs/GodotJS/releases> 下载
[windows-editor-4.6.1-v8.zip](https://github.com/godotjs/GodotJS/releases/download/v1.1.0.beta1-4.6.1/windows-editor-4.6.1-v8.zip)，
解压到 `bin/`，随后用编辑器打开 `project.godot` 运行。命令行示例中的 `<godot>` 指
`bin/windows-editor-4.6.1-v8/godot.windows.editor.x86_64.exe`。

修改 `src/` 后需重新执行 `npm run build`：引擎加载的是 `dist/` 中的构建产物。

## 示例页面

`src/pages/` 下每个页面对应一个路由。起始页面由环境变量 `APP_URL` 指定，未设置时从 `/` 开始：

```bash
# git bash 需附加 MSYS_NO_PATHCONV=1，避免 shell 对 /forms 执行路径转换
MSYS_NO_PATHCONV=1 APP_URL=/forms <godot> --headless --path .
```

| 路由 | 演示内容 |
| --- | --- |
| `/` | 运行时指标（FPS / 帧耗时 / 内存 / 节点数）、渲染管线示意 |
| `/template` | 插值、属性绑定、`@if` / `@for` / `@switch`、`ng-content`、`viewChild()`、`$event` 语义 |
| `/state` | signal / computed / effect / linkedSignal、防抖、待办清单、帧驱动柱状图 |
| `/forms` | `ngModel` 与 `ControlValueAccessor`、自定义复合控件、校验与表单快照 |
| `/styles` | 主题切换、内联 style 绑定、伪类、CSS 变量、`@media`、属性落点对照表 |
| `/interop` | 直接操作节点、`create_tween()`、`gui_input` 拖拽、剪贴板、可用的 JS 标准库清单 |
| `/routing` | 参数路由、query、`route.title` → 窗口标题、历史导航、与浏览器版的差别 |
| `/scenes` | 多入口与场景切换：切换至混合控制 / 纯 JS / GDScript 场景 |
| 其他任意路径 | 404 页（`**` 通配路由） |

## 场景构成

一个工作区产出三个入口（`angular.json` 的 `entries`），四个场景在同一进程内轮流作为主场景，
用于对比界面节点的创建方式：

| 场景 | 根节点脚本 | 节点创建方 |
| --- | --- | --- |
| `main.tscn` | `dist/main.js` | Angular 模板，整棵树由模板生成 |
| `scenes/hybrid.tscn` | `dist/hybrid.js` | 顶栏与底栏为静态 `.tscn` 节点并在 `_ready()` 中绑定，中间 `NgHost` 交由模板渲染 |
| `scenes/plain_js.tscn` | `dist/plain-js.js` | 纯 JS 代码，不引用 `godot-angular` |
| `scenes/gd_demo.tscn` | `scripts/gd_demo.gd` | 静态 `.tscn` 与 GDScript，不使用 Angular 的对照实现 |

混合场景中静态节点与模板节点的分工见 `src/hybrid/`，场景切换流程见 `src/core/switcher.ts`。

## 目录结构

```text
src/
├─ app.ts / app.html      根组件：侧栏、路由出口、状态栏；主题偏好读写在此
├─ main.ts                主入口：bootstrapGodotApp(App) 与路由表
├─ global.scss            全局样式（angular.json 的 styles 选项）
├─ core/                  运行时指标、界面缩放、导航数据、场景切换
├─ pages/                 示例页面，一页一路由
├─ ui/                    复用组件（卡片、表单控件）及其样式
├─ hybrid/                混合场景：静态节点与模板节点共存
└─ plain/plain-js.ts      纯 JS 场景，不使用本库的对照实现
scenes/                   四个场景的 .tscn
themes/                   GDScript 场景使用的 .tres
tests/engine/             引擎内用例
angular.json              构建入口、全局样式与测试构建器配置
project.godot             引擎工程配置，含界面缩放的基准尺寸（1600x1000，canvas_items）
```

各页面组件与 `src/core/` 中的注释说明了对应演示点及其实现原因。
