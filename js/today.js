// 오늘 탭: 날씨 + 아침 코디 추천 + 기록·세탁·정리 알림
const TodayState = { which: null, seed: 0 };

function renderToday(view) {
  const now = new Date();
  if (!TodayState.which) TodayState.which = now.getHours() >= 20 ? 'tomorrow' : 'today';
  const day = TodayState.which === 'tomorrow' ? addDays(today(), 1) : today();
  const wx = Weather.day(day);
  const h = now.getHours();
  const hello = h < 5 ? '늦은 밤이에요' : h < 11 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  const occ = db.ui.occasion || 'daily';
  const tops = activeItems().filter(i => i.cat === 'top').length, bots = activeItems().filter(i => i.cat === 'bottom').length, dresses = activeItems().filter(i => i.cat === 'dress').length;
  const canReco = (tops && bots) || dresses;
  const recs = canReco ? Stylist.recommend({ day, occasion: occ, seed: TodayState.seed }) : [];
  const worn = db.wears[today()];
  const laundry = db.items.filter(i => i.status === 'laundry');
  const unused = Stylist.unused();
  const nudges = [];
  if (!userStyles().length) nudges.push({ a: 'styles', icon: 'style', t: '원하는 스타일을 골라 주세요', s: '추천이 내 취향에 맞춰져요' });
  if (!bodyType()) nudges.push({ a: 'body', icon: 'ruler', t: '체형 분석하기', s: '나와 같은 체형의 마네킹이 생겨요' });
  if (!db.profile.pcolor) nudges.push({ a: 'pcolor', icon: 'palette', t: '퍼스널컬러 진단하기', s: '얼굴이 화사해 보이는 색으로 추천해요' });

  view.innerHTML = `
    <div class="page today">
      <div class="hello"><small>${dayLabel(today())}</small><h1>${hello}</h1></div>
      <div class="wx card">
        ${wx ? `
          <div class="wx-main">
            <div class="wx-temp">${Math.round(wx.feel)}°<small>체감</small></div>
            <div class="wx-txt"><b>${wx.text}</b><span>최저 ${wx.min}° · 최고 ${wx.max}°${wx.rainP ? ` · 비 ${wx.rainP}%` : ''}</span></div>
            <button class="wx-loc" data-a="loc">${ic('pin')}${esc(Weather.loc().name)}</button>
          </div>
          <div class="wx-guide">${esc(tempGuideText(wx.feel))}</div>
          ${wxTips(wx).map(t => `<div class="wx-tip">${t}</div>`).join('')}
        ` : `<div class="wx-main"><div class="wx-txt"><b>날씨 불러오는 중</b><span>인터넷이 연결되어 있어야 해요</span></div><button class="wx-loc" data-a="loc">${ic('pin')}${esc(Weather.loc().name)}</button></div>`}
      </div>
      <div class="seg day-seg" data-g="which">
        <button data-v="today" class="${TodayState.which === 'today' ? 'on' : ''}">오늘 입을 옷</button>
        <button data-v="tomorrow" class="${TodayState.which === 'tomorrow' ? 'on' : ''}">내일 미리 정하기</button>
      </div>
      <div class="chips scroll" data-g="occ">${OCCASIONS.map(o => `<button class="chip ${occ === o.id ? 'on' : ''}" data-v="${o.id}">${o.name}</button>`).join('')}</div>

      <div class="sec-h"><h2>${TodayState.which === 'tomorrow' ? '내일' : '오늘'}의 코디</h2>${canReco ? `<button class="link" data-a="shuffle">${ic('shuffle')} 다른 코디</button>` : ''}</div>
      ${canReco ? (recs.length ? `<div class="ocards hscroll">${recs.map((r, i) => outfitCard(r, i)).join('')}</div>` : '<p class="muted">입을 수 있는 옷이 부족해요. 세탁 중인 옷을 확인해 주세요.</p>') : `
        <div class="card start">
          <b>옷을 넣으면 매일 아침 코디를 골라 드려요</b>
          <div class="need">
            <span class="${tops ? 'ok' : ''}">${tops ? ic('check') : ''}상의 ${tops}벌</span>
            <span class="${bots ? 'ok' : ''}">${bots ? ic('check') : ''}하의 ${bots}벌</span>
            <span class="muted">또는 원피스</span>
          </div>
          <button class="btn primary" data-a="add">옷 넣기</button>
        </div>`}

      ${worn ? `<div class="card worn"><div class="sec-h sm"><h3>오늘 입은 옷</h3><button class="link" data-a="cal">기록 보기</button></div>
        <div class="thumbs">${worn.items.map(itemById).filter(Boolean).map(it => `<img data-img="${thumbKey(it.id)}" data-item="${it.id}" alt="">`).join('')}</div></div>` : ''}

      ${laundry.length ? `<div class="card mini-row"><span class="row-ic">${ic('wash')}</span><span class="grow"><b>세탁 중 ${laundry.length}벌</b><small>${laundry.slice(0, 3).map(itemName).map(esc).join(', ')}${laundry.length > 3 ? ' 외' : ''}</small></span><button class="btn sm" data-a="washed">다 빨았어요</button></div>` : ''}
      ${unused.length ? `<button class="card mini-row" data-a="unused"><span class="row-ic">${ic('closet')}</span><span class="grow"><b>오래 안 입은 옷 ${unused.length}벌</b><small>살려 입는 코디를 만들어 드려요</small></span>${ic('chev')}</button>` : ''}
      ${nudges.map(n => `<button class="card mini-row" data-a="${n.a}"><span class="row-ic">${ic(n.icon)}</span><span class="grow"><b>${n.t}</b><small>${n.s}</small></span>${ic('chev')}</button>`).join('')}
    </div>`;
  hydrateSvg(view); hydrateImgs(view);
  bindOutfitCards(view, recs, { day });
  view.onclick = async (e) => {
    const c = e.target.closest('[data-g] [data-v]');
    if (c) {
      const g = c.parentElement.dataset.g;
      if (g === 'which') TodayState.which = c.dataset.v;
      if (g === 'occ') { db.ui.occasion = c.dataset.v; save(); }
      TodayState.seed = 0;
      return renderToday(view);
    }
    const it = e.target.closest('.worn [data-item]');
    if (it) return openItem(it.dataset.item);
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'shuffle') { TodayState.seed++; renderToday(view); }
    if (a === 'add') addClothes();
    if (a === 'loc') changeLocation();
    if (a === 'cal') openCalendar();
    if (a === 'washed') { laundry.forEach(i => i.status = 'ok'); save(); toast('세탁 끝! 다시 추천에 넣었어요'); renderToday(view); }
    if (a === 'unused') { StyleState.seg = 'tidy'; go('style'); }
    if (a === 'styles') editStyles();
    if (a === 'body') openBody();
    if (a === 'pcolor') openPersonalColor();
  };
  if (!Weather.data || Date.now() - Weather.data.at > 3600000) {
    Weather.load().then(() => { if (App.tab === 'today' && Weather.day(day)) renderToday(view); });
  }
}

function wxTips(wx) {
  const t = [];
  if (wx.feelMax - wx.feelMin >= 8) t.push(`일교차 ${Math.round(wx.feelMax - wx.feelMin)}° — 벗고 입기 쉬운 겉옷을 챙기세요`);
  if (wx.snowy) t.push('눈 소식 — 미끄럽지 않은 신발, 따뜻한 외투');
  else if (wx.rainy) t.push(`비 올 확률 ${wx.rainP}% — 우산 챙기고, 밝은 하의·스웨이드 신발은 피하세요`);
  if (wx.feelMax >= 31) t.push('무더위 — 통풍 잘되는 린넨·면 소재, 밝은 색');
  return t;
}

// ── 코디 카드 ──
function outfitCard(r, i) {
  const items = r.ids.map(itemById).filter(Boolean);
  return `<div class="ocard" data-i="${i}">
    <div class="ocard-mq">${mannequinSvg(r.ids, { cls: 'mini' })}</div>
    <div class="ocard-info">
      <div class="ocard-top"><span class="score">${r.score}</span><div><b>${r.grade}</b><small>${STYLE[r.styleId]?.name || ''} 스타일</small></div></div>
      <ul class="why">${r.good.map(t => `<li class="g">${esc(t)}</li>`).join('')}${r.warn.map(t => `<li class="w">${esc(t)}</li>`).join('')}</ul>
      <div class="thumbs sm">${items.map(it => `<img data-img="${thumbKey(it.id)}" data-item="${it.id}" alt="${esc(itemName(it))}">`).join('')}</div>
    </div>
    <div class="ocard-act"><button class="btn" data-act="fit">입혀 보기</button><button class="btn primary" data-act="wear">이걸로 입을래요</button></div>
  </div>`;
}
function bindOutfitCards(root, recs, { day = today() } = {}) {
  $$('.ocard', root).forEach(card => {
    const r = recs[+card.dataset.i];
    if (!r) return;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const th = e.target.closest('[data-item]');
      if (th && th.tagName === 'IMG') return openItem(th.dataset.item);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'fit' || e.target.closest('.ocard-mq')) { closeAllSheets(); openFitting(r.ids); }
      if (act === 'wear') { addWear(day, r.ids); closeAllSheets(); }
    });
  });
}

// ── 착용 기록 ──
function addWear(day, ids) {
  const prev = db.wears[day];
  const merged = prev && day === today() && ids.length === 1 ? [...new Set([...prev.items, ...ids])] : ids;
  db.wears[day] = { items: merged, note: prev?.note || '' };
  save();
  const label = day === today() ? '오늘' : dayLabel(day);
  toast(`${label} 코디로 기록했어요`, { label: '세탁할 옷 표시', run: () => pickLaundry(merged) });
  rerender();
}
function pickLaundry(ids) {
  const items = ids.map(itemById).filter(Boolean).filter(i => !['bag', 'acc', 'shoes', 'hat'].includes(i.cat));
  const sel = new Set(items.filter(i => ['top', 'dress'].includes(i.cat)).map(i => i.id));
  const p = openSheet(`${sheetHeader('세탁 바구니에 넣기', '<button class="link b" data-a="ok">완료</button>')}
    <p class="hint">세탁 중인 옷은 다 빨 때까지 추천에서 빠져요.</p>
    <div class="grid">${items.map(it => itemTile(it, { sel: sel.has(it.id), badge: false })).join('')}</div>`);
  p.addEventListener('click', (e) => {
    const t = e.target.closest('[data-item]');
    if (t) { const id = t.dataset.item; sel.has(id) ? sel.delete(id) : sel.add(id); t.classList.toggle('sel'); t.querySelector('.tile-check')?.remove(); if (sel.has(id)) t.insertAdjacentHTML('beforeend', `<span class="tile-check">${ic('check')}</span>`); }
    if (e.target.closest('[data-a="ok"]')) { sel.forEach(id => { const it = itemById(id); if (it) it.status = 'laundry'; }); save(); closeSheet(); toast(`${sel.size}벌을 세탁 중으로 표시했어요`); rerender(); }
  });
}

// ── 위치 바꾸기 ──
async function changeLocation() {
  const p = openSheet(`${sheetHeader('날씨 위치')}
    <div class="list"><button class="row" data-a="gps"><span class="row-ic">${ic('pin')}</span><span class="grow"><b>지금 내 위치 쓰기</b><small>위치 권한을 물어봐요</small></span></button></div>
    <label class="fl">도시 검색</label>
    <div class="search"><input class="inp" placeholder="예: 부산, 수원, 제주" data-r="q"><button class="btn" data-a="find">찾기</button></div>
    <div class="list" data-r="res"></div>`);
  p.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'gps') {
      try { await Weather.useMyLocation(); closeSheet(); toast('현재 위치 날씨로 바꿨어요'); rerender(); }
      catch (err) { toast('위치를 가져오지 못했어요. 도시를 검색해 주세요.'); }
    }
    if (a === 'find') {
      const q = $('[data-r="q"]', p).value.trim();
      if (!q) return;
      try {
        const res = await Weather.searchCity(q);
        $('[data-r="res"]', p).innerHTML = res.length ? res.map((r, i) => `<button class="row" data-city="${i}"><span class="grow"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span></button>`).join('') : '<p class="muted">찾지 못했어요</p>';
        $$('[data-city]', p).forEach(b => b.onclick = async () => { db.profile.loc = res[+b.dataset.city]; save(); await Weather.load(true); closeSheet(); toast(`${db.profile.loc.name} 날씨로 바꿨어요`); rerender(); });
      } catch (err) { toast('검색하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    }
  });
}
