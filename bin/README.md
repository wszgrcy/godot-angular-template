# bin/ —— GodotJS 引擎二进制放置目录

目录名只区分平台与运行时，**不带引擎版本号**（要与 godot-angular 内置的平台表一致），
升级引擎时直接覆盖同一个文件，代码与配置都不用动。

当前对齐 GodotJS 1.3.2（Godot 4.7.2 + V8 12.6），从 <https://github.com/wszgrcy/GodotJS/releases>
下载 `linux-editor-4.7.2-v8.zip` / `windows-editor-4.7.2-v8.zip`（zip 里只有一个裸可执行文件）。

```
bin/
├── linux-v8/godot.linuxbsd.editor.x86_64
└── windows-v8/godot.windows.editor.x86_64.exe
```

同一个 Godot 版本的不同 GodotJS 版次，`--version` 输出完全一样（1.3.1 与 1.3.2 都报
`4.7.2.stable.gh.ed1daf0bf`），拿它分不出新旧。要看 GodotJS 自己的版次：

```bash
strings bin/linux-v8/godot.linuxbsd.editor.x86_64 | grep -cx "1.3.2"   # 出 1 = 就是 1.3.2
```
