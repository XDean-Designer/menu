/**
 * ⚠️ 危险 · 已停用（2026-09-21 事故后加锁）
 *
 * 本脚本会用「固定行号区间」从 d:/RTB优化工程/card/demo.html（2026-08-27 的旧 demo）
 * 重新抽取并**整体覆写** price-fragment.html / base.css / catalog.js。
 * demo.html 是重构前的旧源码，因此一旦运行，`价目表/` 里所有后续改动都会被抹掉
 * —— 2026-09-21 18:40 就是这样把行内展开区整套改动冲掉的（后已按 transcript 回放恢复）。
 *
 * 该脚本的引导使命已完成，源码请以 `价目表/` 目录自身为准，不要再运行。
 * 若确需重跑（仅限从零重建包体），先提交备份，再显式设置环境变量：
 *     $env:PRICE_BUILD_FROM_DEMO = 'yes'; node _build-all.js
 */
if (process.env.PRICE_BUILD_FROM_DEMO !== 'yes') {
  console.error('❌ _build-all.js 已停用：它会用 card/demo.html 的旧源码覆写本目录文件。');
  console.error('   如确需从 demo.html 重建（会丢失当前全部改动），请先备份并设置 PRICE_BUILD_FROM_DEMO=yes。');
  process.exit(1);
}

/**
 * Build 价目表重构 package from card/demo.html (line-range extract).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEMO = 'd:/RTB优化工程/card/demo.html';
const OUT = __dirname;
const lines = fs.readFileSync(DEMO, 'utf8').split(/\r?\n/);
const src = lines.join('\n');

function extract(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

/* ===== HTML ===== */
let screens = extract(17381, 17489);
const masks = [
  extract(17490, 17508),
  extract(17509, 17518),
  extract(17519, 17530),
  extract(17531, 17540),
  extract(17541, 17563),
  extract(17583, 17638),
  extract(17639, 17650),
].join('\n\n');

fs.writeFileSync(
  path.join(OUT, 'price-fragment.html'),
  [
    '<!-- ==== PRICE CATALOG (from card/demo.html) ==== -->',
    screens,
    '',
    masks,
    '<!-- ==== /PRICE CATALOG ==== -->',
    '',
  ].join('\n'),
  'utf8'
);
console.log('wrote price-fragment.html');

/* ===== CSS ===== */
const cssRanges = [
  [32, 52],
  [207, 265],
  [267, 535],
  [1230, 1244],
  [1345, 1397],
  [1749, 1783],
  [1849, 1897],   /* duration-input base layout */
  [2730, 4350],
  [4350, 4382],
  [4390, 4404],   /* pick-select-bar · 分组包含项目/包含产品顶栏 */
];

const phoneAlias = `
.phone-inner.phone,
#frame.phone-shell {
  width: var(--phone-w);
  height: var(--phone-h);
  overflow: hidden;
  position: relative;
  background: var(--bg-page);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.phone-inner .picker-mask,
.phone-inner .dialog-mask { position: absolute; inset: 0; }
.phone-inner .toast-msg {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%); z-index: 100;
}
.hub-body { padding: 16px; background: #F7F7F7; }
.hub-card {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border-radius: 12px; padding: 16px;
  border: none; width: 100%; text-align: left; cursor: pointer;
  font-family: inherit; box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.hub-card:active { background: #FAFAFA; }
.hub-card__icon { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
.hub-card__title { font-size: 16px; font-weight: 600; color: var(--text, #1a1a1a); }
.hub-card__desc { font-size: 12px; color: var(--text-sec, #999); margin-top: 4px; }
/* 标题绝对居中后，右侧操作贴右（demo L8551） */
.page-title-bar .title-add-btn {
  position: relative; z-index: 2; flex: 0 0 auto; margin-left: auto; align-self: center;
}
`;

const cssBody = cssRanges.map(([a, b]) => `/* demo L${a}-${b} */\n${extract(a, b)}`).join('\n\n');
const baseCss = `/* 价目表重构 · from card/demo.html */\n${phoneAlias}\n${cssBody}\n`;
fs.writeFileSync(path.join(OUT, 'base.css'), baseCss, 'utf8');
console.log('wrote base.css', baseCss.split('\n').length, 'lines');

/* ===== JS ranges ===== */
const jsRanges = [
  [19183, 20600],   // constants + catalog seed/helpers + escapeHtml/chevron
  [22119, 22152],   // duration unit consts + INPUT_LIMITS + formatMoneyLimitLabel
  [22158, 22162],   // clampMoneyNumber
  [22281, 22453],   // durationFields + buildDurationInputHtml + wireDuration
  [23832, 25395],   // proj list/form/wireProjCatalogModule (exclude showOnlyScreen)
  [25452, 25495],   // ensureDemoFilled + ensureProjDemoImages
  [27429, 27491],   // resolveProj/ProductDemoTarget
];

let jsBody = jsRanges.map(([a, b]) => `/* demo L${a}-${b} */\n${extract(a, b)}`).join('\n\n');

/* FLOW price handlers: lines 27220-27425 inside FLOW_NAV object */
const flowRaw = extract(27220, 27425)
  .replace(/^(\s*)'([a-z0-9-]+)'\(\)/gm, "$1'$2': function ()");

const preamble = `'use strict';
(function (g) {
var state = {
  demoListMode: 'filled',
  templates: [],
  memberHoldings: {},
  cardGroups: [],
  projectCatalog: [],
  productCatalog: [],
  catalogGroups: { project: [], product: [] },
  activeCatalogGroupId: { project: 'all', product: 'all' },
  priceCatalogTab: 'project',
  catalogColSort: { key: null, dir: null },
  catalogListQuery: '',
  projEditingId: null,
  projFormState: null,
  projFormMode: 'add',
  projFormOrigin: null,
  catalogRowActionId: null,
  catalogGroupMenuId: null,
  catalogAssignItemId: null,
  catalogAssignResumeAfterGroupCreate: false,
  catalogGroupNameMode: 'create',
  catalogGroupEditingId: null,
  catalogMembersGroupId: null,
  catalogGroupDeleteId: null,
  catalogItemGroupDraft: null,
  priceCatalogReturn: null,
  navStack: [],
  activeCardGroupIdBySurface: { list: 'all', billing: 'all', empAch: 'all', empScope: 'all' },
  activePickGroupId: { project: 'all', product: 'all', discount: 'all' },
  cardValidityUnit: 'year',
  cardValidityAmount: 1,
  cardValidityKey: 'year',
  cardValidityDays: 0,
  cardValidityMonths: 0,
  cardValidityCustomUnit: 'year',
};

function syncDemoStateButtons() {}
function buildDemoTemplates() { return []; }
function seedDemoMemberHoldings() { return {}; }
function seedCardGroups() { return []; }
function ensureActiveCardGroupIdBySurface() {}
function syncBalanceCanBuyProductsField() {}
function renderProjectList() {}
function renderProductList() {}
function renderMemberPriceProjectList() {}
function renderProjectPickParams() {}
function renderDiscountPickParams() {}
function setStep() {}
function syncFlowMapFromAppState() {}
function applyDemoListState(mode) {
  state.demoListMode = mode === 'empty' ? 'empty' : 'filled';
  if (mode === 'empty') {
    state.projectCatalog = [];
    state.productCatalog = [];
    state.catalogGroups = emptyCatalogGroups();
    ensureSystemHiddenGroups();
  }
}
function closeUnlimitedValidityDialog() {
  var el = document.getElementById('unlimitedValidityDialogMask');
  if (el) el.classList.remove('open');
}
function confirmUnlimitedValidityDialog() { closeUnlimitedValidityDialog(); }
function openWorkbench() { if (g.openHub) g.openHub(); }
function setFlowNavHighlight(id) { if (g.__setNavHighlight) g.__setNavHighlight(id); }
function closeAllFlowOverlays() {
  document.querySelectorAll('.picker-mask.open, .dialog-mask.open').forEach(function (el) {
    el.classList.remove('open');
  });
}
function refreshAfterCatalogChange() { try { projRenderList(); } catch (e) {} }
function parseDurationAmount(v) {
  var n = parseInt(String(v == null ? '' : v).replace(/\\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function formatMoneyDisplay(n) {
  var v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
`;

const overrides = `
/* --- standalone overrides --- */
function projBackFromCatalog() {
  closeAllFlowOverlays();
  if (g.openHub) g.openHub();
  else projShowScreen('screen-hub');
}

function showToast(msg, isWarn) {
  var el = document.getElementById('toastMsg');
  if (!el) { console.log('[toast]', msg); return; }
  el.textContent = msg || '';
  el.classList.toggle('is-multiline', String(msg || '').length > 18);
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { el.classList.remove('show'); }, isWarn ? 2600 : 2000);
}

function showOnlyScreen(id) {
  document.querySelectorAll('#frame .screen').forEach(function (el) {
    el.classList.toggle('hidden', el.id !== id);
  });
  setFlowNavHighlight(id === 'screen-hub' ? 'hub' : id);
}

/* PRICE_FLOW from demo FLOW_NAV */
var PRICE_FLOW = {
${flowRaw.replace(/'([a-z0-9-]+)'\(\)/g, "'$1': function ()")}
};

function runPriceFlow(id) {
  var fn = PRICE_FLOW[id];
  if (typeof fn === 'function') fn();
  else showToast('未接入: ' + id, true);
  setFlowNavHighlight(id);
}

function applyStandaloneDemoBindings() {
  var p4 = getCatalogProjects().find(function (x) { return x.id === 'p4'; });
  if (p4) {
    p4.boundToCard = true;
    p4.boundTemplateIds = ['demo_kids'];
    p4.boundTemplateId = 'demo_kids';
    p4.boundTemplateNames = ['儿童次卡'];
  }
}

var _ensureDemoFilledOrig = ensureDemoFilled;
ensureDemoFilled = function () {
  _ensureDemoFilledOrig();
  applyStandaloneDemoBindings();
};

function initPriceCatalogPackage() {
  if (!getCatalogProjects().length) state.projectCatalog = seedProjectCatalog();
  if (!getCatalogProducts().length) state.productCatalog = seedProductCatalog();
  if (!state.catalogGroups) state.catalogGroups = emptyCatalogGroups();
  var hasCustom = ['project', 'product'].some(function (b) {
    return (state.catalogGroups[b] || []).some(function (g) { return g && !g.system; });
  });
  if (!hasCustom) state.catalogGroups = seedCatalogGroups();
  ensureSystemHiddenGroups();
  try { syncAllCatalogBindings(); } catch (e) {}
  applyStandaloneDemoBindings();
  ensureProjDemoImages();
  try { wireProjCatalogModule(); } catch (e) { console.warn('wireProjCatalogModule', e); }
  if (typeof wireAmountKeypadInputs === 'function') wireAmountKeypadInputs(document);
  if (typeof wireAmountKeypadControls === 'function') wireAmountKeypadControls();
}

g.state = state;
g.PRICE_FLOW = PRICE_FLOW;
g.runPriceFlow = runPriceFlow;
g.initPriceCatalogPackage = initPriceCatalogPackage;
g.ensureDemoFilled = ensureDemoFilled;
g.openPriceCatalog = openPriceCatalog;
g.projShowScreen = projShowScreen;
g.showToast = showToast;
g.showOnlyScreen = showOnlyScreen;
})(typeof window !== 'undefined' ? window : globalThis);
`;

const catalogJs = preamble + '\n' + jsBody + '\n' + overrides;
fs.writeFileSync(path.join(OUT, 'catalog.js'), catalogJs, 'utf8');
try {
  execSync('node --check "' + path.join(OUT, 'catalog.js') + '"', { stdio: 'inherit' });
  console.log('catalog.js OK', Math.round(catalogJs.length / 1024), 'KB');
} catch (e) {
  console.error('catalog.js SYNTAX ERROR');
  process.exitCode = 1;
}
