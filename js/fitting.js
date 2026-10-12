// 피팅룸: 내 체형 마네킹에 옷 입혀 보기 (끌어서 위치, 두 손가락으로 크기), 스타일리스트 한마디, 코디 저장
const FitState = { ids: [], tuck: false, sel: null, cat: 'top' };

function openFitting(ids) {
  if (ids) { FitState.ids = ids.slice(); FitState.sel = null; FitState.tuck = false; }
  go('fitting');
}

const slotOf = (it) => layerKey(it);
function toggleWear(id) {
  const it = itemById(id);
  if (!it) return;
  if (FitState.ids.includes(id)) { FitState.ids = FitState.ids.filter(x => x !== id); if (FitState.sel === id) FitState.sel = null; return; }
  const slot = slotOf(it);
  FitState.ids = FitState.ids.filter(x => {
    const o = itemById(x);
    if (!o) return false;
    if (slot !== 'acc' && slotOf(o) === slot) return false;
    if (it.cat === 'dress' && (o.cat === 'top' || o.cat === 'bottom')) return false;
    if ((it.cat === 'top' || it.cat === 'bottom') && o.cat === 'dress') return false;
    return true;
  });
  FitState.ids.push(id);
  FitState.sel = id;
}

function renderFitting(view) {
  FitState.ids = FitState.ids.filter(id => itemById(id));
  const ev = FitState.ids.length ? Stylist.evaluate(FitState.ids, { tuck: FitState.tuck }) : null;
  const cat = FitState.cat;
  const pickList = cat === 'looks' ? [] : db.items.filter(i => i.cat === cat);
  const hasTop = FitState.ids.some(id => itemById(id)?.cat === 'top');
  const hasBottom = FitState.ids.some(id => itemById(id)?.cat === 'bottom');
  const selIt = FitState.sel ? itemById(FitState.sel) : null;

  view.innerHTML = `
    <div class="page fitting">
      <div class="page-h"><h1>피팅룸</h1>
        <div class="h-act">
          <button class="link" data-a="random">${ic('shuffle')} 추천 입히기</button>
          ${FitState.ids.length ? '<button class="link" data-a="clear">비우기</button>' : ''}
        </div>
      </div>
      <div class="stage checker-soft" data-r="stage">
        ${mannequinSvg(FitState.ids, { tuck: FitState.tuck, cls: 'big', select: FitState.sel })}
        ${ev ? `<button class="fit-score" data-a="detail"><span class="score">${ev.score}</span><span><b>${ev.grade}</b><small>${STYLE[ev.styleId]?.name || ''}</small></span></button>` : ''}
        ${!FitState.ids.length ? '<div class="stage-hint">아래에서 옷을 골라 입혀 보세요</div>' : ''}
        ${selIt ? `<div class="sel-bar">
          <span class="grow">${esc(itemName(selIt))}</span>
          <button class="ib" data-a="smaller" aria-label="작게">−</button>
          <button class="ib" data-a="bigger" aria-label="크게">+</button>
          <button class="ib txt" data-a="resetpos">원위치</button>
          <button class="ib txt" data-a="off">벗기</button>
        </div>` : ''}
      </div>
      ${ev && (ev.good.length || ev.warn.length) ? `<div class="fit-note">
        ${ev.good.slice(0, 2).map(t => `<span class="g">${esc(t)}</span>`).join('')}${ev.warn.slice(0, 2).map(t => `<span class="w">${esc(t)}</span>`).join('')}
      </div>` : ''}
      <div class="fit-actions">
        <button class="pill ${FitState.tuck ? 'on' : ''}" data-a="tuck" ${hasTop && hasBottom ? '' : 'disabled'}>${ic('layers')} 상의 넣어 입기</button>
        <button class="pill" data-a="save" ${FitState.ids.length ? '' : 'disabled'}>${ic('heart')} 코디 저장</button>
        <button class="pill primary" data-a="wear" ${FitState.ids.length ? '' : 'disabled'}>${ic('calendar')} 오늘 입기</button>
      </div>
      <div class="picker">
        <div class="chips scroll" data-g="cat">
          ${CATS.map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-v="${c.id}">${c.name}</button>`).join('')}
          <button class="chip ${cat === 'looks' ? 'on' : ''}" data-v="looks">저장한 코디 <small>${db.looks.length || ''}</small></button>
        </div>
        ${cat === 'looks' ? (db.looks.length ? `<div class="looks hscroll">${db.looks.map(l => `
            <div class="look" data-look="${l.id}">${mannequinSvg(l.items, { cls: 'mini', tuck: l.tuck })}<button class="look-del" data-del="${l.id}" aria-label="삭제">×</button></div>`).join('')}</div>`
          : '<p class="muted pad">마음에 드는 코디를 저장하면 여기 모여요.</p>')
        : (pickList.length ? `<div class="pick hscroll">${pickList.map(it => itemTile(it, { sel: FitState.ids.includes(it.id) })).join('')}</div>`
          : `<p class="muted pad">${CAT_NAME[cat]}가 아직 없어요. <button class="link" data-a="add">옷 넣기</button></p>`)}
      </div>
    </div>`;
  hydrateSvg(view); hydrateImgs(view);
  bindStage(view);
  view.onclick = async (e) => {
    const c = e.target.closest('[data-g="cat"] [data-v]');
    if (c) { FitState.cat = c.dataset.v; return renderFitting(view); }
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      if (await ask('저장한 코디를 지울까요?', '', '지우기', '취소', true)) { db.looks = db.looks.filter(l => l.id !== del.dataset.del); save(); renderFitting(view); }
      return;
    }
    const lk = e.target.closest('[data-look]');
    if (lk) { const l = db.looks.find(x => x.id === lk.dataset.look); FitState.ids = l.items.slice(); FitState.tuck = !!l.tuck; FitState.sel = null; return renderFitting(view); }
    const t = e.target.closest('.pick [data-item]');
    if (t) { toggleWear(t.dataset.item); return renderFitting(view); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const sel = FitState.sel ? itemById(FitState.sel) : null;
    if (a === 'random') {
      const recs = Stylist.recommend({ seed: Math.random(), count: 1 });
      if (!recs.length) return toast('상의·하의(또는 원피스)를 먼저 넣어 주세요');
      FitState.ids = recs[0].ids; FitState.sel = null; FitState.tuck = false;
    }
    if (a === 'clear') { FitState.ids = []; FitState.sel = null; }
    if (a === 'tuck') FitState.tuck = !FitState.tuck;
    if (a === 'add') return addClothes();
    if (a === 'detail') return showFitDetail(ev);
    if (a === 'save') {
      const key = FitState.ids.slice().sort().join();
      if (db.looks.some(l => l.items.slice().sort().join() === key)) return toast('이미 저장한 코디예요');
      db.looks.unshift({ id: uid(), items: FitState.ids.slice(), tuck: FitState.tuck, added: Date.now() });
      save(); toast('코디를 저장했어요');
      return;
    }
    if (a === 'wear') { addWear(today(), FitState.ids.slice()); return; }
    if (sel && (a === 'smaller' || a === 'bigger')) { const f = sel.fitAdj || (sel.fitAdj = {}); f.s = clamp((f.s || 1) * (a === 'bigger' ? 1.06 : 1 / 1.06), 0.4, 2.5); save(); }
    if (sel && a === 'resetpos') { delete sel.fitAdj; save(); }
    if (sel && a === 'off') { FitState.ids = FitState.ids.filter(x => x !== sel.id); FitState.sel = null; }
    renderFitting(view);
  };
}

// 마네킹 위 옷 끌기·두 손가락 크기 조절
function bindStage(view) {
  const svg = $('svg.mq', view);
  if (!svg) return;
  const g = bodyGeometry();
  bodySvg(g); // 손 위치 계산
  const shW = g.shHW * 2;
  const pts = new Map();
  let drag = null;
  const toSvg = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const place = (im, it) => { const b = garmentBox(it, g); im.setAttribute('x', b.x); im.setAttribute('y', b.y); im.setAttribute('width', b.w); im.setAttribute('height', b.h); };
  svg.addEventListener('pointerdown', (e) => {
    const im = e.target.closest('image.mq-item');
    pts.set(e.pointerId, toSvg(e));
    if (pts.size === 2 && drag) {
      const [a, b] = [...pts.values()];
      drag.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), s0: (drag.it.fitAdj?.s) || 1 };
      return;
    }
    if (!im) {
      if (FitState.sel) { FitState.sel = null; renderFitting(view); }
      return;
    }
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const it = itemById(im.dataset.item);
    if (FitState.sel !== it.id) { FitState.sel = it.id; $$('image.mq-item', svg).forEach(x => x.classList.toggle('sel', x === im)); refreshSelBar(view); }
    const f = it.fitAdj || {};
    drag = { im, it, start: toSvg(e), dx0: f.dx || 0, dy0: f.dy || 0, moved: false };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, toSvg(e));
    const f = drag.it.fitAdj || (drag.it.fitAdj = {});
    if (pts.size >= 2 && drag.pinch) {
      const [a, b] = [...pts.values()];
      f.s = clamp(drag.pinch.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch.d0, 0.4, 2.5);
    } else {
      const p = toSvg(e);
      f.dx = drag.dx0 + (p.x - drag.start.x) / shW;
      f.dy = drag.dy0 + (p.y - drag.start.y) / shW;
    }
    drag.moved = true;
    place(drag.im, drag.it);
  });
  const end = (e) => {
    pts.delete(e.pointerId);
    if (drag && pts.size === 0) { if (drag.moved) save(); drag = null; }
    else if (drag && pts.size === 1) { drag.pinch = null; const p = [...pts.values()][0]; const f = drag.it.fitAdj || {}; drag.start = p; drag.dx0 = f.dx || 0; drag.dy0 = f.dy || 0; }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function refreshSelBar(view) {
  // 선택만 바뀐 경우 화면 전체를 다시 그리지 않고 아래 막대만 갱신
  const it = itemById(FitState.sel);
  const stage = $('[data-r="stage"]', view);
  $('.sel-bar', stage)?.remove();
  if (!it) return;
  stage.insertAdjacentHTML('beforeend', `<div class="sel-bar"><span class="grow">${esc(itemName(it))}</span>
    <button class="ib" data-a="smaller" aria-label="작게">−</button><button class="ib" data-a="bigger" aria-label="크게">+</button>
    <button class="ib txt" data-a="resetpos">원위치</button><button class="ib txt" data-a="off">벗기</button></div>`);
}

function showFitDetail(ev) {
  if (!ev) return;
  const ids = FitState.ids;
  const o = outfitFromIds(ids);
  const wx = Weather.day(today());
  openSheet(`${sheetHeader('스타일리스트 한마디')}
    <div class="fit-detail">
      <div class="big-score"><span class="score lg">${ev.score}</span><div><b>${ev.grade}</b><small>${STYLE[ev.styleId]?.name || ''} 스타일${wx ? ` · 오늘 ${wx.min}°~${wx.max}°` : ''}</small></div></div>
      ${ev.good.length ? `<h4>좋은 점</h4><ul class="why lg">${ev.good.map(t => `<li class="g">${esc(t)}</li>`).join('')}</ul>` : ''}
      ${ev.warn.length ? `<h4>이렇게 하면 더 좋아요</h4><ul class="why lg">${ev.warn.map(t => `<li class="w">${esc(t)}</li>`).join('')}</ul>` : ''}
      ${swapIdeas(o).length ? `<h4>바꿔 볼 만한 옷</h4><div class="swap">${swapIdeas(o).map(s => `<button class="swap-it" data-swap="${s.id}"><img data-img="${thumbKey(s.id)}" alt=""><small>${esc(s.why)}</small></button>`).join('')}</div>` : ''}
    </div>`);
  const p = sheetStack[sheetStack.length - 1].el;
  hydrateImgs(p);
  p.addEventListener('click', (e) => {
    const s = e.target.closest('[data-swap]');
    if (s) { toggleWear(s.dataset.swap); closeSheet(); renderFitting($('#view')); }
  });
}

// 한 벌만 바꿔서 점수가 오르는 옷 찾기
function swapIdeas(o) {
  const base = outfitIds(o);
  const cur = Stylist.evaluate(base, { tuck: FitState.tuck });
  if (!cur) return [];
  const ideas = [];
  for (const slot of ['top', 'bottom', 'outer', 'shoes']) {
    if (!o[slot] && slot !== 'outer') continue;
    let best = null;
    for (const it of activeItems().filter(i => i.cat === slot && i.id !== o[slot]?.id)) {
      const ids = base.filter(id => id !== o[slot]?.id).concat(it.id);
      const ev = Stylist.evaluate(ids, { tuck: FitState.tuck });
      if (ev && ev.score >= cur.score + 5 && (!best || ev.score > best.score)) best = { id: it.id, score: ev.score };
    }
    if (best) ideas.push({ id: best.id, why: `${CAT_NAME[slot]} 바꾸면 ${best.score}점` });
  }
  return ideas.slice(0, 4);
}
