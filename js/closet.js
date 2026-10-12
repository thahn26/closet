// 옷장 탭: 목록, 옷 등록(자동 누끼), 수정, 상세
function renderCloset(view) {
  const cat = db.ui.closetCat || 'all';
  const flt = db.ui.closetFlt || '';
  const counts = Object.fromEntries(CATS.map(c => [c.id, db.items.filter(i => i.cat === c.id).length]));
  let list = db.items.filter(i => cat === 'all' || i.cat === cat);
  if (flt === 'laundry' || flt === 'repair') list = list.filter(i => i.status === flt);
  else if (SEASONS.some(s => s.id === flt)) list = list.filter(i => (i.seasons || []).includes(flt));
  else if (flt === 'fav') list = list.filter(i => i.fav);
  list = list.slice().sort((a, b) => CATS.findIndex(c => c.id === a.cat) - CATS.findIndex(c => c.id === b.cat) || (b.added || 0) - (a.added || 0));
  const nLaundry = db.items.filter(i => i.status === 'laundry').length, nRepair = db.items.filter(i => i.status === 'repair').length;

  view.innerHTML = `
    <div class="page">
      <div class="page-h"><h1>옷장</h1><span class="muted">${db.items.length}벌</span></div>
      <div class="chips scroll" data-g="cat">
        <button class="chip ${cat === 'all' ? 'on' : ''}" data-v="all">전체</button>
        ${CATS.map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-v="${c.id}">${c.name}${counts[c.id] ? ` <small>${counts[c.id]}</small>` : ''}</button>`).join('')}
      </div>
      <div class="chips scroll sm" data-g="flt">
        <button class="chip ${flt === '' ? 'on' : ''}" data-v="">모두</button>
        ${SEASONS.map(s => `<button class="chip ${flt === s.id ? 'on' : ''}" data-v="${s.id}">${s.name}</button>`).join('')}
        <button class="chip ${flt === 'fav' ? 'on' : ''}" data-v="fav">즐겨찾기</button>
        <button class="chip ${flt === 'laundry' ? 'on' : ''}" data-v="laundry">세탁 중${nLaundry ? ` <small>${nLaundry}</small>` : ''}</button>
        <button class="chip ${flt === 'repair' ? 'on' : ''}" data-v="repair">수선 필요${nRepair ? ` <small>${nRepair}</small>` : ''}</button>
      </div>
      ${list.length ? `<div class="grid">${list.map(it => itemTile(it)).join('')}</div>` : `
        <div class="empty">
          <div class="empty-ic">${ic('closet')}</div>
          <b>${db.items.length ? '조건에 맞는 옷이 없어요' : '옷장이 비어 있어요'}</b>
          <p class="muted">${db.items.length ? '' : '옷 사진을 찍거나 앨범에서 고르면 배경을 지워서 옷장에 넣어 드려요.'}</p>
          ${db.items.length ? '' : '<button class="btn primary" data-a="add">옷 넣기</button>'}
        </div>`}
    </div>
    <button class="fab" data-a="add" aria-label="옷 추가">${ic('plus')}</button>`;
  hydrateImgs(view);
  view.onclick = (e) => {
    const chip = e.target.closest('[data-g] .chip');
    if (chip) {
      const g = chip.parentElement.dataset.g;
      if (g === 'cat') db.ui.closetCat = chip.dataset.v; else db.ui.closetFlt = chip.dataset.v;
      save(); renderCloset(view); return;
    }
    const t = e.target.closest('[data-item]');
    if (t) return openItem(t.dataset.item);
    if (e.target.closest('[data-a="add"]')) addClothes();
  };
}

// ── 옷 등록 ──
async function addClothes(target = 'closet') {
  const how = await choose('옷 넣기', [
    { label: '사진 찍기', sub: '옷을 바닥이나 벽에 펼치거나 걸어서 찍으세요', icon: 'camera', value: 'cam' },
    { label: '앨범에서 고르기', sub: '여러 장을 한 번에 고를 수 있어요', icon: 'photo', value: 'lib' },
  ]);
  if (!how) return;
  const files = await pickFiles({ multiple: how === 'lib', capture: how === 'cam' });
  if (!files.length) return;
  const added = [];
  for (let i = 0; i < files.length; i++) {
    const r = await addOne(files[i], { idx: i + 1, total: files.length, target });
    if (r === 'stop') break;
    if (r) added.push(r);
  }
  if (added.length) toast(target === 'wish' ? '위시리스트에 담았어요' : `${added.length}벌을 옷장에 넣었어요`);
  rerender();
}

// 사진 한 장 → 누끼 → 정보 입력 → 저장. 반환: 저장된 id | null(건너뜀) | 'stop'
function addOne(file, { idx = 1, total = 1, target = 'closet', preset = {} } = {}) {
  return new Promise(async (resolve) => {
    let result = 'stop';   // 버튼 없이 닫으면 남은 사진도 그만
    const title = target === 'wish' ? '사고 싶은 옷' : '옷 등록';
    const p = openSheet(`${sheetHeader(total > 1 ? `${title} (${idx}/${total})` : title, '', '<button class="link" data-x="close">그만</button>')}
      <div class="cut-progress"><div class="spinner"></div><b data-r="msg">사진 불러오는 중</b><div class="bar"><i data-r="bar"></i></div>
      <p class="hint">사진은 휴대폰 밖으로 나가지 않아요.</p></div>`,
    { full: true, onClose: () => resolve(result) });
    const setP = (msg, f) => { const m = $('[data-r="msg"]', p), b = $('[data-r="bar"]', p); if (m) m.textContent = msg; if (b) b.style.width = Math.round(clamp(f, 0, 1) * 100) + '%'; };
    let cutRes;
    try { cutRes = await Cutout.run(file, setP); }
    catch (e) { toast('사진을 열지 못했어요'); result = null; closeSheet(); return; }
    if (!p.isConnected) return;
    let fin = await Cutout.finalize(cutRes.cut);
    const colors = extractColors(fin.canvas);
    const lastCat = db.ui.lastCat || 'top';
    const draft = {
      id: uid(), cat: preset.cat || lastCat, sub: preset.sub || subsOf(preset.cat || lastCat)[0].id,
      colors, pattern: guessPattern(colors), fit: 'regular', thick: 'normal',
      seasons: null, styles: null, status: 'ok', name: '', brand: '', memo: '', added: Date.now(),
      imgW: fin.w, imgH: fin.h,
    };
    let previewUrl = URL.createObjectURL(fin.blob);
    const body = p.querySelector('.cut-progress');
    const form = document.createElement('div');
    body.replaceWith(form);
    const draw = () => {
      form.innerHTML = itemFormHtml(draft, previewUrl, { how: cutRes.how, target, last: idx === total });
    };
    draw();
    bindItemForm(form, draft, draw, {
      onRetouch: async () => {
        const ed = await openCutoutEditor(cutRes.src, cutRes.cut);
        if (!ed) return;
        cutRes.cut = ed;
        fin = await Cutout.finalize(ed);
        draft.imgW = fin.w; draft.imgH = fin.h;
        draft.colors = extractColors(fin.canvas);
        URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(fin.blob);
        draw();
      },
      onSave: async (extra) => {
        const it = finalizeDraft(draft);
        await putImg(it.id, fin.blob);
        await putImg(thumbKey(it.id), fin.thumb);
        if (target === 'wish') db.wish.unshift({ ...it, ...extra, wish: true });
        else db.items.unshift(it);
        db.ui.lastCat = it.cat;
        save();
        result = it.id;
        URL.revokeObjectURL(previewUrl);
        closeSheet();
      },
      onSkip: () => { result = null; closeSheet(); },
    });
  });
}

function finalizeDraft(d) {
  const it = { ...d };
  if (!it.seasons) it.seasons = SUB[it.sub]?.se || [];
  if (!it.styles) it.styles = SUB[it.sub]?.st || [];
  return it;
}

function itemFormHtml(d, previewUrl, { how, target, editing = false, last = true } = {}) {
  const subs = subsOf(d.cat);
  const seasons = d.seasons || SUB[d.sub]?.se || [];
  const styles = d.styles || SUB[d.sub]?.st || [];
  const clothes = ['top', 'bottom', 'outer', 'dress'].includes(d.cat);
  const pc = db.profile.pcolor?.season;
  const main = d.colors[0];
  const pcf = pc && main && ['top', 'outer', 'dress'].includes(d.cat) ? pcFit(main.hex, pc) : null;
  return `
    <div class="form">
      <div class="preview checker">${previewUrl ? `<img src="${previewUrl}" alt="">` : `<img data-img="${d.id}" alt="">`}
        ${how === 'flood' ? '<span class="pv-note">단색 배경 지우기로 처리했어요</span>' : ''}
        <button class="pv-btn" data-a="retouch">${ic('eraser')} 누끼 다듬기</button>
      </div>
      <label class="fl">종류</label>
      <div class="chips wrap" data-f="cat">${CATS.map(c => `<button class="chip ${d.cat === c.id ? 'on' : ''}" data-v="${c.id}">${c.name}</button>`).join('')}</div>
      <div class="chips wrap sm" data-f="sub">${subs.map(s => `<button class="chip ${d.sub === s.id ? 'on' : ''}" data-v="${s.id}">${s.name}</button>`).join('')}</div>
      <label class="fl">색 <small class="muted">사진에서 자동으로 찾았어요. 눌러서 바꿀 수 있어요</small></label>
      <div class="colors-row">
        ${d.colors.map((c, i) => `<button class="cpill" data-ci="${i}">${swatch(c.hex, 18)}<span>${COLOR[c.id]?.name || ''}${i === 0 ? ' <small>대표</small>' : ''}</span></button>`).join('')}
        <button class="cpill add" data-a="color">색 고치기</button>
      </div>
      ${pcf ? `<p class="pcnote ${pcf}">${pcf === 'good' ? `${PCOLORS[pc].short}에 잘 받는 색이에요` : pcf === 'bad' ? `${PCOLORS[pc].short}에는 얼굴이 칙칙해 보일 수 있는 색이에요` : `${PCOLORS[pc].short}에 무난한 색이에요`}</p>` : ''}
      <label class="fl">무늬</label>
      <div class="chips wrap sm" data-f="pattern">${PATTERNS.map(x => `<button class="chip ${d.pattern === x.id ? 'on' : ''}" data-v="${x.id}">${x.name}</button>`).join('')}</div>
      ${clothes ? `
      <div class="two">
        <div><label class="fl">핏</label><div class="seg sm" data-f="fit">${FITS.map(x => `<button class="${d.fit === x.id ? 'on' : ''}" data-v="${x.id}">${x.name}</button>`).join('')}</div></div>
        <div><label class="fl">두께</label><div class="seg sm" data-f="thick">${THICKS.map(x => `<button class="${d.thick === x.id ? 'on' : ''}" data-v="${x.id}">${x.name}</button>`).join('')}</div></div>
      </div>` : ''}
      ${target === 'wish' ? `
        <label class="fl">가격·링크 <small class="muted">선택</small></label>
        <div class="two"><input class="inp" data-w="price" inputmode="numeric" placeholder="가격 (원)" value="${esc(d.price || '')}"><input class="inp" data-w="link" placeholder="쇼핑몰 링크" value="${esc(d.link || '')}"></div>` : `
      <details class="more" ${editing ? 'open' : ''}><summary>계절·스타일·이름 (자동으로 채워져요)</summary>
        <label class="fl">계절</label>
        <div class="chips wrap sm" data-m="seasons">${SEASONS.map(s => `<button class="chip ${seasons.includes(s.id) ? 'on' : ''}" data-v="${s.id}">${s.name}</button>`).join('')}</div>
        <label class="fl">스타일</label>
        <div class="chips wrap sm" data-m="styles">${STYLES.map(s => `<button class="chip ${styles.includes(s.id) ? 'on' : ''}" data-v="${s.id}">${s.name}</button>`).join('')}</div>
        <label class="fl">이름·브랜드</label>
        <div class="two"><input class="inp" data-t="name" placeholder="${esc(itemName({ ...d, name: '' }))}" value="${esc(d.name)}"><input class="inp" data-t="brand" placeholder="브랜드" value="${esc(d.brand)}"></div>
        <input class="inp" data-t="memo" placeholder="메모 (사이즈, 산 곳 등)" value="${esc(d.memo)}">
      </details>`}
      <div class="btn-row sticky">
        ${editing ? '<button class="btn" data-x="close">취소</button>' : `<button class="btn" data-a="skip">${last ? '버리기' : '이 사진 건너뛰기'}</button>`}
        <button class="btn primary" data-a="save">${target === 'wish' ? '위시리스트에 담기' : editing ? '저장' : '옷장에 넣기'}</button>
      </div>
    </div>`;
}

function bindItemForm(form, d, draw, { onRetouch, onSave, onSkip }) {
  form.addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-f] [data-v]');
    if (chip) {
      const f = chip.parentElement.dataset.f, v = chip.dataset.v;
      if (f === 'cat') { d.cat = v; d.sub = subsOf(v)[0].id; d.seasons = d._se ? d.seasons : null; d.styles = d._st ? d.styles : null; }
      else if (f === 'sub') { d.sub = v; if (!d._se) d.seasons = null; if (!d._st) d.styles = null; }
      else d[f] = v;
      keepText(form, d); draw(); return;
    }
    const mchip = e.target.closest('[data-m] [data-v]');
    if (mchip) {
      const m = mchip.parentElement.dataset.m, v = mchip.dataset.v;
      const cur = d[m] || (m === 'seasons' ? SUB[d.sub]?.se : SUB[d.sub]?.st) || [];
      d[m] = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
      d[m === 'seasons' ? '_se' : '_st'] = true;
      mchip.classList.toggle('on');
      return;
    }
    const ci = e.target.closest('[data-ci]');
    if (ci || e.target.closest('[data-a="color"]')) {
      keepText(form, d);
      const r = await pickColors(d.colors);
      if (r) { d.colors = r; draw(); }
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'retouch') { keepText(form, d); onRetouch && onRetouch(); }
    if (a === 'save') {
      keepText(form, d);
      const extra = {};
      const pr = $('[data-w="price"]', form), ln = $('[data-w="link"]', form);
      if (pr) extra.price = pr.value.replace(/[^0-9]/g, '');
      if (ln) extra.link = ln.value.trim();
      onSave(extra);
    }
    if (a === 'skip') onSkip && onSkip();
  });
}
function keepText(form, d) {
  $$('[data-t]', form).forEach(inp => d[inp.dataset.t] = inp.value.trim());
  $$('[data-w]', form).forEach(inp => d[inp.dataset.w] = inp.value.trim());
}

// 색 고르기 (대표색 1개 + 보조색 최대 2개)
function pickColors(current) {
  return new Promise(resolve => {
    let sel = current.map(c => c.id);
    const hexOf = (id) => current.find(c => c.id === id)?.hex || COLOR[id].hex;
    let out = null;
    const p = openSheet(`${sheetHeader('색 고르기', '<button class="link b" data-a="ok">완료</button>')}
      <p class="hint">처음 고른 색이 대표색이에요. 최대 3개.</p>
      <div class="palette">${COLORS.map(c => `<button class="pal" data-c="${c.id}"><i style="background:${c.hex}"></i><span>${c.name}</span><b class="ord"></b></button>`).join('')}</div>${sheetFooter('이 색으로')}`,
    { onClose: () => resolve(out) });
    const paint = () => $$('.pal', p).forEach(b => { const i = sel.indexOf(b.dataset.c); b.classList.toggle('on', i >= 0); $('.ord', b).textContent = i >= 0 ? i + 1 : ''; });
    paint();
    p.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (b) { const id = b.dataset.c; sel = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id].slice(-3); paint(); }
      if (e.target.closest('[data-a="ok"]')) {
        if (!sel.length) return toast('색을 하나 이상 골라 주세요');
        out = sel.map((id, i) => ({ id, hex: hexOf(id), pct: i === 0 ? 0.7 : 0.15 }));
        closeSheet();
      }
    });
  });
}

// ── 옷 상세 ──
function openItem(id) {
  const it = itemById(id);
  if (!it) return;
  const n = wearCount(id), last = lastWorn(id);
  const pc = db.profile.pcolor?.season;
  const pcf = pc && ['top', 'outer', 'dress'].includes(it.cat) ? pcFit(mainColor(it).hex, pc) : null;
  const bn = Stylist.bodyNote(it);
  const p = openSheet(`${sheetHeader(itemName(it), `<button class="link" data-a="fav">${it.fav ? '★' : '☆'}</button>`)}
    <div class="detail">
      <div class="preview checker sm"><img data-img="${it.id}" alt=""></div>
      <div class="meta">
        <span>${CAT_NAME[it.cat]} · ${SUB[it.sub]?.name || ''}</span>
        <span class="colors-inline">${(it.colors || []).map(c => `${swatch(c.hex)} ${COLOR[c.id]?.name || ''}`).join(' ')}</span>
        ${it.brand ? `<span>${esc(it.brand)}</span>` : ''}
      </div>
      <div class="stats">
        <div><b>${n}</b><small>번 입음</small></div>
        <div><b>${last ? (daysBetween(last, today()) === 0 ? '오늘' : daysBetween(last, today()) + '일 전') : '-'}</b><small>마지막 착용</small></div>
        <div><b>${daysOwned(it)}</b><small>일째 함께</small></div>
      </div>
      ${pcf || bn ? `<div class="notes">
        ${pcf ? `<p class="pcnote ${pcf}">${ic('palette')} ${pcf === 'good' ? `${PCOLORS[pc].short}에 잘 받는 색` : pcf === 'bad' ? `${PCOLORS[pc].short}엔 덜 어울리는 색 — 얼굴에서 먼 아우터·하의로 활용` : `${PCOLORS[pc].short}에 무난한 색`}</p>` : ''}
        ${bn ? `<p class="pcnote ${bn.ok ? 'good' : 'bad'}">${ic('ruler')} ${esc(bn.t)}</p>` : ''}
      </div>` : ''}
      ${it.memo ? `<p class="memo">${esc(it.memo)}</p>` : ''}
      <label class="fl">상태</label>
      <div class="seg" data-g="status">
        <button data-v="ok" class="${!it.status || it.status === 'ok' ? 'on' : ''}">입을 수 있음</button>
        <button data-v="laundry" class="${it.status === 'laundry' ? 'on' : ''}">${ic('wash')}세탁 중</button>
        <button data-v="repair" class="${it.status === 'repair' ? 'on' : ''}">${ic('needle')}수선 필요</button>
      </div>
      <div class="list actions">
        <button class="row" data-a="reco"><span class="row-ic">${ic('style')}</span><span class="grow"><b>이 옷으로 코디 추천</b></span>${ic('chev')}</button>
        <button class="row" data-a="fit"><span class="row-ic">${ic('layers')}</span><span class="grow"><b>이 옷으로 코디 만들기</b></span>${ic('chev')}</button>
        <button class="row" data-a="wear"><span class="row-ic">${ic('calendar')}</span><span class="grow"><b>오늘 입었어요</b></span></button>
        <button class="row" data-a="edit"><span class="row-ic">${ic('edit')}</span><span class="grow"><b>정보 고치기</b></span></button>
        <button class="row" data-a="retouch"><span class="row-ic">${ic('eraser')}</span><span class="grow"><b>누끼 다시 다듬기</b></span></button>
        <button class="row" data-a="archive"><span class="row-ic">${ic('bag')}</span><span class="grow"><b>정리하기</b><small>기부·판매·버림으로 옷장에서 빼요</small></span></button>
        <button class="row danger" data-a="del"><span class="row-ic">${ic('trash')}</span><span class="grow"><b>삭제</b></span></button>
      </div>
    </div>`);
  p.addEventListener('click', async (e) => {
    const st = e.target.closest('[data-g="status"] [data-v]');
    if (st) {
      it.status = st.dataset.v; save();
      $$('[data-g="status"] button', p).forEach(b => b.classList.toggle('on', b === st));
      toast(it.status === 'ok' ? '다시 입을 수 있게 했어요' : `${STATUS[it.status]}으로 표시했어요 — 추천에서 빠져요`);
      rerender(); return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'fav') { it.fav = !it.fav; save(); e.target.textContent = it.fav ? '★' : '☆'; rerender(); }
    if (a === 'reco') showForcedOutfits(it.id);
    if (a === 'fit') { closeAllSheets(); openFitting([it.id]); }
    if (a === 'wear') { addWear(today(), [it.id]); closeSheet(); }
    if (a === 'edit') { closeSheet(); editItem(it.id); }
    if (a === 'retouch') retouchItem(it.id);
    if (a === 'archive') { closeSheet(); archiveItem(it.id); }
    if (a === 'del') {
      if (!await ask('이 옷을 삭제할까요?', '사진과 착용 기록에서 빠져요. 되돌릴 수 없어요.', '삭제', '취소', true)) return;
      deleteItem(it.id); closeSheet(); toast('삭제했어요'); rerender();
    }
  });
}

function editItem(id) {
  const it = itemById(id) || db.wish.find(w => w.id === id);
  if (!it) return;
  const d = structuredClone(it);
  d._se = true; d._st = true;
  const target = it.wish ? 'wish' : 'closet';
  const p = openSheet(`${sheetHeader('정보 고치기')}<div data-r="form"></div>`, { full: true });
  const form = $('[data-r="form"]', p);
  const draw = () => { form.innerHTML = itemFormHtml(d, null, { editing: true, target }); hydrateImgs(form); $('[data-a="retouch"]', form)?.remove(); };
  draw();
  bindItemForm(form, d, draw, {
    onSave: (extra) => {
      delete d._se; delete d._st;
      Object.assign(it, finalizeDraft(d), extra);
      save(); closeSheet(); toast('저장했어요'); rerender();
    },
  });
}

async function retouchItem(id) {
  const it = itemById(id);
  const blob = await getImg(id);
  if (!blob) return toast('사진이 없어요');
  const c = await blobToCanvas(blob);
  const ed = await openCutoutEditor(c, c);
  if (!ed) return;
  const fin = await Cutout.finalize(ed);
  await putImg(id, fin.blob); await putImg(thumbKey(id), fin.thumb);
  it.imgW = fin.w; it.imgH = fin.h; save();
  toast('누끼를 고쳤어요'); closeAllSheets(); rerender();
}

function deleteItem(id) {
  db.items = db.items.filter(i => i.id !== id);
  for (const w of Object.values(db.wears)) w.items = (w.items || []).filter(x => x !== id);
  db.looks.forEach(l => l.items = l.items.filter(x => x !== id));
  db.looks = db.looks.filter(l => l.items.length);
  save();
  delImg(id); delImg(thumbKey(id));
}

async function archiveItem(id) {
  const it = itemById(id);
  const how = await choose(`${itemName(it)} 정리하기`, [
    { label: '기부했어요', value: '기부' }, { label: '팔았어요', value: '판매' },
    { label: '버렸어요', value: '버림' }, { label: '보관함에 넣기 (철 지난 옷 등)', value: '보관' },
  ]);
  if (!how) return;
  db.items = db.items.filter(i => i.id !== id);
  db.archive.unshift({ ...it, gone: { date: today(), how } });
  save();
  toast(`${how === '보관' ? '보관함에 넣었어요' : '정리했어요'} — 나 탭의 보관함에서 되돌릴 수 있어요`);
  rerender();
}

function showForcedOutfits(id) {
  const it = itemById(id);
  const recs = Stylist.recommend({ force: id, count: 3 });
  const p = openSheet(`${sheetHeader(`${itemName(it)} 코디`)}
    ${recs.length ? `<div class="ocards">${recs.map((r, i) => outfitCard(r, i)).join('')}</div>` : `<div class="empty"><b>같이 입을 옷이 부족해요</b><p class="muted">${it.cat === 'top' ? '하의' : it.cat === 'bottom' ? '상의' : '상의·하의'}를 더 등록해 주세요.</p></div>`}`, { full: true });
  hydrateImgs(p);
  bindOutfitCards(p, recs);
}
