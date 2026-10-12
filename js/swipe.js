// 스타일 테스트: 코디 사진을 오른쪽(좋아)·왼쪽(별로)으로 넘기면 취향 스타일을 분석해 저장
const SWIPE_MIN = 15;   // 이만큼 넘기면 중간에 결과를 볼 수 있음

function swipeDeck(pref) {
  const mine = SWIPE_CARDS.filter(c => pref === 'u' || c.g === pref || c.g === 'u');
  const rest = SWIPE_CARDS.filter(c => !mine.includes(c));
  // 같은 스타일이 연달아 나오지 않게 스타일별로 번갈아 섞기
  const interleave = (list) => {
    const rnd = seededRand('swipe' + Date.now());
    const by = {};
    list.slice().sort(() => rnd() - 0.5).forEach(c => (by[c.st[0]] || (by[c.st[0]] = [])).push(c));
    const keys = Object.keys(by).sort(() => rnd() - 0.5), out = [];
    while (keys.some(k => by[k].length)) keys.forEach(k => { if (by[k].length) out.push(by[k].shift()); });
    return out;
  };
  return [...interleave(mine), ...interleave(rest)];
}

function swipeAnalyze(votes) {
  // votes: [{ card, like }]
  const sc = {};
  for (const { card, like } of votes) {
    card.st.forEach((s, i) => {
      const w = i === 0 ? 1 : 0.6;
      const o = sc[s] || (sc[s] = { like: 0, seen: 0 });
      o.seen += w;
      if (like) o.like += w;
    });
  }
  const styles = Object.entries(sc).map(([id, o]) => ({ id, score: (o.like + 0.3) / (o.seen + 1), like: o.like }))
    .filter(s => s.like > 0).sort((a, b) => b.score - a.score || b.like - a.like);
  const liked = votes.filter(v => v.like).map(v => v.card);
  const count = (key) => { const m = {}; liked.forEach(c => m[c[key]] = (m[c[key]] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const tones = count('tone'), fits = count('fit');
  const top = [];
  for (const s of styles) { if (top.length >= 3) break; if (!top.length || s.score >= Math.max(0.42, styles[0].score * 0.72)) top.push(s.id); }
  return {
    styles, top, liked,
    tone: tones.length && tones[0][1] >= Math.max(2, liked.length * 0.3) ? tones[0][0] : null,
    fit: fits.length && fits[0][0] !== 'r' && fits[0][1] >= Math.max(2, liked.length * 0.35) ? fits[0][0] : null,
  };
}
const TONE_NAME = { n: '무채색', e: '베이지·브라운 흙빛', b: '선명한 포인트 색', p: '부드러운 파스텔', d: '블랙·다크 톤' };
const FIT_NAME = { o: '여유 있는 오버핏', s: '몸에 맞는 슬림핏' };

// 테스트 열기 (Promise: 끝나면 resolve)
function openStyleSwipe({ onboarding = false } = {}) {
  return new Promise(resolve => {
    let deck = [], votes = [], pref = db.profile.pref || 'u';
    const p = openSheet(`${sheetHeader('스타일 테스트', '', `<button class="link" data-x="close">${onboarding ? '건너뛰기' : '닫기'}</button>`)}<div data-r="sw"></div>`,
      { full: true, onClose: () => resolve() });
    const box = $('[data-r="sw"]', p);

    const askPref = () => {
      box.innerHTML = `<div class="sw-intro">
        <h2>마음에 드는 코디를 골라 주세요</h2>
        <p class="muted">사진을 <b>오른쪽으로 밀면 좋아</b>, <b>왼쪽으로 밀면 별로</b>예요.<br>고른 사진으로 내 취향 스타일을 분석해요.</p>
        <div class="sw-demo"><span class="no">← 별로</span><span class="yes">좋아 →</span></div>
        <label class="fl">어떤 코디 사진을 보여 드릴까요?</label>
        <div class="list card">
          <button class="row" data-pref="f"><span class="grow"><b>여성 코디 위주</b></span>${ic('chev')}</button>
          <button class="row" data-pref="m"><span class="grow"><b>남성 코디 위주</b></span>${ic('chev')}</button>
          <button class="row" data-pref="u"><span class="grow"><b>구분 없이 모두</b></span>${ic('chev')}</button>
        </div></div>`;
    };

    const draw = () => {
      const i = votes.length;
      if (i >= deck.length) return showResult();
      const card = deck[i], next = deck[i + 1];
      const canStop = votes.length >= SWIPE_MIN;
      box.innerHTML = `
        <div class="sw-top"><div class="bar"><i style="width:${Math.round(i / deck.length * 100)}%"></i></div><span>${i + 1} / ${deck.length}</span></div>
        <div class="sw-stack">
          ${next ? `<div class="sw-card back"><img src="data/swipe/${next.id}.jpg" alt=""></div>` : ''}
          <div class="sw-card" data-r="card"><img src="data/swipe/${card.id}.jpg" alt="코디 사진" draggable="false">
            <span class="stamp yes">좋아</span><span class="stamp no">별로</span>
            <span class="sw-by">Photo @${esc(card.by)} · Unsplash</span></div>
        </div>
        <div class="sw-btns">
          <button class="sw-b no" data-v="0" aria-label="별로">✕</button>
          <button class="sw-b undo" data-v="u" aria-label="되돌리기" ${i ? '' : 'disabled'}>${ic('undo')}</button>
          <button class="sw-b yes" data-v="1" aria-label="좋아">${ic('heart')}</button>
        </div>
        <button class="btn wide ${canStop ? '' : 'ghost'}" data-a="stop" ${canStop ? '' : 'disabled'}>${canStop ? '그만하고 결과 보기' : `${SWIPE_MIN - votes.length}장 더 넘기면 결과를 볼 수 있어요`}</button>`;
      const n2 = deck[i + 2];
      if (n2) { const im = new Image(); im.src = `data/swipe/${n2.id}.jpg`; }
      bindDrag($('[data-r="card"]', box));
    };

    const vote = (like) => {
      votes.push({ card: deck[votes.length], like });
      draw();
    };
    const fly = (el, like) => {
      el.style.transition = 'transform .28s ease-out, opacity .28s';
      el.style.transform = `translate(${like ? 520 : -520}px, 40px) rotate(${like ? 24 : -24}deg)`;
      el.style.opacity = '0';
      setTimeout(() => vote(like), 230);
    };
    const bindDrag = (el) => {
      let sx = 0, sy = 0, dx = 0, dy = 0, on = false;
      const yes = $('.stamp.yes', el), no = $('.stamp.no', el);
      el.addEventListener('pointerdown', (e) => { on = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
      el.addEventListener('pointermove', (e) => {
        if (!on) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        el.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${dx / 18}deg)`;
        yes.style.opacity = clamp(dx / 90, 0, 1); no.style.opacity = clamp(-dx / 90, 0, 1);
      });
      const up = () => {
        if (!on) return;
        on = false;
        if (Math.abs(dx) > 90) return fly(el, dx > 0);
        el.style.transition = 'transform .25s';
        el.style.transform = ''; yes.style.opacity = 0; no.style.opacity = 0;
        dx = 0; dy = 0;
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    };

    const showResult = () => {
      const R = swipeAnalyze(votes);
      if (!R.top.length) {
        box.innerHTML = `<div class="empty"><b>좋아요를 누른 사진이 없어요</b><p class="muted">마음에 드는 코디를 몇 장만 오른쪽으로 넘겨 주세요.</p><button class="btn primary" data-a="again">다시 하기</button></div>`;
        return;
      }
      const max = R.styles[0].score;
      box.innerHTML = `
        <div class="sw-res">
          <small>나의 취향 스타일</small>
          <h2>${R.top.map(s => STYLE[s].name).join(' · ')}</h2>
          <p class="muted">${esc(STYLE[R.top[0]].desc)}</p>
          ${R.tone || R.fit ? `<div class="me-tags dark">${R.tone ? `<span class="tag">${TONE_NAME[R.tone]}</span>` : ''}${R.fit ? `<span class="tag">${FIT_NAME[R.fit]}</span>` : ''}</div>` : ''}
        </div>
        <div class="card">
          <h3>스타일별 취향</h3>
          ${R.styles.slice(0, 6).map(s => `<div class="mrow"><span>${STYLE[s.id].name}${R.top.includes(s.id) ? ' <small class="want">내 스타일</small>' : ''}</span>${bar(s.score / max)}<b></b></div>`).join('')}
          <p class="muted sm">${votes.length}장 중 ${R.liked.length}장을 좋아했어요.</p>
        </div>
        <div class="card"><h3>좋아한 코디</h3><div class="sw-liked">${R.liked.slice(0, 12).map(c => `<img src="data/swipe/${c.id}.jpg" alt="">`).join('')}</div></div>
        <div class="btn-row"><button class="btn" data-a="again">다시 하기</button><button class="btn" data-a="manual">직접 고치기</button></div>
        ${sheetFooter('이 스타일로 저장', 'save')}`;
      box._result = R;
    };

    const start = () => { deck = swipeDeck(pref); votes = []; draw(); };
    if (onboarding || !db.profile.pref || db.profile.pref === 'u' && !db.profile.styles.length) askPref(); else start();

    box.addEventListener('click', async (e) => {
      const pr = e.target.closest('[data-pref]');
      if (pr) { pref = pr.dataset.pref; db.profile.pref = pref; save(); return start(); }
      const v = e.target.closest('[data-v]');
      if (v) {
        if (v.dataset.v === 'u') { votes.pop(); return draw(); }
        const el = $('[data-r="card"]', box);
        return el ? fly(el, v.dataset.v === '1') : null;
      }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'stop') showResult();
      if (a === 'again') start();
      if (a === 'manual' || a === 'save') {
        const R = box._result;
        db.profile.styles = R.top;
        db.profile.taste = { tone: R.tone, fit: R.fit, scores: Object.fromEntries(R.styles.map(s => [s.id, Math.round(s.score * 100) / 100])), date: today() };
        save();
        if (a === 'manual') { await editStyles({ onboarding }); }
        else if (!onboarding) toast(`${R.top.map(s => STYLE[s].name).join('·')} 스타일로 저장했어요`);
        closeSheet();
        rerender();
      }
    });
  });
}
