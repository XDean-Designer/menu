'use strict';
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
  /* 行内展开区（废止全屏新增/详情页后，详情即列表内展开） */
  catalogInline: { mode: null, id: null, dirty: false, busy: false, base: null },
  catalogRowActionId: null,
  catalogGroupMenuId: null,
  catalogGroupExpandedId: null,
  catalogAssignItemId: null,
  catalogAssignResumeAfterGroupCreate: false,
  catalogGroupNameMode: 'create',
  catalogGroupEditingId: null,
  catalogMembersGroupId: null,
  catalogGroupNavBusy: false,
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
  /* 切航/深链前把行内展开区收掉（不播动画，避免与导航动画打架） */
  try {
    var st = state.catalogInline;
    if (st && st.mode) {
      document.getElementById('catalogInlinePanel')?.remove();
      document.querySelector('.table-row-swipe.has-inline-panel')?.classList.remove('has-inline-panel');
      st.mode = null; st.id = null; st.dirty = false; st.base = null; st.busy = false;
      state.projEditingId = null;
      state.projFormState = null;
      document.getElementById('catalogInlineDiscardMask')?.classList.remove('show');
    }
  } catch (e) {}
}
function refreshAfterCatalogChange() { try { projRenderList(); } catch (e) {} }
function parseDurationAmount(v) {
  var n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function formatMoneyDisplay(n) {
  var v = Number(n);
  if (!Number.isFinite(v)) v = 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* demo L19183-20600 */
const PROJ_DEMO_IDS = { bound: 'p4', normal: 'p16', offSale: 'p14' };
const PROD_DEMO_IDS = { normal: 'pd1', offSale: 'pd7' };
const PROJ_DEFAULT_CATEGORY = '其他';
const PROJ_IOS_PICKER_ITEM_H = 44;
const PROJ_DUR_HOUR_MAX = 8;
const PROJ_DUR_MIN_STEP = 5;
const PROJ_DUR_CHIP_PRESETS = [
  { label: '30分', minutes: 30 },
  { label: '1小时', minutes: 60 },
  { label: '1.5小时', minutes: 90 },
  { label: '2小时', minutes: 120 },
];
const PROJ_IMG_PLUS = '<span class="img-upload__plus" aria-hidden="true"></span>';
/* Figma 305:405/325 · 添加图片 + 演示美容美发图 */
const PROJ_IMG_MAX = 1;
const PROJ_DEMO_IMG_POOL = [
  'assets/catalog/demo-imgs/demo-1.jpg',
  'assets/catalog/demo-imgs/demo-2.jpg',
  'assets/catalog/demo-imgs/demo-3.jpg',
  'assets/catalog/demo-imgs/demo-4.jpg',
];
const PROJ_IMG_DEL = '<img src="assets/catalog/demo-imgs/demo-del.svg" width="14" height="14" alt="" aria-hidden="true">';
const ICON_CHEVRON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const ICON_CHEVRON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
function expandMoreLabel(count) {
  return `展开 ${count} 项 ${ICON_CHEVRON_DOWN}`;
}
function expandLessLabel() {
  return `收起 ${ICON_CHEVRON_UP}`;
}
const PROJ_CHEV_ICON = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
/* 名称 / 价格行右侧的铅笔图标（设计稿 1283:243 / 1283:248）：16×16 框内一个 14×14 图形，
   由 10×10 铅笔 + 右下 5.25 长横线组成，描边 #C7C7CC、线宽 1.05。
   坐标按设计稿换算：铅笔 (1+1.8, 1+1.7)，横线 (1+7, 1+11.7) → 16×16 框内 (2.8,2.7) / (8,12.7) */
const PROJ_FORM_EDIT_ICON = '<span class="field-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C7C7CC" stroke-width="1.05"><path transform="translate(2.8 2.7)" d="M7.874999373363992 0.3624367822891307C8.107063783326778 0.1303723723263443 8.421810667124996 2.5905201846570027e-16 8.74999930373777 0C8.912501810593342 0 9.07341318400088 0.03200724652528683 9.223545929976407 0.0941942656586363C9.373678675951933 0.15638128479198576 9.510092609361344 0.24753015753892751 9.624999234111547 0.3624367822891307C9.73990585886175 0.47734340703933387 9.831054870686184 0.6137573404487437 9.893241889819533 0.7638900864242695C9.955428908952882 0.9140228323997952 9.987436294555666 1.0749342058073346 9.987436294555664 1.2374367126629076C9.987436294555666 1.3999392195184805 9.955428908952882 1.5608505929260201 9.893241889819533 1.7109833389015459C9.831054870686184 1.8611160848770716 9.73990585886175 1.9975300182864815 9.624999234111547 2.1124366430366845L2.333333147663405 9.404103007639813L0 9.987436294555664L0.5833332869158513 7.6541031468922585L7.874999373363992 0.3624367822891307Z"/><path d="M8 12.7h5.25"/></svg></span>';
function projFormEditIconHtml() {
  return PROJ_FORM_EDIT_ICON;
}
/* 「保存」按钮里的存盘图标：13.5×13.5，置于 16×16 框内；fill/stroke 用 currentColor，随按钮字色（通栏实心时为白） */
const PROJ_SAVE_ICON = '<svg class="catalog-inline-save__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path transform="translate(1.3 1.3)" fill="currentColor" stroke="currentColor" stroke-width="0.2" d="M13.206999778747559 4.327000141143799L9.17300033569336 0.2929999828338623C8.985507607460022 0.10545061528682709 8.731194406747818 0.00005663740375894122 8.465999603271484 0L1 0C0.7347835004329681 0 0.480429545044899 0.10535679757595062 0.2928931713104248 0.2928931713104248C0.10535679757595062 0.480429545044899 2.220446049250313e-16 0.7347835004329681 0 1L0 12.5C2.220446049250313e-16 12.765216499567032 0.10535679757595062 13.019570216536522 0.2928931713104248 13.207106590270996C0.480429545044899 13.39464296400547 0.7347835004329681 13.5 1 13.5L12.5 13.5C12.765216499567032 13.5 13.019570216536522 13.39464296400547 13.207106590270996 13.207106590270996C13.39464296400547 13.019570216536522 13.5 12.765216499567032 13.5 12.5L13.5 5.033999919891357C13.499943362596241 4.768805116415024 13.394549146294594 4.514492869377136 13.206999778747559 4.327000141143799ZM3.25 1L6.25 1L6.25 2.75L3.25 2.75L3.25 1ZM10.25 12.5L3.25 12.5L3.25 10.25L10.25 10.25L10.25 12.5ZM12.5 12.5L11.25 12.5L11.25 9.75C11.25 9.617391750216484 11.197321958839893 9.49021441489458 11.103553771972656 9.396446228027344C11.00978558510542 9.302678041160107 10.882608249783516 9.25 10.75 9.25L2.75 9.25C2.617391750216484 9.25 2.490214891731739 9.302678041160107 2.396446704864502 9.396446228027344C2.302678517997265 9.49021441489458 2.25 9.617391750216484 2.25 9.75L2.25 12.5L1 12.5L1 1L2.25 1L2.25 3.25C2.25 3.382608249783516 2.302678517997265 3.509785108268261 2.396446704864502 3.603553295135498C2.490214891731739 3.697321482002735 2.617391750216484 3.75 2.75 3.75L6.75 3.75C6.882608249783516 3.75 7.009785585105419 3.697321482002735 7.103553771972656 3.603553295135498C7.197321958839893 3.509785108268261 7.25 3.382608249783516 7.25 3.25L7.25 1L8.465999603271484 1L12.5 5.033999919891357L12.5 12.5Z"/></svg>';
/* 展开区顶部的状态提示条已取消（展开区改为选中行的向下延伸，不再有题头/提示区）；
   限制原因改由「点锁定字段 → toast」承担，文案见 PROJ_LOCK_TOAST */
const PROJ_LOCK_TOAST = {
  name: '该项目已绑定会员卡，项目名称不可修改',
  bookable_bound: '该项目已绑定会员卡，预约设置不可修改',
  bookable_offSale: '项目已下架，请先开启「在售」后再设置可预约',
  bookable_hidden: '项目已隐藏，取消隐藏后需手动开启可预约',
  delete: '该项目已绑定会员卡，不可删除',
};
/* 在售 / 可预约 开关点击后的短提示：原先「打开后项目会在小程序-预约中显示」那行副标题
   占了一行高度，撤掉后改成点开关时用短 toast 说明后果（关在售会连带关掉可预约）。 */
const PROJ_SWITCH_TOAST = {
  onSale_on: '已上架，顾客端可见',
  onSale_off: '已下架，顾客端不可见、不可预约',
  bookable_on: '已开启，项目会在小程序「预约」中显示',
  bookable_off: '已关闭，小程序「预约」中不再显示',
};
const CATALOG_SYS_HIDDEN_GROUP = {
  project: { id: 'g_sys_hidden_project', name: '隐藏', system: true },
  product: { id: 'g_sys_hidden_product', name: '隐藏', system: true },
};

/** Sheet / 操作菜单：Figma card-lock (86:7)，勿改 */
const CATALOG_DELETE_LOCK_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16.1998 16.5C16.1998 15.9477 16.6475 15.5 17.1998 15.5H21.1998C21.7521 15.5 22.1998 15.9477 22.1998 16.5V18.5C22.1998 19.0523 21.7521 19.5 21.1998 19.5H17.1998C16.6475 19.5 16.1998 19.0523 16.1998 18.5V16.5Z" fill="currentColor"/><path d="M12.0002 18.3L4.20045 18.2998C2.87501 18.2998 1.80053 17.2253 1.80049 15.8999L1.80023 6.90004C1.80019 5.57453 2.87472 4.49998 4.20023 4.49998H18.5992C19.9249 4.49998 20.9997 5.57419 20.9997 6.8999L20.9998 8.69998M2.39977 8.69983H20.3998M17.6998 15V14C17.6998 13.1716 18.3713 12.5 19.1998 12.5C20.0282 12.5 20.6998 13.1716 20.6998 14V15.5M17.1998 19.5H21.1998C21.7521 19.5 22.1998 19.0523 22.1998 18.5V16.5C22.1998 15.9477 21.7521 15.5 21.1998 15.5H17.1998C16.6475 15.5 16.1998 15.9477 16.1998 16.5V18.5C16.1998 19.0523 16.6475 19.5 17.1998 19.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/** 左滑删除角标：线性锁（仅 swipe 按钮） */
const CATALOG_SWIPE_DELETE_LOCK_ICON = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

function getCatalogDeleteLocks(p) {
  if (!p) return [];
  const locks = [];
  if (p.boundToCard) locks.push('card');
  if (p.boundToCoupon) locks.push('coupon');
  if (p.boundToMall) locks.push('mall');
  return locks;
}

function isCatalogDeleteLocked(p) {
  return getCatalogDeleteLocks(p).length > 0;
}

function catalogDeleteLockToast(p) {
  const locks = getCatalogDeleteLocks(p);
  if (!locks.length) return PROJ_LOCK_TOAST.delete;
  const labels = { card: '会员卡', coupon: '优惠券', mall: '商城' };
  const parts = locks.map(k => labels[k]).filter(Boolean);
  return `已关联${parts.join('/')}，不可删除`;
}

function catalogDeleteBtnHtml(locked) {
  if (!locked) return `<button type="button" class="act-del" data-swipe-act="delete">删除</button>`;
  return `<button type="button" class="act-del act-del--locked" data-swipe-act="delete" aria-label="删除（已锁定）">删除<span class="act-del__lock">${CATALOG_SWIPE_DELETE_LOCK_ICON}</span></button>`;
}
let projDurDraft = { hours: 0, minutes: 30 };
let projDurWheelTimer = null;

function seedProjectCatalog() {
  const list = [
    { id: 'p1', name: '时尚洗吹', price: 58, duration: 60, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p2', name: '精致剪发', price: 98, duration: 45, onSale: true, bookable: true, category: '剪发' },
    { id: 'p3', name: '洗剪吹', price: 68, duration: 60, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p4', name: '儿童剪发', price: 48, duration: 55, onSale: true, bookable: true, category: '剪发' },
    { id: 'p5', name: '女士造型', price: 128, duration: 45, onSale: true, bookable: true, category: '造型' },
    { id: 'p6', name: '染发', price: 358, duration: 120, onSale: true, bookable: true, category: '烫染' },
    { id: 'p7', name: '漂发', price: 288, duration: 120, onSale: true, bookable: true, category: '烫染' },
    { id: 'p8', name: '烫发', price: 398, duration: 150, onSale: true, bookable: true, category: '烫染' },
    { id: 'p9', name: '摩根烫', price: 458, duration: 150, onSale: true, bookable: false, category: '烫染' },
    { id: 'p10', name: '电棒烫', price: 428, duration: 150, onSale: true, bookable: true, category: '烫染' },
    { id: 'p11', name: '深层滋养', price: 198, duration: 75, onSale: true, bookable: true, category: '护理' },
    { id: 'p12', name: '蛋白矫正', price: 598, duration: 120, onSale: true, bookable: true, category: '护理' },
    { id: 'p13', name: '头疗', price: 138, duration: 50, onSale: true, bookable: true, category: '护理' },
    { id: 'p14', name: '接发', price: 888, duration: 180, onSale: false, bookable: false, category: '造型' },
    { id: 'p15', name: '头皮护理', price: 168, duration: 60, onSale: true, bookable: true, category: '护理' },
    { id: 'p16', name: '挑染', price: 198, duration: 90, onSale: true, bookable: true, category: '烫染' },
    { id: 'p17', name: '时尚造型', price: 128, duration: 45, onSale: true, bookable: true, category: '造型' },
    { id: 'p18', name: '暖色漂褪', price: 328, duration: 120, onSale: true, bookable: false, category: '烫染' },
    { id: 'p19', name: '洗头', price: 28, duration: 20, onSale: true, bookable: true, category: '洗吹' },
    { id: 'p20', name: '面部清洁护理', price: 168, duration: 60, onSale: true, bookable: true, category: '美容' },
    { id: 'p21', name: '深层补水护理', price: 268, duration: 75, onSale: true, bookable: true, category: '美容' },
    { id: 'p22', name: '美白淡斑护理', price: 398, duration: 90, onSale: true, bookable: true, category: '美容' },
    { id: 'p23', name: '手部基础美甲', price: 98, duration: 45, onSale: true, bookable: true, category: '美甲' },
    { id: 'p24', name: '猫眼甲油胶', price: 158, duration: 60, onSale: true, bookable: true, category: '美甲' },
    { id: 'p25', name: '卸甲重做', price: 68, duration: 40, onSale: true, bookable: false, category: '美甲' },
    { id: 'p26', name: '开花嫁接睫毛', price: 288, duration: 90, onSale: true, bookable: true, category: '美睫' },
    { id: 'p27', name: '美睫补嫁', price: 128, duration: 45, onSale: true, bookable: true, category: '美睫' },
  ].map(p => ({
    ...p,
    images: [],
    hasImage: false,
    boundToCard: false,
    boundToCoupon: false,
    boundToMall: false,
    hidden: false,
    boundTemplateIds: [],
    boundTemplateId: null,
    boundTemplateNames: [],
  }));
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  if (byId.p16) byId.p16.boundToCoupon = true;
  if (byId.p9) byId.p9.boundToMall = true;
  if (byId.p13) { byId.p13.hidden = true; byId.p13.bookable = false; }
  if (byId.p5) { byId.p5.hidden = true; byId.p5.bookable = false; }
  /* Figma 305:325 · 绑卡详情默认展开多图，右侧可看出渐隐 */
  if (byId.p4) {
    byId.p4.images = PROJ_DEMO_IMG_POOL.slice(0, 4);
    byId.p4.hasImage = true;
  }
  if (byId.p15) {
    byId.p15.images = [PROJ_DEMO_IMG_POOL[0]];
    byId.p15.hasImage = true;
  }
  return list;
}

function seedProductCatalog() {
  const list = [
    { id: 'pd1', name: '剑琅修护洗发水', spec: '500ml', price: 128, onSale: true, category: '洗护' },
    { id: 'pd2', name: '剑琅滋养护发素', spec: '500ml', price: 98, onSale: true, category: '洗护' },
    { id: 'pd3', name: '剑琅头皮护理精华', spec: '100ml', price: 168, onSale: true, category: '护理' },
    { id: 'pd4', name: '剑琅造型发蜡', spec: '80g', price: 88, onSale: true, category: '造型' },
    { id: 'pd5', name: '剑琅染发护色套装', spec: '', price: 198, onSale: true, category: '烫染' },
    { id: 'pd6', name: '剑琅免洗喷雾', spec: '150ml', price: 68, onSale: true, category: '护理' },
    { id: 'pd7', name: '剑琅儿童温和洗发水', spec: '300ml', price: 78, onSale: false, category: '洗护' },
    { id: 'pd8', name: '剑琅控油洗发水', spec: '400ml', price: 118, onSale: true, category: '洗护' },
    { id: 'pd9', name: '剑琅柔顺发膜', spec: '200ml', price: 148, onSale: true, category: '护理' },
    { id: 'pd10', name: '剑琅护发精油', spec: '50ml', price: 158, onSale: true, category: '护理' },
    { id: 'pd11', name: '剑琅哑光发泥', spec: '100g', price: 78, onSale: true, category: '造型' },
    { id: 'pd12', name: '剑琅定型喷雾', spec: '300ml', price: 88, onSale: true, category: '造型' },
    { id: 'pd13', name: '剑琅漂后修护乳', spec: '250ml', price: 138, onSale: true, category: '烫染' },
    { id: 'pd14', name: '剑琅护色洗发水', spec: '500ml', price: 138, onSale: true, category: '烫染' },
    { id: 'pd15', name: '剑琅儿童护发素', spec: '250ml', price: 68, onSale: true, category: '洗护' },
    { id: 'pd16', name: '剑琅头皮清洁泥', spec: '120g', price: 128, onSale: true, category: '护理' },
    { id: 'pd17', name: '剑琅旅行装洗护套', spec: '', price: 88, onSale: true, category: '洗护' },
    { id: 'pd18', name: '剑琅烫后还原霜', spec: '200ml', price: 118, onSale: false, category: '烫染' },
    { id: 'pd19', name: '剑琅玻尿酸精华液', spec: '30ml', price: 198, onSale: true, category: '美容' },
    { id: 'pd20', name: '剑琅补水面膜', spec: '5片', price: 88, onSale: true, category: '美容' },
    { id: 'pd21', name: '剑琅甲油胶套装', spec: '12色', price: 168, onSale: true, category: '美甲' },
    { id: 'pd22', name: '剑琅指缘护理油', spec: '15ml', price: 58, onSale: true, category: '美甲' },
    { id: 'pd23', name: '剑琅睫毛胶水', spec: '5ml', price: 78, onSale: true, category: '美睫' },
    { id: 'pd24', name: '剑琅美睫卸除液', spec: '50ml', price: 48, onSale: true, category: '美睫' },
  ].map(p => ({
    ...p,
    boundToCard: false,
    boundToCoupon: false,
    boundToMall: false,
    hidden: false,
    boundTemplateIds: [],
    boundTemplateId: null,
    boundTemplateNames: [],
  }));
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  if (byId.pd6) byId.pd6.boundToCoupon = true;
  if (byId.pd11) byId.pd11.boundToMall = true;
  if (byId.pd17) byId.pd17.hidden = true;
  if (byId.pd4) byId.pd4.hidden = true;
  return list;
}

function seedCatalogGroups() {
  return {
    project: [
      { id: 'g_proj_wash', name: '洗吹', itemIds: ['p1', 'p3', 'p19'] },
      { id: 'g_proj_tang', name: '烫染', itemIds: ['p6', 'p7', 'p8', 'p9', 'p10', 'p16', 'p18'] },
      { id: 'g_proj_care', name: '护理', itemIds: ['p11', 'p12', 'p13', 'p15'] },
      { id: 'g_proj_cut', name: '剪发造型', itemIds: ['p2', 'p4', 'p5', 'p14', 'p17'] },
      { id: 'g_proj_beauty', name: '美容', itemIds: ['p20', 'p21', 'p22'] },
      { id: 'g_proj_nail', name: '美甲', itemIds: ['p23', 'p24', 'p25'] },
      { id: 'g_proj_lash', name: '美睫', itemIds: ['p26', 'p27'] },
      { id: 'g_proj_empty', name: '待配置', itemIds: [] },
      { id: CATALOG_SYS_HIDDEN_GROUP.project.id, name: '隐藏', system: true, itemIds: ['p13', 'p5'] },
    ],
    product: [
      { id: 'g_prod_wash', name: '洗护', itemIds: ['pd1', 'pd2', 'pd7', 'pd8', 'pd14', 'pd15', 'pd17'] },
      { id: 'g_prod_care', name: '头皮护理', itemIds: ['pd3', 'pd6', 'pd9', 'pd10', 'pd16'] },
      { id: 'g_prod_style', name: '造型', itemIds: ['pd4', 'pd11', 'pd12'] },
      { id: 'g_prod_color', name: '烫染护理', itemIds: ['pd5', 'pd13', 'pd14', 'pd18'] },
      { id: 'g_prod_beauty', name: '美容', itemIds: ['pd19', 'pd20'] },
      { id: 'g_prod_nail', name: '美甲', itemIds: ['pd21', 'pd22'] },
      { id: 'g_prod_lash', name: '美睫', itemIds: ['pd23', 'pd24'] },
      { id: 'g_prod_kids', name: '儿童专区', itemIds: ['pd7', 'pd15'] },
      { id: 'g_prod_empty', name: '待配置', itemIds: [] },
      { id: CATALOG_SYS_HIDDEN_GROUP.product.id, name: '隐藏', system: true, itemIds: ['pd17', 'pd4'] },
    ],
  };
}

function emptyCatalogGroups() {
  return { project: [], product: [] };
}

function emptyActiveCatalogGroupId() {
  return { project: 'all', product: 'all' };
}

function emptyActivePickGroupId() {
  return { project: 'all', discount: 'all', product: 'all' };
}

function getPickGroupModeKey(mode) {
  if (mode === 'discount') return 'discount';
  if (mode === 'product') return 'product';
  return 'project';
}

function getActivePickGroupId(mode) {
  if (!state.activePickGroupId) state.activePickGroupId = emptyActivePickGroupId();
  return state.activePickGroupId[getPickGroupModeKey(mode)] || 'all';
}

function setActivePickGroupId(mode, id) {
  if (!state.activePickGroupId) state.activePickGroupId = emptyActivePickGroupId();
  state.activePickGroupId[getPickGroupModeKey(mode)] = id || 'all';
}

function getOnSaleProjectCount() {
  return getCatalogProjects().filter(p => p.onSale && !p.hidden).length;
}

function getOnSaleProductCount() {
  return getCatalogProducts().filter(p => p.onSale && !p.hidden).length;
}

function getAllProductNamesForPicker() {
  const list = getCatalogProducts();
  ensureCatalogSortOrder(list);
  return [...list]
    .filter(p => p.onSale && !p.hidden)
    .sort(compareCatalogPickerOrder)
    .map(p => p.name);
}

function getProductPrice(name) {
  const p = getCatalogProducts().find(x => x.name === name);
  return p != null ? p.price : 0;
}

function isCatalogSystemGroup(g) {
  return !!g?.system;
}

function getCatalogItemsForBucket(bucket) {
  return bucket === 'product' ? getCatalogProducts() : getCatalogProjects();
}

function ensureSystemHiddenGroups() {
  ['project', 'product'].forEach(bucket => {
    const groups = getCatalogGroupsForBucket(bucket);
    const meta = CATALOG_SYS_HIDDEN_GROUP[bucket];
    let sys = groups.find(g => g.id === meta.id);
    if (!sys) {
      sys = { id: meta.id, name: meta.name, system: true, itemIds: [] };
      groups.push(sys);
    } else {
      sys.system = true;
      sys.name = meta.name;
    }
    sys.itemIds = getCatalogItemsForBucket(bucket).filter(p => p.hidden).map(p => p.id);
  });
}

function getCustomCatalogGroups(bucket) {
  ensureSystemHiddenGroups();
  return getCatalogGroupsForBucket(bucket).filter(g => !g.system);
}

function getSystemHiddenGroup(bucket) {
  ensureSystemHiddenGroups();
  return findCatalogGroupById(CATALOG_SYS_HIDDEN_GROUP[bucket || getCatalogGroupBucket()]?.id, bucket);
}

function syncItemHiddenFromSystemGroup(g, bucket) {
  if (!g || !isCatalogSystemGroup(g)) return;
  const ids = new Set(g.itemIds || []);
  getCatalogItemsForBucket(bucket).forEach(item => {
    const next = ids.has(item.id);
    item.hidden = next;
    applyCatalogHiddenClearsBookable(item, next);
  });
}

/** 项目隐藏时强制关闭「可预约」；取消隐藏不自动恢复 */
function applyCatalogHiddenClearsBookable(item, hidden) {
  if (!item || !hidden) return;
  if (item.bookable != null) item.bookable = false;
}

function setCatalogItemHidden(item, hidden) {
  if (!item) return;
  const next = !!hidden;
  if (!!item.hidden === next) return;
  item.hidden = next;
  applyCatalogHiddenClearsBookable(item, next);
  const bucket = getCatalogProducts().some(x => x.id === item.id) ? 'product' : 'project';
  ensureSystemHiddenGroups();
  const sys = getSystemHiddenGroup(bucket);
  if (!sys) return;
  const set = new Set(sys.itemIds || []);
  if (next) set.add(item.id);
  else set.delete(item.id);
  sys.itemIds = [...set];
}

function isCatalogVisibleToCustomer(p) {
  return !!p?.onSale && !p?.hidden;
}

function isCatalogBookableToCustomer(p) {
  return isCatalogVisibleToCustomer(p) && !!p?.bookable;
}

window.CardCatalogBridge = {
  getBillProjects() {
    return getCatalogProjects().map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || '项目',
      price: p.price,
      benefitKey: p.name,
    }));
  },
  getBillProducts() {
    return getCatalogProducts().map(p => ({
      id: p.id,
      name: p.name,
      spec: p.spec || '',
      category: p.category || '产品',
      price: p.price,
      stock: null,
      type: 'product',
      kind: 'product',
    }));
  },
};

function getProductNamesForPickerByGroup() {
  const all = getAllProductNamesForPicker();
  const gid = getActivePickGroupId('product');
  if (!gid || gid === 'all') return all;
  const g = findCatalogGroupById(gid, 'product');
  if (!g) return all;
  const ids = new Set(g.itemIds || []);
  return all.filter(name => {
    const p = getCatalogProducts().find(x => x.name === name);
    return p && ids.has(p.id);
  });
}

function getProjectNamesForPickerByGroup(mode) {
  if (mode === 'product') return getProductNamesForPickerByGroup();
  const all = getAllProjectNamesForPicker();
  const gid = getActivePickGroupId(mode);
  if (!gid || gid === 'all') return all;
  const g = findCatalogGroupById(gid, 'project');
  if (!g) return all;
  const ids = new Set(g.itemIds || []);
  return all.filter(name => {
    const p = getCatalogProjects().find(x => x.name === name);
    return p && ids.has(p.id);
  });
}

function pickGroupTabsElId(mode) {
  if (mode === 'discount') return 'discPickGroupTabs';
  if (mode === 'product') return 'prodPickGroupTabs';
  return 'projPickGroupTabs';
}

function pickGroupBarElId(mode) {
  if (mode === 'discount') return 'discPickGroupBar';
  if (mode === 'product') return 'prodPickGroupBar';
  return 'projPickGroupBar';
}

function pickGroupListElId(mode) {
  if (mode === 'discount') return 'memberPriceProjectList';
  if (mode === 'product') return 'productList';
  return 'projectList';
}

function pickGroupEmptyElId(mode) {
  if (mode === 'discount') return 'discPickGroupEmpty';
  if (mode === 'product') return 'prodPickGroupEmpty';
  return 'projPickGroupEmpty';
}

function renderPickGroupTabs(mode) {
  const el = document.getElementById(pickGroupTabsElId(mode));
  if (!el) return;
  const bucket = mode === 'product' ? 'product' : 'project';
  const groups = getCustomCatalogGroups(bucket);
  const tabs = [{ id: 'all', name: '全部' }, ...groups.map(g => ({ id: g.id, name: g.name }))];
  if (!tabs.some(t => t.id === getActivePickGroupId(mode))) setActivePickGroupId(mode, 'all');
  const cur = getActivePickGroupId(mode);
  el.innerHTML = tabs.map(t => (
    `<button type="button" class="catalog-group-tab${t.id === cur ? ' on' : ''}" data-pick-group="${escapeAttr(t.id)}" data-pick-mode="${escapeAttr(mode)}" role="tab" aria-selected="${t.id === cur ? 'true' : 'false'}">
      <span class="catalog-group-tab__face"><span class="catalog-group-tab__label">${escapeHtml(t.name)}</span></span>
    </button>`
  )).join('');
  requestAnimationFrame(() => scrollActivePickGroupTabIntoView(mode));
}

function scrollActivePickGroupTabIntoView(mode) {
  const el = document.getElementById(pickGroupTabsElId(mode));
  const on = el?.querySelector('.catalog-group-tab.on');
  if (!el || !on) return;
  ensureGroupTabFullyVisible(el, on);
}

/** 保证选中分组 Tab（含白胶囊）完整落在滚动可视区内，避免左/右滑裁切 */
function ensureGroupTabFullyVisible(scroller, tab, behavior = 'smooth') {
  if (!scroller || !tab) return;
  const pad = 10;
  const tabLeft = tab.offsetLeft;
  const tabRight = tabLeft + tab.offsetWidth;
  const viewLeft = scroller.scrollLeft;
  const viewRight = viewLeft + scroller.clientWidth;
  let next = viewLeft;
  if (tabLeft < viewLeft + pad) next = Math.max(0, tabLeft - pad);
  else if (tabRight > viewRight - pad) next = Math.max(0, tabRight - scroller.clientWidth + pad);
  if (Math.abs(next - viewLeft) > 0.5) {
    scroller.scrollTo({ left: next, behavior });
  }
}

/** 仅当选中 Tab 被半裁切时回正；已完全滚出则不拉回，避免妨碍浏览其它分组 */
function nudgePartialGroupTabIntoView(scroller) {
  const on = scroller?.querySelector('.catalog-group-tab.on');
  if (!scroller || !on) return;
  const tabLeft = on.offsetLeft;
  const tabRight = tabLeft + on.offsetWidth;
  const viewLeft = scroller.scrollLeft;
  const viewRight = viewLeft + scroller.clientWidth;
  const clippedLeft = tabLeft < viewLeft && tabRight > viewLeft;
  const clippedRight = tabRight > viewRight && tabLeft < viewRight;
  if (clippedLeft || clippedRight) ensureGroupTabFullyVisible(scroller, on);
}

function wireGroupScrollPartialSnap(el) {
  if (!el || el.dataset.partialSnapWired === '1') return;
  el.dataset.partialSnapWired = '1';
  let timer = null;
  el.addEventListener('scroll', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => nudgePartialGroupTabIntoView(el), 140);
  }, { passive: true });
}

function syncPickGroupChrome(mode) {
  const bar = document.getElementById(pickGroupBarElId(mode));
  const list = document.getElementById(pickGroupListElId(mode));
  const empty = document.getElementById(pickGroupEmptyElId(mode));
  const total = mode === 'product' ? getOnSaleProductCount() : getOnSaleProjectCount();
  if (!total) {
    bar?.classList.add('hidden');
    if (getActivePickGroupId(mode) !== 'all') setActivePickGroupId(mode, 'all');
    list?.classList.remove('is-hidden');
    empty?.classList.add('hidden');
    return;
  }
  bar?.classList.remove('hidden');
  renderPickGroupTabs(mode);
  const inCustomGroup = getActivePickGroupId(mode) !== 'all';
  const filtered = getProjectNamesForPickerByGroup(mode);
  if (inCustomGroup && !filtered.length) {
    list?.classList.add('is-hidden');
    empty?.classList.remove('hidden');
  } else {
    list?.classList.remove('is-hidden');
    empty?.classList.add('hidden');
  }
}

function wirePickGroupScrollPan(el) {
  if (!el || el.dataset.panWired === '1') return;
  el.dataset.panWired = '1';
  wireGroupScrollPartialSnap(el);
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  let panning = false;
  const THRESHOLD = 6;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    if (e.button != null && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    moved = false;
    panning = false;
  });
  el.addEventListener('pointermove', e => {
    if (pointerId == null || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!panning && Math.abs(dx) < THRESHOLD) return;
    if (!panning) {
      panning = true;
      el.classList.add('is-panning');
      try { el.setPointerCapture(pointerId); } catch (_) {}
    }
    moved = true;
    el.scrollLeft = startScroll - dx;
    e.preventDefault();
  });
  const endPan = e => {
    if (pointerId == null || (e && e.pointerId !== pointerId)) return;
    if (panning) {
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      el.classList.remove('is-panning');
    }
    if (moved) requestAnimationFrame(() => nudgePartialGroupTabIntoView(el));
    pointerId = null;
    panning = false;
  };
  el.addEventListener('pointerup', endPan);
  el.addEventListener('pointercancel', endPan);
  el.addEventListener('click', e => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);
}

function wirePickGroupTabs() {
  ['project', 'discount', 'product'].forEach(mode => {
    const el = document.getElementById(pickGroupTabsElId(mode));
    wirePickGroupScrollPan(el);
    if (!el || el.dataset.tabWired === '1') return;
    el.dataset.tabWired = '1';
    el.addEventListener('click', e => {
      if (el.classList.contains('is-panning')) return;
      const tab = e.target.closest('[data-pick-group]');
      if (!tab || tab.dataset.pickMode !== mode) return;
      const gid = tab.dataset.pickGroup;
      if (!gid || gid === getActivePickGroupId(mode)) return;
      setActivePickGroupId(mode, gid);
      if (mode === 'discount') renderMemberPriceProjectList();
      else if (mode === 'product') renderProductList();
      else renderProjectList();
      syncFlowMapFromAppState();
    });
  });
}

function isProductCatalogTab() { return state.priceCatalogTab === 'product'; }

function getCatalogProducts() { return state.productCatalog || []; }

function getActivePriceCatalog() {
  return isProductCatalogTab() ? getCatalogProducts() : getCatalogProjects();
}

function mutateActivePriceCatalog(mutator) {
  if (isProductCatalogTab()) mutator(state.productCatalog);
  else mutator(state.projectCatalog);
}

function findCatalogItemById(id) {
  return getCatalogProjects().find(x => x.id === id) || getCatalogProducts().find(x => x.id === id);
}

function syncProjListDragHint() {
  const el = document.getElementById('projListDragHint');
  if (!el) return;
  /* 整表无数据（空态）时没有可拖内容，提示条一并隐藏 */
  if (!getActivePriceCatalog().length) {
    el.classList.add('hidden');
    return;
  }
  try {
    /* sessionStorage：同会话内关闭仍记忆；强制刷新后重新显示。不改 PRD 文案/可关闭语义 */
    el.classList.toggle('hidden', sessionStorage.getItem(CATALOG_DRAG_HINT_KEY) === '1');
  } catch (_) {
    el.classList.remove('hidden');
  }
}

function syncPriceCatalogTabs() {
  const tab = state.priceCatalogTab || 'project';
  document.querySelectorAll('[data-price-catalog-tab]').forEach(btn => {
    const on = btn.dataset.priceCatalogTab === tab;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  syncPriceCatalogTabInk(tab);
  document.getElementById('projTableCard')?.classList.toggle('is-product-tab', tab === 'product');
  const emptyAdd = document.getElementById('btnProjEmptyAdd');
  if (emptyAdd) {
    emptyAdd.textContent = tab === 'product' ? '添加产品' : '添加项目';
    /* 空态 CTA 统一为「虚线品牌红」：项目/产品不再各用一套样式 */
    emptyAdd.classList.add('btn-proj-empty-add--dash');
  }
  const emptyToGroup = document.getElementById('btnProjEmptyAddToGroup');
  if (emptyToGroup) {
    emptyToGroup.textContent = tab === 'product' ? '添加产品到本组' : '添加项目到本组';
    emptyToGroup.classList.add('btn-proj-empty-add--dash');
  }
  const nameHead = document.querySelector('#projTableHead [data-col-sort="name"] .table-head__inner');
  if (nameHead) nameHead.textContent = tab === 'product' ? '产品名称（规格）' : '项目名称';
  const durHead = document.querySelector('#projTableHead [data-col-sort="duration"]');
  if (durHead) {
    /* 产品没有时长列：整格隐藏。此前只改了网格列数、没藏格子，
       于是第 3 格被折到第二行，表头被撑高到 49.59px 且「时长（分钟）」与「价格」上下叠行。 */
    durHead.classList.toggle('hidden', tab === 'product');
    const durInner = durHead.querySelector('.table-head__inner');
    if (durInner && tab !== 'product') durInner.textContent = '时长（分钟）';
  }
  const priceHead = document.querySelector('#projTableHead [data-col-sort="price"] .table-head__inner');
  if (priceHead) priceHead.textContent = '价格（¥）';
  syncProjListDragHint();
  syncCatalogGroupChrome();
}

/* 主 Tab 选中指示条（品牌红下划线）
   · 位置：纯 CSS 驱动 —— 靠 data-active 在 25% / 75% 之间切，left 过渡 160ms（无需测量，屏幕隐藏时也正确）
   · 宽度：宽 = 文字宽 + 20（最短 40）。屏幕隐藏时量得 0，此时保留 CSS 兜底 52px，
     每次 sync 都会重试，因此导航进入/切屏后自然会落到真实宽度。 */
var PCT_INK_MIN_W = 40, PCT_INK_PAD = 20;
function syncPriceCatalogTabInk(tab) {
  const bar = document.getElementById('priceCatalogTabs');
  if (!bar) return;
  bar.setAttribute('data-active', tab || 'project');
  const on = bar.querySelector('.page-tabs__item.on');
  if (!on) return;
  let w = 0;
  try {
    const r = document.createRange();
    r.selectNodeContents(on);
    w = r.getBoundingClientRect().width;
  } catch (_) {}
  if (w > 0) {
    bar.style.setProperty('--pct-ink-w', Math.max(PCT_INK_MIN_W, Math.round(w) + PCT_INK_PAD) + 'px');
  }
}

function syncCatalogGroupChrome() {
  const total = getActivePriceCatalog().length;
  const bar = document.getElementById('catalogGroupBar');
  const shell = document.querySelector('#screen-p-list .catalog-list-shell');
  if (!total) {
    bar?.classList.add('hidden');
    shell?.classList.add('hidden');
    if (getActiveCatalogGroupId() !== 'all') setActiveCatalogGroupId('all');
    return;
  }
  bar?.classList.remove('hidden');
  shell?.classList.remove('hidden');
  renderCatalogGroupTabs();
}

function getCatalogGroupBucket() {
  return isProductCatalogTab() ? 'product' : 'project';
}

function getCatalogGroupsForBucket(bucket) {
  const key = bucket || getCatalogGroupBucket();
  if (!state.catalogGroups) state.catalogGroups = emptyCatalogGroups();
  if (!Array.isArray(state.catalogGroups[key])) state.catalogGroups[key] = [];
  return state.catalogGroups[key];
}

function getActiveCatalogGroups() {
  ensureSystemHiddenGroups();
  const bucket = getCatalogGroupBucket();
  const groups = getCatalogGroupsForBucket(bucket);
  const custom = groups.filter(g => !g.system);
  const sys = groups.find(g => g.system);
  return sys ? [...custom, sys] : custom;
}

function getActiveCatalogGroupId() {
  if (!state.activeCatalogGroupId) state.activeCatalogGroupId = emptyActiveCatalogGroupId();
  const bucket = getCatalogGroupBucket();
  return state.activeCatalogGroupId[bucket] || 'all';
}

function setActiveCatalogGroupId(id) {
  if (!state.activeCatalogGroupId) state.activeCatalogGroupId = emptyActiveCatalogGroupId();
  state.activeCatalogGroupId[getCatalogGroupBucket()] = id || 'all';
}

function findCatalogGroupById(id, bucket) {
  if (!id || id === 'all') return null;
  return getCatalogGroupsForBucket(bucket).find(g => g.id === id) || null;
}

function catalogGroupUid() {
  return 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function purgeCatalogItemFromGroups(itemId) {
  if (!itemId || !state.catalogGroups) return;
  ['project', 'product'].forEach(bucket => {
    getCatalogGroupsForBucket(bucket).forEach(g => {
      g.itemIds = (g.itemIds || []).filter(id => id !== itemId);
    });
  });
}

function filterCatalogByActiveGroup(list) {
  const gid = getActiveCatalogGroupId();
  const bucket = getCatalogGroupBucket();
  if (!gid || gid === 'all') return list.filter(p => !p.hidden);
  const sysHidden = getSystemHiddenGroup(bucket);
  if (sysHidden && gid === sysHidden.id) return list.filter(p => !!p.hidden);
  const g = findCatalogGroupById(gid, bucket);
  const ids = new Set(g?.itemIds || []);
  return list.filter(p => ids.has(p.id) && !p.hidden);
}

const CATALOG_GROUP_DRAG_ICON = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(4 4.25)"><line x1="0.75" y1="0.75" x2="9.25" y2="0.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/><line x1="0.75" y1="8.75" x2="9.25" y2="8.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/><line x1="1.659" y1="4.75" x2="8.341" y2="4.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/></g></svg>';
/* 分组行展开操作：编辑成员→「包含项目/包含产品」用文件夹内条目图标；重命名铅笔；删除灰底白垃圾桶 */
const CATALOG_GROUP_ACT_MEMBERS_ICON = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.75 6.55C2.75 5.67 3.46 4.95 4.35 4.95H8.1C8.55 4.95 8.98 5.13 9.3 5.45L10.47 6.62H17.65C18.54 6.62 19.25 7.34 19.25 8.22V15.45C19.25 16.33 18.54 17.05 17.65 17.05H4.35C3.46 17.05 2.75 16.33 2.75 15.45V6.55Z" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.6 10.62H14.4" stroke="currentColor" stroke-width="1.56" stroke-linecap="round"/><path d="M7.6 13.28H11.4" stroke="currentColor" stroke-width="1.56" stroke-linecap="round"/></svg>';
const CATALOG_GROUP_ACT_RENAME_ICON = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 18.3333H19.25" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.125 3.20833C15.4897 2.84366 15.9843 2.63879 16.5 2.63879C17.0157 2.63879 17.5103 2.84366 17.875 3.20833C18.2397 3.57301 18.4445 4.06761 18.4445 4.58333C18.4445 5.09906 18.2397 5.59366 17.875 5.95833L6.41667 17.4167L2.75 18.3333L3.66667 14.6667L15.125 3.20833Z" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CATALOG_GROUP_ACT_DELETE_ICON = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.75 5.5H19.25" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.33333 5.5V4.4C7.33333 3.96239 7.50717 3.54271 7.81661 3.23327C8.12604 2.92384 8.54573 2.75 8.98333 2.75H13.0167C13.4543 2.75 13.874 2.92384 14.1834 3.23327C14.4928 3.54271 14.6667 3.96239 14.6667 4.4V5.5" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.4167 5.5L16.775 16.6833C16.7294 17.1371 16.5163 17.5576 16.1773 17.8627C15.8383 18.1678 15.3977 18.3356 14.9417 18.3333H7.05833C6.60226 18.3356 6.16171 18.1678 5.82271 17.8627C5.48371 17.5576 5.2706 17.1371 5.225 16.6833L4.58333 5.5" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.16667 10.0833V14.6667M12.8333 10.0833V14.6667" stroke="currentColor" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CATALOG_GROUP_CREATE_PLUS_ICON = '<svg class="btn-catalog-group-create__plus" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CATALOG_ROW_DRAG_ICON = '<svg width="10" height="10" viewBox="0 0 10 9.5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="0.75" y1="0.75" x2="9.25" y2="0.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/><line x1="0.75" y1="8.75" x2="9.25" y2="8.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/><line x1="1.659" y1="4.75" x2="8.341" y2="4.75" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/></svg>';
const PROJ_IMG_CAM = '<img class="img-upload__cam" src="assets/catalog/add-image-camera.svg" width="36" height="36" alt="" aria-hidden="true">';
/* 「隐藏」图标：16×16 统一 1.5 线宽的眼+斜线（Tab 白胶囊内 / 「已隐藏」折叠条共用） */
const CATALOG_HIDE_ICON = '<span class="catalog-hide-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.6 8C12.5 10.2 10.4 11.7 8 11.7C5.6 11.7 3.5 10.2 2.4 8C3.5 5.8 5.6 4.3 8 4.3C10.4 4.3 12.5 5.8 13.6 8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.15" stroke="currentColor" stroke-width="1.5"/><path d="M3.2 12.9L12.8 3.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>';
const CATALOG_CHECK_OFF_ICON = '<svg class="catalog-check-off" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="10" cy="10" r="9.5" stroke="#D7D7D5"/></svg>';
const CATALOG_CHECK_ON_ICON = '<svg class="catalog-check-on" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#F32F41"/><path d="M6 10L9 13L15 7" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CATALOG_MEMBER_CHECK_ICON = '<span class="catalog-member-check" aria-hidden="true"><svg class="catalog-member-check__off" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="16.5" height="16.5" rx="2.25" stroke="#C8C9CC" stroke-width="1.5" fill="#fff"/></svg><svg class="catalog-member-check__on" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="18" height="18" rx="3" fill="#F32F41"/><path d="M4.5 9L7.5 12L13.5 5.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
const CATALOG_HIDDEN_CHEV_ICON = '<svg class="catalog-hidden-toggle__chev" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12.65 5.5L8 10.15L3.35 5.5" stroke="#929292" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CATALOG_DRAG_HINT_KEY = 'rtb_catalog_drag_hint_dismissed';

function renderCatalogGroupTabs() {
  const el = document.getElementById('catalogGroupTabs');
  if (!el) return;
  ensureSystemHiddenGroups();
  const active = getActiveCatalogGroupId();
  const bucket = getCatalogGroupBucket();
  const custom = getCustomCatalogGroups(bucket);
  const sysHidden = getSystemHiddenGroup(bucket);
  const tabs = [{ id: 'all', name: '全部' }, ...custom.map(g => ({ id: g.id, name: g.name }))];
  if (sysHidden) tabs.push({ id: sysHidden.id, name: sysHidden.name });
  if (!tabs.some(t => t.id === active)) setActiveCatalogGroupId('all');
  const cur = getActiveCatalogGroupId();
  el.innerHTML = tabs.map(t => {
    const isHiddenTab = !!(sysHidden && t.id === sysHidden.id);
    const label = `${isHiddenTab ? CATALOG_HIDE_ICON : ''}<span class="catalog-group-tab__label-text">${escapeHtml(t.name)}</span>`;
    return `<button type="button" class="catalog-group-tab${t.id === cur ? ' on' : ''}${isHiddenTab ? ' is-hidden-group' : ''}" data-catalog-group="${escapeAttr(t.id)}" role="tab" aria-selected="${t.id === cur ? 'true' : 'false'}">
      <span class="catalog-group-tab__face"><span class="catalog-group-tab__label">${label}</span></span>
    </button>`;
  }).join('');
  requestAnimationFrame(() => {
    if (document.documentElement.dataset.captureRevealHidden === '1'
      && typeof bakeCatalogGroupTabsRevealHidden === 'function') {
      bakeCatalogGroupTabsRevealHidden();
    } else {
      scrollActiveCatalogGroupTabIntoView();
    }
  });
}

function scrollActiveCatalogGroupTabIntoView() {
  /* capture 要展示右端「隐藏」时，禁止回拉到选中的「全部」 */
  if (document.documentElement.dataset.captureRevealHidden === '1') return;
  const el = document.getElementById('catalogGroupTabs');
  const on = el?.querySelector('.catalog-group-tab.on');
  if (!el || !on) return;
  ensureGroupTabFullyVisible(el, on);
}

/**
 * capture 专用：把分组条滚到最右，使「隐藏」整颗 Tab（含左侧图标）落在可视区。
 * html-to-design 常忽略 scrollLeft，故同时把位移烘焙进 transform，并保持 overflow:hidden 裁切左侧 Tab。
 */
function bakeCatalogGroupTabsRevealHidden() {
  const scroller = document.getElementById('catalogGroupTabs');
  const hiddenTab = scroller?.querySelector('.catalog-group-tab.is-hidden-group');
  if (!scroller || !hiddenTab) return false;
  document.documentElement.dataset.captureRevealHidden = '1';

  let track = scroller.querySelector('.catalog-group-scroll__capture-track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'catalog-group-scroll__capture-track';
    while (scroller.firstChild) track.appendChild(scroller.firstChild);
    scroller.appendChild(track);
  }

  scroller.scrollLeft = 0;
  scroller.style.overflow = 'hidden';
  void scroller.offsetWidth;
  const max = Math.max(0, track.scrollWidth - scroller.clientWidth);
  /* 再多让出一点，保证隐藏图标不被右侧 fade/齿轮区视觉压迫 */
  const shift = max;
  track.style.transform = shift > 0 ? `translateX(-${shift}px)` : '';
  scroller.scrollLeft = 0;
  return shift > 0 || !!hiddenTab;
}

function wireCatalogGroupScrollPan() {
  const el = document.getElementById('catalogGroupTabs');
  if (!el || el.dataset.panWired === '1') return;
  el.dataset.panWired = '1';
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  let panning = false;
  const THRESHOLD = 6;

  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return; /* 原生横向滑动 */
    if (e.button != null && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    moved = false;
    panning = false;
  });
  el.addEventListener('pointermove', e => {
    if (pointerId == null || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!panning && Math.abs(dx) < THRESHOLD) return;
    if (!panning) {
      panning = true;
      el.classList.add('is-panning');
      try { el.setPointerCapture(pointerId); } catch (_) {}
    }
    moved = true;
    el.scrollLeft = startScroll - dx;
    e.preventDefault();
  });
  const endPan = e => {
    if (pointerId == null || (e && e.pointerId !== pointerId)) return;
    if (panning) {
      el.classList.remove('is-panning');
      try { el.releasePointerCapture(pointerId); } catch (_) {}
    }
    if (moved) {
      el.dataset.suppressTabClick = '1';
      requestAnimationFrame(() => nudgePartialGroupTabIntoView(el));
    }
    pointerId = null;
    panning = false;
    moved = false;
  };
  el.addEventListener('pointerup', endPan);
  el.addEventListener('pointercancel', endPan);
  el.addEventListener('click', e => {
    if (el.dataset.suppressTabClick === '1') {
      e.preventDefault();
      e.stopPropagation();
      el.dataset.suppressTabClick = '';
    }
  }, true);
  wireGroupScrollPartialSnap(el);
}

function openCatalogGroupManage() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  closeAllCatalogSwipes();
  closeCatalogRowActions();
  /* 进入分组管理：所有行内展开一律收起 */
  state.catalogGroupExpandedId = null;
  state.catalogGroupMenuId = null;
  clearCatalogGroupStackClasses();
  renderCatalogGroupManage();
  projShowScreen('screen-p-groups');
}

function catalogGroupPrefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

function clearCatalogGroupStackClasses(opts) {
  const keepBusy = !!(opts && opts.keepBusy);
  const phone = document.querySelector('#frame .phone-inner') || document.querySelector('.phone-inner.phone');
  phone?.classList.remove('is-group-pushing');
  const groups = document.getElementById('screen-p-groups');
  const members = document.getElementById('screen-p-group-members');
  [groups, members].forEach(el => {
    if (!el) return;
    el.classList.remove(
      'is-push-enter', 'is-push-enter-active', 'is-push-under', 'is-push-under-active',
      'is-stack-front', 'is-stack-back',
      'is-pop-leave', 'is-pop-leave-active', 'is-pop-reveal', 'is-pop-reveal-active'
    );
  });
  if (!keepBusy) state.catalogGroupNavBusy = false;
}

function waitCatalogGroupNavEnd(el, fallbackMs, cb) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el?.removeEventListener('transitionend', onEnd);
    clearTimeout(t);
    cb();
  };
  const onEnd = (e) => {
    if (e.target !== el || e.propertyName !== 'transform') return;
    finish();
  };
  el?.addEventListener('transitionend', onEnd);
  const t = setTimeout(finish, fallbackMs);
}

function pushCatalogMembersScreen(groups, members) {
  if (state.catalogGroupNavBusy) return;
  state.catalogGroupNavBusy = true;
  clearCatalogGroupStackClasses({ keepBusy: true });
  const phone = groups.closest('.phone-inner') || document.querySelector('#frame .phone-inner');
  phone?.classList.add('is-group-pushing');
  document.querySelectorAll('#frame .screen').forEach(el => {
    if (el !== groups && el !== members) el.classList.add('hidden');
  });
  groups.classList.remove('hidden');
  members.classList.remove('hidden');
  members.classList.add('is-push-enter');
  groups.classList.add('is-push-under');
  void members.offsetWidth;
  requestAnimationFrame(() => {
    members.classList.add('is-push-enter-active');
    groups.classList.add('is-push-under-active');
  });
  waitCatalogGroupNavEnd(members, 360, () => {
    members.classList.remove('is-push-enter', 'is-push-enter-active');
    members.classList.add('is-stack-front');
    groups.classList.remove('is-push-under', 'is-push-under-active');
    groups.classList.add('is-stack-back');
    state.catalogGroupNavBusy = false;
    setFlowNavHighlight('price-group-members');
  });
}

/** 编辑成员 → 分组管理：成员页自右侧滑出 */
function popToCatalogGroupManage() {
  const groups = document.getElementById('screen-p-groups');
  const members = document.getElementById('screen-p-group-members');
  const canPop = members && groups && !members.classList.contains('hidden')
    && !catalogGroupPrefersReducedMotion()
    && !document.documentElement.classList.contains('capture-figma');
  if (!canPop) {
    openCatalogGroupManage();
    return;
  }
  if (state.catalogGroupNavBusy) return;
  state.catalogGroupNavBusy = true;
  closeAllCatalogSwipes();
  closeCatalogRowActions();
  state.catalogGroupExpandedId = null;
  state.catalogGroupMenuId = null;
  renderCatalogGroupManage();

  const phone = groups.closest('.phone-inner') || document.querySelector('#frame .phone-inner');
  phone?.classList.add('is-group-pushing');
  groups.classList.remove('hidden');
  members.classList.remove('hidden');
  members.classList.remove('is-stack-front', 'is-push-enter', 'is-push-enter-active');
  groups.classList.remove('is-stack-back', 'is-push-under', 'is-push-under-active');
  members.classList.add('is-pop-leave');
  groups.classList.add('is-pop-reveal');
  void members.offsetWidth;
  requestAnimationFrame(() => {
    members.classList.add('is-pop-leave-active');
    groups.classList.add('is-pop-reveal-active');
  });
  waitCatalogGroupNavEnd(members, 360, () => {
    members.classList.add('hidden');
    clearCatalogGroupStackClasses();
    groups.classList.remove('hidden');
    setFlowNavHighlight('price-group-menu');
  });
}

function renderCatalogGroupManage() {
  const listEl = document.getElementById('catalogGroupManageList');
  const emptyEl = document.getElementById('catalogGroupManageEmpty');
  if (!listEl) return;
  const groups = getActiveCatalogGroups();
  const noun = isProductCatalogTab() ? '个产品' : '个项目';
  if (!groups.length) {
    listEl.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    state.catalogGroupExpandedId = null;
    return;
  }
  emptyEl?.classList.add('hidden');
  const expandedId = state.catalogGroupExpandedId;
  listEl.innerHTML = `<div class="catalog-group-card" id="catalogGroupCard">${groups.map(g => {
    const n = (g.itemIds || []).length;
    const isSys = isCatalogSystemGroup(g);
    const open = !isSys && expandedId === g.id;
    const membersLabel = isProductCatalogTab() ? '包含产品' : '包含项目';
    const actions = isSys ? '' : `<div class="catalog-group-manage-actions${open ? '' : ' hidden'}">
      <div class="catalog-group-manage-actions__main">
        <button type="button" class="catalog-group-manage-act" data-group-act="members" data-group-id="${escapeAttr(g.id)}">
          <span class="catalog-group-manage-act__ico" aria-hidden="true">${CATALOG_GROUP_ACT_MEMBERS_ICON}</span>
          <span class="catalog-group-manage-act__label">${membersLabel}</span>
        </button>
        <button type="button" class="catalog-group-manage-act" data-group-act="rename" data-group-id="${escapeAttr(g.id)}">
          <span class="catalog-group-manage-act__ico" aria-hidden="true">${CATALOG_GROUP_ACT_RENAME_ICON}</span>
          <span class="catalog-group-manage-act__label">重命名</span>
        </button>
      </div>
      <button type="button" class="catalog-group-manage-act catalog-group-manage-act--delete" data-group-act="delete" data-group-id="${escapeAttr(g.id)}" aria-label="删除">
        <span class="catalog-group-manage-act__delete-btn" aria-hidden="true">${CATALOG_GROUP_ACT_DELETE_ICON}</span>
      </button>
    </div>`;
    return `<div class="catalog-group-manage-item${open ? ' is-open' : ''}" data-group-id="${escapeAttr(g.id)}"${isSys ? ' data-group-system="1"' : ''}>
      <div class="catalog-group-manage-row">
        ${isSys ? '<span class="catalog-group-manage-row__drag-spacer" aria-hidden="true"></span>' : `<button type="button" class="catalog-group-manage-row__drag" data-group-drag="${escapeAttr(g.id)}" aria-label="拖动排序">${CATALOG_GROUP_DRAG_ICON}</button>`}
        <button type="button" class="catalog-group-manage-row__main" data-group-row="${escapeAttr(g.id)}"${isSys ? ` data-group-members="${escapeAttr(g.id)}"` : ''}>
          <span class="catalog-group-manage-row__name">${escapeHtml(g.name)}</span>
          <span class="catalog-group-manage-row__meta">${n} ${noun}</span>
        </button>
        ${isSys ? '<span class="catalog-group-manage-row__more-spacer" aria-hidden="true"></span>' : `<button type="button" class="catalog-group-manage-row__more" data-group-toggle="${escapeAttr(g.id)}" aria-label="更多" aria-expanded="${open ? 'true' : 'false'}">⋯</button>`}
      </div>
      ${actions}
    </div>`;
  }).join('')}</div>`;
  wireCatalogGroupManageDrag();
}

function wireCatalogGroupManageDrag() {
  const card = document.getElementById('catalogGroupCard');
  if (!card) return;
  let draggingRow = null;
  let placeholder = null;
  let startY = 0;

  const finishDrag = () => {
    if (!draggingRow || !placeholder) return;
    const cardEl = document.getElementById('catalogGroupCard');
    if (cardEl) cardEl.insertBefore(draggingRow, placeholder);
    placeholder.remove();
    draggingRow.classList.remove('is-dragging');
    draggingRow.style.transform = '';
    draggingRow = null;
    placeholder = null;
    commitCatalogGroupOrderFromDom();
  };

  card.querySelectorAll('[data-group-drag]').forEach(handle => {
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const row = handle.closest('.catalog-group-manage-item');
      if (!row || row.dataset.groupSystem === '1') return;
      collapseCatalogGroupRowActions();
      draggingRow = row;
      startY = e.clientY;
      placeholder = document.createElement('div');
      placeholder.className = 'catalog-group-manage-item is-drag-placeholder';
      placeholder.dataset.groupId = row.dataset.groupId;
      row.parentNode.insertBefore(placeholder, row);
      row.classList.add('is-dragging');
      handle.setPointerCapture(e.pointerId);
      const onMove = ev => {
        if (!draggingRow) return;
        const dy = ev.clientY - startY;
        draggingRow.style.transform = `translateY(${dy}px)`;
        const slots = [...card.querySelectorAll('.catalog-group-manage-item:not(.is-dragging)')];
        let insertBefore = null;
        for (const slot of slots) {
          if (slot === placeholder) continue;
          const rect = slot.getBoundingClientRect();
          if (ev.clientY < rect.top + rect.height / 2) {
            insertBefore = slot;
            break;
          }
        }
        if (insertBefore) card.insertBefore(placeholder, insertBefore);
        else card.appendChild(placeholder);
      };
      const onUp = () => {
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        finishDrag();
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
  });
}

function commitCatalogGroupOrderFromDom() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const card = document.getElementById('catalogGroupCard');
  if (!card) return;
  const groups = getActiveCatalogGroups();
  const ids = [...card.querySelectorAll('.catalog-group-manage-item[data-group-id]:not([data-group-system="1"])')]
    .map(r => r.dataset.groupId)
    .filter(Boolean);
  const ordered = ids.map(id => groups.find(g => g.id === id && !g.system)).filter(Boolean);
  const sys = groups.find(g => g.system);
  if (ordered.length + (sys ? 1 : 0) !== groups.length) return;
  groups.splice(0, groups.length, ...(sys ? [...ordered, sys] : ordered));
  renderCatalogGroupTabs();
}

function collapseCatalogGroupRowActions() {
  state.catalogGroupExpandedId = null;
  document.querySelectorAll('.catalog-group-manage-item.is-open').forEach(el => {
    el.classList.remove('is-open');
    el.querySelector('.catalog-group-manage-actions')?.classList.add('hidden');
    el.querySelector('[data-group-toggle]')?.setAttribute('aria-expanded', 'false');
  });
}

/** 点行 / ⋯ → 行内展开三钮（手风琴）；系统组不展开 */
function toggleCatalogGroupRowActions(groupId) {
  const g = findCatalogGroupById(groupId);
  if (!g || isCatalogSystemGroup(g)) {
    if (g) openCatalogGroupMembers(groupId);
    return;
  }
  if (state.catalogGroupExpandedId === groupId) {
    collapseCatalogGroupRowActions();
    return;
  }
  state.catalogGroupExpandedId = groupId;
  document.querySelectorAll('.catalog-group-manage-item').forEach(el => {
    const open = el.dataset.groupId === groupId;
    el.classList.toggle('is-open', open);
    el.querySelector('.catalog-group-manage-actions')?.classList.toggle('hidden', !open);
    el.querySelector('[data-group-toggle]')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function handleCatalogGroupRowAction(act, groupId) {
  const id = groupId || state.catalogGroupExpandedId;
  if (!id || act === 'cancel') return;
  const g = findCatalogGroupById(id);
  if (!g) return;
  if (isCatalogSystemGroup(g) && act !== 'members') {
    showToast('系统分组不可重命名或删除', true);
    return;
  }
  if (act === 'members') openCatalogGroupMembers(id);
  else if (act === 'rename') openCatalogGroupNameDialog('rename', id);
  else if (act === 'delete') openCatalogGroupDeleteConfirm(id);
}

/** @deprecated 深链兼容：改为行内展开 */
function openCatalogGroupRowMenu(groupId) {
  openCatalogGroupManage();
  requestAnimationFrame(() => toggleCatalogGroupRowActions(groupId));
}
function closeCatalogGroupRowMenu() {
  collapseCatalogGroupRowActions();
  document.getElementById('catalogGroupMenuMask')?.classList.remove('open');
  state.catalogGroupMenuId = null;
}
function handleCatalogGroupMenuAction(act) {
  const id = state.catalogGroupMenuId || state.catalogGroupExpandedId;
  closeCatalogGroupRowMenu();
  if (!id || act === 'cancel') return;
  handleCatalogGroupRowAction(act, id);
}

function openCatalogGroupNameDialog(mode, groupId) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  state.catalogGroupNameMode = mode;
  state.catalogGroupEditingId = groupId || null;
  const title = document.getElementById('catalogGroupNameTitle');
  const input = document.getElementById('catalogGroupNameInput');
  if (title) title.textContent = mode === 'rename' ? '重命名分组' : '新建分组';
  if (input) {
    const g = findCatalogGroupById(groupId);
    input.value = mode === 'rename' && g ? g.name : '';
    input.classList.remove('is-error');
  }
  document.getElementById('catalogGroupNameMask')?.classList.add('show');
  setTimeout(() => input?.focus(), 50);
}

function closeCatalogGroupNameDialog() {
  document.getElementById('catalogGroupNameMask')?.classList.remove('show');
  state.catalogGroupNameMode = null;
  state.catalogGroupEditingId = null;
  /* 从设置分组 Sheet 唤起时取消新建：清 resume，Sheet 仍打开 */
  state.catalogAssignResumeAfterGroupCreate = false;
}

function confirmCatalogGroupNameDialog() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const input = document.getElementById('catalogGroupNameInput');
  const name = (input?.value || '').trim();
  input?.classList.remove('is-error');
  if (!name) {
    input?.classList.add('is-error');
    showToast('请输入分组名称', true);
    return;
  }
  const groups = getActiveCatalogGroups();
  const mode = state.catalogGroupNameMode;
  const editingId = state.catalogGroupEditingId;
  if (groups.some(g => g.name === name && g.id !== editingId)) {
    input?.classList.add('is-error');
    showToast('分组名称已存在', true);
    return;
  }
  const resumeAssign = !!state.catalogAssignResumeAfterGroupCreate;
  const resumeItemId = resumeAssign ? state.catalogAssignItemId : null;
  let createdId = null;
  if (mode === 'rename' && editingId) {
    const g = findCatalogGroupById(editingId);
    if (isCatalogSystemGroup(g)) {
      showToast('系统分组不可重命名', true);
      return;
    }
    if (g) g.name = name;
    showToast('已重命名');
  } else {
    const g = { id: catalogGroupUid(), name, itemIds: [] };
    groups.push(g);
    createdId = g.id;
    if (!resumeAssign) setActiveCatalogGroupId(g.id);
    showToast('已新建分组');
  }
  state.catalogAssignResumeAfterGroupCreate = false;
  document.getElementById('catalogGroupNameMask')?.classList.remove('show');
  state.catalogGroupNameMode = null;
  state.catalogGroupEditingId = null;
  renderCatalogGroupManage();
  renderCatalogGroupTabs();
  if (resumeItemId && createdId) {
    state.catalogAssignPrefillGroupId = createdId;
    openCatalogItemGroupSheet(resumeItemId);
  } else if (typeof projRenderList === 'function') {
    projRenderList();
  }
}

function openCatalogGroupDeleteConfirm(groupId) {
  state.catalogGroupDeletingId = groupId;
  document.getElementById('catalogGroupDeleteMask')?.classList.add('show');
}

function closeCatalogGroupDeleteConfirm() {
  document.getElementById('catalogGroupDeleteMask')?.classList.remove('show');
  state.catalogGroupDeletingId = null;
}

function confirmCatalogGroupDelete() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const id = state.catalogGroupDeletingId;
  const g = findCatalogGroupById(id);
  if (isCatalogSystemGroup(g)) {
    showToast('系统分组不可删除', true);
    closeCatalogGroupDeleteConfirm();
    return;
  }
  const groups = getActiveCatalogGroups();
  const idx = groups.findIndex(g => g.id === id);
  if (idx >= 0) groups.splice(idx, 1);
  if (getActiveCatalogGroupId() === id) setActiveCatalogGroupId('all');
  closeCatalogGroupDeleteConfirm();
  renderCatalogGroupManage();
  renderCatalogGroupTabs();
  showToast('已删除分组');
}

function moveCatalogGroup(groupId, dir) {
  const groups = getActiveCatalogGroups();
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx < 0) return;
  const next = dir === 'up' ? idx - 1 : idx + 1;
  if (next < 0 || next >= groups.length) return;
  const tmp = groups[idx];
  groups[idx] = groups[next];
  groups[next] = tmp;
  renderCatalogGroupManage();
  renderCatalogGroupTabs();
}

function openCatalogGroupMembers(groupId) {
  const g = findCatalogGroupById(groupId);
  if (!g) return;
  state.catalogMembersGroupId = groupId;
  const isProduct = isProductCatalogTab();
  /* 系统「隐藏」组：标题直接叫「隐藏项目 / 隐藏产品」；自定义组：包含项目/包含产品 · {组名} */
  const titleText = isCatalogSystemGroup(g)
    ? (isProduct ? '隐藏产品' : '隐藏项目')
    : `${isProduct ? '包含产品' : '包含项目'} · ${g.name}`;
  const title = document.getElementById('catalogGroupMembersTitle');
  if (title) title.textContent = titleText;
  renderCatalogGroupMembers();
  const groups = document.getElementById('screen-p-groups');
  const members = document.getElementById('screen-p-group-members');
  const fromGroups = !!(groups && !groups.classList.contains('hidden'));
  const usePush = fromGroups
    && members
    && !catalogGroupPrefersReducedMotion()
    && !document.documentElement.classList.contains('capture-figma');
  if (usePush) pushCatalogMembersScreen(groups, members);
  else {
    clearCatalogGroupStackClasses();
    projShowScreen('screen-p-group-members');
  }
}

function syncCatalogGroupMembersCount() {
  const listEl = document.getElementById('catalogGroupMembersList');
  const countEl = document.getElementById('catalogGroupMembersCount');
  if (!listEl || !countEl) return;
  const n = listEl.querySelectorAll('input[data-member-id]:checked').length;
  countEl.textContent = `已选 ${n}`;
}

function renderCatalogGroupMembers() {
  const listEl = document.getElementById('catalogGroupMembersList');
  if (!listEl) return;
  const g = findCatalogGroupById(state.catalogMembersGroupId);
  const selected = new Set(g?.itemIds || []);
  const catalog = getActivePriceCatalog();
  const sorted = projSortCatalog([...catalog]);
  if (!sorted.length) {
    listEl.innerHTML = `<div class="catalog-group-manage-empty" style="padding:32px 16px"><p class="catalog-group-manage-empty__hint">暂无可选${isProductCatalogTab() ? '产品' : '项目'}</p></div>`;
    syncCatalogGroupMembersCount();
    return;
  }
  listEl.innerHTML = sorted.map(p => {
    const checked = selected.has(p.id) ? ' checked' : '';
    return `<label class="catalog-member-item">
      <input type="checkbox" data-member-id="${escapeAttr(p.id)}"${checked}>
      ${CATALOG_MEMBER_CHECK_ICON}
      <span class="catalog-member-item__main">
        <span class="catalog-member-item__name">${escapeHtml(p.name)}</span>
      </span>
      <span class="catalog-member-item__price">¥${Number(p.price) || 0}</span>
    </label>`;
  }).join('');
  syncCatalogGroupMembersCount();
}

function saveCatalogGroupMembers() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const g = findCatalogGroupById(state.catalogMembersGroupId);
  if (!g) return;
  const bucket = getCatalogGroupBucket();
  const listEl = document.getElementById('catalogGroupMembersList');
  const ids = [...(listEl?.querySelectorAll('input[data-member-id]:checked') || [])]
    .map(el => el.dataset.memberId)
    .filter(Boolean);
  g.itemIds = ids;
  if (isCatalogSystemGroup(g)) syncItemHiddenFromSystemGroup(g, bucket);
  showToast('已更新成员');
  popToCatalogGroupManage();
}

function openCatalogItemGroupSheet(itemId) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const item = findCatalogItemById(itemId);
  if (!item) return;
  const bucket = getCatalogProducts().some(x => x.id === itemId) ? 'product' : 'project';
  state.catalogAssignItemId = itemId;
  state.catalogAssignBucket = bucket;
  const title = document.getElementById('catalogItemGroupTitle');
  if (title) title.textContent = item.name;
  const groups = getCatalogGroupsForBucket(bucket);
  const listEl = document.getElementById('catalogItemGroupList');
  if (!listEl) return;
  const custom = getCustomCatalogGroups(bucket);
  const mask = document.getElementById('catalogItemGroupMask');
  mask?.classList.toggle('is-assign-empty', !custom.length);
  if (!custom.length) {
    listEl.innerHTML = `<div class="catalog-group-sheet-empty">
      <button type="button" class="btn-main btn-outline-brand" id="btnCatalogItemGroupGoManage"><svg class="btn-main__plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>去新建分组</span></button>
    </div>`;
    document.getElementById('btnCatalogItemGroupGoManage')?.addEventListener('click', () => {
      state.catalogAssignResumeAfterGroupCreate = true;
      openCatalogGroupNameDialog('create');
    });
  } else {
    const prefillId = state.catalogAssignPrefillGroupId;
    state.catalogAssignPrefillGroupId = null;
    listEl.innerHTML = groups.map(g => {
      const on = (g.itemIds || []).includes(itemId) || (!!prefillId && g.id === prefillId);
      const count = (g.itemIds || []).length;
      const label = g.system ? escapeHtml(g.name) : `${escapeHtml(g.name)}（${count}）`;
      return `<label class="catalog-group-assign-row${on ? ' is-on' : ''}">
        <input type="checkbox" data-assign-group="${escapeAttr(g.id)}"${on ? ' checked' : ''}>
        <span class="catalog-group-assign-row__name">${label}</span>
        <span class="catalog-group-assign-row__check" aria-hidden="true">${CATALOG_CHECK_OFF_ICON}${CATALOG_CHECK_ON_ICON}</span>
      </label>`;
    }).join('');
    listEl.querySelectorAll('.catalog-group-assign-row').forEach(row => {
      const input = row.querySelector('input');
      input?.addEventListener('change', () => {
        row.classList.toggle('is-on', !!input.checked);
      });
    });
  }
  mask?.classList.add('open');
}

function closeCatalogItemGroupSheet() {
  const mask = document.getElementById('catalogItemGroupMask');
  mask?.classList.remove('open');
  mask?.classList.remove('is-assign-empty');
  state.catalogAssignItemId = null;
  state.catalogAssignBucket = null;
  state.catalogAssignResumeAfterGroupCreate = false;
  state.catalogAssignPrefillGroupId = null;
}

function confirmCatalogItemGroupSheet() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const itemId = state.catalogAssignItemId;
  const bucket = state.catalogAssignBucket
    || (getCatalogProducts().some(x => x.id === itemId) ? 'product' : 'project');
  if (!itemId) {
    closeCatalogItemGroupSheet();
    return;
  }
  const groups = getCatalogGroupsForBucket(bucket);
  const listEl = document.getElementById('catalogItemGroupList');
  const selected = new Set(
    [...(listEl?.querySelectorAll('input[data-assign-group]:checked') || [])]
      .map(el => el.dataset.assignGroup)
      .filter(Boolean)
  );
  groups.forEach(g => {
    const set = new Set(g.itemIds || []);
    if (selected.has(g.id)) set.add(itemId);
    else set.delete(itemId);
    g.itemIds = [...set];
  });
  const item = findCatalogItemById(itemId);
  const sysHidden = getSystemHiddenGroup(bucket);
  if (item && sysHidden) {
    const nextHidden = (sysHidden.itemIds || []).includes(itemId);
    item.hidden = nextHidden;
    applyCatalogHiddenClearsBookable(item, nextHidden);
  }
  closeCatalogItemGroupSheet();
  showToast('已更新分组');
  projRenderList();
}

function syncBalanceCanBuyProductsField() {
  /* 面值不可用于购买产品：字段固定为 false，无 Step2 配置项 */
  if (state.benefits) state.benefits.balanceCanBuyProducts = false;
}

function collectTemplateProjectRefs(templates) {
  const refs = {};
  const add = (name, tplId) => {
    if (!name || !tplId) return;
    if (!refs[name]) refs[name] = new Set();
    refs[name].add(tplId);
  };
  for (const tpl of templates || []) {
    if (tpl.benefits?.timesOrValidity && tpl.projectItems?.length) {
      tpl.projectItems.forEach(item => add(item.name, tpl.id));
    }
    if (tpl.benefits?.projectDiscount && tpl.memberPrices) {
      Object.keys(tpl.memberPrices).forEach(name => add(name, tpl.id));
    }
  }
  return refs;
}

function syncProjectCatalogBindings() {
  const refs = collectTemplateProjectRefs(state.templates);
  for (const p of state.projectCatalog || []) {
    const ids = refs[p.name] ? [...refs[p.name]] : [];
    p.boundToCard = ids.length > 0;
    p.boundTemplateIds = ids;
    p.boundTemplateId = ids[0] || null;
    p.boundTemplateNames = ids.map(id => getTemplateById(id)?.name || id);
  }
}

function collectTemplateProductRefs(templates) {
  const refs = {};
  const add = (name, tplId) => {
    if (!name || !tplId) return;
    if (!refs[name]) refs[name] = new Set();
    refs[name].add(tplId);
  };
  for (const tpl of templates || []) {
    if (tpl.benefits?.products && tpl.productItems?.length) {
      tpl.productItems.forEach(item => add(item.name, tpl.id));
    }
  }
  return refs;
}

function syncProductCatalogBindings() {
  const refs = collectTemplateProductRefs(state.templates);
  for (const p of state.productCatalog || []) {
    const ids = refs[p.name] ? [...refs[p.name]] : [];
    p.boundToCard = ids.length > 0;
    p.boundTemplateIds = ids;
    p.boundTemplateId = ids[0] || null;
    p.boundTemplateNames = ids.map(id => getTemplateById(id)?.name || id);
  }
}

function syncAllCatalogBindings() {
  syncProjectCatalogBindings();
  syncProductCatalogBindings();
}

function getCatalogProjects() { return state.projectCatalog || []; }
function getProjectPrice(name) {
  const p = getCatalogProjects().find(x => x.name === name);
  return p != null ? p.price : 0;
}
function getOnSaleProjectNames() {
  return getCatalogProjects().filter(p => p.onSale).map(p => p.name);
}
function compareCatalogPickerOrder(a, b) {
  const ao = a.sortOrder ?? 0;
  const bo = b.sortOrder ?? 0;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name, 'zh-CN');
}
function ensureCatalogSortOrder(catalog) {
  const items = catalog || getCatalogProjects();
  if (!items.some(p => p.sortOrder == null)) return;
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  sorted.forEach((p, i) => { p.sortOrder = i; });
}
function nextCatalogSortOrder(catalog) {
  const list = catalog || getActivePriceCatalog();
  ensureCatalogSortOrder(list);
  const max = Math.max(-1, ...list.map(p => p.sortOrder ?? 0));
  return max + 1;
}
function getAllProjectNamesForPicker() {
  ensureCatalogSortOrder();
  return [...getCatalogProjects()]
    .filter(p => p.onSale && !p.hidden)
    .sort(compareCatalogPickerOrder)
    .map(p => p.name);
}
function formatProjectPrice(name) {
  const p = getProjectPrice(name);
  return p != null && p > 0 ? `¥${p}` : '';
}

const VALIDITY_LABELS = { permanent: '永久有效', '1y': '1 年', '6m': '6 月' };
const DEFAULT_AUDIENCE_OPTIONS = [
  { key: 'all', label: '全部', fixed: true },
  { key: 'new_first', label: '新客首开', preset: true },
  { key: 'old_renew', label: '老客续充', preset: true },
  { key: 'kids', label: '儿童专享', preset: true },
];

function cloneDefaultAudienceOptions() {
  return DEFAULT_AUDIENCE_OPTIONS.map(o => ({ ...o }));
}

function getAudienceLabelMap() {
  return Object.fromEntries(state.audienceOptions.map(d => [d.key, d.label]));
}

function getAudienceSpecificKeys() {
  return state.audienceOptions.filter(d => d.key !== 'all').map(d => d.key);
}

function normalizeAudience(raw) {
  const labels = getAudienceLabelMap();
  if (!raw) return ['all'];
  if (Array.isArray(raw)) {
    const keys = raw.filter(k => labels[k]);
    if (!keys.length || keys.includes('all')) return ['all'];
    const specific = getAudienceSpecificKeys();
    if (specific.length && specific.every(k => keys.includes(k))) return ['all'];
    return keys;
  }
  const legacy = { all: ['all'], new: ['new_first'], old: ['old_renew'] };
  return normalizeAudience(legacy[raw] || ['all']);
}

function formatAudienceDisplay(audience) {
  const labels = getAudienceLabelMap();
  const keys = normalizeAudience(audience);
  if (keys.includes('all')) return labels.all || '全部';
  return keys.map(k => labels[k] || k).join('、');
}

function syncAudienceChecksFromState() {
  const keys = new Set(normalizeAudience(state.audience));
  document.querySelectorAll('#audienceOptionList input[name="audience"]').forEach(cb => {
    cb.checked = keys.has(cb.value);
  });
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(text) {
  return escapeAttr(text).replace(/>/g, '&gt;');
}

function chevronRightHtml() {
  return '<svg class="icon-chevron-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
}

/* demo L22119-22152 */
const DURATION_UNIT_LABELS = { day: '日', month: '月', year: '年', permanent: '永久', minute: '分', hour: '时' };
const DURATION_UNITS = ['day', 'month', 'year', 'permanent'];
const PROJ_SERVICE_DURATION_UNITS = ['minute', 'hour'];
const PROJ_SERVICE_DURATION_MAX_MIN = PROJ_DUR_HOUR_MAX * 60;

/** 全局输入边界（边界测试 / 防超长） */
const INPUT_LIMITS = {
  CARD_NAME: 30,
  PROJECT_NAME: 30,
  PRODUCT_NAME: 30,
  GROUP_NAME: 20,
  SPEC: 20,
  PERSON_NAME: 20,
  SCHEME_NAME: 20,
  STOCK_NAME: 30,
  BARCODE: 32,
  REMARK_LONG: 500,
  REMARK_SHORT: 200,
  PHONE: 11,
  SEARCH: 50,
  MONEY_MAX: 999999.99,
  MONEY_INT_DIGITS: 6,
  VALIDITY_DAY_MAX: 3650,
  VALIDITY_MONTH_MAX: 120,
  VALIDITY_YEAR_MAX: 10,
  QTY_MAX: 999,
  CART_QTY_MAX: 999,
  YEARS_EXP_MAX: 50,
  PCT_MAX: 100,
};

function formatMoneyLimitLabel() {
  return '999,999.99';
}

/* demo L22158-22162 */
function clampMoneyNumber(n) {
  if (!Number.isFinite(n) || n < 0) return 0;
  const capped = Math.min(INPUT_LIMITS.MONEY_MAX, n);
  return Math.round(capped * 100) / 100;
}

/* demo L22281-22453 */
function durationFieldsToValiditySnap(unit, amount) {
  if (unit === 'permanent') {
    return { validityKey: 'permanent', validityDays: null, validityMonths: null, validityCustomUnit: 'days' };
  }
  const n = parseDurationAmount(amount);
  if (!n) {
    return {
      validityKey: 'custom',
      validityDays: null,
      validityMonths: null,
      validityCustomUnit: unit === 'day' ? 'days' : 'months',
    };
  }
  if (unit === 'day') {
    return { validityKey: 'custom', validityDays: n, validityMonths: null, validityCustomUnit: 'days' };
  }
  if (unit === 'month') {
    return { validityKey: 'custom', validityDays: null, validityMonths: n, validityCustomUnit: 'months' };
  }
  if (unit === 'year') {
    return { validityKey: 'custom', validityDays: null, validityMonths: n * 12, validityCustomUnit: 'months' };
  }
  return { validityKey: 'permanent', validityDays: null, validityMonths: null, validityCustomUnit: 'days' };
}

function buildDurationInputHtml(opts = {}) {
  const unitLabels = opts.unitLabels || DURATION_UNIT_LABELS;
  const includePermanent = opts.includePermanent !== false;
  const units = opts.units
    || (includePermanent ? DURATION_UNITS : DURATION_UNITS.filter(u => u !== 'permanent'));
  const unit = units.includes(opts.unit) ? opts.unit : (units[0] || 'month');
  const amount = opts.amount ?? '';
  const confirmed = opts.confirmed !== false && (unit === 'permanent' || parseDurationAmount(amount));
  const fieldHidden = unit === 'permanent' ? ' is-hidden' : '';
  const amountVal = amount != null && amount !== '' ? String(amount) : '';
  const idAttr = opts.id ? ` id="${escapeAttr(opts.id)}"` : '';
  const dataId = opts.id ? ` data-duration-id="${escapeAttr(opts.id)}"` : '';
  const unitBtns = units.map(u =>
    `<button type="button" class="duration-input__unit${u === unit ? ' is-active' : ''}" data-duration-unit="${u}">${unitLabels[u] || u}</button>`
  ).join('');
  const gridCols = units.length;
  const activeIdx = Math.max(0, units.indexOf(unit));
  const indicatorStyle = `width:calc((100% - 2 * var(--dur-seg-inset, 2px)) / ${gridCols});transform:translateX(${activeIdx * 100}%)`;
  // 含「永久」时每格至少 ~34px，避免两字换行出框
  const colW = units.includes('permanent') ? 34 : 30;
  const unitsWidth = Math.max(units.includes('permanent') ? 136 : 90, gridCols * colW);
  const rootWidth = 68 + 8 + unitsWidth;
  return `<div class="duration-input"${idAttr}${dataId} style="width:${rootWidth}px">
    <div class="duration-input__field${fieldHidden}" data-duration-field>
      <input type="text" class="duration-input__num${confirmed ? ' is-confirmed' : ''}" data-duration-num inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="请输入" value="${escapeAttr(amountVal)}" />
    </div>
    <div class="duration-input__units" data-duration-units style="grid-template-columns:repeat(${gridCols},1fr);flex:0 0 ${unitsWidth}px;width:${unitsWidth}px">
      <span class="duration-seg-indicator" style="${indicatorStyle}" aria-hidden="true"></span>${unitBtns}
    </div>
  </div>`;
}

function syncDurationSegIndicator(root, unit) {
  const track = root.querySelector('[data-duration-units]');
  const indicator = track?.querySelector('.duration-seg-indicator');
  const buttons = track ? [...track.querySelectorAll('[data-duration-unit]')] : [];
  const idx = buttons.findIndex(b => b.dataset.durationUnit === unit);
  if (!indicator || idx < 0 || !buttons.length) return;
  indicator.style.width = `calc((100% - 2 * var(--dur-seg-inset, 2px)) / ${buttons.length})`;
  indicator.style.transform = `translateX(${idx * 100}%)`;
}

function syncDurationInputDom(root, unit, amount) {
  if (!root) return;
  const field = root.querySelector('[data-duration-field]');
  const input = root.querySelector('[data-duration-num]');
  if (field) field.classList.toggle('is-hidden', unit === 'permanent');
  if (input) {
    const n = parseDurationAmount(amount);
    const editing = document.activeElement === input;
    input.value = unit === 'permanent' ? '' : (n ? String(n) : (amount != null && amount !== '' ? String(amount) : ''));
    input.classList.toggle('is-confirmed', !editing && (unit === 'permanent' || !!n));
  }
  root.querySelectorAll('[data-duration-unit]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.durationUnit === unit);
  });
  syncDurationSegIndicator(root, unit);
}

function wireDurationInput(root, handlers) {
  if (!root) return;
  const input = root.querySelector('[data-duration-num]');
  root.querySelectorAll('[data-duration-unit]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      const nextUnit = btn.dataset.durationUnit;
      const prev = handlers.get();
      let nextAmount = prev.amount;
      if (nextUnit === 'permanent') nextAmount = null;
      else if (handlers.mapAmountOnUnitChange) {
        nextAmount = handlers.mapAmountOnUnitChange(prev.unit, nextUnit, prev.amount);
      }
      handlers.set({ unit: nextUnit, amount: nextAmount });
      syncDurationInputDom(root, nextUnit, nextAmount);
      handlers.onChange?.();
    };
  });
  if (input) {
    input.onfocus = () => input.classList.remove('is-confirmed');
    input.oninput = () => {
      input.value = input.value.replace(/\D/g, '');
      const prev = handlers.get();
      handlers.set({ unit: prev.unit, amount: input.value });
      handlers.onChange?.();
    };
    input.onblur = () => {
      const prev = handlers.get();
      let n = parseDurationAmount(input.value);
      if (handlers.clampAmount) n = handlers.clampAmount(prev.unit, n);
      handlers.set({ unit: prev.unit, amount: n });
      syncDurationInputDom(root, prev.unit, n);
      handlers.onChange?.();
    };
  }
  const cur = handlers.get?.() || {};
  syncDurationInputDom(root, cur.unit || 'month', cur.amount);
}

function minutesToServiceDurationFields(mins) {
  const m = Math.max(0, parseInt(mins, 10) || 0);
  if (m > 0 && m % 60 === 0) {
    const h = m / 60;
    if (h <= PROJ_DUR_HOUR_MAX) return { unit: 'hour', amount: h };
  }
  return { unit: 'minute', amount: m > 0 ? m : null };
}

function serviceDurationFieldsToMinutes(unit, amount) {
  const n = parseDurationAmount(amount);
  if (!n) return null;
  if (unit === 'hour') return Math.min(PROJ_SERVICE_DURATION_MAX_MIN, n * 60);
  return Math.min(PROJ_SERVICE_DURATION_MAX_MIN, n);
}

function mapServiceDurationAmountOnUnitChange(fromUnit, toUnit, amount) {
  const mins = serviceDurationFieldsToMinutes(fromUnit, amount);
  if (mins == null) return null;
  if (toUnit === 'hour') return Math.max(1, Math.min(PROJ_DUR_HOUR_MAX, Math.round(mins / 60) || 1));
  return Math.max(1, Math.min(PROJ_SERVICE_DURATION_MAX_MIN, mins));
}

function clampServiceDurationAmount(unit, amount) {
  const n = parseDurationAmount(amount);
  if (!n) return null;
  if (unit === 'hour') return Math.min(PROJ_DUR_HOUR_MAX, n);
  return Math.min(PROJ_SERVICE_DURATION_MAX_MIN, n);
}

function wireProjServiceDurationInput(container) {
  const root = container?.querySelector('#projServiceDuration');
  if (!root || !state.projFormState) return;
  wireDurationInput(root, {
    get: () => {
      if (state.projFormState._durUnit) {
        return { unit: state.projFormState._durUnit, amount: state.projFormState._durAmount };
      }
      return minutesToServiceDurationFields(state.projFormState.duration);
    },
    set: ({ unit, amount }) => {
      state.projFormState._durUnit = unit;
      state.projFormState._durAmount = amount;
      const mins = serviceDurationFieldsToMinutes(unit, amount);
      if (mins != null) state.projFormState.duration = mins;
    },
    mapAmountOnUnitChange: mapServiceDurationAmountOnUnitChange,
    clampAmount: clampServiceDurationAmount,
  });
}

/* demo L23832-25395 */
function projUid() { return 'p' + Date.now().toString(36); }

function projFormatDurationText(mins) {
  const m = Math.max(0, parseInt(mins, 10) || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h > 0 && r > 0) return `${h}小时${r}分`;
  if (h > 0) return `${h}小时`;
  return `${r}分`;
}

const CATALOG_DUR_CLOCK_ICON = '<svg class="dur-clock" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function projFormatDurationListHtml(mins) {
  const m = Math.max(0, parseInt(mins, 10) || 0);
  return `<span class="dur-cell"><span class="dur-text">${m}</span></span>`;
}

function projFormatMeteringListHtml(p) {
  return projFormatDurationListHtml(p && p.duration);
}

function isTimesMeteringProject(_p) {
  return false;
}

function projMinutesToWheel(total) {
  const capped = Math.min(PROJ_DUR_HOUR_MAX * 60 + 55, Math.max(0, parseInt(total, 10) || 0));
  let hours = Math.floor(capped / 60);
  let minutes = capped % 60;
  minutes = Math.round(minutes / PROJ_DUR_MIN_STEP) * PROJ_DUR_MIN_STEP;
  if (minutes >= 60) { hours += 1; minutes = 0; }
  if (hours > PROJ_DUR_HOUR_MAX) { hours = PROJ_DUR_HOUR_MAX; minutes = 55; }
  return { hours, minutes };
}

function projBuildIosColHtml(min, max, suffix) {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i;
    return `<div class="ios-picker-item" data-value="${v}">${v}${suffix}</div>`;
  }).join('');
}

function projBuildIosMinColHtml() {
  const items = [];
  for (let m = 0; m <= 55; m += PROJ_DUR_MIN_STEP) {
    items.push(`<div class="ios-picker-item" data-value="${m}">${m}分</div>`);
  }
  return items.join('');
}

function projGetIosColValue(col) {
  if (!col) return 0;
  const idx = Math.round(col.scrollTop / PROJ_IOS_PICKER_ITEM_H);
  const items = col.querySelectorAll('.ios-picker-item');
  const el = items[Math.max(0, Math.min(items.length - 1, idx))];
  return parseInt(el?.dataset.value, 10) || 0;
}

function projSyncIosColActive(col) {
  if (!col) return;
  const idx = Math.round(col.scrollTop / PROJ_IOS_PICKER_ITEM_H);
  col.querySelectorAll('.ios-picker-item').forEach((el, i) => {
    el.classList.toggle('is-active', i === idx);
    el.classList.toggle('is-near', Math.abs(i - idx) === 1);
  });
}

function projScrollIosColTo(col, value) {
  if (!col) return;
  const items = [...col.querySelectorAll('.ios-picker-item')];
  const idx = Math.max(0, items.findIndex(el => parseInt(el.dataset.value, 10) === value));
  col.scrollTop = idx * PROJ_IOS_PICKER_ITEM_H;
  projSyncIosColActive(col);
}

function projSnapIosColToNearest(col, opts = {}) {
  if (!col) return;
  const idx = Math.round(col.scrollTop / PROJ_IOS_PICKER_ITEM_H);
  const top = idx * PROJ_IOS_PICKER_ITEM_H;
  if (opts.smooth && typeof col.scrollTo === 'function') col.scrollTo({ top, behavior: 'smooth' });
  else { col.scrollTop = top; projSyncIosColActive(col); }
}

function projWireIosCol(col, onScroll) {
  if (!col || col.dataset.projWired) return;
  col.dataset.projWired = '1';
  col.addEventListener('scroll', () => {
    projSyncIosColActive(col);
    clearTimeout(projDurWheelTimer);
    projDurWheelTimer = setTimeout(() => {
      projSnapIosColToNearest(col);
      onScroll();
      projSyncIosColActive(col);
    }, 80);
  }, { passive: true });
  col.addEventListener('wheel', e => e.preventDefault(), { passive: false });
}

function projWireIosColMouseDrag(col) {
  if (!col || col.dataset.projDragWired) return;
  col.dataset.projDragWired = '1';
  let dragging = false, startY = 0, startScrollTop = 0, activePointerId = null, dragRafId = null;
  const endDrag = e => {
    if (!dragging || e.pointerId !== activePointerId) return;
    dragging = false;
    if (dragRafId) { cancelAnimationFrame(dragRafId); dragRafId = null; }
    col.classList.remove('is-dragging');
    try { col.releasePointerCapture(activePointerId); } catch (_) {}
    activePointerId = null;
    projSnapIosColToNearest(col, { smooth: true });
  };
  col.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true;
    activePointerId = e.pointerId;
    startY = e.clientY;
    startScrollTop = col.scrollTop;
    col.classList.add('is-dragging');
    col.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  col.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== activePointerId) return;
    const nextTop = startScrollTop - (e.clientY - startY);
    if (dragRafId) cancelAnimationFrame(dragRafId);
    dragRafId = requestAnimationFrame(() => { col.scrollTop = nextTop; projSyncIosColActive(col); dragRafId = null; });
    e.preventDefault();
  });
  col.addEventListener('pointerup', endDrag);
  col.addEventListener('pointercancel', endDrag);
}

function projReadDurFromWheels() {
  projDurDraft.hours = projGetIosColValue(document.getElementById('durHourCol'));
  projDurDraft.minutes = projGetIosColValue(document.getElementById('durMinCol'));
}

function projScrollDurWheels() {
  projScrollIosColTo(document.getElementById('durHourCol'), projDurDraft.hours);
  projScrollIosColTo(document.getElementById('durMinCol'), projDurDraft.minutes);
}

function projRenderDurChips() {
  const row = document.getElementById('durChipRow');
  if (!row) return;
  const total = projDurDraft.hours * 60 + projDurDraft.minutes;
  row.innerHTML = PROJ_DUR_CHIP_PRESETS.map(p =>
    `<button type="button" class="validity-chip ${total === p.minutes ? 'on' : ''}" data-dur-chip="${p.minutes}">${p.label}</button>`
  ).join('');
  row.querySelectorAll('[data-dur-chip]').forEach(btn => {
    btn.onclick = () => {
      const w = projMinutesToWheel(+btn.dataset.durChip);
      projDurDraft.hours = w.hours;
      projDurDraft.minutes = w.minutes;
      projScrollDurWheels();
      projRenderDurChips();
    };
  });
}

function initProjDurPicker() {
  const hourCol = document.getElementById('durHourCol');
  const minCol = document.getElementById('durMinCol');
  if (!hourCol || !minCol) return;
  hourCol.innerHTML = projBuildIosColHtml(0, PROJ_DUR_HOUR_MAX, '小时');
  minCol.innerHTML = projBuildIosMinColHtml();
  projWireIosCol(hourCol, () => { projReadDurFromWheels(); projRenderDurChips(); });
  projWireIosCol(minCol, () => { projReadDurFromWheels(); projRenderDurChips(); });
  projWireIosColMouseDrag(hourCol);
  projWireIosColMouseDrag(minCol);
}

function openDurPicker() {
  closeAmountKeypad();
  projDurDraft = projMinutesToWheel(state.projFormState?.duration || 30);
  projScrollDurWheels();
  projRenderDurChips();
  document.getElementById('durPickerMask')?.classList.add('open');
}

function closeDurPicker() {
  document.getElementById('durPickerMask')?.classList.remove('open');
}

function confirmDurPicker() {
  projReadDurFromWheels();
  const total = projDurDraft.hours * 60 + projDurDraft.minutes;
  if (total < PROJ_DUR_MIN_STEP) { showToast('时长至少5分钟', true); return; }
  if (state.projFormState) state.projFormState.duration = total;
  closeDurPicker();
  /* 时长回显：全屏表单已废止，现由展开区内的 .duration-input 自行同步 DOM */
  const dispEl = document.querySelector('#catalogInlineBody #fDurDisplay');
  if (dispEl && state.projFormState) dispEl.textContent = projFormatDurationText(state.projFormState.duration);
}

function closeProjDeleteDialog() {
  document.getElementById('projDialogMask')?.classList.remove('show');
}

function projFormatPriceHtml(n) {
  return `<span class="price-num"><span class="yen">¥</span>${escapeHtml(String(n))}</span>`;
}

function projSortCatalog(list) {
  ensureCatalogSortOrder();
  return [...list].sort((a, b) => {
    if (a.onSale !== b.onSale) return a.onSale ? -1 : 1;
    if (a.onSale && b.onSale) {
      const cmp = compareCatalogPickerOrder(a, b);
      if (cmp !== 0) return cmp;
    }
    const ao = a.sortOrder ?? 0;
    const bo = b.sortOrder ?? 0;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

const CATALOG_COL_SORT_LABELS = { name: '名称', duration: '时长', price: '价格' };

function isCatalogColSortActive() {
  return !!(state.catalogColSort && state.catalogColSort.key);
}

function compareCatalogByCol(a, b, key, dir) {
  const sign = dir === 'desc' ? -1 : 1;
  let cmp = 0;
  if (key === 'name') {
    cmp = a.name.localeCompare(b.name, 'zh-CN');
  } else if (key === 'duration') {
    cmp = (a.duration || 0) - (b.duration || 0);
  } else if (key === 'spec') {
    cmp = String(a.spec || '').localeCompare(String(b.spec || ''), 'zh-CN');
  } else if (key === 'price') {
    cmp = (a.price || 0) - (b.price || 0);
  }
  if (cmp === 0 && key !== 'name') cmp = a.name.localeCompare(b.name, 'zh-CN');
  return cmp * sign;
}

function sortCatalogByActiveCol(list) {
  const { key, dir } = state.catalogColSort || {};
  if (!key) return projSortCatalog(list);
  return [...list].sort((a, b) => compareCatalogByCol(a, b, key, dir));
}

function cycleCatalogColSort(key) {
  const cur = state.catalogColSort || { key: null, dir: null };
  if (cur.key !== key) state.catalogColSort = { key, dir: 'asc' };
  else if (cur.dir === 'asc') state.catalogColSort = { key, dir: 'desc' };
  else state.catalogColSort = { key: null, dir: null };
  projRenderList();
}

function syncCatalogColSortHead() {
  const head = document.getElementById('projTableHead');
  if (!head) return;
  if (state.catalogColSort && (state.catalogColSort.key === 'sale' || state.catalogColSort.key === 'spec')) {
    state.catalogColSort = { key: null, dir: null };
  }
  const { key, dir } = state.catalogColSort || {};
  head.querySelectorAll('[data-col-sort]').forEach(btn => {
    const on = key === btn.dataset.colSort;
    btn.classList.toggle('is-sorted', on);
    btn.classList.toggle('is-desc', on && dir === 'desc');
    btn.setAttribute('aria-sort', on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

function getCatalogSortBucket(p) {
  return p.onSale ? 'sale' : 'off';
}

function projShowScreen(screenId) {
  showOnlyScreen(screenId);
  /* 切屏前若列表屏处于 display:none，指示条宽度量不到（会退回 CSS 兜底）；
     这里在可见后再补量一次，保证宽 = 文字宽 + 20 精确成立。 */
  if (screenId === 'screen-p-list') syncPriceCatalogTabInk(state.priceCatalogTab || 'project');
}

function catalogItemMatchesSearch(p, q, isProduct) {
  if (!q) return true;
  if (p.name.toLowerCase().includes(q)) return true;
  if (isProduct && String(p.spec || '').toLowerCase().includes(q)) return true;
  return false;
}

/** 列表名称：产品附带规格参数 */
function catalogListDisplayName(p, isProduct) {
  const name = p.name || '';
  if (!isProduct) return name;
  const spec = String(p.spec || '').trim();
  return spec ? `${name}（${spec}）` : name;
}

function buildCatalogListRow(p, { isProduct, inHiddenSection }) {
  const wrap = document.createElement('div');
  const bucket = getCatalogSortBucket(p);
  wrap.className = 'table-row-swipe' + (p.onSale ? '' : ' is-off-sale');
  wrap.dataset.projId = p.id;
  wrap.dataset.sortBucket = inHiddenSection ? `hidden-${bucket}` : bucket;
  const displayName = catalogListDisplayName(p, isProduct);
  const longName = displayName.length > 5;
  const saleLabel = p.onSale ? '下架' : '上架';
  const hideLabel = p.hidden ? '取消隐藏' : '隐藏';
  const delLocked = isCatalogDeleteLocked(p);
  const actions = [];
  actions.push(`<button type="button" class="act-group" data-swipe-act="group">分组</button>`);
  actions.push(`<button type="button" class="act-sale" data-swipe-act="sale">${saleLabel}</button>`);
  actions.push(`<button type="button" class="act-hide" data-swipe-act="hide">${hideLabel}</button>`);
  actions.push(catalogDeleteBtnHtml(delLocked));
  wrap.innerHTML = `
      <div class="table-row-actions">${actions.join('')}</div>
      <div class="table-row">
        <div class="name">
          <button type="button" class="catalog-row-drag" data-catalog-drag aria-label="拖动排序">${CATALOG_ROW_DRAG_ICON}</button>
          <div class="name-main">
            <span class="name-text${longName ? ' is-long' : ''}${p.boundToCard ? ' is-bound' : ''}">${escapeHtml(displayName)}</span>
          </div>
        </div>
        <div class="dur">${isProduct ? '' : projFormatDurationListHtml(p.duration)}</div>
        <div class="price">${projFormatPriceHtml(p.price)}</div>
      </div>`;
  const row = wrap.querySelector('.table-row');
  let openWidth = 0;
  actions.forEach(() => { openWidth += 68; });
  wrap.querySelectorAll('[data-swipe-act]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const act = btn.dataset.swipeAct;
      const proj = findCatalogItemById(p.id);
      if (!proj) return;
      let ok = false;
      if (act === 'group') {
        openCatalogItemGroupSheet(proj.id);
        ok = true;
      } else if (act === 'sale') {
        ok = toggleCatalogOnSale(proj);
        if (ok) refreshAfterCatalogChange();
      } else if (act === 'hide') {
        ok = toggleCatalogHidden(proj, !proj.hidden);
        if (ok) refreshAfterCatalogChange();
      } else if (act === 'delete') {
        ok = openCatalogDeleteConfirm(proj.id);
      }
      if (ok) closeAllCatalogSwipes();
    });
  });
  row.addEventListener('click', () => {
    // 左滑展开时：任意点击本行（含最左侧）归位，优先于 suppressClick
    if (wrap.classList.contains('is-open')) {
      row.dataset.suppressClick = '';
      closeAllCatalogSwipes();
      return;
    }
    if (row.dataset.suppressClick === '1') {
      row.dataset.suppressClick = '';
      return;
    }
    closeAllCatalogSwipes();
    /* 详情不再是全屏跳转，改为本行向下展开 */
    toggleCatalogInlineEdit(p.id);
  });
  wrap._swipeOpenWidth = openWidth;
  return wrap;
}

function projRenderList() {
  syncAllCatalogBindings();
  syncPriceCatalogTabs();
  const isProduct = isProductCatalogTab();
  const groupId = getActiveCatalogGroupId();
  const bucket = getCatalogGroupBucket();
  const sysHidden = getSystemHiddenGroup(bucket);
  const inHiddenTab = !!(sysHidden && groupId === sysHidden.id);
  const inAllTab = !groupId || groupId === 'all';
  const inCustomGroup = groupId && groupId !== 'all' && !inHiddenTab;
  let base = isCatalogColSortActive()
    ? sortCatalogByActiveCol(getActivePriceCatalog())
    : projSortCatalog(getActivePriceCatalog());
  let list = filterCatalogByActiveGroup(base);
  /* 「全部」Tab：主列表排除隐藏；底部折叠区可展开查看隐藏项 */
  let hiddenList = [];
  if (inAllTab) {
    hiddenList = base.filter(p => !!p.hidden);
  }
  const onSaleList = list.filter(p => !!p.onSale);
  const offSaleList = list.filter(p => !p.onSale);
  const total = getActivePriceCatalog().length;
  syncCatalogColSortHead();
  const tbody = document.getElementById('projProjectTable');
  const tableCard = document.getElementById('projTableCard');
  const listEmpty = document.getElementById('projListEmpty');
  const emptyTitle = document.getElementById('projListEmptyTitle');
  const emptyHint = document.getElementById('projListEmptyHint');
  const emptyAdd = document.getElementById('btnProjEmptyAdd');
  const emptyToGroup = document.getElementById('btnProjEmptyAddToGroup');
  if (!tbody) return;
  syncCatalogGroupChrome();
  tbody.innerHTML = '';
  tbody.classList.remove('is-reordering');
  if (!onSaleList.length && !offSaleList.length && !hiddenList.length) {
    /* 空态「新建」：展开区替代空态块，直接出现在内容区（表头与空态一起收起） */
    if (catalogInline().mode === 'add' && !inCustomGroup && !inHiddenTab) {
      listEmpty?.classList.add('hidden');
      emptyToGroup?.classList.add('hidden');
      /* syncCatalogGroupChrome() 在无数据时会把整个 .catalog-list-shell 藏掉，
         它会连带藏掉表卡与展开区 —— 这里必须显式放出来 */
      document.querySelector('#screen-p-list .catalog-list-shell')?.classList.remove('hidden');
      tableCard?.classList.remove('hidden');
      tableCard?.classList.add('is-add-panel');
      wireCatalogRowInteractions(tbody, {});
      mountCatalogInlinePanel();
      return;
    }
    tableCard?.classList.remove('is-add-panel');
    tableCard?.classList.toggle('hidden', !total || inCustomGroup || inHiddenTab);
    listEmpty?.classList.remove('hidden');
    if (emptyTitle) {
      if (inHiddenTab) emptyTitle.textContent = isProduct ? '暂无隐藏产品' : '暂无隐藏项目';
      else if (inCustomGroup) emptyTitle.textContent = isProduct ? '本组暂无产品' : '本组暂无项目';
      else emptyTitle.textContent = isProduct ? '暂无产品' : '暂无项目';
    }
    if (emptyHint) {
      if (inHiddenTab) emptyHint.textContent = '左滑条目可将项目/产品移入隐藏';
      else if (inCustomGroup) emptyHint.textContent = '可将价目表中的条目加入本组';
      else emptyHint.textContent = isProduct ? '添加后可在开单记账中使用' : '添加后可在选择项目与办卡中使用';
      emptyHint.classList.toggle('hidden', false);
    }
    emptyAdd?.classList.toggle('hidden', inCustomGroup || inHiddenTab);
    emptyToGroup?.classList.toggle('hidden', !(inCustomGroup && total));
    return;
  }
  tableCard?.classList.remove('hidden');
  tableCard?.classList.remove('is-add-panel');
  listEmpty?.classList.add('hidden');
  emptyToGroup?.classList.add('hidden');
  onSaleList.forEach(p => {
    tbody.appendChild(buildCatalogListRow(p, { isProduct, inHiddenSection: false }));
  });
  if (offSaleList.length) {
    const offBlock = document.createElement('div');
    offBlock.className = 'catalog-offsale-block';
    offBlock.innerHTML = `
      <div class="catalog-offsale-head">已下架</div>
      <div class="catalog-offsale-list"></div>`;
    const offMount = offBlock.querySelector('.catalog-offsale-list');
    offSaleList.forEach(p => {
      offMount.appendChild(buildCatalogListRow(p, { isProduct, inHiddenSection: false }));
    });
    tbody.appendChild(offBlock);
  }
  if (hiddenList.length) {
    const block = document.createElement('div');
    block.className = 'catalog-hidden-block' + (state.catalogHiddenExpanded ? ' is-open' : '');
    block.innerHTML = `
      <button type="button" class="catalog-hidden-toggle" data-catalog-hidden-toggle aria-expanded="${state.catalogHiddenExpanded ? 'true' : 'false'}">
        <span class="catalog-hidden-toggle__label">${CATALOG_HIDE_ICON}已隐藏</span>
        ${CATALOG_HIDDEN_CHEV_ICON}
      </button>
      <div class="catalog-hidden-list"></div>`;
    const hiddenMount = block.querySelector('.catalog-hidden-list');
    hiddenList.forEach(p => {
      hiddenMount.appendChild(buildCatalogListRow(p, { isProduct, inHiddenSection: true }));
    });
    block.querySelector('[data-catalog-hidden-toggle]')?.addEventListener('click', () => {
      const willOpen = !state.catalogHiddenExpanded;
      state.catalogHiddenExpanded = willOpen;
      projRenderList();
      if (willOpen) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollCatalogHiddenSectionToTop());
        });
      }
    });
    tbody.appendChild(block);
  }
  wireCatalogRowInteractions(tbody, {
    /* 无关键字搜索；自定义分组内可拖。仅「隐藏」Tab / 列排序拦截 */
    dragBlockedHiddenTab: inHiddenTab,
    colSortActive: isCatalogColSortActive(),
  });
  /* 有数据时，列表底部添加入口 */
  if (canCatalogWrite()) {
    const addRow = document.createElement('button');
    addRow.type = 'button';
    addRow.className = 'catalog-list-add-row catalog-list-add-row--dash';
    addRow.id = 'btnCatalogListAdd';
    addRow.innerHTML = `<span class="catalog-list-add-row__plus" aria-hidden="true">+</span><span>${isProduct ? '添加产品' : '添加项目'}</span>`;
    addRow.addEventListener('click', projOpenAdd);
    /* 新增面板打开时，「添加」这一行让位给表单本体 */
    if (catalogInline().mode === 'add') addRow.classList.add('hidden');
    tbody.appendChild(addRow);
  }
  /* 行内展开区（编辑态挂在目标行之后；新增态挂在在售末行之后） */
  if (catalogInline().mode) mountCatalogInlinePanel();
}

/** 展开「已隐藏」后，将其标题滚到价目表滚动区顶部附近 */
function scrollCatalogHiddenSectionToTop() {
  const scroller = catalogListScroller();
  const block = document.querySelector('#projProjectTable .catalog-hidden-block.is-open');
  if (!scroller || !block) return;
  const anchor = block.querySelector('.catalog-hidden-toggle') || block;
  const delta = anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  const nextTop = Math.max(0, scroller.scrollTop + delta);
  if (typeof scroller.scrollTo === 'function') {
    scroller.scrollTo({ top: nextTop, behavior: 'smooth' });
  } else {
    scroller.scrollTop = nextTop;
  }
}

const CATALOG_LONG_PRESS_MS = 400;
const CATALOG_DRAG_MOVE_PX = 8;
const CATALOG_SWIPE_MOVE_PX = 10;

function toggleCatalogOnSale(proj) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return false;
  if (!proj) return false;
  proj.onSale = !proj.onSale;
  if (!proj.onSale && proj.bookable != null) proj.bookable = false;
  showToast(proj.onSale ? '已上架' : '已下架');
  return true;
}

function toggleCatalogHidden(proj, hidden) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return false;
  if (!proj) return false;
  const next = !!hidden;
  if (!!proj.hidden === next) return false;
  setCatalogItemHidden(proj, next);
  showToast(next ? '已隐藏' : '已取消隐藏');
  return true;
}

function openCatalogDeleteConfirm(projId) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return false;
  const p = findCatalogItemById(projId);
  if (!p) return false;
  if (isCatalogDeleteLocked(p)) {
    showToast(catalogDeleteLockToast(p), true);
    return false;
  }
  state.projEditingId = projId;
  state.projFormKind = getCatalogProducts().some(x => x.id === projId) ? 'product' : 'project';
  document.getElementById('projDialogMask')?.classList.add('show');
  return true;
}

function closeAllCatalogSwipes(exceptWrap) {
  document.querySelectorAll('.table-row-swipe.is-open, .table-row-swipe.is-swiping').forEach(wrap => {
    if (exceptWrap && wrap === exceptWrap) return;
    wrap.classList.remove('is-open', 'is-swiping');
    const row = wrap.querySelector('.table-row');
    if (row) row.style.transform = '';
  });
}

/** 截图 / deep-link：强制展开某行左滑快捷键 */
function openCatalogRowSwipe(projId) {
  closeAllCatalogSwipes();
  if (!projId) return false;
  const wrap = document.querySelector(`.table-row-swipe[data-proj-id="${CSS.escape(String(projId))}"]`);
  if (!wrap) return false;
  const row = wrap.querySelector('.table-row');
  const openWidth = wrap._swipeOpenWidth || (wrap.querySelectorAll('[data-swipe-act]').length * 68) || 272;
  wrap.classList.add('is-open');
  if (row) {
    row.style.transition = '';
    row.style.transform = `translateX(${-openWidth}px)`;
  }
  try {
    wrap.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch (_) { /* ignore */ }
  return true;
}

function openCatalogRowActions(projId) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const p = findCatalogItemById(projId);
  if (!p) return;
  state.catalogActionProjId = projId;
  const mask = document.getElementById('catalogRowActionMask');
  const title = document.getElementById('catalogRowActionTitle');
  if (title) title.textContent = p.name;
  const saleBtn = mask?.querySelector('[data-catalog-act="sale"]');
  if (saleBtn) saleBtn.textContent = p.onSale ? '下架' : '上架';
  mask?.querySelector('[data-catalog-act="hide"]')?.classList.toggle('hidden', !!p.hidden);
  mask?.querySelector('[data-catalog-act="unhide"]')?.classList.toggle('hidden', !p.hidden);
  const lockEl = document.getElementById('catalogActDeleteLock');
  if (lockEl) {
    const locked = isCatalogDeleteLocked(p);
    lockEl.classList.toggle('is-hidden', !locked);
    lockEl.innerHTML = locked ? CATALOG_DELETE_LOCK_ICON : '';
    lockEl.setAttribute('aria-hidden', locked ? 'false' : 'true');
  }
  mask?.classList.add('open');
}

function closeCatalogRowActions() {
  document.getElementById('catalogRowActionMask')?.classList.remove('open');
  state.catalogActionProjId = null;
}

function handleCatalogRowAction(act) {
  const id = state.catalogActionProjId;
  closeCatalogRowActions();
  if (!id || act === 'cancel') return;
  const proj = findCatalogItemById(id);
  if (!proj) return;
  if (act === 'sale') {
    if (toggleCatalogOnSale(proj)) refreshAfterCatalogChange();
  } else if (act === 'hide') {
    if (toggleCatalogHidden(proj, true)) refreshAfterCatalogChange();
  } else if (act === 'unhide') {
    if (toggleCatalogHidden(proj, false)) refreshAfterCatalogChange();
  } else if (act === 'group') {
    openCatalogItemGroupSheet(proj.id);
  } else if (act === 'delete') {
    openCatalogDeleteConfirm(proj.id);
  }
}

function commitCatalogBucketOrder(tbody, bucket) {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return false;
  const catalog = getActivePriceCatalog();
  const visibleIds = [...tbody.querySelectorAll(`.table-row-swipe[data-sort-bucket="${bucket}"]`)]
    .map(r => r.dataset.projId)
    .filter(Boolean);
  if (!visibleIds.length) return false;

  const isHiddenBucket = String(bucket).startsWith('hidden-');
  const saleKey = isHiddenBucket ? String(bucket).slice('hidden-'.length) : bucket;
  const fullIds = projSortCatalog(catalog.filter(p => {
    if (getCatalogSortBucket(p) !== saleKey) return false;
    return isHiddenBucket ? !!p.hidden : !p.hidden;
  })).map(p => p.id);

  const visibleSet = new Set(visibleIds);
  const merged = [];
  let vi = 0;
  fullIds.forEach(id => {
    if (visibleSet.has(id)) {
      if (vi < visibleIds.length) merged.push(visibleIds[vi++]);
    } else {
      merged.push(id);
    }
  });
  while (vi < visibleIds.length) merged.push(visibleIds[vi++]);

  let changed = false;
  merged.forEach((id, i) => {
    const p = catalog.find(x => x.id === id);
    if (!p) return;
    if (p.sortOrder !== i) {
      p.sortOrder = i;
      changed = true;
    }
  });
  return changed;
}

/* 拖拽挂载点与缩放：大原型里是 .phone-wrap；独立原型是 #frame.phone-shell > .phone-inner.phone
   （position:relative + overflow:hidden + 无 transform），语义等价 */
function getProjPickDragMount() {
  return document.querySelector('.phone-inner.phone')
    || document.querySelector('#frame.phone-shell')
    || document.body;
}

function getPhoneWrapScale() {
  const mount = document.querySelector('.phone-inner.phone') || document.querySelector('#frame.phone-shell');
  if (!mount) return 1;
  const tr = getComputedStyle(mount).transform;
  if (!tr || tr === 'none') return 1;
  if (tr.startsWith('matrix')) {
    const vals = tr.slice(7, -1).split(',').map(v => parseFloat(v.trim()));
    return vals[0] || 1;
  }
  const m = tr.match(/scale\(([\d.]+)/);
  return m ? parseFloat(m[1]) : 1;
}

function wireCatalogRowInteractions(tbody, opts = {}) {
  if (!tbody) return;
  const dragBlockedHiddenTab = !!opts.dragBlockedHiddenTab || !!opts.filterActive;
  const colSortActive = !!opts.colSortActive;
  const dragBlockToastFor = (wrapEl) => {
    if (colSortActive) return '请先取消列排序后再手动排序';
    if (dragBlockedHiddenTab) return '「隐藏」分组内不支持拖拽排序，请切换到「全部」或其它分组';
    /* 「全部」底部「已隐藏」折叠区：禁止拖拽排序 */
    if (String(wrapEl?.dataset?.sortBucket || '').startsWith('hidden-')) {
      return '已隐藏的项目不支持拖拽排序';
    }
    return null;
  };
  tbody.querySelectorAll('.table-row-swipe').forEach(wrap => {
    if (wrap.dataset.dragWired === '1') return;
    wrap.dataset.dragWired = '1';
    const row = wrap.querySelector('.table-row');
    if (!row) return;
    let pressTimer = null;
    let armed = false;
    let dragging = false;
    let swiping = false;
    let activePointerId = null;
    let pressStartX = 0;
    let pressStartY = 0;
    let dragStartY = 0;
    let dragStartLocalTop = 0;
    let dragScale = 1;
    let dragMount = null;
    let dragCard = null;
    let placeholder = null;
    let suppressClick = false;
    let swipeStartX = 0;
    let swipeBaseX = 0;
    const bucket = wrap.dataset.sortBucket;
    const openWidth = wrap._swipeOpenWidth || 136;
    const dragBlockToast = () => dragBlockToastFor(wrap);

    const clearPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };

    const getBucketSlots = () => [...tbody.querySelectorAll(`.table-row-swipe[data-sort-bucket="${bucket}"], .table-row-drag-placeholder[data-sort-bucket="${bucket}"]`)];

    const updatePlaceholderIndex = clientY => {
      if (!placeholder) return;
      const slots = getBucketSlots();
      let insertBefore = null;
      for (const slot of slots) {
        if (slot === placeholder) continue;
        const rect = slot.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          insertBefore = slot;
          break;
        }
      }
      if (insertBefore) {
        insertBefore.parentElement?.insertBefore(placeholder, insertBefore);
      } else {
        const rows = [...tbody.querySelectorAll(`.table-row-swipe[data-sort-bucket="${bucket}"]`)];
        const last = rows[rows.length - 1];
        if (last) last.parentElement?.insertBefore(placeholder, last.nextElementSibling);
      }
    };

    const clearDragStyles = () => {
      dragCard?.classList.remove('is-dragging');
      tbody.classList.remove('is-reordering');
      if (!dragCard) return;
      dragCard.style.position = '';
      dragCard.style.top = '';
      dragCard.style.left = '';
      dragCard.style.width = '';
      dragCard.style.margin = '';
      dragCard.style.zIndex = '';
      dragCard.style.background = '';
      dragCard.style.boxShadow = '';
    };

    const detachDocListeners = () => {
      document.removeEventListener('pointermove', onDocPointerMove);
      document.removeEventListener('pointerup', onDocPointerEnd);
      document.removeEventListener('pointercancel', onDocPointerEnd);
    };

    const setRowTranslate = x => {
      row.style.transition = 'none';
      row.style.transform = `translateX(${x}px)`;
    };

    const settleSwipe = x => {
      row.style.transition = '';
      wrap.classList.remove('is-swiping');
      const open = x < -openWidth / 2;
      if (open) {
        closeAllCatalogSwipes(wrap);
        wrap.classList.add('is-open');
        row.style.transform = `translateX(${-openWidth}px)`;
      } else {
        wrap.classList.remove('is-open');
        row.style.transform = '';
      }
    };

    const onDocPointerMove = e => {
      if (e.pointerId !== activePointerId) return;
      if (dragging && dragCard) {
        e.preventDefault();
        dragCard.style.top = `${dragStartLocalTop + (e.clientY - dragStartY) / dragScale}px`;
        updatePlaceholderIndex(e.clientY);
        return;
      }
      if (swiping) {
        e.preventDefault();
        const dx = e.clientX - swipeStartX;
        const next = Math.min(0, Math.max(-openWidth, swipeBaseX + dx));
        setRowTranslate(next);
        return;
      }
      const dx = e.clientX - pressStartX;
      const dy = e.clientY - pressStartY;
      if (armed && !dragging && Math.abs(dy) > CATALOG_DRAG_MOVE_PX && Math.abs(dy) >= Math.abs(dx)) {
        const block = dragBlockToast();
        if (block) {
          showToast(block, true);
          armed = false;
          activePointerId = null;
          return;
        }
        startDrag(e);
        return;
      }
      if (!armed && !dragging && pressTimer && (Math.abs(dx) > CATALOG_SWIPE_MOVE_PX || Math.abs(dy) > CATALOG_DRAG_MOVE_PX)) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > CATALOG_SWIPE_MOVE_PX) {
          clearPress();
          swiping = true;
          wrap.classList.add('is-swiping');
          swipeStartX = e.clientX;
          swipeBaseX = wrap.classList.contains('is-open') ? -openWidth : 0;
          closeAllCatalogSwipes(wrap);
          row.style.transition = 'none';
        } else {
          clearPress();
          activePointerId = null;
        }
      }
    };

    const endDrag = (commit, pointerId) => {
      if (!dragging) return;
      dragging = false;
      armed = false;
      clearPress();
      detachDocListeners();
      if (placeholder && dragCard) {
        (placeholder.parentElement || tbody).insertBefore(dragCard, placeholder);
      }
      placeholder?.remove();
      placeholder = null;
      clearDragStyles();
      if (pointerId != null) {
        try { dragCard?.releasePointerCapture(pointerId); } catch (_) {}
      }
      const changed = commit && commitCatalogBucketOrder(tbody, bucket);
      dragCard = null;
      activePointerId = null;
      if (changed) refreshAfterCatalogChange();
    };

    const onDocPointerEnd = e => {
      if (e.pointerId !== activePointerId) return;
      if (dragging) {
        endDrag(true, e.pointerId);
        return;
      }
      if (swiping) {
        const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(row.style.transform || '');
        const x = m ? parseFloat(m[1]) : 0;
        settleSwipe(x);
        swiping = false;
        suppressClick = true;
        row.dataset.suppressClick = '1';
        detachDocListeners();
        activePointerId = null;
        return;
      }
      if (armed) {
        armed = false;
        suppressClick = true;
        row.dataset.suppressClick = '1';
        closeAllCatalogSwipes();
        openCatalogRowActions(wrap.dataset.projId);
      }
      clearPress();
      detachDocListeners();
      activePointerId = null;
    };

    const startDrag = (e) => {
      closeAllCatalogSwipes();
      dragging = true;
      armed = false;
      dragCard = wrap;
      suppressClick = true;
      row.dataset.suppressClick = '1';
      activePointerId = e.pointerId;
      dragStartY = e.clientY;
      dragScale = getPhoneWrapScale();
      dragMount = getProjPickDragMount();
      const mountRect = dragMount.getBoundingClientRect();
      const rect = wrap.getBoundingClientRect();
      dragStartLocalTop = (rect.top - mountRect.top) / dragScale;
      placeholder = document.createElement('div');
      placeholder.className = 'table-row-drag-placeholder';
      placeholder.dataset.sortBucket = bucket;
      placeholder.style.height = `${rect.height / dragScale}px`;
      /* 下架区分挂在 .catalog-offsale-list 内，须插回原父节点，不能一律用 tbody */
      (wrap.parentElement || tbody).insertBefore(placeholder, wrap);
      dragMount.appendChild(wrap);
      wrap.classList.add('is-dragging');
      tbody.classList.add('is-reordering');
      wrap.style.width = `${rect.width / dragScale}px`;
      wrap.style.left = `${(rect.left - mountRect.left) / dragScale}px`;
      wrap.style.top = `${dragStartLocalTop}px`;
      wrap.style.position = 'absolute';
      wrap.style.margin = '0';
      wrap.style.zIndex = '10000';
      try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
      if (navigator.vibrate) navigator.vibrate(10);
    };

    row.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button, [data-catalog-drag]')) return;
      activePointerId = e.pointerId;
      pressStartX = e.clientX;
      pressStartY = e.clientY;
      armed = false;
      swiping = false;
      suppressClick = false;
      clearPress();
      document.addEventListener('pointermove', onDocPointerMove, { passive: false });
      document.addEventListener('pointerup', onDocPointerEnd);
      document.addEventListener('pointercancel', onDocPointerEnd);
      pressTimer = setTimeout(() => {
        pressTimer = null;
        const block = dragBlockToast();
        if (block) {
          showToast(block, true);
          activePointerId = null;
          detachDocListeners();
          return;
        }
        armed = true;
        if (navigator.vibrate) navigator.vibrate(8);
      }, CATALOG_LONG_PRESS_MS);
    });

    row.addEventListener('click', e => {
      // 展开态允许冒泡到行点击以归位，不拦截
      if (wrap.classList.contains('is-open')) {
        suppressClick = false;
        row.dataset.suppressClick = '';
        return;
      }
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    }, true);

    const dragHandle = wrap.querySelector('[data-catalog-drag]');
    dragHandle?.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      // 左滑展开时点最左侧把手 → 归位，不进入拖拽
      if (wrap.classList.contains('is-open')) {
        closeAllCatalogSwipes();
        return;
      }
      const block = dragBlockToast();
      if (block) {
        showToast(block, true);
        return;
      }
      activePointerId = e.pointerId;
      pressStartX = e.clientX;
      pressStartY = e.clientY;
      armed = true;
      swiping = false;
      suppressClick = false;
      clearPress();
      document.addEventListener('pointermove', onDocPointerMove, { passive: false });
      document.addEventListener('pointerup', onDocPointerEnd);
      document.addEventListener('pointercancel', onDocPointerEnd);
      if (navigator.vibrate) navigator.vibrate(8);
    });
  });
}

function projNormalizeImages(raw, hasImageFlag) {
  const list = Array.isArray(raw) ? raw.filter(Boolean).map(String) : [];
  if (list.length) return list.slice(0, PROJ_IMG_MAX);
  if (hasImageFlag) return [PROJ_DEMO_IMG_POOL[0]];
  return [];
}

function projPickNextDemoImage(images) {
  const used = new Set(images || []);
  const next = PROJ_DEMO_IMG_POOL.find(src => !used.has(src));
  if (next) return next;
  return PROJ_DEMO_IMG_POOL[(images || []).length % PROJ_DEMO_IMG_POOL.length];
}

/** 开单限购：价目产品不再管理库存，恒为不限购 */
function catalogStockLimit(_p) {
  return null;
}

function projDefaultForm(kind = 'project') {
  if (kind === 'product') {
    return { kind: 'product', name: '', spec: '', price: '', onSale: true, category: '产品', images: [], hasImage: false, imageExpanded: false };
  }
  return {
    kind: 'project', name: '', price: '', duration: 60,
    onSale: true, bookable: true, images: [], hasImage: false, imageExpanded: false, _durUnit: null, _durAmount: null,
  };
}

function projProjectToForm(p) {
  const images = projNormalizeImages(p.images, p.hasImage);
  const imageExpanded = images.length > 0;
  if (getCatalogProducts().some(x => x.id === p.id)) {
    return {
      kind: 'product', name: p.name, spec: p.spec || '', price: String(p.price),
      onSale: p.onSale, category: p.category || '产品', images, hasImage: images.length > 0, imageExpanded,
    };
  }
  return {
    kind: 'project',
    name: p.name,
    price: String(p.price),
    duration: p.duration || 60,
    onSale: p.onSale,
    bookable: !!p.bookable,
    images,
    hasImage: images.length > 0,
    imageExpanded,
    _durUnit: null,
    _durAmount: null,
  };
}

function projImageUploadSectionHtml(s, imageLabel) {
  const images = Array.isArray(s.images) ? s.images.slice(0, PROJ_IMG_MAX) : [];
  const atMax = images.length >= PROJ_IMG_MAX;
  const thumbs = images.map((src, idx) => `
    <div class="proj-img-thumb" data-img-idx="${idx}">
      <img class="proj-img-thumb__media" src="${escapeAttr(src)}" alt="" loading="lazy">
      <button type="button" class="proj-img-thumb__del" data-img-del="${idx}" aria-label="删除图片">${PROJ_IMG_DEL}</button>
    </div>`).join('');
  return `<div class="proj-form-row col" style="padding:0">
    <button type="button" class="collapse-head ${s.imageExpanded ? 'open' : ''}" id="projImgCollapse"><div><span class="title">${imageLabel}</span></div>${PROJ_CHEV_ICON}</button>
    <div class="collapse-body ${s.imageExpanded ? 'open' : ''}" id="projImgBody">
      <div class="proj-img-rail-outer">
        <div class="proj-img-rail-wrap">
          <div class="proj-img-rail" id="projImgRail">
            ${atMax ? '' : `<button type="button" class="img-upload" id="projImgUpload" aria-label="添加图片">${PROJ_IMG_CAM}<span class="img-upload__cap">添加图片</span></button>`}
            ${thumbs}
          </div>
        </div>
        <div class="proj-img-rail__fade" aria-hidden="true"></div>
      </div>
    </div>
  </div>`;
}

function projFormRowAttrs(extraClass, locked, toast) {
  const cls = ['proj-form-row', extraClass, locked ? 'is-locked' : ''].filter(Boolean).join(' ');
  const toastAttr = locked ? ` data-lock-toast="${escapeAttr(toast)}"` : '';
  return ` class="${cls}"${toastAttr}`;
}

function projWireLockToasts(container) {
  if (container.dataset.lockToastWired) return;
  container.dataset.lockToastWired = '1';
  container.addEventListener('click', e => {
    /* 锁定标记可能挂在整行（名称）或某一格（可预约）上，统一按属性就近匹配 */
    const locked = e.target.closest('[data-lock-toast]');
    if (!locked?.dataset.lockToast) return;
    showToast(locked.dataset.lockToast, true);
  });
}

function projSyncBookableLock(container, bound) {
  const bookableBtn = container.querySelector('#fProjBookable');
  /* 可预约的锁定标记挂在它自己那一格（#projBookableWrap），不能挂整行：
     合并行里还有「在售」，整行锁掉会让点「在售」也弹锁定 toast */
  const bookableWrap = container.querySelector('#projBookableWrap');
  if (!bookableBtn || !bookableWrap || bound) return;
  const offSale = !state.projFormState.onSale;
  const isHidden = !!findCatalogItemById(state.projEditingId)?.hidden;
  if (offSale || isHidden) {
    bookableBtn.disabled = true;
    state.projFormState.bookable = false;
    bookableBtn.classList.remove('on');
    bookableWrap.classList.add('is-locked');
    bookableWrap.dataset.lockToast = isHidden && !offSale
      ? PROJ_LOCK_TOAST.bookable_hidden
      : PROJ_LOCK_TOAST.bookable_offSale;
  } else {
    bookableBtn.disabled = false;
    bookableWrap.classList.remove('is-locked');
    delete bookableWrap.dataset.lockToast;
  }
}

function projRenderForm(container, mode) {
  const p = mode === 'edit' ? findCatalogItemById(state.projEditingId) : null;
  const isProduct = state.projFormKind === 'product';
  const bound = !!p?.boundToCard && !isProduct;
  const offSale = !!p && !p.onSale;
  const isHidden = !!p && !!p.hidden;
  const lockBookable = bound || offSale || isHidden;
  const lockBookableToast = bound
    ? PROJ_LOCK_TOAST.bookable_bound
    : (isHidden ? PROJ_LOCK_TOAST.bookable_hidden : PROJ_LOCK_TOAST.bookable_offSale);
  const isEdit = mode === 'edit';
  const reqCls = isEdit ? '' : ' req';
  const s = state.projFormState;
  if (!container || !s) return;
  /* 标签用短文案（设计稿 1258:612/620/628/664）：名称 / 价格 / 时长 / 封面图（可选）。
     68px 固定标签列在 2 字标签下能给控件留更多宽度，信息也没丢（表头/详情另有上下文）。 */
  const nameLabel = '名称';
  const priceLabel = '价格';
  const imageLabel = '封面图（可选）';
  const editIcon = projFormEditIconHtml();
  const durationRow = isProduct ? '' : `<div class="proj-form-row form-row--duration" id="projDurRow"><span class="label">时长</span><div class="field">${buildDurationInputHtml({
            id: 'projServiceDuration',
            ...minutesToServiceDurationFields(s.duration),
            units: PROJ_SERVICE_DURATION_UNITS,
            unitLabels: DURATION_UNIT_LABELS,
            includePermanent: false,
          })}</div></div>`;
  /* 「在售 + 可预约」并成一行：省掉整整一行高度。产品没有可预约，仍是常规单行。
     锁定只加在「可预约」那一格上 —— 在售永远可点，不能整行锁掉（否则点「在售」也会弹锁定 toast）。 */
  const onSaleSwitch = `<button type="button" class="switch ${s.onSale ? 'on' : ''}" id="fProjOnSale"></button>`;
  const switchesRow = isProduct
    ? `<div class="proj-form-row"><span class="label">在售</span><div class="field">${onSaleSwitch}</div></div>`
    : `<div class="proj-form-row proj-form-row--switches">
        <div class="switch-pair">
          <span class="switch-pair__item"><span class="label">在售</span>${onSaleSwitch}</span>
          <span class="switch-pair__item${lockBookable ? ' is-locked' : ''}" id="projBookableWrap"${lockBookable ? ` data-lock-toast="${escapeAttr(lockBookableToast)}"` : ''}><span class="label">可预约</span><button type="button" class="switch ${s.bookable ? 'on' : ''}" id="fProjBookable" ${lockBookable ? 'disabled' : ''}></button></span>
        </div>
      </div>`;
  /* 单张白卡：原先的「基本信息 / 售卖设置 / 高级设置」三层分组小标题已取消 */
  container.innerHTML = `
    <div class="proj-form-stack">
      <div class="proj-form-section">
        <div${projFormRowAttrs('', bound, PROJ_LOCK_TOAST.name)}><span class="label${reqCls}">${nameLabel}</span><div class="field"><input type="text" id="fProjName" placeholder="请输入" value="${escapeAttr(s.name)}" maxlength="30" ${bound ? 'disabled' : ''}>${editIcon}</div></div>
        ${isProduct ? `<div class="proj-form-row"><span class="label">规格</span><div class="field"><input type="text" id="fProjSpec" placeholder="选填" value="${escapeAttr(s.spec || '')}" maxlength="20"></div></div>` : ''}
        <div class="proj-form-row"><span class="label${reqCls}">${priceLabel}</span><div class="field"><input type="text" class="input-amount" id="fPrice" placeholder="请输入" value="${escapeAttr(s.price ? ('¥' + String(s.price).replace(/^¥/, '')) : '')}">${editIcon}</div></div>
        ${durationRow}
        ${switchesRow}
        ${projImageUploadSectionHtml(s, imageLabel)}
      </div>
    </div>`;
  projBindFormEvents(container, { bound, offSale, isHidden, isProduct, mode });
}

function projBindFormEvents(container, lockCtx) {
  const bound = !!lockCtx?.bound;
  const offSale = !!lockCtx?.offSale;
  const isHidden = !!lockCtx?.isHidden;
  const isProduct = !!lockCtx?.isProduct;
  const bindSwitch = (id, key, opts = {}) => {
    const el = container.querySelector(id);
    if (!el || opts.disabled) return;
    el.addEventListener('click', () => {
      state.projFormState[key] = !state.projFormState[key];
      el.classList.toggle('on', state.projFormState[key]);
      if (opts.afterToggle) opts.afterToggle();
    });
  };
  bindSwitch('#fProjOnSale', 'onSale', {
    afterToggle: () => {
      /* 先同步可预约的锁定态（关在售会连带把可预约置为关），再报结果，toast 才与界面一致 */
      projSyncBookableLock(container, bound);
      showToast(state.projFormState.onSale ? PROJ_SWITCH_TOAST.onSale_on : PROJ_SWITCH_TOAST.onSale_off);
    },
  });
  if (!isProduct) {
    const bookableLocked = bound || isHidden || (offSale && !state.projFormState.onSale);
    bindSwitch('#fProjBookable', 'bookable', {
      disabled: bookableLocked,
      afterToggle: () => showToast(state.projFormState.bookable ? PROJ_SWITCH_TOAST.bookable_on : PROJ_SWITCH_TOAST.bookable_off),
    });
  }
  if (!isProduct) projWireLockToasts(container);
  container.querySelector('#fProjName')?.addEventListener('input', e => { state.projFormState.name = e.target.value; });
  container.querySelector('#fProjSpec')?.addEventListener('input', e => { state.projFormState.spec = e.target.value; });
  const priceEl = container.querySelector('#fPrice');
  if (priceEl) {
    priceEl.setAttribute('readonly', 'readonly');
    /* 金额键盘只写 input.value，必须回写到表单态；否则校验读不到价格 → 保存被拦（「请填写有效价格」） */
    const syncPriceState = e => {
      if (!state.projFormState) return;
      state.projFormState.price = String((e && e.target ? e.target.value : priceEl.value) || '').replace(/^¥/, '').trim();
    };
    if (!priceEl.dataset.priceStateWired) {
      priceEl.dataset.priceStateWired = '1';
      priceEl.addEventListener('input', syncPriceState);
      priceEl.addEventListener('change', syncPriceState);
    }
    if (!priceEl.dataset.amountKeypadWired) {
      priceEl.dataset.amountKeypadWired = '1';
      priceEl.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openAmountKeypad(priceEl);
      });
      priceEl.addEventListener('focus', e => {
        e.preventDefault();
        e.stopPropagation();
        priceEl.blur();
        openAmountKeypad(priceEl);
      });
    }
  }
  wireProjServiceDurationInput(container);
  const refreshImgSection = () => {
    const section = container.querySelector('#projImgCollapse')?.closest('.proj-form-row');
    if (!section) return;
    const label = section.querySelector('.title')?.textContent || '封面图（可选）';
    section.outerHTML = projImageUploadSectionHtml(state.projFormState, label);
    wireProjImageSection();
  };
  const wireProjImageSection = () => {
    container.querySelector('#projImgCollapse')?.addEventListener('click', () => {
      state.projFormState.imageExpanded = !state.projFormState.imageExpanded;
      container.querySelector('#projImgCollapse')?.classList.toggle('open', state.projFormState.imageExpanded);
      container.querySelector('#projImgBody')?.classList.toggle('open', state.projFormState.imageExpanded);
    });
    container.querySelector('#projImgUpload')?.addEventListener('click', e => {
      e.stopPropagation();
      const images = Array.isArray(state.projFormState.images) ? state.projFormState.images.slice() : [];
      if (images.length >= PROJ_IMG_MAX) {
        showToast('仅可上传 1 张封面', true);
        return;
      }
      state.projFormState.imageExpanded = true;
      images.push(projPickNextDemoImage(images));
      state.projFormState.images = images;
      state.projFormState.hasImage = true;
      refreshImgSection();
      showToast('已添加演示图片');
    });
    container.querySelectorAll('[data-img-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-img-del'), 10);
        const images = Array.isArray(state.projFormState.images) ? state.projFormState.images.slice() : [];
        if (Number.isNaN(idx) || idx < 0 || idx >= images.length) return;
        images.splice(idx, 1);
        state.projFormState.images = images;
        state.projFormState.hasImage = images.length > 0;
        state.projFormState.imageExpanded = true;
        refreshImgSection();
        showToast('已移除图片');
      });
    });
  };
  wireProjImageSection();
}

/* ==================== 行内展开区（详情 / 新增） ==================== */
const CIN_OPEN_MS = 320;
/* 保存反馈要求「快、干净利落」：收起 120ms、归位 260ms、高亮 320ms */
const CIN_CLOSE_MS = 120;
const CIN_FLIP_MS = 260;
const CIN_FOCUS_GAP = 12;     /* 顶边锚定时，距列表可视区顶边（表头下沿）的留白 */
const CIN_GLOW_MS = 320;

function catalogInline() { return state.catalogInline || (state.catalogInline = { mode: null, id: null, dirty: false, busy: false, base: null, addHost: 'top' }); }
function catalogInlinePanel() { return document.getElementById('catalogInlinePanel'); }
function reduceMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
/* 等动画结束：优先 animation/transitionend，兜底超时（避免永远挂住） */
function animEnd(el, ms) {
  return new Promise(resolve => {
    let done = false;
    const fin = () => { if (done) return; done = true; cleanup(); resolve(); };
    const cleanup = () => {
      el.removeEventListener('transitionend', onEnd);
      el.removeEventListener('animationend', onEnd);
      clearTimeout(t);
    };
    const onEnd = e => { if (e.target === el) fin(); };
    el.addEventListener('transitionend', onEnd);
    el.addEventListener('animationend', onEnd);
    const t = setTimeout(fin, ms + 120);
  });
}
function nextFrame() { return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }

/**
 * 展开动画期间「锁死」面板顶边在屏幕上的位置。
 * 必要性：动画把 height 从 0 长起来，scrollHeight 会先变矮再变高，
 * 浏览器会把 scrollTop 夹回（内容变矮时），面板就再也回不到焦点线。
 * 实测：「已下架」区块里的条目 gapTop 会飙到 378.8px。这里逐帧补回差值。
 */
function pinPanelTopWhileAnimating(panel, ms) {
  const scroller = catalogListScroller();
  if (!scroller || typeof requestAnimationFrame !== 'function') return;
  const top0 = panel.getBoundingClientRect().top;
  const t0 = performance.now();
  const step = now => {
    if (!panel.isConnected) return;
    const cur = panel.getBoundingClientRect().top;
    if (Math.abs(cur - top0) > 0.5) scroller.scrollTop += (cur - top0);
    if (now - t0 < ms + 80) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 表单「脏值」指纹：只纳影响数据/展示的字段，不含 UI 展开态 */
function projFormDirtySnapshot() {
  const s = state.projFormState || {};
  return JSON.stringify({
    name: s.name || '',
    spec: s.spec || '',
    price: String(s.price == null ? '' : s.price).replace(/^¥/, '').trim(),
    duration: s.duration == null ? null : parseInt(s.duration, 10) || 0,
    onSale: !!s.onSale,
    bookable: !!s.bookable,
    images: (Array.isArray(s.images) ? s.images : []).map(x => (x && (x.src || x.url || x.id)) || '').join('|'),
    _durUnit: s._durUnit || null,
    _durAmount: s._durAmount == null ? null : s._durAmount,
  });
}
function markCatalogInlineDirty() {
  const st = catalogInline();
  if (!st.mode) return;
  const el = document.getElementById('catalogInlinePanel');
  if (el) el.classList.toggle('is-dirty', st.dirty = projFormDirtySnapshot() !== st.base);
}

function catalogInlineTitle(p, mode) {
  const isProduct = state.projFormKind === 'product';
  if (mode === 'add') return isProduct ? '添加产品' : '添加项目';
  return isProduct ? '产品详情' : '项目详情';
}

/** 新增展开区锚点：在售区之后、「已下架 / 已隐藏 / 底部添加行」之前 */
function findCatalogAddMountBefore(tbody) {
  if (!tbody) return null;
  return tbody.querySelector(':scope > .catalog-offsale-block, :scope > .catalog-hidden-block, :scope > .catalog-list-add-row');
}

/**
 * 把展开区挂进列表 DOM。
 * - 编辑：插在目标行之后（行内手风琴）
 * - 新增：空态挂在内容区顶部；有数据时挂在在售末行之后（已下架 / 已隐藏之上）
 */
function mountCatalogInlinePanel() {
  const st = catalogInline();
  const tbody = document.getElementById('projProjectTable');
  if (!tbody || !st.mode) return null;

  const isAdd = st.mode === 'add';
  const p = isAdd ? null : findCatalogItemById(st.id);
  if (!isAdd && !p) return null;

  const panel = document.createElement('div');
  /* 编辑态加 --joined：与选中行拼成一块「被按下去」的灰底块（顶部内阴影在交界处） */
  panel.className = 'catalog-inline-panel'
    + (isAdd ? ' catalog-inline-panel--add' : ' catalog-inline-panel--joined');
  panel.id = 'catalogInlinePanel';
  const titleText = catalogInlineTitle(p, st.mode);
  panel.setAttribute('aria-label', titleText);
  /* 新增态补可见标题；详情态仍无题头（再点行 / 点外部收起） */
  panel.innerHTML = `
    ${isAdd ? `<div class="catalog-inline-panel__head" id="catalogInlineHead">${escapeHtml(titleText)}</div>` : ''}
    <div class="catalog-inline-panel__body" id="catalogInlineBody"></div>
    <div class="catalog-inline-panel__foot">
      <button type="button" class="btn-main" id="catalogInlineSave">${PROJ_SAVE_ICON}<span>保存</span></button>
    </div>`;

  if (isAdd) {
    const before = findCatalogAddMountBefore(tbody);
    if (before) tbody.insertBefore(panel, before);
    else tbody.appendChild(panel);
  } else {
    const wrap = tbody.querySelector(`.table-row-swipe[data-proj-id="${st.id}"]`);
    if (!wrap) return null;
    wrap.classList.add('has-inline-panel');
    wrap.after(panel);
  }

  projRenderForm(panel.querySelector('#catalogInlineBody'), isAdd ? 'add' : 'edit');

  /* 脏值基线与监听 */
  st.base = projFormDirtySnapshot();
  st.dirty = false;
  const onMutate = () => markCatalogInlineDirty();
  panel.addEventListener('input', onMutate);
  panel.addEventListener('change', onMutate);
  panel.addEventListener('click', e => {
    if (e.target.closest('.switch, [data-duration-unit], [data-img-del], #projImgUpload')) onMutate();
  });

  /* 收起手势：题头已撤，改由「再点选中行 / 点展开区外 / 切 Tab」触发，见 requestCatalogInlineClose */
  panel.querySelector('#catalogInlineSave')?.addEventListener('click', () => saveCatalogInline());
  syncCatalogWriteChrome();
  return panel;
}

/** 展开动画：高度+透明度 0 → 目标，落定后清掉内联样式 */
async function playCatalogInlineOpen(panel, finalH) {
  if (!panel) return;
  const h = finalH == null ? panel.getBoundingClientRect().height : finalH;
  if (reduceMotion()) return;
  panel.classList.add('is-opening');
  panel.style.height = '0px';
  panel.style.marginBottom = '0px';
  panel.style.opacity = '0';
  await nextFrame();
  panel.style.transition = `height ${CIN_OPEN_MS}ms var(--cip-ease), margin-bottom ${CIN_OPEN_MS}ms var(--cip-ease), opacity ${Math.round(CIN_OPEN_MS * 0.75)}ms var(--cip-ease)`;
  panel.style.height = h + 'px';
  panel.style.marginBottom = '';
  panel.style.opacity = '1';
  await animEnd(panel, CIN_OPEN_MS);
  panel.classList.remove('is-opening');
  panel.style.cssText = '';
  void panel.offsetHeight;
}

/** 关闭动画：目标 → 0，落定后回调（由回调决定是移除还是切到另一行） */
async function playCatalogInlineClose(panel) {
  if (!panel) return;
  if (reduceMotion()) return;
  const h = panel.getBoundingClientRect().height;
  panel.classList.add('is-closing');
  panel.style.height = h + 'px';
  panel.style.opacity = '1';
  void panel.offsetHeight;
  panel.style.transition = `height ${CIN_CLOSE_MS}ms var(--cip-ease), margin-bottom ${CIN_CLOSE_MS}ms var(--cip-ease), opacity ${Math.round(CIN_CLOSE_MS * 0.8)}ms var(--cip-ease)`;
  panel.style.height = '0px';
  panel.style.marginBottom = '0px';
  panel.style.opacity = '0';
  await animEnd(panel, CIN_CLOSE_MS);
}

/**
 * 价目表列表的滚动容器。
 * 表头/分组轨/Tab 固定后，滚动条从 .page-body 下移到 #projProjectTable，
 * 所有「滚动定位」相关计算都必须走这里，避免两处各认一个容器。
 */
function catalogListScroller() {
  return document.getElementById('projProjectTable')
    || document.querySelector('#screen-p-list .page-body');
}

/** 计算「最佳操作位」目标 scrollTop：装得下就垂直居中，装不下则顶边贴表头下沿 +12 */
function catalogInlineScrollTarget(panel, panelHeight) {
  const scroller = catalogListScroller();
  if (!scroller || !panel) return null;
  const view = scroller.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  const h = panelHeight == null ? box.height : panelHeight;
  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  /* 面板在滚动内容里的偏移（与高度无关：面板顶在流中的位置不随自身高度变化） */
  const base = box.top - view.top + scroller.scrollTop;
  const mode = h <= view.height ? 'center' : 'top';
  const raw = mode === 'center' ? base - (view.height - h) / 2 : base - CIN_FOCUS_GAP;
  return {
    scroller, view, box, h, mode,
    raw: Math.round(raw),
    nextTop: Math.max(0, Math.min(maxTop, Math.round(raw))),
    maxTop,
  };
}
function scrollCatalogInlineIntoFocus(panel, opts = {}) {
  const t = catalogInlineScrollTarget(panel, opts.panelHeight);
  if (!t) return null;
  /* 收起态下 scrollHeight 变小，落点再夹一次，避免滚过头 */
  const next = Math.max(0, Math.min(t.nextTop, t.maxTop));
  if (opts.instant) t.scroller.scrollTop = next;
  else if (typeof t.scroller.scrollTo === 'function') t.scroller.scrollTo({ top: next, behavior: 'smooth' });
  else t.scroller.scrollTop = next;
  return { ...t, nextTop: next };
}

/**
 * 展开某行/新增面板。进入前若已有面板，调用方应先收（保证两条动效不打架）。
 */
function openCatalogInline(mode, id, opts = {}) {
  const st = catalogInline();
  if (st.busy) return;
  const isProduct = mode === 'add'
    ? isProductCatalogTab()
    : getCatalogProducts().some(x => x.id === id);
  state.projFormKind = isProduct ? 'product' : 'project';

  st.mode = mode;
  st.id = mode === 'edit' ? id : null;
  state.projEditingId = mode === 'edit' ? id : null;
  state.projFormState = mode === 'edit' ? projProjectToForm(findCatalogItemById(id)) : projDefaultForm(state.projFormKind);
  st.base = null; st.dirty = false;

  projRenderList();
  const panel = catalogInlinePanel();
  if (!panel) return;
  /* 面板此刻仍是「自然高度」，scrollHeight 才是最终值 —— 先把落点算定并滚过去 */
  const target = catalogInlineScrollTarget(panel);
  if (target) target.scroller.scrollTop = target.nextTop;
  /* 再收起为 0 并长出；期间锁死顶边，抵消 scrollTop 被夹回 */
  pinPanelTopWhileAnimating(panel, CIN_OPEN_MS);
  void playCatalogInlineOpen(panel, target ? target.h : undefined);
}

/** 带脏值守卫的收起入口（点头部 / 点外部 / 点另一行） */
function requestCatalogInlineClose(reason) {
  const st = catalogInline();
  if (!st.mode || st.busy) return;
  if (st.dirty) { openCatalogInlineDiscardDialog(reason); return; }
  closeCatalogInline();
}

let catalogInlinePendingClose = null;
let catalogInlinePendingTab = null;
function openCatalogInlineDiscardDialog(reason) {
  catalogInlinePendingClose = reason || 'scrim';
  document.getElementById('catalogInlineDiscardMask')?.classList.add('show');
}
function closeCatalogInlineDiscardDialog() {
  document.getElementById('catalogInlineDiscardMask')?.classList.remove('show');
  catalogInlinePendingClose = null;
  catalogInlinePendingTab = null;
}
function confirmCatalogInlineDiscard() {
  const reason = catalogInlinePendingClose;
  const tab = catalogInlinePendingTab;
  closeCatalogInlineDiscardDialog();
  if (tab) { closeCatalogInline('tab', { after: () => activatePriceCatalogTab(tab) }); return; }
  closeCatalogInline(reason);
}

/** 播放收起动画并移除面板；add 态收起后要重绘以恢复空态块 */
async function closeCatalogInline(reason, opts = {}) {
  const st = catalogInline();
  const panel = catalogInlinePanel();
  if (!st.mode) { opts.after && opts.after(); return; }
  const wasAdd = st.mode === 'add';
  st.busy = true;
  try {
    if (panel) {
      await playCatalogInlineClose(panel);
      panel.remove();
    }
    const wrap = document.querySelector('.table-row-swipe.has-inline-panel');
    if (wrap) wrap.classList.remove('has-inline-panel');
    st.mode = null; st.id = null; st.dirty = false; st.base = null;
    state.projEditingId = null;
    state.projFormState = null;
    /* 新增态曾占位（顶掉空态块 / 表头），收起后要还原列表 */
    if (wasAdd) projRenderList();
  } finally {
    st.busy = false;
  }
  opts.after && opts.after();
}

/** 行右键行为：同一行再点 = 收起；不同行 = 先收起再展开（手风琴） */
function toggleCatalogInlineEdit(id) {
  const st = catalogInline();
  if (st.busy) return;
  if (st.mode === 'edit' && st.id === id) { requestCatalogInlineClose('row'); return; }
  if (st.dirty) { catalogInlinePendingSwitch = id; openCatalogInlineDiscardDialog('switch'); return; }
  if (st.mode) closeCatalogInline('switch', { after: () => openCatalogInline('edit', id) });
  else openCatalogInline('edit', id);
}
let catalogInlinePendingSwitch = null;
function confirmCatalogInlineDiscardSwitch() {
  const id = catalogInlinePendingSwitch;
  catalogInlinePendingSwitch = null;
  closeCatalogInlineDiscardDialog();
  const st = catalogInline();
  if (!st.mode) { openCatalogInline('edit', id); return; }
  closeCatalogInline('switch', { after: () => openCatalogInline('edit', id) });
}

/** 点展开区之外 = 收起 */
function onDocumentClickForInline(e) {
  const st = catalogInline();
  if (!st.mode || st.busy) return;
  if (e.target.closest('#catalogInlinePanel')) return;
  /* 点另一行由该行自己的 click 处理（会走 switch 分支） */
  if (e.target.closest('.table-row-swipe .table-row')) return;
  /* 金额键盘打开时：不收起展开区（点遮罩只关键盘） */
  const amountMask = document.getElementById('amountKeypadMask');
  if (amountMask && amountMask.classList.contains('open')) return;
  /* 其它浮层（左滑操作/分组 Sheet/金额键盘/时长选择器）不算「外部」 */
  if (e.target.closest('.table-row-actions, .picker-mask, .dialog-mask, .amount-keypad, #amountKeypadMask, .catalog-row-action-mask')) return;
  if (e.target.closest('#catalogInlineDiscardMask')) return;
  requestCatalogInlineClose('outside');
}

/** 新增入口：切到列表页并在内容区展开「新增」面板 */
function projOpenAdd() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const st = catalogInline();
  if (st.busy) return;
  state.projEditingId = null;
  state.projFormKind = isProductCatalogTab() ? 'product' : 'project';
  state.projFormState = projDefaultForm(state.projFormKind);
  projShowScreen('screen-p-list');
  openCatalogInline('add');
}

/** 编辑入口（含 7 个深链）：切到列表页并展开该行 */
function projOpenEdit(id) {
  const p = findCatalogItemById(id);
  if (!p) {
    showToast(isProductCatalogTab() ? '未找到该产品，请先切换「有数据」' : '未找到该项目，请先切换「有数据」', true);
    return;
  }
  state.projFormKind = getCatalogProducts().some(x => x.id === id) ? 'product' : 'project';
  state.projEditingId = id;
  state.projFormState = projProjectToForm(p);
  /* 深链可能不在列表页（或 Tab 不对），先归位 */
  if (state.priceCatalogTab !== (state.projFormKind === 'product' ? 'product' : 'project')) {
    state.priceCatalogTab = state.projFormKind === 'product' ? 'product' : 'project';
    state.catalogColSort = { key: null, dir: null };
  }
  setActiveCatalogGroupId('all');
  projShowScreen('screen-p-list');
  openCatalogInline('edit', id);
}

function projValidateForm() {
  const name = (state.projFormState?.name || '').trim();
  const priceRaw = String(state.projFormState?.price || '').replace(/^¥/, '').trim();
  state.projFormState.price = priceRaw;
  const price = parseFloat(priceRaw);
  if (state.projFormState?._durUnit) {
    const mins = serviceDurationFieldsToMinutes(state.projFormState._durUnit, state.projFormState._durAmount);
    if (mins != null) state.projFormState.duration = mins;
  }
  const dur = parseInt(state.projFormState?.duration, 10) || 0;
  const isProduct = state.projFormKind === 'product';
  if (!name) { showToast(isProduct ? '请填写产品名称' : '请填写项目名称', true); return false; }
  const catalog = isProduct ? (state.productCatalog || []) : (state.projectCatalog || []);
  const nameNorm = name.trim();
  const dup = catalog.some(p => p.id !== state.projEditingId && String(p.name || '').trim() === nameNorm);
  if (dup) { showToast('名称已存在', true); return false; }
  if (isNaN(price) || price < 0) { showToast('请填写有效价格', true); return false; }
  if (price > INPUT_LIMITS.MONEY_MAX) { showToast(`金额不能超过 ${formatMoneyLimitLabel()}`, true); return false; }
  if (!isProduct && dur < 1) {
    showToast('请填写项目时长', true);
    return false;
  }
  if (!isProduct && dur > PROJ_SERVICE_DURATION_MAX_MIN) state.projFormState.duration = PROJ_SERVICE_DURATION_MAX_MIN;
  return true;
}

/** 只做校验 + 落库，返回 { ok, id, isNew }；不含任何导航/动效 */
function projCommitForm() {
  if (!projValidateForm()) return { ok: false };
  const isProduct = state.projFormKind === 'product';
  const catalog = isProduct ? state.productCatalog : state.projectCatalog;
  const images = projNormalizeImages(state.projFormState.images, false);
  const payload = isProduct ? {
    name: state.projFormState.name.trim(),
    spec: (state.projFormState.spec || '').trim(),
    price: Math.round(parseFloat(state.projFormState.price) * 100) / 100,
    onSale: state.projFormState.onSale,
    category: state.projFormState.category || '产品',
    images,
    hasImage: images.length > 0,
  } : {
    name: state.projFormState.name.trim(),
    price: Math.round(parseFloat(state.projFormState.price) * 100) / 100,
    duration: state.projFormState.duration,
    onSale: state.projFormState.onSale,
    bookable: state.projFormState.bookable,
    images,
    hasImage: images.length > 0,
    category: PROJ_DEFAULT_CATEGORY,
  };
  let id = state.projEditingId;
  let isNew = false;
  if (id) {
    const idx = catalog.findIndex(p => p.id === id);
    if (idx >= 0) {
      catalog[idx] = { ...catalog[idx], ...payload };
      if (isProduct) delete catalog[idx].stock;
    }
  } else {
    id = projUid();
    isNew = true;
    catalog.push({
      id,
      boundToCard: false,
      boundToCoupon: false,
      boundToMall: false,
      hidden: false,
      sortOrder: nextCatalogSortOrder(catalog),
      ...payload,
    });
  }
  return { ok: true, id, isNew, isProduct };
}

/** 保存成功反馈：该行高亮闪一次（~1.2s）后自动淡出 */
function catalogRowSavedGlow(id) {
  const wrap = document.querySelector(`#projProjectTable .table-row-swipe[data-proj-id="${id}"]`);
  if (!wrap || reduceMotion()) return;
  wrap.classList.add('is-saved-glow');
  setTimeout(() => wrap.classList.remove('is-saved-glow'), CIN_GLOW_MS + 60);
}

/**
 * 新增保存后的「归位」：展开区收起的同时长成列表行。
 * 做法：收起前记下展开区矩形 → 收起 + 重绘 → 量新行矩形 →
 * 用一个 ghost（展开区外观的浮层）从首帧飞到末帧（同帧起飞、落到目标位），
 * 落定即撤 ghost —— 其终态与新行像素一致，因此无跳变。
 */
async function catalogFlipPanelToRow(firstRect, newId) {
  if (!firstRect || reduceMotion()) { catalogRowSavedGlow(newId); return; }
  const wrap = document.querySelector(`#projProjectTable .table-row-swipe[data-proj-id="${newId}"]`);
  const rowEl = wrap?.querySelector('.table-row');
  if (!rowEl) { catalogRowSavedGlow(newId); return; }
  const last = rowEl.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'catalog-flip-ghost';
  ghost.style.cssText = `left:${firstRect.left}px;top:${firstRect.top}px;width:${firstRect.width}px;height:${firstRect.height}px;`;
  ghost.innerHTML = '<div class="catalog-flip-ghost__inner"></div>';
  rowEl.style.visibility = 'hidden';
  document.body.appendChild(ghost);
  const dx = last.left - firstRect.left;
  const dy = last.top - firstRect.top;
  const sx = last.width / firstRect.width;
  const sy = last.height / firstRect.height;
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1,1)', borderRadius: '12px', opacity: 1, boxShadow: '0 2px 10px rgba(0,0,0,.05)' },
    { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, borderRadius: '0px', opacity: 1, boxShadow: '0 0 0 rgba(0,0,0,0)', offset: 0.92 },
    { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, borderRadius: '0px', opacity: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  ], { duration: CIN_FLIP_MS, easing: 'cubic-bezier(.22,.82,.24,1)', fill: 'both' });
  /* 内部内容早退场，避免整块内容被压成一条 */
  const inner = ghost.querySelector('.catalog-flip-ghost__inner');
  if (inner) inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Math.round(CIN_FLIP_MS * 0.42), easing: 'ease-out', fill: 'both' });
  try { await anim.finished; } catch (_) {}
  ghost.remove();
  rowEl.style.visibility = '';
  catalogRowSavedGlow(newId);
}

/** 把某行拉回可视区（瞬时，不用平滑滚动，便于紧接着量它的矩形做 FLIP） */
function catalogKeepRowInView(id) {
  const wrap = document.querySelector(`#projProjectTable .table-row-swipe[data-proj-id="${id}"]`);
  const scroller = catalogListScroller();
  if (!wrap || !scroller) return;
  const vr = scroller.getBoundingClientRect();
  const rr = wrap.getBoundingClientRect();
  if (rr.top < vr.top || rr.bottom > vr.bottom) scroller.scrollTop += rr.top - (vr.top + CIN_FOCUS_GAP);
}

/** 行内展开区「保存」 */
async function saveCatalogInline() {
  if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) return;
  const st = catalogInline();
  if (st.busy) return;
  const isAdd = st.mode === 'add';
  const res = projCommitForm();
  if (!res.ok) return;
  /* 归位动效的起点：收起前量展开区 */
  const firstRect = isAdd ? catalogInlinePanel()?.getBoundingClientRect() : null;
  st.dirty = false;
  st.base = projFormDirtySnapshot();
  const finish = () => {
    if (res.isProduct) syncBalanceCanBuyProductsField();
    if (state.priceCatalogReturn === 'screen2') {
      renderProjectList();
      if (state.projBenefitDraft) renderProjectPickParams();
    } else if (state.priceCatalogReturn === 'screen2p') {
      renderProductList();
    } else if (state.priceCatalogReturn === 'screen4') {
      renderMemberPriceProjectList();
      if (state.discBenefitDraft) renderDiscountPickParams();
    }
    showToast(res.isNew ? (res.isProduct ? '产品已创建' : '项目已创建') : '保存成功');
    if (isAdd) catalogFlipPanelToRow(firstRect, res.id);
    else catalogRowSavedGlow(res.id);
  };
  if (isAdd) {
    /* 新增：先收起并重绘（新行入列），再由 ghost 完成「长成一行」的归位 */
    await closeCatalogInline('add-saved');
    catalogKeepRowInView(res.id);
    finish();
    return;
  }
  /* 编辑：收起 → 重绘该行（名称/价格/时长可能已变）→ 高亮闪一次。
     closeCatalogInline 只移除了展开区，行 DOM 仍是保存前的旧值，
     不重绘就会出现「改了名字/价格，列表还显示老数据」。 */
  await closeCatalogInline('saved');
  projRenderList();
  catalogKeepRowInView(res.id);
  finish();
}

/** 兼容旧入口（全屏保存按钮已废止；仅保留给深链/外部调用） */
function projSaveForm() {
  if (catalogInline().mode) { saveCatalogInline(); return; }
  const res = projCommitForm();
  if (!res.ok) return;
  projRenderList();
  if (res.isProduct) syncBalanceCanBuyProductsField();
  projShowScreen('screen-p-list');
  showToast(res.isNew ? (res.isProduct ? '产品已创建' : '项目已创建') : '保存成功');
}

function openPriceCatalog(fromScreen) {
  closeAllFlowOverlays();
  state.priceCatalogReturn = fromScreen || 'screen0';
  state.navStack.push(state.priceCatalogReturn);
  state.catalogColSort = { key: null, dir: null };
  syncAllCatalogBindings();
  projRenderList();
  syncCatalogWriteChrome();
  projShowScreen('screen-p-list');
}

function canCatalogWrite() {
  return !window.RTBPerm || typeof window.RTBPerm.has !== 'function' || !!window.RTBPerm.has('priceListCreate');
}
function canCardWrite() {
  return !window.RTBPerm || typeof window.RTBPerm.has !== 'function' || !!window.RTBPerm.has('cardItemCreate');
}
function syncCatalogWriteChrome() {
  const can = canCatalogWrite();
  ['btnProjTitleAdd', 'btnProjEmptyAdd', 'btnCatalogGroupManage'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', !can);
  });
  document.getElementById('catalogInlineSave')?.classList.toggle('hidden', !can);
  /* 新增面板打开时，「添加」行让位给表单本体，不能被这里重新放出 */
  document.getElementById('btnCatalogListAdd')?.classList.toggle('hidden', !can || catalogInline().mode === 'add');
}
function syncCardWriteChrome() {
  const can = canCardWrite();
  ['btnAddCard', 'btnCardGroupManage', 'emptyStateCreateBtn', 'btnAddCardCreate'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', !can);
  });
  const detailWrite = ['btnEditTemplate', 'btnShelfTemplate', 'btnDetailCloneTop', 'btnDetailReshelf'];
  detailWrite.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!can) el.classList.add('hidden');
  });
  /* 有写入权限时，详情壳仍按 shelved 规则控制显隐 */
  if (can && state.viewingTemplateId) {
    const t = typeof getTemplateById === 'function' ? getTemplateById(state.viewingTemplateId) : null;
    if (t && typeof syncDetailShell === 'function') syncDetailShell(t);
  }
}

function projBackFromCatalog() {
  closeAllFlowOverlays();
  state.navStack.pop();
  const from = state.priceCatalogReturn || 'screen0';
  /* 权益返回：刷新分组 Tab（重置为「全部」）并重绘列表 */
  syncAllCatalogBindings();
  if (from === 'workbench') {
    state.priceCatalogReturn = null;
    openWorkbench();
  } else if (from === 'screen2') {
    setActivePickGroupId('project', 'all');
    renderProjectList();
    if (state.projBenefitDraft) renderProjectPickParams();
    showOnlyScreen('screen2');
  } else if (from === 'screen2p') {
    setActivePickGroupId('product', 'all');
    renderProductList();
    showOnlyScreen('screen2p');
  } else if (from === 'screen6') {
    showOnlyScreen('screen6');
  } else if (from === 'screen4') {
    setActivePickGroupId('discount', 'all');
    renderMemberPriceProjectList();
    if (state.discBenefitDraft) renderDiscountPickParams();
    showOnlyScreen('screen4');
  } else {
    setStep(0);
  }
  syncFlowMapFromAppState();
}

/** 切换价目表 Tab（项目 / 产品）：清列排序 + 重绘列表；供点击与「放弃修改」后统一复用 */
function activatePriceCatalogTab(tab) {
  state.priceCatalogTab = tab;
  state.catalogColSort = { key: null, dir: null };
  closeAllCatalogSwipes();
  projRenderList();
}

function wireProjCatalogModule() {
  document.querySelectorAll('[data-price-catalog-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.priceCatalogTab;
      if (!tab || state.priceCatalogTab === tab) return;
      const st = catalogInline();
      /* 切 Tab 也收起展开区：展开区里的表单属于另一个 Tab，留着只会串数据 */
      if (st.mode) {
        if (st.dirty) { catalogInlinePendingTab = tab; openCatalogInlineDiscardDialog('tab'); return; }
        closeCatalogInline('tab', { after: () => activatePriceCatalogTab(tab) });
        return;
      }
      activatePriceCatalogTab(tab);
    });
  });
  document.getElementById('btnProjTitleAdd')?.addEventListener('click', projOpenAdd);
  document.getElementById('btnProjEmptyAdd')?.addEventListener('click', projOpenAdd);
  document.getElementById('projTableHead')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-col-sort]');
    if (!btn) return;
    cycleCatalogColSort(btn.dataset.colSort);
  });
  document.getElementById('projBackFromList')?.addEventListener('click', projBackFromCatalog);
  document.getElementById('catalogInlineDiscardAbort')?.addEventListener('click', () => { catalogInlinePendingSwitch = null; closeCatalogInlineDiscardDialog(); });
  document.getElementById('catalogInlineDiscardOk')?.addEventListener('click', () => {
    if (catalogInlinePendingSwitch) confirmCatalogInlineDiscardSwitch();
    else confirmCatalogInlineDiscard();
  });
  /* 点展开区之外 = 收起 */
  document.addEventListener('click', onDocumentClickForInline, true);
  document.getElementById('projDialogCancel')?.addEventListener('click', closeProjDeleteDialog);
  document.getElementById('projDialogMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('projDialogMask')) closeProjDeleteDialog();
  });
  document.getElementById('projDialogConfirm')?.addEventListener('click', () => {
    if (window.RTBPerm && typeof window.RTBPerm.requireCatalogWrite === 'function' && !window.RTBPerm.requireCatalogWrite()) {
      closeProjDeleteDialog();
      return;
    }
    const delId = state.projEditingId;
    const p = findCatalogItemById(delId);
    if (isCatalogDeleteLocked(p)) {
      showToast(catalogDeleteLockToast(p), true);
      closeProjDeleteDialog();
      return;
    }
    const isProduct = getCatalogProducts().some(x => x.id === delId);
    if (isProduct) {
      state.productCatalog = state.productCatalog.filter(x => x.id !== delId);
      syncBalanceCanBuyProductsField();
    } else {
      state.projectCatalog = state.projectCatalog.filter(x => x.id !== delId);
    }
    purgeCatalogItemFromGroups(delId);
    closeProjDeleteDialog();
    refreshAfterCatalogChange();
    projShowScreen('screen-p-list');
    showToast('已删除');
  });
  document.getElementById('unlimitedValidityCancel')?.addEventListener('click', closeUnlimitedValidityDialog);
  document.getElementById('unlimitedValidityConfirm')?.addEventListener('click', confirmUnlimitedValidityDialog);
  document.getElementById('unlimitedValidityDialogMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('unlimitedValidityDialogMask')) closeUnlimitedValidityDialog();
  });
  const catalogActionMask = document.getElementById('catalogRowActionMask');
  catalogActionMask?.addEventListener('click', e => {
    if (e.target === catalogActionMask) closeCatalogRowActions();
  });
  catalogActionMask?.querySelectorAll('[data-catalog-act]').forEach(btn => {
    btn.addEventListener('click', () => handleCatalogRowAction(btn.dataset.catalogAct));
  });
  document.getElementById('catalogGroupTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-catalog-group]');
    if (!tab) return;
    const id = tab.dataset.catalogGroup;
    if (!id || id === getActiveCatalogGroupId()) return;
    setActiveCatalogGroupId(id);
    closeAllCatalogSwipes();
    projRenderList();
  });
  wireCatalogGroupScrollPan();
  document.getElementById('btnCatalogGroupManage')?.addEventListener('click', openCatalogGroupManage);
  document.getElementById('projBackFromGroups')?.addEventListener('click', () => {
    projRenderList();
    projShowScreen('screen-p-list');
  });
  document.getElementById('btnCatalogGroupCreate')?.addEventListener('click', () => {
    state.catalogAssignResumeAfterGroupCreate = false;
    openCatalogGroupNameDialog('create');
  });
  document.getElementById('catalogGroupManageList')?.addEventListener('click', e => {
    if (e.target.closest('[data-group-drag]')) return;
    const actBtn = e.target.closest('[data-group-act]');
    if (actBtn) {
      handleCatalogGroupRowAction(actBtn.dataset.groupAct, actBtn.dataset.groupId);
      return;
    }
    const toggle = e.target.closest('[data-group-toggle]');
    if (toggle) {
      toggleCatalogGroupRowActions(toggle.dataset.groupToggle);
      return;
    }
    const members = e.target.closest('[data-group-members]');
    if (members) {
      openCatalogGroupMembers(members.dataset.groupMembers);
      return;
    }
    const rowBtn = e.target.closest('[data-group-row]');
    if (rowBtn) {
      toggleCatalogGroupRowActions(rowBtn.dataset.groupRow);
    }
  });
  document.getElementById('catalogGroupMenuMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('catalogGroupMenuMask')) closeCatalogGroupRowMenu();
  });
  document.getElementById('catalogGroupMenuMask')?.querySelectorAll('[data-group-menu-act]').forEach(btn => {
    btn.addEventListener('click', () => handleCatalogGroupMenuAction(btn.dataset.groupMenuAct));
  });
  document.getElementById('catalogGroupNameCancel')?.addEventListener('click', closeCatalogGroupNameDialog);
  document.getElementById('catalogGroupNameConfirm')?.addEventListener('click', confirmCatalogGroupNameDialog);
  document.getElementById('catalogGroupNameMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('catalogGroupNameMask')) closeCatalogGroupNameDialog();
  });
  document.getElementById('catalogGroupNameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmCatalogGroupNameDialog();
  });
  document.getElementById('catalogGroupDeleteCancel')?.addEventListener('click', closeCatalogGroupDeleteConfirm);
  document.getElementById('catalogGroupDeleteConfirm')?.addEventListener('click', confirmCatalogGroupDelete);
  document.getElementById('catalogGroupDeleteMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('catalogGroupDeleteMask')) closeCatalogGroupDeleteConfirm();
  });
  document.getElementById('projBackFromGroupMembers')?.addEventListener('click', popToCatalogGroupManage);
  document.getElementById('btnCatalogGroupMembersSave')?.addEventListener('click', saveCatalogGroupMembers);
  document.getElementById('catalogGroupMembersList')?.addEventListener('change', e => {
    if (e.target.matches('input[data-member-id]')) syncCatalogGroupMembersCount();
  });
  document.getElementById('btnCatalogMembersInvert')?.addEventListener('click', () => {
    const listEl = document.getElementById('catalogGroupMembersList');
    listEl?.querySelectorAll('input[data-member-id]').forEach(el => { el.checked = !el.checked; });
    syncCatalogGroupMembersCount();
  });
  document.getElementById('btnCatalogMembersSelectAll')?.addEventListener('click', () => {
    const listEl = document.getElementById('catalogGroupMembersList');
    listEl?.querySelectorAll('input[data-member-id]').forEach(el => { el.checked = true; });
    syncCatalogGroupMembersCount();
  });
  document.getElementById('btnProjEmptyAddToGroup')?.addEventListener('click', () => {
    const gid = getActiveCatalogGroupId();
    if (gid && gid !== 'all') openCatalogGroupMembers(gid);
  });
  document.getElementById('catalogItemGroupCancel')?.addEventListener('click', closeCatalogItemGroupSheet);
  document.getElementById('catalogItemGroupConfirm')?.addEventListener('click', confirmCatalogItemGroupSheet);
  document.getElementById('catalogItemGroupMask')?.addEventListener('click', e => {
    if (e.target === document.getElementById('catalogItemGroupMask')) closeCatalogItemGroupSheet();
  });
  document.getElementById('btnDurCancel')?.addEventListener('click', closeDurPicker);
  document.getElementById('btnDurOk')?.addEventListener('click', confirmDurPicker);
  document.getElementById('durPickerMask')?.addEventListener('click', e => {
    if (e.target.id === 'durPickerMask') closeDurPicker();
  });
  document.getElementById('btnManagePriceCatalog')?.addEventListener('click', () => openPriceCatalog('screen2'));
  document.getElementById('btnManagePriceCatalogDisc')?.addEventListener('click', () => openPriceCatalog('screen4'));
  document.getElementById('btnManagePriceCatalogProd')?.addEventListener('click', () => openPriceCatalog('screen2p'));
  wirePickGroupTabs();
  document.getElementById('btnProjListHintClose')?.addEventListener('click', () => {
    try { sessionStorage.setItem(CATALOG_DRAG_HINT_KEY, '1'); } catch (_) {}
    syncProjListDragHint();
  });
  syncProjListDragHint();
  initProjDurPicker();
}

/* demo L25452-25495 */
function ensureDemoFilled() {
  /* 仅保证价目表可用，不打断进行中的建卡表单 */
  if (state.demoListMode !== 'filled') {
    state.demoListMode = 'filled';
    syncDemoStateButtons();
  }
  if (!getCatalogProjects().length) state.projectCatalog = seedProjectCatalog();
  if (!getCatalogProducts().length) state.productCatalog = seedProductCatalog();
  if (!state.catalogGroups) state.catalogGroups = emptyCatalogGroups();
  if (!state.activeCatalogGroupId) state.activeCatalogGroupId = emptyActiveCatalogGroupId();
  /* 空态会留下仅含系统「隐藏」的分组；须按「是否有自定义组」判断，否则烫染/护理等演示组不会注入 */
  const hasCustomGroup = ['project', 'product'].some(bucket =>
    (state.catalogGroups[bucket] || []).some(g => g && !g.system)
  );
  if (!hasCustomGroup && (getCatalogProjects().length || getCatalogProducts().length)) {
    state.catalogGroups = seedCatalogGroups();
  }
  ensureSystemHiddenGroups();
  if (!state.templates.length) {
    state.templates = buildDemoTemplates();
    if (!Object.keys(state.memberHoldings || {}).length) seedDemoMemberHoldings();
  }
  if (!Array.isArray(state.cardGroups)) state.cardGroups = [];
  if (state.templates.length && !state.cardGroups.length) state.cardGroups = seedCardGroups();
  ensureActiveCardGroupIdBySurface();
  /* 须在 templates 就绪后再同步，否则绑卡标记会全为 false */
  syncAllCatalogBindings();
  ensureProjDemoImages();
}

/** 保证绑卡演示项带上多图，充分展示 Figma 305:325 上传 UI */
function ensureProjDemoImages() {
  const projects = getCatalogProjects();
  const p4 = projects.find(x => x.id === 'p4');
  if (p4 && (!Array.isArray(p4.images) || p4.images.length < 3)) {
    p4.images = PROJ_DEMO_IMG_POOL.slice(0, 4);
    p4.hasImage = true;
  }
  const p15 = projects.find(x => x.id === 'p15');
  if (p15 && (!Array.isArray(p15.images) || !p15.images.length)) {
    p15.images = [PROJ_DEMO_IMG_POOL[0]];
    p15.hasImage = true;
  }
}

/* demo L27429-27491 */
function resolveProjDemoTarget(kind) {
  const preferredId = PROJ_DEMO_IDS[kind];
  const match = {
    bound: x => x.boundToCard && x.onSale,
    offSale: x => !x.onSale,
    normal: x => !x.boundToCard && x.onSale,
  }[kind];

  const pick = () => {
    let p = preferredId ? getCatalogProjects().find(x => x.id === preferredId) : null;
    if (p && match && !match(p)) p = null;
    if (!p && match) p = getCatalogProjects().find(match);
    return p || null;
  };

  let p = pick();
  if (!p) {
    /* 强制重建演示价目表 + 卡模板，避免「有目录无演示卡」或绑卡未同步导致入口失效 */
    state.projectCatalog = seedProjectCatalog();
    state.productCatalog = seedProductCatalog();
    state.templates = buildDemoTemplates();
    if (!Object.keys(state.memberHoldings || {}).length) seedDemoMemberHoldings();
    state.demoListMode = 'filled';
    syncDemoStateButtons();
    syncAllCatalogBindings();
    p = pick();
  }
  if (!p) {
    const tip = { bound: '绑卡锁定', offSale: '已下架', normal: '普通' }[kind] || '目标';
    showToast(`未找到「项目详情 · ${tip}」演示项`, true);
  }
  return p;
}

/** 产品详情演示项：优先固定 ID，缺失或状态不符时回退匹配 */
function resolveProductDemoTarget(kind) {
  const preferredId = PROD_DEMO_IDS[kind];
  const match = {
    offSale: x => !x.onSale,
    normal: x => !!x.onSale,
  }[kind];

  const pick = () => {
    let p = preferredId ? getCatalogProducts().find(x => x.id === preferredId) : null;
    if (p && match && !match(p)) p = null;
    if (!p && match) p = getCatalogProducts().find(match);
    return p || null;
  };

  let p = pick();
  if (!p) {
    state.productCatalog = seedProductCatalog();
    state.demoListMode = 'filled';
    syncDemoStateButtons();
    syncAllCatalogBindings();
    p = pick();
  }
  if (!p) {
    const tip = { offSale: '已下架', normal: '普通' }[kind] || '目标';
    showToast(`未找到「产品详情 · ${tip}」演示项`, true);
  }
  return p;
}

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
  'price-list-empty': function () {
    applyDemoListState('empty');
    state.priceCatalogTab = 'project';
    state.catalogColSort = { key: null, dir: null };
    state.catalogHiddenExpanded = false;
    syncPriceCatalogTabs();
    /* 必须重绘：清空数据后若只切屏，DOM 会残留上一页的列表/表头/分组轨，空态块永不出现 */
    projRenderList();
    projShowScreen('screen-p-list');
    setFlowNavHighlight('price-list-empty');
  },
  'price-list-filled': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    /* capture：分组条滚到右端，保证「隐藏」Tab（含左侧图标）完整可见 */
    const wantCapture = document.documentElement.classList.contains('prd-capture')
      || new URLSearchParams(location.search).get('capture') === '1';
    if (wantCapture) {
      document.documentElement.dataset.captureRevealHidden = '1';
      document.documentElement.classList.add('prd-capture');
      const run = () => bakeCatalogGroupTabsRevealHidden();
      requestAnimationFrame(() => {
        run();
        setTimeout(run, 50);
        setTimeout(run, 200);
        setTimeout(run, 600);
        setTimeout(run, 1500);
      });
    }
  },
  'price-list-action': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const first = getCatalogProjects().find(p => p.onSale && !p.hidden) || getCatalogProjects()[0];
    if (first) openCatalogRowActions(first.id);
  },
  'price-list-swipe': function () {
    ensureDemoFilled();
    syncAllCatalogBindings();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const target = getCatalogProjects().find(p => p.onSale && !p.hidden && !isCatalogDeleteLocked(p))
      || getCatalogProjects().find(p => !isCatalogDeleteLocked(p))
      || getCatalogProjects()[0];
    requestAnimationFrame(() => {
      openCatalogRowSwipe(target && target.id);
      requestAnimationFrame(() => openCatalogRowSwipe(target && target.id));
    });
  },
  'price-list-swipe-locked': function () {
    ensureDemoFilled();
    syncAllCatalogBindings();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const target = getCatalogProjects().find(p => p.onSale && !p.hidden && isCatalogDeleteLocked(p))
      || getCatalogProjects().find(p => isCatalogDeleteLocked(p));
    requestAnimationFrame(() => {
      openCatalogRowSwipe(target && target.id);
      requestAnimationFrame(() => openCatalogRowSwipe(target && target.id));
    });
  },
  'price-list-product': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'product';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
  },
  'price-groups': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    openCatalogGroupManage();
  },
  'price-add': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projOpenAdd();
  },
  'price-add-product': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'product';
    syncPriceCatalogTabs();
    projOpenAdd();
  },
  'price-edit-normal': function () {
    ensureDemoFilled();
    const p = resolveProjDemoTarget('normal');
    if (p) projOpenEdit(p.id);
  },
  'price-edit-bound': function () {
    ensureDemoFilled();
    const p = resolveProjDemoTarget('bound');
    if (p) projOpenEdit(p.id);
  },
  'price-edit-off-sale': function () {
    ensureDemoFilled();
    const p = resolveProjDemoTarget('offSale');
    if (p) projOpenEdit(p.id);
  },
  'price-edit-product': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'product';
    syncPriceCatalogTabs();
    const p = resolveProductDemoTarget('normal');
    if (p) projOpenEdit(p.id);
  },
  'price-edit-product-off-sale': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'product';
    syncPriceCatalogTabs();
    const p = resolveProductDemoTarget('offSale');
    if (p) projOpenEdit(p.id);
  },
  'price-list-hidden-open': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    state.catalogHiddenExpanded = true;
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollCatalogHiddenSectionToTop());
    });
  },
  'price-item-group': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const first = getCatalogProjects().find(p => p.onSale && !p.hidden) || getCatalogProjects()[0];
    if (first) openCatalogItemGroupSheet(first.id);
  },
  'price-item-group-empty': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    /* 仅保留系统「隐藏」，模拟轨上只有「全部 / 隐藏」 */
    ['project', 'product'].forEach(bucket => {
      const groups = getCatalogGroupsForBucket(bucket);
      const kept = groups.filter(g => g && g.system);
      groups.length = 0;
      groups.push(...kept);
    });
    ensureSystemHiddenGroups();
    setActiveCatalogGroupId('all');
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const first = getCatalogProjects().find(p => p.onSale && !p.hidden) || getCatalogProjects()[0];
    if (first) openCatalogItemGroupSheet(first.id);
  },
  'price-group-members': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    const g = (state.catalogGroups?.project || []).find(x => !x.system) || (state.catalogGroups?.project || [])[0];
    if (g) openCatalogGroupMembers(g.id);
  },
  'price-group-menu': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    openCatalogGroupManage();
    /* 演示 / 截图：展开第一个自定义组（进页默认仍收起，本深链显式展开） */
    const g = (state.catalogGroups?.project || []).find(x => !x.system);
    if (g) {
      state.catalogGroupExpandedId = g.id;
      renderCatalogGroupManage();
    }
  },
  'price-group-create': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    openCatalogGroupManage();
    openCatalogGroupNameDialog('create');
  },
  'price-group-rename': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    openCatalogGroupManage();
    const g = (state.catalogGroups?.project || []).find(x => !x.system);
    if (g) openCatalogGroupNameDialog('rename', g.id);
  },
  'price-group-delete': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    openCatalogGroupManage();
    const g = (state.catalogGroups?.project || []).find(x => !x.system);
    if (g) openCatalogGroupDeleteConfirm(g.id);
  },
  'price-item-delete': function () {
    ensureDemoFilled();
    state.priceCatalogTab = 'project';
    syncPriceCatalogTabs();
    projRenderList();
    projShowScreen('screen-p-list');
    const first = getCatalogProjects().find(p => p.onSale && !p.hidden && !isCatalogDeleteLocked(p))
      || getCatalogProjects().find(p => !isCatalogDeleteLocked(p))
      || getCatalogProjects()[0];
    if (first) openCatalogDeleteConfirm(first.id);
  },
};

function runPriceFlow(id) {
  var fn = PRICE_FLOW[id];
  if (typeof fn === 'function') {
    /* 深链/导航切换先清浮层：否则上一节点的 Sheet/Dialog 会残留在新页面上 */
    closeAllFlowOverlays();
    fn();
  } else showToast('未接入: ' + id, true);
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
/* 独立原型没有会员卡模板，syncProjectCatalogBindings 会把所有项目重算成「未绑卡」，
   把演示用的绑卡项（p4）冲掉 —— 于是「项目详情 · 绑卡」深链看不到锁定态。
   每次重算后重新落回演示绑定，保证锁定与「为什么锁」的说明 toast 始终可复现。 */
var _syncProjectCatalogBindingsOrig = syncProjectCatalogBindings;
syncProjectCatalogBindings = function () {
  _syncProjectCatalogBindingsOrig();
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
