// 앱 뼈대: 탭 이동, 처음 시작 안내, 오프라인 지원 등록
const TABS = [
  { id: 'today', name: '오늘', icon: 'today', render: renderToday },
  { id: 'closet', name: '옷장', icon: 'closet', render: renderCloset },
  { id: 'fitting', name: '피팅룸', icon: 'fitting', render: renderFitting },
  { id: 'style', name: '스타일', icon: 'style', render: renderStyle },
  { id: 'me', name: '나', icon: 'me', render: renderMe },
];
const App = { tab: 'today' };

function go(tab) {
  App.tab = tab;
  db.ui.tab = tab; save();
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const view = $('#view');
  view.onclick = null;
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  TABS.find(t => t.id === tab).render(view);
}
function rerender() {
  const view = $('#view');
  const y = window.scrollY;
  TABS.find(t => t.id === App.tab).render(view);
  window.scrollTo(0, y);
}

function buildTabbar() {
  $('#tabbar').innerHTML = TABS.map(t => `<button data-tab="${t.id}" class="${t.id === App.tab ? 'on' : ''}">${ic(t.icon)}<span>${t.name}</span></button>`).join('');
  $('#tabbar').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { closeAllSheets(); go(b.dataset.tab); } };
}

// ── 처음 시작 ──
function onboarding() {
  const p = openSheet(`
    <div class="onb">
      <div class="logo big">closet</div>
      <h2>나만의 옷장 스타일리스트</h2>
      <ul class="onb-list">
        <li>${ic('camera')}<span><b>옷 사진만 찍으면</b> 배경을 지워 옷장에 정리</span></li>
        <li>${ic('fitting')}<span><b>내 체형 마네킹</b>에 이리저리 입혀 보기</span></li>
        <li>${ic('today')}<span><b>매일 아침</b> 날씨·체형·퍼스널컬러 맞춤 코디</span></li>
        <li>${ic('style')}<span><b>옷장 분석</b>으로 꼭 필요한 옷만 사기</span></li>
      </ul>
      <p class="muted sm">모든 사진과 정보는 이 휴대폰 안에만 저장돼요.</p>
      <button class="btn primary wide" data-a="start">시작하기</button>
    </div>`, { full: true });
  p.querySelector('[data-a="start"]').onclick = async () => {
    closeSheet();
    await openStyleSwipe({ onboarding: true });
    db.onboarded = true; save();
    const next = await choose('다음으로 할 일', [
      { label: '체형 분석하기', sub: '치수나 전신 사진으로 나만의 마네킹 만들기', icon: 'ruler', value: 'body' },
      { label: '옷 넣기', sub: '옷 사진을 찍어 옷장 채우기', icon: 'camera', value: 'add' },
      { label: '나중에 할게요', value: null },
    ]);
    rerender();
    if (next === 'body') openBody();
    if (next === 'add') { go('closet'); addClothes(); }
  };
}

function init() {
  App.tab = db.ui.tab && TABS.some(t => t.id === db.ui.tab) ? db.ui.tab : 'today';
  if (App.tab === 'fitting') App.tab = 'today';
  buildTabbar();
  go(App.tab);
  if (!db.onboarded) onboarding();
  Weather.load().then(() => { if (App.tab === 'today') rerender(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();
