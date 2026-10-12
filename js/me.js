// 나 탭: 프로필(체형·퍼스널컬러·스타일), 착용 기록 달력, 보관함, 설정·백업
const MeState = { ym: today().slice(0, 7) };

function renderMe(view) {
  const bt = bodyType(), pc = db.profile.pcolor?.season, prefs = userStyles();
  const b = db.profile.body;
  view.innerHTML = `
    <div class="page">
      <div class="page-h"><h1>나</h1></div>
      <div class="card profile">
        <div class="profile-mq">${mannequinSvg([], { cls: 'mini' })}</div>
        <div class="profile-info">
          <button class="pi-row" data-a="body"><small>체형</small><b>${bt ? `${BODY_TYPES[bt].name}` : '분석 전'}</b><span>${bt ? esc(BODY_TYPES[bt].short) : '치수나 전신 사진으로'}${b.height ? ` · ${b.height}cm` : ''}</span></button>
          <button class="pi-row" data-a="pcolor"><small>퍼스널컬러</small><b>${pc ? PCOLORS[pc].name : '진단 전'}</b>${pc ? `<span class="pal-mini">${PCOLORS[pc].good.slice(0, 6).map(h => swatch(h, 12)).join('')}</span>` : '<span>질문 + 셀카로</span>'}</button>
          <button class="pi-row" data-a="styles"><small>원하는 스타일</small><b>${prefs.length ? prefs.map(s => STYLE[s].name).join(', ') : '고르기 전'}</b></button>
        </div>
      </div>

      <div class="card">
        <div class="sec-h sm"><h3>착용 기록</h3><button class="link" data-a="cal">크게 보기</button></div>
        ${calendarHtml(MeState.ym)}
      </div>

      <div class="list card">
        <button class="row" data-a="body"><span class="row-ic">${ic('ruler')}</span><span class="grow"><b>체형 분석</b><small>내 치수로 마네킹 만들기</small></span>${ic('chev')}</button>
        <button class="row" data-a="pcolor"><span class="row-ic">${ic('palette')}</span><span class="grow"><b>퍼스널컬러 진단</b><small>${pc ? '다시 진단하기' : '어울리는 색 찾기'}</small></span>${ic('chev')}</button>
        <button class="row" data-a="styles"><span class="row-ic">${ic('style')}</span><span class="grow"><b>원하는 스타일·추천 범위</b></span>${ic('chev')}</button>
        <button class="row" data-a="archive"><span class="row-ic">${ic('bag')}</span><span class="grow"><b>보관함</b><small>정리한 옷 ${db.archive.length}벌</small></span>${ic('chev')}</button>
        <button class="row" data-a="loc"><span class="row-ic">${ic('pin')}</span><span class="grow"><b>날씨 위치</b><small>${esc(Weather.loc().name)}</small></span>${ic('chev')}</button>
        <button class="row" data-a="backup"><span class="row-ic">${ic('layers')}</span><span class="grow"><b>백업·복원</b><small>사진까지 파일 하나로 저장해요</small></span>${ic('chev')}</button>
        <button class="row" data-a="about"><span class="row-ic">${ic('gear')}</span><span class="grow"><b>앱 정보</b></span>${ic('chev')}</button>
      </div>
    </div>`;
  hydrateSvg(view); hydrateImgs(view);
  view.onclick = (e) => {
    const nav = e.target.closest('[data-ym]');
    if (nav) { MeState.ym = nav.dataset.ym; return renderMe(view); }
    const d = e.target.closest('[data-day]');
    if (d) return openDay(d.dataset.day);
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'body') openBody();
    if (a === 'pcolor') openPersonalColor();
    if (a === 'styles') editStyles();
    if (a === 'cal') openCalendar();
    if (a === 'archive') openArchive();
    if (a === 'loc') changeLocation();
    if (a === 'backup') openBackup();
    if (a === 'about') openAbout();
  };
}

// ── 달력 ──
function calendarHtml(ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const prev = fmt(new Date(y, m - 2, 1)).slice(0, 7), next = fmt(new Date(y, m, 1)).slice(0, 7);
  const t = today();
  let cells = '';
  for (let i = 0; i < first.getDay(); i++) cells += '<span></span>';
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const key = `${ym}-${String(d).padStart(2, '0')}`;
    const w = db.wears[key];
    const lead = w ? (w.items.map(itemById).filter(Boolean).find(i => i.cat === 'dress' || i.cat === 'top') || itemById(w.items[0])) : null;
    if (w) count++;
    cells += `<button class="cal-d${key === t ? ' today' : ''}${w ? ' has' : ''}" data-day="${key}" ${key > addDays(t, 1) ? 'disabled' : ''}>
      <span>${d}</span>${lead ? `<img data-img="${thumbKey(lead.id)}" alt="">` : ''}</button>`;
  }
  return `<div class="cal">
    <div class="cal-h"><button class="ib" data-ym="${prev}">‹</button><b>${y}년 ${m}월</b><small class="muted">${count}일 기록</small><button class="ib" data-ym="${next}" ${next > t.slice(0, 7) ? 'disabled' : ''}>›</button></div>
    <div class="cal-w">${[...WEEKDAY].map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal-g">${cells}</div></div>`;
}
function openCalendar() {
  let ym = MeState.ym;
  const p = openSheet(`${sheetHeader('착용 기록')}<div data-r="cal"></div><div data-r="stat"></div>`, { full: true });
  const draw = () => {
    $('[data-r="cal"]', p).innerHTML = calendarHtml(ym);
    // 이번 달 많이 입은 옷
    const cnt = {};
    Object.entries(db.wears).filter(([k]) => k.startsWith(ym)).forEach(([, w]) => w.items.forEach(id => cnt[id] = (cnt[id] || 0) + 1));
    const top = Object.entries(cnt).filter(([id]) => itemById(id)).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('[data-r="stat"]', p).innerHTML = top.length ? `<h4>이번 달 자주 입은 옷</h4><div class="thumbs">${top.map(([id, n]) => `<span class="th-n"><img data-img="${thumbKey(id)}" data-item="${id}" alt=""><small>${n}번</small></span>`).join('')}</div>` : '';
    hydrateImgs(p);
  };
  draw();
  p.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-ym]');
    if (nav) { ym = nav.dataset.ym; return draw(); }
    const d = e.target.closest('[data-day]');
    if (d) return openDay(d.dataset.day, draw);
    const it = e.target.closest('[data-item]');
    if (it) openItem(it.dataset.item);
  });
}
function openDay(day, after) {
  const w = db.wears[day] || { items: [], note: '' };
  const ids = w.items.filter(id => itemById(id));
  const ev = ids.length ? Stylist.evaluate(ids, { day, wx: null }) : null;
  const p = openSheet(`${sheetHeader(dayLabel(day))}
    ${ids.length ? `<div class="day-view"><div class="day-mq">${mannequinSvg(ids, { cls: 'mini' })}</div>
      <div><div class="grid sm">${ids.map(id => itemTile(itemById(id), { badge: false })).join('')}</div>${ev ? `<p class="muted sm">${ev.grade} · ${STYLE[ev.styleId]?.name || ''}</p>` : ''}</div></div>` : '<p class="muted">이날 입은 옷 기록이 없어요.</p>'}
    <input class="inp" data-r="note" placeholder="메모 (어디 갔는지, 칭찬 들은 코디 등)" value="${esc(w.note || '')}">
    <div class="btn-row">${ids.length ? '<button class="btn danger-t" data-a="del">기록 지우기</button>' : ''}<button class="btn primary" data-a="pick">${ids.length ? '옷 바꾸기' : '입은 옷 고르기'}</button></div>`,
  { onClose: () => { const n = $('[data-r="note"]', p)?.value.trim() || ''; if (db.wears[day] && n !== (db.wears[day].note || '')) { db.wears[day].note = n; save(); } after && after(); rerender(); } });
  hydrateSvg(p);
  p.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    const t = e.target.closest('[data-item]');
    if (t && !a) return openItem(t.dataset.item);
    if (a === 'del') { delete db.wears[day]; save(); closeSheet(); }
    if (a === 'pick') {
      const sel = await pickItems(ids, '입은 옷 고르기');
      if (sel) { if (sel.length) db.wears[day] = { items: sel, note: $('[data-r="note"]', p)?.value.trim() || '' }; else delete db.wears[day]; save(); closeSheet(); }
    }
  });
}
function pickItems(initial = [], title = '옷 고르기') {
  return new Promise(resolve => {
    const sel = new Set(initial);
    let cat = 'all', out = null;
    const p = openSheet(`${sheetHeader(title, '<button class="link b" data-a="ok">완료</button>')}
      <div class="chips scroll" data-g="cat"><button class="chip on" data-v="all">전체</button>${CATS.map(c => `<button class="chip" data-v="${c.id}">${c.name}</button>`).join('')}</div>
      <div class="grid" data-r="g"></div>`, { full: true, onClose: () => resolve(out) });
    const draw = () => {
      $('[data-r="g"]', p).innerHTML = db.items.filter(i => cat === 'all' || i.cat === cat).map(it => itemTile(it, { sel: sel.has(it.id), badge: false })).join('') || '<p class="muted">옷이 없어요</p>';
      hydrateImgs(p);
    };
    draw();
    p.addEventListener('click', (e) => {
      const c = e.target.closest('[data-g] [data-v]');
      if (c) { cat = c.dataset.v; $$('[data-g] .chip', p).forEach(x => x.classList.toggle('on', x === c)); return draw(); }
      const t = e.target.closest('[data-item]');
      if (t) { const id = t.dataset.item; sel.has(id) ? sel.delete(id) : sel.add(id); return draw(); }
      if (e.target.closest('[data-a="ok"]')) { out = [...sel]; closeSheet(); }
    });
  });
}

// ── 원하는 스타일 ──
function editStyles({ onboarding = false } = {}) {
  return new Promise(resolve => {
    const sel = new Set(userStyles());
    let pref = db.profile.pref || 'u';
    const p = openSheet(`${sheetHeader('원하는 스타일', '<button class="link b" data-a="ok">완료</button>')}
      <p class="hint">입고 싶은 스타일을 1~3개 골라 주세요. 코디 추천과 쇼핑 추천이 여기에 맞춰져요.</p>
      <div class="style-grid">${STYLES.map(s => `<button class="style-card ${sel.has(s.id) ? 'on' : ''}" data-s="${s.id}">
        <span class="sc-sw">${s.colors.slice(0, 4).map(c => `<i style="background:${COLOR[c].hex}"></i>`).join('')}</span>
        <b>${s.name}</b><small>${esc(s.desc)}</small></button>`).join('')}</div>
      <label class="fl">추천할 옷 범위</label>
      <div class="seg" data-g="pref">
        <button data-v="f" class="${pref === 'f' ? 'on' : ''}">여성복 위주</button>
        <button data-v="m" class="${pref === 'm' ? 'on' : ''}">남성복 위주</button>
        <button data-v="u" class="${pref === 'u' ? 'on' : ''}">구분 없이</button>
      </div>
      <p class="hint">기본템 추천(스커트·원피스 등 포함 여부)과 마네킹 기본 치수에만 쓰여요.</p>`, { full: true, onClose: () => resolve() });
    p.addEventListener('click', (e) => {
      const s = e.target.closest('[data-s]');
      if (s) {
        const id = s.dataset.s;
        if (sel.has(id)) sel.delete(id); else { if (sel.size >= 3) return toast('3개까지 고를 수 있어요'); sel.add(id); }
        s.classList.toggle('on', sel.has(id)); return;
      }
      const pr = e.target.closest('[data-g="pref"] [data-v]');
      if (pr) { pref = pr.dataset.v; $$('[data-g="pref"] button', p).forEach(b => b.classList.toggle('on', b === pr)); return; }
      if (e.target.closest('[data-a="ok"]')) {
        db.profile.styles = [...sel]; db.profile.pref = pref; save(); closeSheet();
        if (!onboarding) { toast('스타일을 저장했어요'); rerender(); }
      }
    });
  });
}

// ── 체형 분석 ──
const BODY_FIELDS = [
  { k: 'height', name: '키', unit: 'cm', help: '맨발로 똑바로 서서' },
  { k: 'weight', name: '몸무게', unit: 'kg', help: '선택 — 마네킹 팔·다리 굵기에만 써요', opt: true },
  { k: 'shoulder', name: '어깨너비', unit: 'cm', help: '등 뒤에서 한쪽 어깨 끝 → 반대쪽 어깨 끝' },
  { k: 'bust', name: '가슴둘레', unit: 'cm', help: '가슴의 가장 두꺼운 곳을 수평으로 한 바퀴' },
  { k: 'waist', name: '허리둘레', unit: 'cm', help: '배꼽 위 가장 잘록한 곳' },
  { k: 'hip', name: '엉덩이둘레', unit: 'cm', help: '엉덩이의 가장 튀어나온 곳을 수평으로' },
];
function openBody() {
  const b = { ...db.profile.body };
  const p = openSheet(`${sheetHeader('체형 분석', '<button class="link b" data-a="save">저장</button>')}
    <div class="body-top">
      <div class="body-mq" data-r="mq"></div>
      <div class="body-res" data-r="res"></div>
    </div>
    <button class="btn wide" data-a="photo">${ic('camera')} 전신 사진으로 재기</button>
    <p class="hint">줄자가 없으면 전신 사진으로 대략 잴 수 있어요. 키만 정확히 넣어 주세요. 사진은 저장하지 않아요.</p>
    <div class="body-form">${BODY_FIELDS.map(f => `<label class="bf"><span><b>${f.name}</b><small>${f.help}</small></span>
      <span class="bf-in"><input class="inp" inputmode="decimal" data-k="${f.k}" value="${esc(b[f.k] || '')}" placeholder="${f.opt ? '선택' : ''}"><em>${f.unit}</em></span></label>`).join('')}</div>`, { full: true });
  const draw = () => {
    $('[data-r="mq"]', p).innerHTML = mannequinSvg([], { cls: 'mini', body: b });
    const t = bodyType(b);
    $('[data-r="res"]', p).innerHTML = t ? `<small>내 체형</small><h3>${BODY_TYPES[t].name}</h3><p>${esc(BODY_TYPES[t].desc)}</p>
      <ul class="dolist sm">${BODY_TYPES[t].do.slice(0, 3).map(x => `<li class="g">${esc(x)}</li>`).join('')}</ul>
      ${b.legRatio ? `<p class="muted sm">다리 길이 비율 ${Math.round(b.legRatio * 100)}% ${b.legRatio >= 0.48 ? '(긴 편)' : b.legRatio <= 0.45 ? '(하이웨이스트로 보완하면 좋아요)' : ''}</p>` : ''}`
      : '<small>내 체형</small><h3>치수를 넣어 주세요</h3><p class="muted">가슴·허리·엉덩이 둘레를 넣으면 체형을 알려 드려요. 마네킹은 넣는 대로 바로 바뀌어요.</p>';
  };
  draw();
  p.addEventListener('input', (e) => { const k = e.target.dataset.k; if (k) { b[k] = e.target.value.replace(/[^0-9.]/g, ''); draw(); } });
  p.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'save') {
      db.profile.body = b; save(); closeSheet();
      const t = bodyType(b);
      toast(t ? `${BODY_TYPES[t].name} 체형으로 저장했어요` : '저장했어요');
      rerender();
    }
    if (a === 'photo') {
      if (!(+b.height > 100)) return toast('먼저 키를 넣어 주세요 (사진을 cm로 바꿀 때 필요해요)');
      const r = await bodyFromPhoto(+b.height);
      if (r) {
        ['shoulder', 'bust', 'waist', 'hip'].forEach(k => { b[k] = String(r[k]); const inp = $(`[data-k="${k}"]`, p); if (inp) inp.value = r[k]; });
        b.legRatio = r.legRatio;
        db.profile.bodyFrom = 'photo';
        draw();
        toast('사진으로 잰 값을 채웠어요. 아는 치수가 있으면 고쳐 주세요.');
      }
    }
  });
}

function bodyFromPhoto(height) {
  return new Promise(async (resolve) => {
    const how = await choose('전신 사진', [
      { label: '지금 찍기', sub: '다른 사람이 찍어 주거나 거울 없이 타이머로', icon: 'camera', value: 'cam' },
      { label: '앨범에서 고르기', icon: 'photo', value: 'lib' },
    ]);
    if (!how) return resolve(null);
    let result = null;
    const p = openSheet(`${sheetHeader('전신 사진 분석')}
      <div class="tips"><b>잘 재는 방법</b><span>정면으로 서서 머리부터 발끝까지 · 팔은 몸에서 살짝 떨어지게 · 몸에 붙는 옷 · 단순한 배경</span></div>
      <div class="photo-an"><canvas data-r="cv"></canvas><div class="spinner" data-r="sp"></div></div>
      <div data-r="out"><p class="muted">사진 고르는 중</p></div>`, { full: true, onClose: () => resolve(result) });
    const files = await pickFiles({ capture: how === 'cam' });
    if (!files.length) { closeSheet(); return; }
    $('[data-r="out"]', p).innerHTML = '<p class="muted">몸 윤곽을 찾는 중… (처음엔 분석 도구를 받느라 조금 걸려요)</p>';
    try {
      const c = await fileToCanvas(files[0], 1100);
      const cv = $('[data-r="cv"]', p);
      cv.width = c.width; cv.height = c.height;
      const g = cv.getContext('2d');
      g.drawImage(c, 0, 0);
      const r = await Vision.analyzeBody(c, height);
      g.lineWidth = Math.max(3, c.width / 200); g.strokeStyle = '#ff5a3c'; g.fillStyle = '#ff5a3c'; g.font = `bold ${Math.round(c.width / 28)}px sans-serif`;
      r.lines.forEach(l => { g.beginPath(); g.moveTo(l.a, l.y); g.lineTo(l.b, l.y); g.stroke(); if (l.t) g.fillText(l.t, l.b + 8, l.y + 8); });
      $('[data-r="sp"]', p)?.remove();
      $('[data-r="out"]', p).innerHTML = `
        <div class="an-res"><div><small>어깨너비</small><b>${r.shoulder}cm</b></div><div><small>가슴</small><b>${r.bust}cm</b></div><div><small>허리</small><b>${r.waist}cm</b></div><div><small>엉덩이</small><b>${r.hip}cm</b></div><div><small>다리 비율</small><b>${Math.round(r.legRatio * 100)}%</b></div></div>
        ${r.odd ? '<p class="pcnote bad">헐렁한 옷이나 몸에 붙은 팔 때문에 값이 튀는 것 같아요. 몸에 붙는 옷을 입고 팔을 살짝 벌린 채 다시 찍으면 더 정확해요.</p>' : ''}
        <p class="hint">사진은 옷 두께·자세에 따라 오차가 있어요(±3~5cm). 아는 치수는 직접 고쳐 주세요.</p>
        <div class="btn-row"><button class="btn" data-x="close">다시 하기</button><button class="btn primary" data-a="use">이 값으로 채우기</button></div>`;
      $('[data-a="use"]', p).onclick = () => { result = r; closeSheet(); };
    } catch (e) {
      $('[data-r="sp"]', p)?.remove();
      $('[data-r="out"]', p).innerHTML = `<p class="err">${esc(e.message || '분석하지 못했어요')}</p><p class="hint">인터넷이 연결된 상태에서 처음 한 번 분석 도구를 받아야 해요.</p>`;
    }
  });
}

// ── 퍼스널컬러 진단 ──
function openPersonalColor() {
  const ans = {};
  let face = null, faceCanvas = null;
  const drapes = {};
  const p = openSheet(`${sheetHeader('퍼스널컬러 진단')}<div data-r="step"></div>`, { full: true });
  const step = $('[data-r="step"]', p);

  const showQuestions = () => {
    step.innerHTML = `<p class="hint">1단계 · 질문 ${PC_QUESTIONS.length}개에 답해 주세요.</p>
      ${PC_QUESTIONS.map((q, i) => `<div class="pcq"><b>${i + 1}. ${q.q}</b><div class="chips wrap" data-q="${i}">${q.opts.map((o, j) => `<button class="chip ${ans[i] === j ? 'on' : ''}" data-o="${j}">${o.t}</button>`).join('')}</div></div>`).join('')}
      <div class="btn-row sticky"><button class="btn primary" data-a="next">다음</button></div>`;
  };
  const showPhoto = () => {
    step.innerHTML = `<p class="hint">2단계 · 셀카로 더 정확하게 (선택)</p>
      <div class="tips"><b>잘 찍는 방법</b><span>화장 안 한 얼굴 · 창가 자연광 · 노란 조명 피하기 · 얼굴이 크게</span></div>
      <div class="btn-row"><button class="btn" data-a="cam">${ic('camera')} 셀카 찍기</button><button class="btn" data-a="lib">${ic('photo')} 앨범에서</button></div>
      <button class="btn wide ghost" data-a="result">사진 없이 결과 보기</button>
      <p class="hint">사진은 휴대폰 안에서만 분석하고 저장하지 않아요.</p>`;
  };
  const faceCrop = () => {
    const f = face.face, s = Math.max(f.w, f.h) * 1.5;
    return { x: f.x + f.w / 2 - s / 2, y: f.y + f.h / 2 - s * 0.45, s };
  };
  const drapeCanvas = (bg) => {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 280;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 240, 280);
    const cr = faceCrop();
    g.save(); g.beginPath(); g.ellipse(120, 118, 84, 104, 0, 0, Math.PI * 2); g.clip();
    g.drawImage(faceCanvas, cr.x, cr.y, cr.s, cr.s, 120 - 104, 118 - 104, 208, 208);
    g.restore();
    return c.toDataURL('image/jpeg', 0.85);
  };
  const showDrape = (i) => {
    if (i >= DRAPES.length) return showResult();
    const D = DRAPES[i];
    step.innerHTML = `<p class="hint">3단계 · 색 대보기 (${i + 1}/${DRAPES.length})</p>
      <h3 class="center">어느 쪽 얼굴이 더 맑고 화사해 보여요?</h3>
      <div class="drape">
        <button data-d="a"><img src="${drapeCanvas(D.a.hex)}" alt=""><span>${D.a.label}</span></button>
        <button data-d="b"><img src="${drapeCanvas(D.b.hex)}" alt=""><span>${D.b.label}</span></button>
      </div>
      <p class="hint center">잡티·그늘이 덜 보이고 피부가 밝아 보이는 쪽을 골라요. <button class="link" data-d="0">비슷해요</button></p>`;
    step.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const v = b.dataset.d === 'a' ? 1 : b.dataset.d === 'b' ? -1 : 0;
      drapes[i] = v;
      showDrape(i + 1);
    });
  };
  const compute = () => {
    let w = 0, d = 0, c = 0;
    PC_QUESTIONS.forEach((q, i) => { const o = q.opts[ans[i]]; if (o) { w += o.w || 0; d += o.d || 0; c += o.c || 0; } });
    if (face) { w += face.w * 1.5; d += face.d; c += face.c; }
    DRAPES.forEach((D, i) => {
      const v = drapes[i] || 0;
      if (D.key === 'w') w += v * 1.5;
      if (D.key === 'd') d += -v * 1.5;  // a = 밝은 색이 나으면 light
      if (D.key === 'c') c += v * 1.5;
    });
    const warm = w >= 0;
    const s1 = warm ? (d - c > 0 ? 'autumn' : 'spring') : (d + c > 0 ? 'winter' : 'summer');
    const s2 = warm ? (s1 === 'autumn' ? 'spring' : 'autumn') : (s1 === 'winter' ? 'summer' : 'winter');
    const alt = Math.abs(w) < 1.5 ? (warm ? (s1 === 'spring' ? 'summer' : 'winter') : (s1 === 'summer' ? 'spring' : 'autumn')) : s2;
    return { season: s1, alt, w: Math.round(w * 10) / 10, d: Math.round(d * 10) / 10, c: Math.round(c * 10) / 10 };
  };
  const showResult = () => {
    const r = compute();
    const P = PCOLORS[r.season];
    const clothes = db.items.filter(i => ['top', 'outer', 'dress'].includes(i.cat));
    const good = clothes.filter(i => pcFit(mainColor(i).hex, r.season) === 'good');
    step.innerHTML = `
      <div class="pc-res ${r.season}">
        <small>나의 퍼스널컬러</small><h2>${P.name}</h2>
        <div class="pc-pal">${P.good.map(h => `<i style="background:${h}"></i>`).join('')}</div>
        <p>${esc(P.desc)}</p>
        <p class="muted sm">${esc(P.tip)}</p>
        <h4>피하면 좋은 색</h4><div class="pc-pal sm">${P.avoid.map(h => `<i style="background:${h}"></i>`).join('')}</div>
        ${face ? `<p class="muted sm">사진 피부색 ${swatch(face.skin, 12)} ${face.w > 0.3 ? '노란 기가 도는 편' : face.w < -0.3 ? '붉은·푸른 기가 도는 편' : '중간 톤'}</p>` : ''}
        <p class="muted sm">두 번째로 가까운 타입: ${PCOLORS[r.alt].name}</p>
        ${clothes.length ? `<p>내 옷장 상의·아우터 중 잘 받는 색 <b>${good.length}</b>벌</p>` : ''}
      </div>
      <p class="hint">조명·카메라에 따라 달라질 수 있어요. 결과가 낯설면 두 번째 타입도 참고하세요.</p>
      <div class="btn-row sticky"><button class="btn" data-a="alt">${PCOLORS[r.alt].short}로 저장</button><button class="btn primary" data-a="save">${P.short}로 저장</button></div>`;
    step.querySelector('[data-a="save"]').onclick = () => savePc(r.season, r);
    step.querySelector('[data-a="alt"]').onclick = () => savePc(r.alt, r);
  };
  const savePc = (season, r) => {
    db.profile.pcolor = { season, w: r.w, d: r.d, c: r.c, date: today() };
    save(); closeSheet(); toast(`${PCOLORS[season].name}으로 저장했어요`); rerender();
  };
  showQuestions();
  step.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-q] [data-o]');
    if (o) { const qi = +o.parentElement.dataset.q; ans[qi] = +o.dataset.o; $$('.chip', o.parentElement).forEach(x => x.classList.toggle('on', x === o)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'next') {
      if (Object.keys(ans).length < PC_QUESTIONS.length - 1) return toast('질문에 답해 주세요');
      showPhoto();
    }
    if (a === 'result') showResult();
    if (a === 'cam' || a === 'lib') {
      const files = await pickFiles({ capture: a === 'cam' ? 'user' : false });
      if (!files.length) return;
      step.innerHTML = '<div class="cut-progress"><div class="spinner"></div><b>얼굴 피부색 분석 중</b><p class="hint">처음엔 분석 도구를 받느라 조금 걸려요</p></div>';
      try {
        faceCanvas = await fileToCanvas(files[0], 900);
        face = await Vision.analyzeFace(faceCanvas);
        showDrape(0);
      } catch (err) {
        step.innerHTML = `<p class="err">${esc(err.message || '분석하지 못했어요')}</p><div class="btn-row"><button class="btn" data-a="retry">다시 찍기</button><button class="btn primary" data-a="result">사진 없이 결과 보기</button></div>`;
      }
    }
    if (a === 'retry') showPhoto();
  });
}

// ── 보관함 ──
function openArchive() {
  const p = openSheet(`${sheetHeader('보관함')}<div data-r="l"></div>`, { full: true });
  const draw = () => {
    $('[data-r="l"]', p).innerHTML = db.archive.length ? `<div class="list">${db.archive.map(it => `<div class="row static">
      <img class="row-img checker" data-img="${thumbKey(it.id)}" alt="">
      <span class="grow"><b>${esc(itemName(it))}</b><small>${it.gone.how} · ${it.gone.date}</small></span>
      <button class="btn sm" data-r2="${it.id}">옷장으로</button><button class="ib" data-del="${it.id}" aria-label="삭제">${ic('trash')}</button></div>`).join('')}</div>`
      : '<div class="empty"><b>보관함이 비어 있어요</b><p class="muted">옷 상세에서 \'정리하기\'를 하면 여기로 와요.</p></div>';
    hydrateImgs(p);
  };
  draw();
  p.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-r2]');
    if (r) { const it = db.archive.find(x => x.id === r.dataset.r2); db.archive = db.archive.filter(x => x !== it); delete it.gone; db.items.unshift(it); save(); draw(); toast('옷장으로 돌려놨어요'); rerender(); }
    const d = e.target.closest('[data-del]');
    if (d) {
      if (!await ask('완전히 지울까요?', '사진까지 지워져요.', '지우기', '취소', true)) return;
      db.archive = db.archive.filter(x => x.id !== d.dataset.del); save(); delImg(d.dataset.del); delImg(thumbKey(d.dataset.del)); draw();
    }
  });
}

// ── 백업·복원 ──
function blobToDataUrl(b) { return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }
async function dataUrlToBlob(u) { return (await fetch(u)).blob(); }

function openBackup() {
  const n = db.items.length + db.archive.length + db.wish.filter(w => !w.noImg).length;
  const p = openSheet(`${sheetHeader('백업·복원')}
    <p>옷 사진과 기록은 <b>이 휴대폰 안에만</b> 저장돼요. 앱을 지우거나 사파리 데이터를 지우면 사라지니, 가끔 백업 파일을 '파일' 앱이나 iCloud Drive에 저장해 두세요.</p>
    <div class="list card">
      <button class="row" data-a="export"><span class="row-ic">${ic('layers')}</span><span class="grow"><b>백업 파일 만들기</b><small>옷 ${n}벌 사진 포함</small></span></button>
      <button class="row" data-a="import"><span class="row-ic">${ic('undo')}</span><span class="grow"><b>백업 파일로 되돌리기</b><small>지금 데이터는 백업 내용으로 바뀌어요</small></span></button>
    </div>
    <p class="muted sm" data-r="st"></p>
    <button class="btn danger-t wide" data-a="reset">모든 데이터 지우기</button>`);
  const st = $('[data-r="st"]', p);
  p.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'export') {
      st.textContent = '백업 파일 만드는 중…';
      const keys = await allImgKeys();
      const images = {};
      for (const k of keys) { const b = await getImg(k); if (b) images[k] = await blobToDataUrl(b); }
      const json = JSON.stringify({ app: 'closet', v: 1, date: new Date().toISOString(), db, images });
      const name = `closet-backup-${today()}.json`;
      const file = new File([json], name, { type: 'application/json' });
      st.textContent = `${(file.size / 1024 / 1024).toFixed(1)}MB 백업 파일을 만들었어요.`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    if (a === 'import') {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (data.app !== 'closet' || !data.db) throw new Error('closet 백업 파일이 아니에요');
          if (!await ask('백업으로 되돌릴까요?', `${data.date ? data.date.slice(0, 10) + ' 백업 · ' : ''}지금 옷장 데이터는 백업 내용으로 바뀌어요.`, '되돌리기', '취소', true)) return;
          st.textContent = '되돌리는 중…';
          const oldKeys = await allImgKeys();
          for (const k of oldKeys) if (!(k in (data.images || {}))) await delImg(k);
          for (const [k, u] of Object.entries(data.images || {})) await putImg(k, await dataUrlToBlob(u));
          db = normalize(data.db); save();
          closeAllSheets(); toast('백업으로 되돌렸어요'); rerender();
        } catch (err) { toast(err.message || '파일을 읽지 못했어요'); st.textContent = ''; }
      };
      inp.click();
    }
    if (a === 'reset') {
      if (!await ask('모든 데이터를 지울까요?', '옷 사진, 기록, 체형·퍼스널컬러 정보가 모두 사라져요. 되돌릴 수 없어요.', '모두 지우기', '취소', true)) return;
      const keys = await allImgKeys();
      for (const k of keys) await delImg(k);
      db = freshDb(); save(); localStorage.removeItem(WX_KEY);
      closeAllSheets(); location.reload();
    }
  });
}

function openAbout() {
  openSheet(`${sheetHeader('closet')}
    <div class="about">
      <div class="logo big">closet</div>
      <p>나만의 옷장 · 맞춤 스타일리스트</p>
      <ul class="dolist sm">
        <li>모든 사진과 기록은 이 휴대폰 안에만 저장돼요. 서버로 보내지 않아요.</li>
        <li>배경 지우기·몸 분석은 휴대폰 안에서 도는 무료 AI(@imgly/background-removal, MediaPipe)로 해요. 처음 한 번 도구를 받을 때만 인터넷이 필요해요.</li>
        <li>날씨는 Open-Meteo 무료 날씨 정보예요.</li>
        <li>코디 추천은 색 조합·날씨·체형·퍼스널컬러·착용 기록 규칙으로 계산해요. 돈 드는 AI는 쓰지 않아요.</li>
      </ul>
      <p class="muted sm">옷 ${db.items.length}벌 · 기록 ${Object.keys(db.wears).length}일 · 저장한 코디 ${db.looks.length}개</p>
    </div>`);
}
