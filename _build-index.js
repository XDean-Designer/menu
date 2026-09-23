/**
 * Assemble index.html for 价目表重构
 */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const shellHead = fs.readFileSync(path.join('D:/RTB打补丁工程/提成设置/index.html'), 'utf8');
const headEnd = shellHead.indexOf('</head>');
const head = shellHead.slice(0, headEnd)
  .replace(/<title>[^<]*<\/title>/, '<title>剑琅联盟 · 价目表重构</title>')
  /* 整条 <link> 一起删：原正则只吃 href=…> 会留下 `<link rel="stylesheet" ` 残片，
     生成的 index.html 里就出现两行残缺标签（浏览器能容忍，但是无效 HTML） */
  .replace(/<link rel="stylesheet" href="comm2\.css"[^>]*>\s*/g, '')
  .replace(/<link rel="stylesheet" href="salary\.css"[^>]*>\s*/g, '')
  /* 源壳的样式顺序是 comm2 / base / salary / shell；删掉两个不用的之后
     剩下的正是 base + shell。这里不能再插一遍 shell.css（会变成两行重复）。 */
  /* 源壳 <head> 里那段「手机壳 / 导航抽屉」内联脚本属于**提成设置**原型，
     继续留着它会被这里覆盖、也无法演进（价目表手机预览另有 mobile-preview.js）。
     剥掉后由本文件在 </head> 前注入价目表自己的控制器。 */
  .replace(/<script>[\s\S]*?preferMobile[\s\S]*?<\/script>\s*/, '')

/* 站内 favicon（内联 SVG，红底价目三横）：GitHub Pages 上不加这一行，
   浏览器会去请求站点根 favicon.ico → 404。 */
const FAVICON =
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E' +
  '%3Crect width=\'32\' height=\'32\' rx=\'8\' fill=\'%23F32F41\'/%3E%3Cg fill=\'%23ffffff\'%3E' +
  '%3Crect x=\'9\' y=\'10\' width=\'14\' height=\'2.4\' rx=\'1.2\'/%3E%3Crect x=\'9\' y=\'15\' width=\'14\' height=\'2.4\' rx=\'1.2\'/%3E' +
  '%3Crect x=\'9\' y=\'20\' width=\'8\' height=\'2.4\' rx=\'1.2\'/%3E%3C/g%3E%3C/svg%3E">'

const fragment = fs.readFileSync(path.join(OUT, 'price-fragment.html'), 'utf8');

const statusBar = `    <div class="status-bar">
      <div class="status-bar__time">9:41</div>
      <div class="status-bar__icons">
        <svg width="19.2" height="12" viewBox="0 0 19.2002 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.13379 7.40039C2.72262 7.40066 3.2001 7.91493 3.2002 8.5498V10.8496C3.2002 11.4846 2.72268 11.9997 2.13379 12H1.06641C0.477422 11.9998 0 11.4846 0 10.8496V8.5498C9.79152e-05 7.91486 0.477483 7.40054 1.06641 7.40039H2.13379ZM7.43359 5C8.02258 5.00015 8.5 5.52275 8.5 6.16699V10.833C8.5 11.4772 8.02258 11.9998 7.43359 12H6.36621C5.77732 11.9997 5.2998 11.4772 5.2998 10.833V6.16699C5.2998 5.52283 5.77732 5.00027 6.36621 5H7.43359ZM12.833 2.40039C13.422 2.40039 13.9003 2.91564 13.9004 3.55176V10.8477C13.9004 11.4839 13.4221 12 12.833 12H11.7666C11.1775 12 10.7002 11.4839 10.7002 10.8477V3.55176C10.7003 2.91566 11.1776 2.40043 11.7666 2.40039H12.833ZM18.1338 0C18.7227 0.00025962 19.2002 0.50384 19.2002 1.125V10.875C19.2002 11.4962 18.7227 11.9997 18.1338 12H17.0664C16.4774 11.9999 16 11.4962 16 10.875V1.125C16 0.503771 16.4774 0.000148442 17.0664 0H18.1338Z" fill="#1A1A1A"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.11231 8.95898C7.49091 7.68034 9.51016 7.68016 10.8887 8.95898C10.9579 9.02774 10.9981 9.12508 11 9.22753C11.0019 9.33007 10.9652 9.42913 10.8984 9.50097L8.73926 11.8906C8.67602 11.9606 8.58985 12 8.50001 12C8.41016 12 8.32398 11.9606 8.26075 11.8906L6.10157 9.50097C6.03487 9.42907 5.99803 9.33008 6.00001 9.22753C6.00199 9.12499 6.04291 9.02771 6.11231 8.95898ZM3.1084 6.11034C6.14692 3.29648 10.8531 3.29648 13.8916 6.11034C13.9601 6.17631 13.999 6.26741 14 6.3623C14.0009 6.45701 13.9635 6.54798 13.8965 6.61523L12.6201 7.89941C12.4886 8.03051 12.2756 8.03383 12.1406 7.90624C11.1429 7.00679 9.84502 6.50878 8.49903 6.50878C7.15382 6.50934 5.85652 7.00732 4.85938 7.90624C4.72442 8.03384 4.51142 8.03051 4.37989 7.89941L3.10352 6.61523C3.03647 6.54807 2.99919 6.45699 3.00001 6.3623C3.00091 6.26738 3.03986 6.17631 3.1084 6.11034ZM0.107428 3.19335C4.79922 -1.06448 12.2007 -1.06442 16.8926 3.19335C16.9605 3.25661 16.9994 3.34337 17 3.43358C17.0005 3.52372 16.9636 3.61083 16.8965 3.6748L15.6094 4.90429C15.4768 5.03049 15.2616 5.03147 15.127 4.90722C13.3394 3.29788 10.9665 2.40048 8.50001 2.40038C6.03341 2.40049 3.66077 3.29781 1.87305 4.90722C1.73852 5.03166 1.52312 5.03068 1.39063 4.90429L0.103522 3.6748C0.0365013 3.6108 -0.00055106 3.52371 6.19569e-06 3.43358C0.000632915 3.34337 0.0394625 3.25656 0.107428 3.19335Z" fill="#1A1A1A"/></svg>
        <svg width="27.3" height="12" viewBox="0 0 27.328 13" fill="none" xmlns="http://www.w3.org/2000/svg"><g><rect x="0.5" y="0.5" width="24" height="12" rx="3" stroke="#1A1A1A" opacity="0.35"/><path d="M26 4.66667V8.66667C26.8047 8.32789 27.328 7.5398 27.328 6.66667C27.328 5.79353 26.8047 5.00544 26 4.66667" fill="#1A1A1A" opacity="0.4"/><rect x="2" y="2" width="21" height="9" rx="1.33333" fill="#1A1A1A"/></g></svg>
      </div>
    </div>`;

const navMain = [
  { id: 'price-list-empty', label: '价目表 · 空态' },
  { id: 'price-list-filled', label: '价目表 · 项目' },
  { id: 'price-list-product', label: '价目表 · 产品' },
  { id: 'price-groups', label: '分组管理' },
  { id: 'price-group-members', label: '分组 · 包含项目' },
  { id: 'price-add', label: '新增项目' },
  { id: 'price-add-product', label: '新增产品' },
  { id: 'price-edit-normal', label: '项目详情 · 普通' },
  { id: 'price-edit-bound', label: '项目详情 · 绑卡' },
  { id: 'price-edit-off-sale', label: '项目详情 · 下架' },
  { id: 'price-edit-product', label: '产品详情' },
  { id: 'price-edit-product-off-sale', label: '产品详情 · 下架' },
];
const navSheets = [
  { id: 'price-list-action', label: '行操作 Sheet' },
  { id: 'price-list-swipe', label: '左滑可删除' },
  { id: 'price-list-swipe-locked', label: '左滑不可删除' },
  { id: 'price-list-hidden-open', label: '已隐藏展开' },
  { id: 'price-item-group', label: '设置分组 Sheet' },
  { id: 'price-item-group-empty', label: '设置分组 · 无组' },
  { id: 'price-group-menu', label: '分组行展开' },
  { id: 'price-group-create', label: '新建分组 Dialog' },
  { id: 'price-group-rename', label: '重命名 Dialog' },
  { id: 'price-group-delete', label: '删除分组 Dialog' },
  { id: 'price-item-delete', label: '删除价目 Dialog' },
];

/* 首页 = 价目表 · 项目（「功能入口」页已取消，v1.24）：生成时就把 `on` 打到该项上，
   不依赖 boot 时的 JS 高亮（app.js 的 HOME_FLOW 与之对应，两处需同改）。 */
function navBtns(items, startIdx) {
  return items.map((it, i) => {
    const idx = startIdx == null ? '·' : String(startIdx + i);
    const on = it.id === 'price-list-filled' ? ' on' : '';
    return `<button type="button" class="nav-item${on}" data-flow="${it.id}"><span class="idx">${idx}</span>${it.label}</button>`;
  }).join('\n    ');
}

const html = `${head}
${FAVICON}
<script src="mobile-preview.js"></script>
</head>
<body>
<aside class="site-nav">
  <div class="nav-brand">
    <div class="t">价目表重构</div>
    <div class="s">独立原型 · 项目创建与管理</div>
  </div>
  <div class="nav-group">
    <div class="g-t">价目表</div>
    ${navBtns(navMain, 1)}
  </div>
  <div class="nav-group">
    <div class="g-t">浮层 / 叠加态</div>
    ${navBtns(navSheets, null)}
  </div>
  <div class="nav-group grow">
    <div class="g-t">文档</div>
    <a class="nav-link" href="PRD-%E9%A1%B9%E7%9B%AE%E5%88%9B%E5%BB%BA%E4%B8%8E%E7%AE%A1%E7%90%86.html"><span class="idx">P</span> PRD</a>
  </div>
</aside>
<div class="nav-drawer-mask" id="navDrawerMask" aria-hidden="true"></div>
<div class="nav-edge-hit" id="navEdgeHit" aria-hidden="true"></div>
<div class="stage">
  <div id="frame" class="phone-shell">
    <div class="phone-inner phone">
${statusBar}
${fragment}
      <div class="toast-msg" id="toastMsg" role="status" aria-live="polite"></div>
    </div>
  </div>
</div>
<script src="amount-keypad.js"></script>
<script src="catalog.js"></script>
<script src="app.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log('wrote index.html', Math.round(html.length / 1024), 'KB');
