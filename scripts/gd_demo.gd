extends PanelContainer
## 纯 GDScript 场景。
##
## 这里没有 Angular、也没有 JS：节点在 scenes/gd_demo.tscn 里静态摆好，行为写在本文件里，
## 外观来自 themes/gd_theme.tres（Theme 资源）。构建产物里根本没有它 —— Angular 侧
## 完全不知道这个场景存在，两边唯一的交集是 change_scene_to_file() 传的那个路径字符串。

## 计数
var _clicks: int = 0
## 帧号
var _frames: int = 0

@onready var _plus: Button = $Col/Card/CardCol/CountRow/PlusBtn
@onready var _minus: Button = $Col/Card/CardCol/CountRow/MinusBtn
@onready var _reset: Button = $Col/Card/CardCol/CountRow/ResetBtn
@onready var _count: Label = $Col/Card/CardCol/CountRow/Count
@onready var _tick: Label = $Col/Card/CardCol/CountRow/Tick
@onready var _stat: Label = $Col/Card/CardCol/Stat
@onready var _bar: ProgressBar = $Col/Card/CardCol/Bar
@onready var _ball: Panel = $Col/Stage/Inner/Ball


func _ready() -> void:
	# 静态节点在 .tscn 里摆好，脚本只负责连信号 —— 和 hybrid 场景里 JS 那半边是同一套做法
	_plus.pressed.connect(_on_add.bind(1))
	_minus.pressed.connect(_on_add.bind(-1))
	_reset.pressed.connect(_on_add.bind(0))
	$Col/Nav/ToMain.pressed.connect(_goto.bind("res://main.tscn"))
	$Col/Nav/ToHybrid.pressed.connect(_goto.bind("res://scenes/hybrid.tscn"))
	$Col/Nav/ToPlain.pressed.connect(_goto.bind("res://scenes/plain_js.tscn"))

	# 动画交给引擎：_process() 里一行都不用写
	var tw := _bar.create_tween()
	tw.set_loops()
	tw.tween_property(_bar, "value", 100.0, 1.6)
	tw.tween_property(_bar, "value", 0.0, 0.9)

	print("[gd] GDScript 场景就绪：节点来自 .tscn，外观来自 .tres，行为来自 .gd")


func _process(delta: float) -> void:
	_frames += 1
	_tick.text = "帧 %d · %.2f ms" % [_frames, delta * 1000.0]
	_stat.text = "FPS %d · 节点 %d · 本场景没有 Angular 参与" % [
		Performance.get_monitor(Performance.TIME_FPS),
		Performance.get_monitor(Performance.OBJECT_NODE_COUNT),
	]

	# 逐帧动画：舞台尺寸要等布局完成才拿得到
	var inner := $Col/Stage/Inner as Control
	_ball.position = Vector2(
		inner.size.x / 2.0 - 20 + cos(_frames * 0.03) * (inner.size.x / 2.0 - 30),
		inner.size.y / 2.0 - 20 + sin(_frames * 0.045) * (inner.size.y / 2.0 - 26),
	)


func _on_add(n: int) -> void:
	if n == 0:
		_clicks = 0
	else:
		_clicks += n
	_count.text = str(_clicks)


func _goto(path: String) -> void:
	# 本场景没有 Angular 应用要销毁，直接切
	var err := get_tree().change_scene_to_file(path)
	print("[gd] change_scene_to_file(%s) → %s" % [path, "ok" if err == OK else str(err)])
