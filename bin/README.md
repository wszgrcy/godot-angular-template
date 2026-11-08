# bin/ —— GodotJS 引擎二进制放置目录

目录名只区分平台与运行时，**不带引擎版本号**（要与 godot-angular 内置的平台表一致），
升级引擎时直接覆盖同一个文件，代码与配置都不用动。

当前对齐 GodotJS 1.3.5（Godot 4.7.2 + V8 12.6），从 <https://github.com/wszgrcy/GodotJS/releases>
下载 `linux-editor-4.7.2-v8.zip` / `windows-editor-4.7.2-v8.zip`（zip 里只有一个裸可执行文件）。

```
bin/
├── linux-v8/godot.linuxbsd.editor.x86_64
└── windows-v8/godot.windows.editor.x86_64.exe
```

`--version` 只记 Godot 内核（各版次都报 `4.7.2.stable.gh.ed1daf0bf`），分不出 GodotJS 版次；
`strings` 里的版本串来自手维护的 `jsb_version.h`，也不能用来判版次。确认手上那份是不是 1.3.5，比 md5：

| 文件 | md5 |
| --- | --- |
| `linux-v8/godot.linuxbsd.editor.x86_64` | `9c93e230f851dbcf42a3d88c6d2ec8ae` |
| `windows-v8/godot.windows.editor.x86_64.exe` | `64d9f644c1cc9d1c316723103fbb516c` |

```bash
md5sum bin/linux-v8/godot.linuxbsd.editor.x86_64
```
