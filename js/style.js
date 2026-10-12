// 스타일 탭: 옷장 분석 리포트, 쇼핑 추천(기본템·스타일·색), 위시리스트, 정리·관리
const StyleState = { seg: 'report' };

function renderStyle(view) {
  const seg = StyleState.seg;
  view.innerHTML = `
    <div class="page">
      <div class="page-h"><h1>스타일</h1></div>
      <div class="seg wide" data-g="seg">
        <button data-v="report" class="${seg === 'report' ? 'on' : ''}">분석</button>
        <button data-v="shop" class="${seg === 'shop' ? 'on' : ''}">쇼핑</button>
        <button data-v="wish" class="${seg === 'wish' ? 'on' : ''}">위시리스트</button>
        <button data-v="tidy" class="${seg === 'tidy' ? 'on' : ''}">정리·관리</button>
      </div>
      <div data-r="body">${seg === 'report' ? reportHtml() : seg === 'shop' ? shopHtml() : seg === 'wish' ? wishHtml() : tidyHtml()}</div>
    </div>`;
  hydrateImgs(view); hydrateSvg(view);
  view.onclick = async (e) => {
    const s = e.target.closest('[data-g="seg"] [data-v]');
    if (s) { StyleState.seg = s.dataset.v; return renderStyle(view); }
    const it = e.target.closest('[data-item]');
    if (it && !e.target.closest('[data-a]')) return openItem(it.dataset.item);
    const w = e.target.closest('[data-wish]');
    if (w && !e.target.closest('[data-a]')) return openWish(w.dataset.wish);
    const a = e.target.closest('[data-a]');
    if (!a) return;
    const act = a.dataset.a;
    if (act === 'styles') editStyles();
    if (act === 'body') openBody();
    if (act === 'pcolor') openPersonalColor();
    if (act === 'add') addClothes();
    if (act === 'wish-photo') addClothes('wish');
    if (act === 'wish-quick') addWishQuick();
    if (act === 'revive') showForcedOutfits(a.dataset.id);
    if (act === 'archive') archiveItem(a.dataset.id);
    if (act === 'ok') { const x = itemById(a.dataset.id); x.status = 'ok'; save(); toast('입을 수 있게 바꿨어요'); renderStyle(view); }
    if (act === 'washall') { db.items.forEach(i => { if (i.status === 'laundry') i.status = 'ok'; }); save(); toast('세탁 끝!'); renderStyle(view); }
    if (act === 'basic-wish') {
      const b = Stylist.basics()[+a.dataset.i];
      const sub = SUB[b.sub];
      db.wish.unshift({ id: uid(), cat: sub.cat, sub: b.sub, name: b.name, colors: [{ id: b.pick, hex: COLOR[b.pick].hex }], pattern: 'solid', fit: 'regular', added: Date.now(), wish: true, noImg: true });
      save(); toast('위시리스트에 담았어요');
    }
  };
}

function bar(pct, color = 'var(--ink)') { return `<span class="mbar"><i style="width:${Math.round(pct * 100)}%;background:${color}"></i></span>`; }

function reportHtml() {
  const A = Stylist.analyze();
  if (A.total < 3) return `<div class="empty"><div class="empty-ic">${ic('style')}</div><b>옷을 3벌 이상 넣으면 분석해 드려요</b><p class="muted">지금 ${A.total}벌</p><button class="btn primary" data-a="add">옷 넣기</button></div>`;
  const prefs = userStyles();
  const bt = bodyType(), pc = db.profile.pcolor?.season;
  const clothesN = A.colors.reduce((a, c) => a + c[1], 0) || 1;
  return `
    <div class="card report-hero">
      <small>내 옷장 스타일</small>
      <h2>${esc(A.typeName || '분석 중')}</h2>
      <p class="muted">옷 ${A.total}벌 · 만들 수 있는 상·하의 코디 <b>${A.combos}</b>가지</p>
      <div class="me-tags">
        ${bt ? `<span class="tag">${BODY_TYPES[bt].name}</span>` : '<button class="tag ghost" data-a="body">체형 분석 전</button>'}
        ${pc ? `<span class="tag">${PCOLORS[pc].name}</span>` : '<button class="tag ghost" data-a="pcolor">퍼스널컬러 진단 전</button>'}
        ${prefs.length ? prefs.map(s => `<span class="tag">${STYLE[s].name}</span>`).join('') : '<button class="tag ghost" data-a="styles">원하는 스타일 고르기</button>'}
      </div>
    </div>
    ${A.notes.length ? `<div class="card"><h3>스타일리스트 의견</h3><ul class="advice">${A.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <div class="card"><h3>가진 옷의 스타일</h3>
      ${A.styles.slice(0, 6).map(s => `<div class="mrow"><span>${STYLE[s.id].name}${prefs.includes(s.id) ? ' <small class="want">원하는 스타일</small>' : ''}</span>${bar(s.pct / A.styles[0].pct)}<b>${Math.round(s.pct * 100)}%</b></div>`).join('')}
      ${A.desiredPct !== null ? `<p class="muted sm">원하는 스타일과 일치하는 정도 <b>${Math.round(A.desiredPct * 100)}%</b></p>` : ''}
    </div>
    ${A.wornStyles.length ? `<div class="card"><h3>실제로 자주 입는 스타일 <small class="muted">최근 90일</small></h3>
      ${A.wornStyles.slice(0, 4).map(s => `<div class="mrow"><span>${STYLE[s.id].name}</span>${bar(s.pct / A.wornStyles[0].pct, 'var(--accent)')}<b>${Math.round(s.pct * 100)}%</b></div>`).join('')}</div>` : ''}
    <div class="card"><h3>옷장 색 구성</h3>
      <div class="colorbar">${A.colors.map(([id, n]) => `<i style="background:${COLOR[id].hex};flex:${n}" title="${COLOR[id].name}"></i>`).join('')}</div>
      <div class="color-legend">${A.colors.slice(0, 8).map(([id, n]) => `<span>${swatch(COLOR[id].hex, 10)} ${COLOR[id].name} ${Math.round(n / clothesN * 100)}%</span>`).join('')}</div>
      <p class="muted sm">무채색 비율 ${Math.round(A.neutralPct * 100)}% — 60~80%면 조합하기 가장 쉬워요.</p>
      ${pc && A.pcTotal ? `<p class="muted sm">상의·아우터 중 ${PCOLORS[pc].short}에 잘 받는 색 <b>${A.pcGood}</b>벌, 덜 맞는 색 <b>${A.pcBad}</b>벌</p>` : ''}
    </div>
    <div class="card"><h3>종류별</h3>
      <div class="catgrid">${CATS.map(c => `<div><b>${A.byCat[c.id]}</b><small>${c.name}</small></div>`).join('')}</div>
    </div>
    ${bt ? `<div class="card"><h3>${BODY_TYPES[bt].name} 스타일링 포인트</h3>
      <ul class="dolist">${BODY_TYPES[bt].do.map(t => `<li class="g">${esc(t)}</li>`).join('')}${BODY_TYPES[bt].avoid.map(t => `<li class="w">${esc(t)}</li>`).join('')}</ul></div>` : ''}`;
}

function shopHtml() {
  const basics = Stylist.basics();
  const missing = basics.map((b, i) => ({ ...b, i })).filter(b => !b.owned).sort((a, b) => b.rank - a.rank);
  const owned = basics.filter(b => b.owned);
  const keys = Stylist.styleKeys();
  const picks = Stylist.colorPicks();
  const bt = bodyType(), pc = db.profile.pcolor?.season;
  return `
    <div class="card">
      <h3>먼저 사면 좋은 기본템</h3>
      <p class="muted sm">내 옷장에 없는 종류, 다가오는 계절에 필요한 옷, 더했을 때 코디가 많이 늘어나는 옷 순서예요. ${pc ? `색은 ${PCOLORS[pc].short}에 맞춰 골랐어요.` : ''}</p>
      ${missing.length ? `<div class="list">${missing.slice(0, 8).map(b => `
        <div class="row static">
          <span class="row-sw" style="background:${COLOR[b.pick].hex}"></span>
          <span class="grow"><b>${esc(b.name)}</b>${b.note ? `<em class="need-note">${esc(b.note)}</em>` : ''}<small>${esc(b.why)}${pc ? ` · 추천 색: ${COLOR[b.pick].name}` : ''}</small></span>
          ${b.gain && db.items.length ? `<span class="gain">+${b.gain}<small>코디</small></span>` : ''}
          <button class="ib" data-a="basic-wish" data-i="${b.i}" aria-label="위시리스트에 담기">${ic('heart')}</button>
        </div>`).join('')}</div>` : '<p>기본템을 모두 갖췄어요! 👏</p>'}
      ${owned.length ? `<details class="more"><summary>이미 있는 기본템 ${owned.length}개</summary><div class="chips wrap sm">${owned.map(b => `<span class="chip on">${esc(b.name)}</span>`).join('')}</div></details>` : ''}
    </div>
    ${keys.length ? keys.map(k => `<div class="card">
      <h3>${STYLE[k.style].name} 스타일 핵심템</h3>
      <p class="muted sm">${esc(STYLE[k.style].desc)}</p>
      <div class="chips wrap">${k.have.map(s => `<span class="chip on">${ic('check')}${SUB[s].name}</span>`).join('')}${k.missing.map(s => `<span class="chip dash">${SUB[s].name}</span>`).join('')}</div>
      ${k.missing.length ? `<p class="sm">없는 것: <b>${k.missing.map(s => SUB[s].name).join(', ')}</b> · 추천 색 ${STYLE[k.style].colors.slice(0, 4).map(c => COLOR[c]?.name).filter(Boolean).join('·')}</p>` : '<p class="sm">핵심템을 다 갖췄어요.</p>'}
    </div>`).join('') : `<button class="card mini-row" data-a="styles"><span class="row-ic">${ic('style')}</span><span class="grow"><b>원하는 스타일을 고르면</b><small>그 스타일에 필요한 옷을 알려 드려요</small></span>${ic('chev')}</button>`}
    ${picks.length ? `<div class="card"><h3>${PCOLORS[pc].short}에 잘 받는데 옷장에 없는 색</h3>
      <div class="pc-picks">${picks.map(x => `<span>${swatch(x.hex, 28)}<small>${x.c.name}</small></span>`).join('')}</div>
      <p class="muted sm">상의·니트·셔츠처럼 얼굴 가까운 옷으로 고르면 효과가 커요.</p></div>`
    : !pc ? `<button class="card mini-row" data-a="pcolor"><span class="row-ic">${ic('palette')}</span><span class="grow"><b>퍼스널컬러를 진단하면</b><small>나에게 맞는 색을 골라 드려요</small></span>${ic('chev')}</button>` : ''}
    ${bt ? `<div class="card"><h3>${BODY_TYPES[bt].name}에게 잘 맞는 실루엣</h3><ul class="dolist">${BODY_TYPES[bt].do.map(t => `<li class="g">${esc(t)}</li>`).join('')}</ul></div>`
    : `<button class="card mini-row" data-a="body"><span class="row-ic">${ic('ruler')}</span><span class="grow"><b>체형 분석을 하면</b><small>체형에 맞는 핏과 실루엣을 알려 드려요</small></span>${ic('chev')}</button>`}`;
}

// ── 위시리스트 ──
function wishHtml() {
  const v = { buy: '사도 좋아요', think: '한 번 더 고민', skip: '비추천' };
  return `
    <p class="muted">사고 싶은 옷을 담으면, 내 옷장과 몇 개의 코디가 나오는지·비슷한 옷이 있는지 봐 드려요. 충동구매 방지!</p>
    <div class="btn-row"><button class="btn" data-a="wish-photo">${ic('camera')} 사진으로 담기</button><button class="btn" data-a="wish-quick">${ic('plus')} 종류·색만 담기</button></div>
    ${db.wish.length ? `<div class="list wish">${db.wish.map(w => {
      const r = Stylist.wishCheck(w);
      return `<button class="row" data-wish="${w.id}">
        ${w.noImg ? `<span class="row-sw lg" style="background:${mainColor(w).hex}"></span>` : `<img class="row-img checker" data-img="${thumbKey(w.id)}" alt="">`}
        <span class="grow"><b>${esc(itemName(w))}</b><small>코디 +${r.gain}${r.similar.length ? ` · 비슷한 옷 ${r.similar.length}벌` : ''}${w.price ? ` · ${(+w.price).toLocaleString()}원` : ''}</small></span>
        <span class="verdict ${r.verdict}">${v[r.verdict]}</span>
      </button>`;
    }).join('')}</div>` : '<div class="empty"><b>위시리스트가 비어 있어요</b></div>'}`;
}

function addWishQuick() {
  const d = { cat: 'top', sub: 'tee', colors: [{ id: 'white', hex: COLOR.white.hex }], fit: 'regular', pattern: 'solid', name: '', price: '', link: '' };
  const p = openSheet(`${sheetHeader('사고 싶은 옷', '<button class="link b" data-a="ok">담기</button>')}<div data-r="f"></div>${sheetFooter('위시리스트에 담기')}`);
  const f = $('[data-r="f"]', p);
  const draw = () => {
    f.innerHTML = `
      <label class="fl">종류</label>
      <div class="chips wrap" data-f="cat">${CATS.map(c => `<button class="chip ${d.cat === c.id ? 'on' : ''}" data-v="${c.id}">${c.name}</button>`).join('')}</div>
      <div class="chips wrap sm" data-f="sub">${subsOf(d.cat).map(s => `<button class="chip ${d.sub === s.id ? 'on' : ''}" data-v="${s.id}">${s.name}</button>`).join('')}</div>
      <label class="fl">색</label>
      <div class="palette sm">${COLORS.map(c => `<button class="pal ${d.colors[0].id === c.id ? 'on' : ''}" data-c="${c.id}"><i style="background:${c.hex}"></i><span>${c.name}</span></button>`).join('')}</div>
      <label class="fl">핏·무늬</label>
      <div class="seg sm" data-f="fit">${FITS.map(x => `<button class="${d.fit === x.id ? 'on' : ''}" data-v="${x.id}">${x.name}</button>`).join('')}</div>
      <div class="chips wrap sm" data-f="pattern" style="margin-top:8px">${PATTERNS.map(x => `<button class="chip ${d.pattern === x.id ? 'on' : ''}" data-v="${x.id}">${x.name}</button>`).join('')}</div>
      <label class="fl">이름·가격·링크 <small class="muted">선택</small></label>
      <input class="inp" data-t="name" placeholder="예: 무신사 오버핏 셔츠" value="${esc(d.name)}">
      <div class="two"><input class="inp" data-t="price" inputmode="numeric" placeholder="가격 (원)" value="${esc(d.price)}"><input class="inp" data-t="link" placeholder="링크" value="${esc(d.link)}"></div>`;
  };
  draw();
  const keep = () => $$('[data-t]', f).forEach(i => d[i.dataset.t] = i.value.trim());
  p.addEventListener('click', (e) => {
    const c = e.target.closest('[data-f] [data-v]');
    if (c) { keep(); const k = c.parentElement.dataset.f; d[k] = c.dataset.v; if (k === 'cat') d.sub = subsOf(d.cat)[0].id; return draw(); }
    const col = e.target.closest('[data-c]');
    if (col) { keep(); d.colors = [{ id: col.dataset.c, hex: COLOR[col.dataset.c].hex }]; return draw(); }
    if (e.target.closest('[data-a="ok"]')) {
      keep();
      db.wish.unshift({ ...d, id: uid(), price: d.price.replace(/[^0-9]/g, ''), added: Date.now(), wish: true, noImg: true });
      save(); closeSheet(); toast('위시리스트에 담았어요'); rerender();
    }
  });
}

function openWish(id) {
  const w = db.wish.find(x => x.id === id);
  if (!w) return;
  const r = Stylist.wishCheck(w);
  const v = { buy: ['사도 좋아요', '옷장에 잘 녹아드는 옷이에요.'], think: ['한 번 더 고민', '장단점이 비슷해요.'], skip: ['비추천', '지금 옷장에선 활용도가 낮아요.'] }[r.verdict];
  // 이 옷과 어울리는 내 옷 (예시 코디)
  const partners = db.items.filter(i => ['top', 'bottom', 'outer', 'shoes'].includes(i.cat) && i.cat !== w.cat && Stylist.pairOk(w, i)).slice(0, 8);
  const p = openSheet(`${sheetHeader(itemName(w), '<button class="link" data-a="edit">고치기</button>')}
    <div class="detail">
      ${w.noImg ? `<div class="wish-sw" style="background:${mainColor(w).hex}"><span>${esc(SUB[w.sub]?.name || '')}</span></div>` : `<div class="preview checker sm"><img data-img="${w.id}" alt=""></div>`}
      <div class="verdict-box ${r.verdict}"><b>${v[0]}</b><span>${v[1]}</span></div>
      <ul class="why lg">${r.why.map(x => `<li class="${x.ok ? 'g' : 'w'}">${esc(x.t)}</li>`).join('')}</ul>
      ${r.similar.length ? `<h4>이미 있는 비슷한 옷</h4><div class="thumbs">${r.similar.map(s => `<img data-img="${thumbKey(s.id)}" data-item="${s.id}" alt="">`).join('')}</div>` : ''}
      ${partners.length ? `<h4>같이 입기 좋은 내 옷</h4><div class="thumbs">${partners.map(s => `<img data-img="${thumbKey(s.id)}" data-item="${s.id}" alt="">`).join('')}</div>` : ''}
      ${w.price ? `<p>가격 ${(+w.price).toLocaleString()}원${r.gain ? ` · 코디 1개당 약 ${Math.round(+w.price / Math.max(1, r.gain)).toLocaleString()}원` : ''}</p>` : ''}
      ${w.link ? `<a class="btn" href="${esc(w.link)}" target="_blank" rel="noopener">쇼핑몰 열기</a>` : ''}
      <div class="btn-row"><button class="btn danger-t" data-a="del">지우기</button><button class="btn primary" data-a="bought">샀어요 → 옷장으로</button></div>
    </div>`);
  p.addEventListener('click', async (e) => {
    const th = e.target.closest('[data-item]');
    if (th) return openItem(th.dataset.item);
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit') { closeSheet(); editItem(w.id); }
    if (a === 'del') { db.wish = db.wish.filter(x => x.id !== id); save(); closeSheet(); if (!w.noImg) { delImg(w.id); delImg(thumbKey(w.id)); } rerender(); }
    if (a === 'bought') {
      if (w.noImg) {
        closeSheet();
        toast('산 옷 사진을 찍어서 옷장에 넣어 주세요');
        const files = await pickFiles({ capture: true });
        if (!files.length) return;
        const r2 = await addOne(files[0], { preset: { cat: w.cat, sub: w.sub } });
        if (r2 && r2 !== 'stop') { db.wish = db.wish.filter(x => x.id !== id); save(); }
      } else {
        const it = { ...w }; delete it.wish; delete it.price; delete it.link; it.added = Date.now(); it.status = 'ok';
        db.items.unshift(finalizeDraft(it)); db.wish = db.wish.filter(x => x.id !== id); save(); closeSheet();
        toast('옷장에 넣었어요');
      }
      rerender();
    }
  });
}

// ── 정리·관리 ──
function tidyHtml() {
  const un = Stylist.unused();
  const laundry = db.items.filter(i => i.status === 'laundry'), repair = db.items.filter(i => i.status === 'repair');
  const row = (x) => `<div class="row static" data-item="${x.it.id}">
      <img class="row-img checker" data-img="${thumbKey(x.it.id)}" alt="">
      <span class="grow"><b>${esc(itemName(x.it))}</b><small>${x.d !== null ? `${x.d}일째 안 입음` : `등록 후 ${x.owned}일 동안 한 번도 안 입음`}</small></span>
      <button class="btn sm" data-a="revive" data-id="${x.it.id}">살려 입기</button>
      <button class="ib" data-a="archive" data-id="${x.it.id}" aria-label="정리">${ic('bag')}</button>
    </div>`;
  return `
    <div class="card"><h3>오래 안 입은 옷 <small class="muted">${un.length}벌</small></h3>
      <p class="muted sm">두 달 넘게 안 입었거나, 산 뒤 한 달 동안 한 번도 안 입은 옷이에요. '살려 입기'로 코디를 받아 보고, 그래도 손이 안 가면 정리해 보세요.</p>
      ${un.length ? `<div class="list">${un.slice(0, 30).map(row).join('')}</div>` : '<p>모든 옷을 골고루 잘 입고 있어요!</p>'}
    </div>
    <div class="card"><div class="sec-h sm"><h3>${ic('wash')} 세탁 중 <small class="muted">${laundry.length}벌</small></h3>${laundry.length ? '<button class="link" data-a="washall">다 빨았어요</button>' : ''}</div>
      ${laundry.length ? `<div class="list">${laundry.map(it => `<div class="row static" data-item="${it.id}"><img class="row-img checker" data-img="${thumbKey(it.id)}" alt=""><span class="grow"><b>${esc(itemName(it))}</b></span><button class="btn sm" data-a="ok" data-id="${it.id}">빨았어요</button></div>`).join('')}</div>` : '<p class="muted sm">옷 상세 화면이나 착용 기록 뒤에 세탁 중으로 표시할 수 있어요.</p>'}
    </div>
    <div class="card"><h3>${ic('needle')} 수선 필요 <small class="muted">${repair.length}벌</small></h3>
      ${repair.length ? `<div class="list">${repair.map(it => `<div class="row static" data-item="${it.id}"><img class="row-img checker" data-img="${thumbKey(it.id)}" alt=""><span class="grow"><b>${esc(itemName(it))}</b>${it.memo ? `<small>${esc(it.memo)}</small>` : ''}</span><button class="btn sm" data-a="ok" data-id="${it.id}">고쳤어요</button></div>`).join('')}</div>` : '<p class="muted sm">단추·지퍼·기장 수선이 필요한 옷을 표시해 두면 추천에서 빠져요.</p>'}
    </div>`;
}
