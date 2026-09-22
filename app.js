/* 价目表重构 · shell nav + deep links */
(function (g) {
  'use strict';

  function setNavHighlight(flowId) {
    document.querySelectorAll('.site-nav .nav-item').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-flow') === flowId);
    });
  }
  g.__setNavHighlight = setNavHighlight;

  g.openHub = function () {
    try {
      document.querySelectorAll('.picker-mask.open, .dialog-mask.open').forEach(function (el) {
        el.classList.remove('open');
      });
    } catch (e) {}
    g.showOnlyScreen('screen-hub');
    setNavHighlight('hub');
  };

  function goFlow(id) {
    if (id === 'hub') {
      g.openHub();
      return;
    }
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
    var hub = document.getElementById('hubGoPrice');
    if (hub) {
      hub.addEventListener('click', function () {
        goFlow('price-list-filled');
      });
    }
    var listBack = document.getElementById('projBackFromList');
    if (listBack) {
      listBack.addEventListener('click', function (e) {
        /* catalog.js also binds; ensure hub when standalone */
        e.stopImmediatePropagation();
        g.openHub();
      }, true);
    }
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
    else g.openHub();
  }

  function boot() {
    if (typeof g.initPriceCatalogPackage === 'function') g.initPriceCatalogPackage();
    bindNav();
    applyDeepLink();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
