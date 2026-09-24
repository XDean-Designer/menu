/* 价目表重构 · shell nav + deep links */
(function (g) {
  'use strict';

  function setNavHighlight(flowId) {
    document.querySelectorAll('.site-nav .nav-item').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-flow') === flowId);
    });
  }
  g.__setNavHighlight = setNavHighlight;

  /* 原型已取消「功能入口」页：首页 = 价目表 · 项目（v1.24） */
  var HOME_FLOW = 'price-list-filled';

  /* run-to-figma 全高截图：这些 flow 是**浮层态**（Sheet / Dialog），画布必须锁 844 视口。
     判据不是「有没有浮层」，而是「蒙层要不要跟着画布走」——
     蒙层是 `inset: 0` 相对画布定位的，画布一旦按内容增高（最深 1323px 余量），
     蒙层就会被拉成整条长黑带、弹窗飘到内容之外。
     页面态则交给 base.css 的 `html.figma-capture:not(.capture-overlay)` 按内容增高。 */
  var CAPTURE_OVERLAY_FLOWS = {
    'price-list-action': 1,        // 行操作 Sheet
    'price-list-action-locked': 1, // 行操作 Sheet · 绑卡不可删除（capture 专用）
    'price-item-group': 1,         // 设置分组 Sheet
    'price-item-group-empty': 1,   // 设置分组 · 无组
    'price-group-create': 1,       // 新建分组 Dialog
    'price-group-rename': 1,       // 重命名 Dialog
    'price-group-delete': 1,       // 删除分组 Dialog
    'price-item-delete': 1,        // 删除价目 Dialog
    'price-amount-keypad': 1,      // 金额键盘（无导航入口，capture 专用）
    'price-inline-discard': 1,     // 放弃修改确认（无导航入口，capture 专用）
  };

  function goFlow(id) {
    if (typeof g.runPriceFlow === 'function') g.runPriceFlow(id);
    else if (g.PRICE_FLOW && typeof g.PRICE_FLOW[id] === 'function') {
      g.PRICE_FLOW[id]();
      setNavHighlight(id);
    } else if (typeof g.showToast === 'function') g.showToast('未接入: ' + id, true);
  }

  function bindNav() {
    document.querySelectorAll('.site-nav [data-flow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goFlow(btn.getAttribute('data-flow'));
        if (document.documentElement.classList.contains('view-mobile')) {
          document.documentElement.classList.remove('nav-drawer-open');
        }
      });
    });
  }

  function applyDeepLink() {
    var q = new URLSearchParams(location.search);
    var capture = q.get('capture');
    var flow = q.get('flow');
    /* run-to-figma：?capture=<flowId> 兼作深链；capture=1 仅开截图模式 */
    if (capture) {
      document.documentElement.classList.add('prd-capture', 'figma-capture');
      if (!flow && capture !== '1') flow = capture;
      /* 浮层态锁 844 视口，页面态按内容增高 —— 见 CAPTURE_OVERLAY_FLOWS 的说明 */
      document.documentElement.classList.toggle('capture-overlay', !!CAPTURE_OVERLAY_FLOWS[flow]);
    }
    if (flow) goFlow(flow);
    else goFlow(HOME_FLOW);
  }

  function boot() {
    if (typeof g.initPriceCatalogPackage === 'function') g.initPriceCatalogPackage();
    bindNav();
    applyDeepLink();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
