/** 侧边导航与首页能力矩阵共用的数据源。 */
export interface NavItem {
  /** 路由路径 */
  path: string;
  /** 导航文字 */
  label: string;
  /** 一句话说明 */
  desc: string;
  /** 角标 */
  tag: string;
}

export const NAV: NavItem[] = [
  { path: "/", label: "概览", desc: "运行时状态与能力地图", tag: "home" },
  { path: "/template", label: "模板语法", desc: "插值 · 控制流 · 投影", tag: "ng" },
  { path: "/state", label: "状态与响应式", desc: "signal · computed · zoneless", tag: "rx" },
  { path: "/forms", label: "表单", desc: "ngModel · 自定义 CVA", tag: "form" },
  { path: "/styles", label: "样式与主题", desc: "CSS → Theme / StyleBox", tag: "css" },
  { path: "/interop", label: "引擎互操作", desc: "viewChild · rAF · Web API", tag: "js" },
  { path: "/routing", label: "路由", desc: "provideGodotRouter", tag: "router" },
];
