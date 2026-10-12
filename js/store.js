// 데이터 저장: 옷 정보·기록은 localStorage, 사진은 IndexedDB (모두 이 휴대폰 안에만)
const KEY = 'closet-v1';

function freshDb() {
  return {
    v: 1,
    onboarded: false,
    profile: {
      pref: 'u',            // 추천 옷 범위: f 여성복, m 남성복, u 구분 없이
      styles: [],           // 원하는 스타일 id
      body: { height: '', weight: '', shoulder: '', bust: '', waist: '', hip: '', legRatio: null },
      bodyFrom: '',         // 'tape' | 'photo'
      pcolor: null,         // { season, w, d, c, date }
      loc: null,            // { lat, lon, name }
    },
    items: [],              // 옷
    looks: [],              // 저장한 코디 { id, items, tuck, name, added }
    wears: {},              // 'YYYY-MM-DD': { items: [], note }
    wish: [],               // 위시리스트
    archive: [],            // 정리한 옷 { ...item, gone: { date, how } }
    ui: { occasion: 'daily', closetCat: 'all' },
  };
}

function normalize(d) {
  const base = freshDb();
  if (!d || typeof d !== 'object') return base;
  return {
    ...base, ...d,
    profile: { ...base.profile, ...(d.profile || {}), body: { ...base.profile.body, ...((d.profile || {}).body || {}) } },
    items: d.items || [], looks: d.looks || [], wears: d.wears || {}, wish: d.wish || [], archive: d.archive || [],
    ui: { ...base.ui, ...(d.ui || {}) },
  };
}

let db = (() => {
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return freshDb(); }
})();

function save() {
  wearCache = null;
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('저장 공간이 부족해요. 설정에서 백업한 뒤 정리해 주세요.'); }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── 날짜 ──
function fmt(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
const today = () => fmt(new Date());
function addDays(k, n) { const d = parseDay(k); d.setDate(d.getDate() + n); return fmt(d); }
function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
function dayLabel(k) { const d = parseDay(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`; }

// ── 옷 찾기·착용 통계 ──
const itemById = (id) => db.items.find(i => i.id === id);
const activeItems = () => db.items.filter(i => i.status === 'ok' || !i.status);

let wearCache = null;
function wearStats() {
  if (wearCache) return wearCache;
  const m = {};
  for (const [day, w] of Object.entries(db.wears)) {
    for (const id of w.items || []) {
      const s = m[id] || (m[id] = { count: 0, last: null });
      s.count++;
      if (!s.last || day > s.last) s.last = day;
    }
  }
  return (wearCache = m);
}
function lastWorn(id) { return (wearStats()[id] || {}).last || null; }
function wearCount(id) { return (wearStats()[id] || {}).count || 0; }
function daysSinceWorn(item, ref = today()) {
  const l = lastWorn(item.id);
  if (l) return daysBetween(l, ref);
  return null;
}
function daysOwned(item, ref = today()) { return daysBetween(fmt(new Date(item.added || Date.now())), ref); }

// ── 사진 (IndexedDB) ──
const IMG_DB = 'closet-img';
let imgDbP = null;
function imgDb() {
  if (imgDbP) return imgDbP;
  imgDbP = new Promise((res, rej) => {
    const r = indexedDB.open(IMG_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return imgDbP;
}
async function imgTx(mode, fn) {
  const d = await imgDb();
  return new Promise((res, rej) => {
    const tx = d.transaction('img', mode);
    const st = tx.objectStore('img');
    const out = fn(st);
    tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
const putImg = (key, blob) => { urlCache.delete(key); return imgTx('readwrite', st => st.put(blob, key)); };
const getImg = (key) => imgTx('readonly', st => st.get(key));
const delImg = (key) => { const u = urlCache.get(key); if (u) URL.revokeObjectURL(u); urlCache.delete(key); return imgTx('readwrite', st => st.delete(key)); };
const allImgKeys = () => imgTx('readonly', st => st.getAllKeys());

// 사진 URL 캐시 (같은 사진을 여러 번 읽지 않게)
const urlCache = new Map();
const urlPending = new Map();
async function imgUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  if (urlPending.has(key)) return urlPending.get(key);
  const p = getImg(key).then(b => {
    urlPending.delete(key);
    if (!b) return '';
    const u = URL.createObjectURL(b);
    urlCache.set(key, u);
    return u;
  }).catch(() => { urlPending.delete(key); return ''; });
  urlPending.set(key, p);
  return p;
}
// 옷 사진 키: id (누끼 원본 크기), id+'_t' (목록용 작은 사진)
const thumbKey = (id) => id + '_t';
