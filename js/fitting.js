// 코디 탭: 옷을 골라 코디 보드 만들기, 스타일리스트 한마디, 코디 저장·오늘 입기
const FitState = { ids: [], cat: 'top' };

function openFitting(ids) {
  if (ids) FitState.ids = ids.slice();
  go('fitting');
}

// 한 칸에 한 벌 (소품은 여러 개)
function slotOf(it) { return it.cat === 'acc' ? (['scarf', 'belt'].includes(it.sub) ? it.sub : 'acc') : it.cat; }
function toggleWear(id) {
  const it = itemById(id);
  if (!it) return;
  if (FitState.ids.includes(id)) { FitState.ids = FitState.ids.filter(x => x !== id); return; }
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
}

function renderFitting(view) {
  FitState.ids = FitState.ids.filter(id => itemById(id));
  const ev = FitState.ids.length ? Stylist.evaluate(FitState.ids) : null;
  const cat = FitState.cat;
  const pickList = cat === 'looks' ? [] : db.items.filter(i => i.cat === cat);

  view.innerHTML = `
    <div class="page fitting">
      <div class="page-h"><h1>코디</h1>
        <div class="h-act">
          <button class="link" data-a="random">${ic('shuffle')} 추천 코디</button>
          ${FitState.ids.length ? '<button class="link" data-a="clear">비우기</button>' : ''}
        </div>
      </div>
      <div class="stage">
        ${outfitBoardBig(FitState.ids)}
        ${ev ? `<button class="fit-score" data-a="detail"><span class="score">${ev.score}</span><span><b>${ev.grade}</b><small>${STYLE[ev.styleId]?.name || ''}</small></span></button>` : ''}
      </div>
      ${ev && (ev.good.length || ev.warn.length) ? `<div class="fit-note">
        ${ev.good.slice(0, 2).map(t => `<span class="g">${esc(t)}</span>`).join('')}${ev.warn.slice(0, 2).map(t => `<span class="w">${esc(t)}</span>`).join('')}
      </div>` : ''}
      <div class="fit-actions">
        <button class="pill" data-a="detail" ${ev ? '' : 'disabled'}>${ic('style')} 스타일리스트 의견</button>
        <button class="pill" data-a="save" ${FitState.ids.length ? '' : 'disabled'}>${ic('heart')} 코디 저장</button>
        <button class="pill primary" data-a="wear" ${FitState.ids.length ? '' : 'disabled'}>${ic('calendar')} 오늘 입기</button>
      </div>
      <div class="picker">
        <div class="chips scroll" data-g="cat">
          ${CATS.map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-v="${c.id}">${c.name}</button>`).join('')}
          <button class="chip ${cat === 'looks' ? 'on' : ''}" data-v="looks">저장한 코디 <small>${db.looks.length || ''}</small></button>
        </div>
        ${cat === 'looks' ? (db.looks.length ? `<div class="looks hscroll">${db.looks.map(l => `
            <div class="look" data-look="${l.id}">${outfitBoard(l.items, { cls: 'mini' })}<button class="look-del" data-del="${l.id}" aria-label="삭제">×</button></div>`).join('')}</div>`
          : '<p class="muted pad">마음에 드는 코디를 저장하면 여기 모여요.</p>')
        : (pickList.length ? `<div class="pick hscroll">${pickList.map(it => itemTile(it, { sel: FitState.ids.includes(it.id) })).join('')}</div>`
          : `<p class="muted pad">${CAT_NAME[cat]}가 아직 없어요. <button class="link" data-a="add">옷 넣기</button></p>`)}
      </div>
    </div>`;
  hydrateImgs(view);
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
    if (lk) { const l = db.looks.find(x => x.id === lk.dataset.look); FitState.ids = l.items.slice(); return renderFitting(view); }
    const t = e.target.closest('.pick [data-item]');
    if (t) { toggleWear(t.dataset.item); return renderFitting(view); }
    // 보드 위 옷을 누르면 빼기
    const onBoard = e.target.closest('.board.big [data-item]');
    if (onBoard) { FitState.ids = FitState.ids.filter(x => x !== onBoard.dataset.item); return renderFitting(view); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'random') {
      const recs = Stylist.recommend({ seed: Math.random(), count: 1 });
      if (!recs.length) return toast('상의·하의(또는 원피스)를 먼저 넣어 주세요');
      FitState.ids = recs[0].ids;
    }
    if (a === 'clear') FitState.ids = [];
    if (a === 'add') return addClothes();
    if (a === 'detail') return showFitDetail(ev);
    if (a === 'save') {
      const key = FitState.ids.slice().sort().join();
      if (db.looks.some(l => l.items.slice().sort().join() === key)) return toast('이미 저장한 코디예요');
      db.looks.unshift({ id: uid(), items: FitState.ids.slice(), added: Date.now() });
      save(); toast('코디를 저장했어요');
      return;
    }
    if (a === 'wear') { addWear(today(), FitState.ids.slice()); return; }
    renderFitting(view);
  };
}

function showFitDetail(ev) {
  if (!ev) return;
  const o = outfitFromIds(FitState.ids);
  const wx = Weather.day(today());
  const ideas = swapIdeas(o);
  openSheet(`${sheetHeader('스타일리스트 한마디')}
    <div class="fit-detail">
      <div class="big-score"><span class="score lg">${ev.score}</span><div><b>${ev.grade}</b><small>${STYLE[ev.styleId]?.name || ''} 스타일${wx ? ` · 오늘 ${wx.min}°~${wx.max}°` : ''}</small></div></div>
      ${ev.good.length ? `<h4>좋은 점</h4><ul class="why lg">${ev.good.map(t => `<li class="g">${esc(t)}</li>`).join('')}</ul>` : ''}
      ${ev.warn.length ? `<h4>이렇게 하면 더 좋아요</h4><ul class="why lg">${ev.warn.map(t => `<li class="w">${esc(t)}</li>`).join('')}</ul>` : ''}
      ${ideas.length ? `<h4>바꿔 볼 만한 옷</h4><div class="swap">${ideas.map(s => `<button class="swap-it" data-swap="${s.id}"><img data-img="${thumbKey(s.id)}" alt=""><small>${esc(s.why)}</small></button>`).join('')}</div>` : ''}
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
  const cur = Stylist.evaluate(base);
  if (!cur) return [];
  const ideas = [];
  for (const slot of ['top', 'bottom', 'outer', 'shoes']) {
    if (!o[slot] && slot !== 'outer') continue;
    let best = null;
    for (const it of activeItems().filter(i => i.cat === slot && i.id !== o[slot]?.id)) {
      const ids = base.filter(id => id !== o[slot]?.id).concat(it.id);
      const ev = Stylist.evaluate(ids);
      if (ev && ev.score >= cur.score + 5 && (!best || ev.score > best.score)) best = { id: it.id, score: ev.score };
    }
    if (best) ideas.push({ id: best.id, why: `${CAT_NAME[slot]} 바꾸면 ${best.score}점` });
  }
  return ideas.slice(0, 4);
}
