# 价目表重构（独立原型）

从大原型 `card/demo.html` 剥离的 **项目创建与管理 / 价目表** 模块，可本地独立运行。

## 线上地址（GitHub Pages）

<https://xdean-designer.github.io/menu/> — 仓库 <https://github.com/XDean-Designer/menu>

> 仓库根目录 = 本目录内容（`index.html` 即原型首页），Pages 走 `main` 分支根目录。
> `_tmp_*` 临时校验脚本、`_shots/` 截图、Run to Figma 落下的位图占位都不入库。

## 启动

```powershell
cd D:\RTB打补丁工程\价目表
python -m http.server 8770
```

浏览器打开：<http://localhost:8770/index.html>

## 手机预览

真机打开线上地址即自动切全屏手机模式；电脑上要复现，在 URL 后加参数。

| 场景 | 做法 |
|------|------|
| 真机（iOS / Android） | 直接打开页面，按 UA 自动开启，无需参数 |
| 电脑上预览 | `?mobile=1`（可与 `?flow=…` 叠加） |
| 电脑上强制回桌面壳 | `?mobile=0`（真机上也可用） |
| 旧写法（保留兼容） | `?view=mobile` / `?view=desktop` |

实现（`mobile-preview.js`）：

- **逻辑画布固定 390 宽**（`--phone-w`），整体 `transform: scale(视口宽 / 390)` 铺满 —— 不拉伸布局，
  绝对定位元素（分组行删除钮、0.5px 发丝线、按文字宽算出的 Tab 指示条）不会被撑歪
- **不靠视口宽度判定**：`max-width` 窄窗、DevTools 设备模式都不会误开手机模式（只认 UA / iPadOS 触屏 Mac）
- **键盘避让**：`visualViewport` 与 `innerHeight` 差值折算成逻辑 px 写进 `--kb-h`，
  底部 Sheet（`padding-bottom`）与居中 Dialog（`translateY`）让开系统键盘
- **左缘滑动唤出左侧导航抽屉**（跟手拖拽，抽屉 `z-index 400` > 蒙层 `350`）
- 假状态栏（9:41）在手机模式隐藏；顶部按 `env(safe-area-inset-top)` 避让刘海，并已按缩放折算

## 深链

| URL | 说明 |
|-----|------|
| `?flow=hub` | 功能入口 |
| `?flow=price-list-filled` | 价目表 · 项目（有数据） |
| `?flow=price-list-product` | 价目表 · 产品 |
| `?flow=price-groups` | 分组管理 |
| `?flow=price-add` | 新增项目 |
| `?flow=price-edit-normal` | 项目详情 · 普通 |
| `?flow=price-list-action` | 行操作 Sheet |
| `?flow=price-list-filled&capture=1` | 仅手机框（截图） |

完整节点与大原型 FLOW「项目创建与管理」一致。

## 文件

| 文件 | 说明 |
|------|------|
| `index.html` | 左侧链路导航 + 390×844 手机框（由 `price-fragment.html` 经 `_build-index.js` 生成） |
| `catalog.js` / `base.css` | 价目核心（**手改，源在本目录**） |
| `price-fragment.html` | 内联进 `index.html` 的页面片段（**手改**） |
| `amount-keypad.js` | 金额数字键盘 |
| `app.js` / `shell.css` | 壳与深链（`shell.css` 含 `html.view-mobile` 手机模式） |
| `mobile-preview.js` | 手机预览控制器（390 缩放 / 键盘避让 / 导航抽屉），由 `_build-index.js` 注入 |
| `PRD-项目创建与管理.html` | PRD（完整稿；精简版已删除） |

## 重建

```powershell
node _build-index.js      # ✅ 安全：由 price-fragment.html 重新内联出 index.html
```

> ⚠️ **`_build-all.js` 已停用**（2026-09-22 加锁）。
> 它会用**固定行号区间**从 `d:/RTB优化工程/card/demo.html`（2026-08-27 的旧 demo）
> 重新抽取并**整体覆写** `price-fragment.html` / `base.css` / `catalog.js`。
> demo.html 是重构前的旧源码 —— 2026-09-21 运行过一次，把行内展开区整套改动全部冲掉
> （已按 agent transcript 回放恢复）。现运行会被拦截并以非 0 退出，文件不受影响。
> 真要从零重跑需显式设 `PRICE_BUILD_FROM_DEMO=yes`，且**必须先备份**。

**源码以本目录为准**：`base.css` / `catalog.js` / `price-fragment.html` / `shell.css` / `app.js` 都是手改的，
不要再从任何外部 demo 生成它们。

## 验证

```powershell
node _tmp_serve.mjs 8770          # 起本地静态服务（或 python -m http.server 8770）
node _tmp_probe_inline.mjs        # 行内展开区专项（156 项）
node _tmp_verify_catalog.mjs      # 价目表全量回归（100 项）
node _tmp_shots_inline.mjs        # 重出 _shots/ 截图
python _tmp_build_prd.py          # 由 PRD .md 重生成 .html 预览
```

## 与大原型关系

- **复制保留**：`card/demo.html` 内价目模块未删除
- **一次性搬运**：后续各自独立演进
