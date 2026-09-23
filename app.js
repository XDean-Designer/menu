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
