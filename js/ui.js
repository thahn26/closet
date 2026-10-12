// 공통 UI 도우미: 이스케이프, 토스트, 바텀시트, 확인창, 사진 채우기, 아이콘
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ICON = {
  today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  closet: '<svg viewBox="0 0 24 24"><path d="M12 6.5a1.8 1.8 0 1 1 1.8-1.8c0 1-1.8 1.4-1.8 2.6v.4"/><path d="M12 7.7 3.2 14.2a1.4 1.4 0 0 0 .8 2.5h16a1.4 1.4 0 0 0 .8-2.5z"/></svg>',
  fitting: '<svg viewBox="0 0 24 24"><path d="M9 3h6l-.6 2.5a5.5 5.5 0 0 1 3.1 5V14l-1.5 3H8l-1.5-3v-3.5a5.5 5.5 0 0 1 3.1-5z"/><path d="M12 17v4M8.5 21h7"/></svg>',
  style: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  photo: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5L6 19.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M4 7h3.5c4 0 5 10 9 10H20M17 14l3 3-3 3M4 17h3.5c1.5 0 2.5-1.4 3.3-3M13.2 10c.8-1.6 1.8-3 3.3-3H20M17 4l3 3-3 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>',
  wash: '<svg viewBox="0 0 24 24"><path d="M3.5 7h17l-1.6 11.2a2 2 0 0 1-2 1.8H7.1a2 2 0 0 1-2-1.8z"/><path d="M6.5 11.5c1.4 1.2 2.8 1.2 4.2 0s2.8-1.2 4.2 0 2.4 1 3.6 0"/></svg>',
  needle: '<svg viewBox="0 0 24 24"><path d="M19.5 4.5 7 17M17 4l3 3M7 17l-2.5 2.5M7 17c-3-1-3.5 2-1 2.5s5-1 3-3.5"/></svg>',
  rain: '<svg viewBox="0 0 24 24"><path d="M7 15a4.5 4.5 0 1 1 1-8.9A5.5 5.5 0 0 1 18.5 8 3.5 3.5 0 0 1 18 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  ruler: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/></svg>',
  palette: '<svg viewBox="0 0 24 24"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.8 2-1.8 0-1.4-1.2-1.7-1.2-3 0-1 .8-1.7 1.8-1.7h2.2a3.7 3.7 0 0 0 3.7-3.7c0-3.8-3.8-6.8-8.5-6.8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7.3" r="1.2"/><circle cx="14.5" cy="7.3" r="1.2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12.5H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="M4 20 15 9M14 4v3M17.5 5.5l-2 2M20 9h-3M18.5 12.5l-2-1.5"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M8.5 20H20M4.6 14.6l8.8-8.8a2 2 0 0 1 2.8 0l2.5 2.5a2 2 0 0 1 0 2.8L11 18.8a2 2 0 0 1-1.4.6H8.3a2 2 0 0 1-1.4-.6l-2.3-2.3a2 2 0 0 1 0-1.9z"/><path d="M9 10l5 5"/></svg>',
  brush: '<svg viewBox="0 0 24 24"><path d="M18.5 3.5 10 12l2 2 8.5-8.5a1.4 1.4 0 0 0-2-2z"/><path d="M10 12c-2.5 0-4 1.5-4 3.5S4.5 19 3.5 20c3.5.5 9-.5 8.5-6"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 3.5 21 8.5l-9 5-9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/></svg>',
};
const ic = (name) => ICON[name] || '';

let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); action.run(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 4500 : 2400);
}

// ── 바텀시트 (여러 겹 가능) ──
const sheetStack = [];
function openSheet(html, { onClose, full = false } = {}) {
  const s = document.createElement('div');
  s.className = 'sheet' + (full ? ' full' : '');
  s.style.zIndex = 50 + sheetStack.length * 2;
  s.innerHTML = `<div class="backdrop"></div><div class="panel">${html}</div>`;
  document.body.appendChild(s);
  void s.offsetHeight;
  s.classList.add('open');
  const entry = { el: s, onClose };
  sheetStack.push(entry);
  s.querySelector('.backdrop').onclick = () => closeSheet(entry);
  s.addEventListener('click', (e) => { if (e.target.closest('[data-x="close"]')) closeSheet(entry); });
  hydrateImgs(s);
  return s.querySelector('.panel');
}
function closeSheet(entry) {
  entry = entry || sheetStack[sheetStack.length - 1];
  if (!entry) return;
  const i = sheetStack.indexOf(entry);
  if (i < 0) return;
  sheetStack.splice(i, 1);
  entry.el.classList.remove('open');
  setTimeout(() => entry.el.remove(), 300);
  entry.onClose && entry.onClose();
}
function closeAllSheets() { while (sheetStack.length) closeSheet(); }
function sheetHeader(title, right = '', left = '<button class="link" data-x="close">닫기</button>') {
  return `<div class="sheet-h">${left}<h3>${esc(title)}</h3>${right || '<span style="min-width:48px"></span>'}</div>`;
}

// 확인창 (Promise<boolean>)
function ask(title, msg, yes = '확인', no = '취소', danger = false) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'sheet open';
    box.style.zIndex = 90;
    box.innerHTML = `<div class="backdrop"></div><div class="panel" style="padding-top:20px">
      <h3 style="margin:0 0 6px;font-size:18px">${esc(title)}</h3>
      ${msg ? `<p class="muted" style="margin:0 0 18px">${esc(msg)}</p>` : ''}
      <div class="btn-row"><button class="btn" data-v="0">${esc(no)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${esc(yes)}</button></div>
    </div>`;
    document.body.appendChild(box);
    const done = (v) => { box.remove(); resolve(v); };
    box.querySelector('.backdrop').onclick = () => done(false);
    box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => done(b.dataset.v === '1'));
  });
}

// 여러 개 중 고르기 (Promise<value|null>)
function choose(title, options) {
  return new Promise(resolve => {
    let picked = null;
    const p = openSheet(`${sheetHeader(title)}<div class="list">${options.map((o, i) =>
      `<button class="row" data-i="${i}">${o.icon ? `<span class="row-ic">${ic(o.icon)}</span>` : ''}<span class="grow"><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span></button>`).join('')}</div>`,
      { onClose: () => resolve(picked) });
    $$('[data-i]', p).forEach(b => b.onclick = () => { picked = options[+b.dataset.i].value; closeSheet(); });
  });
}

// ── 사진 채우기: <img data-img="key"> ──
function hydrateImgs(root = document) {
  $$('img[data-img]', root).forEach(async (img) => {
    const key = img.dataset.img;
    if (img.dataset.loaded === key) return;
    const u = await imgUrl(key);
    if (u && img.dataset.img === key) { img.src = u; img.dataset.loaded = key; }
  });
}

// 옷 타일 (목록용)
function itemTile(it, { badge = true, sel = false, attrs = '' } = {}) {
  const st = it.status && it.status !== 'ok' ? `<span class="tag-st ${it.status}">${STATUS[it.status]}</span>` : '';
  return `<button class="tile${sel ? ' sel' : ''}" data-item="${it.id}" ${attrs}>
    <img data-img="${thumbKey(it.id)}" alt="${esc(itemName(it))}">
    ${badge ? st : ''}${sel ? `<span class="tile-check">${ic('check')}</span>` : ''}
  </button>`;
}
function itemName(it) {
  if (it.name) return it.name;
  const c = it.colors && it.colors[0] ? COLOR[it.colors[0].id]?.name || '' : '';
  return `${c} ${SUB[it.sub]?.name || CAT_NAME[it.cat] || '옷'}`.trim();
}
function swatch(hex, size = 14) {
  return `<i class="sw" style="background:${hex};width:${size}px;height:${size}px"></i>`;
}

// 파일 고르기 (사진)
function pickFiles({ multiple = false, capture = false } = {}) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    if (multiple) inp.multiple = true;
    if (capture) inp.capture = typeof capture === 'string' ? capture : 'environment';
    inp.onchange = () => resolve([...inp.files]);
    inp.click();
  });
}

// 이미지 파일 → 캔버스 (최대 변 길이 제한, 사진 회전 자동 반영)
async function fileToCanvas(file, max = 1400) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let src = bmp, w, h;
  if (!bmp) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    src = img; w = img.naturalWidth; h = img.naturalHeight;
  } else { w = bmp.width; h = bmp.height; }
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  if (bmp) bmp.close();
  return c;
}
const canvasBlob = (c, type = 'image/png', q) => new Promise(r => c.toBlob(r, type, q));
