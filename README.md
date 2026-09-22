# 价目表重构（独立原型）

从大原型 `card/demo.html` 剥离的 **项目创建与管理 / 价目表** 模块，可本地独立运行。

## 启动

```powershell
cd D:\RTB打补丁工程\价目表
python -m http.server 8770
```

浏览器打开：<http://localhost:8770/index.html>

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
| `app.js` / `shell.css` | 壳与深链 |
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
