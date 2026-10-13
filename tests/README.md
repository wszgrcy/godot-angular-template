# tests/ —— 测试相关

Godot 的 `res://` 根目录就是本仓库根（`project.godot` 所在目录），所以场景放在哪里都行，
只要 `res://` 路径写对。本目录集中存放所有“不在运行时主流程里”的东西。

```
tests/
├── engine_vitest.tscn      # ng test 的引擎入口场景，挂 res://dist-engine-test/vitest-entry.js
└── engine/                 # 引擎内执行的 vitest 用例（angular.json → test.specInclude）
    └── hello.spec.ts
```

`main.tscn` 留在根目录：它是 `project.godot` 里 `run/main_scene` 指向的应用主场景，不属于测试。

## 对应的配置

| 内容 | 配置位置 |
| --- | --- |
| `engine/*.spec.ts` | `angular.json` → `architect.test.options.specInclude` |
| `engine_vitest.tscn` | `angular.json` → `architect.test.options.engine.scene`（`res://tests/engine_vitest.tscn`） |
| 全部 `.ts` | `tsconfig.json` → `include` 里额外加了 `tests/**/*.ts`（`npm run typecheck` 才会覆盖到） |

场景内部引用脚本用的是 `res://` **绝对**路径，与场景自身所在位置无关，所以移动 `.tscn`
不需要改场景内容，只需要改引用它的地方（目前只有 `angular.json` 一处）。

## 一个注意点

builder 判断“是否需要补跑一次 `godot --headless --import`”时，只对**项目根目录**下的
`.js` / `.tscn` 取哈希（见 `node_modules/godot-angular/builder/shared/godot-bin.mjs` 的
`entryHash`）。场景移进本目录后不再被这个哈希覆盖。正常情况无影响（`.tscn` 运行时直接读盘，
bundle 走 `require` 也直接读盘），但如果你改了场景里 `ext_resource` 的脚本路径而引擎似乎仍
在用旧副本，删掉 `.godot/cuj-entry-hash` 再跑一次 `npm test` 即可强制重新 import。
