// 스타일리스트 엔진 (AI 없이 규칙으로): 코디 점수·추천, 옷장 분석, 쇼핑·위시리스트 판단
function josa(word, pair) {
  const w = String(word || '');
  const ch = w.charCodeAt(w.length - 1);
  const has = ch >= 0xac00 && ch <= 0xd7a3 ? (ch - 0xac00) % 28 !== 0 : false;
  const [a, b] = { '은는': ['은', '는'], '이가': ['이', '가'], '을를': ['을', '를'], '과와': ['과', '와'], '으로': ['으로', '로'] }[pair];
  if (pair === '으로' && ch >= 0xac00 && (ch - 0xac00) % 28 === 8) return w + '로'; // ㄹ 받침
  return w + (has ? a : b);
}

// ── 프로필 해석 ──
function bodyType(b = db.profile.body) {
  const bust = +b.bust, waist = +b.waist, hip = +b.hip, sh = +b.shoulder;
  if (!bust || !waist || !hip) return null;
  const upper = sh ? (bust + sh * 2.3) / 2 : bust;
  const r = upper / hip;
  if (waist >= upper * 0.95 || waist >= hip * 0.95) return 'O';
  if (r > 1.05) return 'V';
  if (r < 0.95) return 'A';
  if (waist / hip <= 0.78 && waist / upper <= 0.8) return 'X';
  return 'H';
}
function heightCat(b = db.profile.body) {
  const h = +b.height;
  if (!h) return null;
  const [lo, hi] = db.profile.pref === 'm' ? [168, 182] : db.profile.pref === 'f' ? [157, 170] : [160, 177];
  return h < lo ? 'short' : h > hi ? 'tall' : 'mid';
}
function userStyles() { return db.profile.styles || []; }
// 이번 계절 + 두 달 뒤 계절 (미리 준비할 옷)
function upcomingSeasons(d = new Date()) {
  const of = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'fall' : 'winter');
  const m = d.getMonth() + 1;
  return [...new Set([of(m), of((m + 1) % 12 + 1)])];
}

// ── 옷 속성 ──
const itemW = (it) => (SUB[it.sub]?.w || 0) + (THICKS.find(t => t.id === it.thick)?.adj || 0) * ((SUB[it.sub]?.w || 0) > 0 ? 1 : 0);
const itemLeg = (it) => SUB[it.sub]?.leg ?? 2;
const itemF = (it) => SUB[it.sub]?.f ?? 2;
const itemStyles = (it) => (it.styles && it.styles.length ? it.styles : SUB[it.sub]?.st || []);
const colorName = (it) => COLOR[mainColor(it).id]?.name || '';
const Lof = (it) => hexLab(mainColor(it).hex)[0];

function seededRand(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// 코디(슬롯 → 옷)
function outfitFromIds(ids) {
  const o = {};
  for (const id of ids) {
    const it = itemById(id);
    if (!it) continue;
    if (it.cat === 'acc') { if (it.sub === 'scarf') o.scarf = it; else if (it.sub === 'belt') o.belt = it; else (o.accs || (o.accs = [])).push(it); }
    else o[it.cat] = it;
  }
  return o;
}
const outfitIds = (o) => ['hat', 'outer', 'top', 'dress', 'bottom', 'shoes', 'bag', 'scarf', 'belt'].map(k => o[k]?.id).filter(Boolean).concat((o.accs || []).map(a => a.id));

function makeCtx({ day = today(), occasion = db.ui.occasion || 'daily', wx, tuck = false, seed = '', jitter = 0, fresh = true } = {}) {
  return {
    day, tuck, fresh, jitter,
    wx: wx === undefined ? Weather.day(day) : wx,
    occ: OCCASIONS.find(o => o.id === occasion) || OCCASIONS[0],
    styles: userStyles(),
    bt: bodyType(), hc: heightCat(),
    pc: db.profile.pcolor?.season || null,
    seed,
  };
}

// ── 코디 점수 ──
function scoreOutfit(o, C) {
  const R = { s: 0, good: [], warn: [], styleId: null };
  const add = (p, t) => { R.s += p; if (t) (p >= 0 ? R.good : R.warn).push({ p: Math.abs(p), t }); };
  const core = [o.top, o.bottom, o.dress, o.outer].filter(Boolean);
  const visible = [...core, o.shoes].filter(Boolean);
  if (!core.length) return R;

  // 1) 색 조합
  const accents = new Map();
  for (const it of visible) {
    const c = mainColor(it), n = COLOR[c.id]?.n ?? 0;
    if (n < 1) accents.set(c.id, n === 0.5 ? 0.5 : 1);
  }
  const accW = [...accents.values()].reduce((a, b) => a + b, 0);
  const strong = [...accents.entries()].filter(([, v]) => v === 1).map(([k]) => k);
  if (accW === 0) add(18, '무채색으로 깔끔하게 맞춘 조합');
  else if (accW <= 1) {
    const nm = COLOR[[...accents.keys()][0]]?.name;
    add(24, strong.length ? `${josa(nm, '으로')} 포인트를 하나만 줘서 세련돼요` : `${nm} 톤이 차분하게 어우러져요`);
  } else if (accW <= 2) {
    if (strong.length >= 2) {
      const d = hueDiff(hexHsl(COLOR[strong[0]].hex)[0], hexHsl(COLOR[strong[1]].hex)[0]);
      if (d < 35) add(15, '비슷한 계열 색이라 자연스러워요');
      else if (d > 150) add(6, '보색 대비가 과감한 조합이에요');
      else add(-6, '포인트 색이 두 가지라 산만해 보일 수 있어요');
    } else add(17, '흙빛 색과 포인트가 잘 어울려요');
  } else add(-10, '색이 많아요. 한두 개는 무채색으로 바꿔 보세요');

  const ids = core.map(it => mainColor(it).id);
  const earth = ['beige', 'ivory', 'camel', 'brown', 'white', 'khaki'];
  if (core.length >= 2 && ids.every(id => earth.includes(id)) && new Set(ids).size >= 2) add(5, '베이지·브라운 톤온톤');

  const topLike = o.dress || o.top;
  if (o.top && o.bottom) {
    const a = mainColor(o.top), b = mainColor(o.bottom);
    if (a.id === b.id) {
      if (a.id === 'black' && C.styles.some(s => s === 'chic' || s === 'minimal')) add(4, '올블랙으로 시크하게');
      else if (a.id !== 'black' && a.id !== 'denim') add(-3, '상·하의 색이 똑같아 밋밋할 수 있어요');
      else if (a.id === 'denim') add(-4, '청청 조합은 톤 차이를 두면 더 좋아요');
    }
  }
  const patterned = visible.filter(it => it.pattern && it.pattern !== 'solid').length;
  if (patterned > 1) add(-10, '무늬 있는 옷이 두 개라 복잡해 보여요');

  // 2) 날씨
  if (C.wx) {
    const wx = C.wx;
    const upper = (o.dress ? itemW(o.dress) : o.top ? itemW(o.top) : 0) + (o.scarf ? itemW(o.scarf) : 0);
    const full = upper + (o.outer ? itemW(o.outer) : 0);
    const tMorning = targetWarmth(wx.feelMin + 1), tNoon = targetWarmth(wx.feelMax);
    const dM = full - tMorning, dN = (o.outer ? upper : full) - tNoon;
    const pen = (d) => d < 0 ? -d * 7 : d * 3.5;
    const wpts = clamp(22 - (pen(dM) * 0.6 + pen(dN) * 0.4), -22, 22);
    let wtext = '';
    if (dM < -1.3) wtext = '';
    else if (Math.abs(dM) <= 1.2 && Math.abs(dN) <= 1.6) wtext = `${wx.min}°~${wx.max}° 날씨에 딱 맞는 두께예요`;
    add(Math.round(wpts), wtext);
    if (dM < -1.3) add(-2, `아침 체감 ${Math.round(wx.feelMin)}°엔 추울 수 있어요${o.outer ? '' : ' — 겉옷을 챙기세요'}`);
    else if (dN > 2 && !o.outer) add(-2, '낮에는 조금 더울 수 있어요');
    if (o.outer && wx.feelMax - wx.feelMin >= 7 && wx.feelMax >= 15 && dN <= 1.6) add(3, '일교차가 커서 낮에 벗기 쉬운 겉옷이 좋아요');
    if (o.outer && wx.feelMin >= 25) add(-10, '더운 날이라 겉옷은 빼는 게 좋아요');
    const leg = o.dress ? itemLeg(o.dress) : o.bottom ? itemLeg(o.bottom) : 2;
    if (wx.feel < 12 && leg < 1) add(-14, '짧은 하의는 쌀쌀해요');
    else if (wx.feel < 17 && leg === 0) add(-7, '짧은 하의는 조금 쌀쌀할 수 있어요');
    if (wx.feelMax >= 27 && leg < 1) add(4, '더운 날 시원한 하의');
    else if (wx.feelMax >= 29 && leg >= 2) add(-3, '');
    if (o.shoes) {
      const s = o.shoes.sub;
      if (s === 'sandals' && wx.feelMax < 20) add(-12, '샌들은 쌀쌀해요');
      if (s === 'boots' && wx.feelMax > 22) add(-8, '부츠는 더울 수 있어요');
      if (wx.rainy || wx.snowy) {
        if (s === 'boots') add(4, `${wx.snowy ? '눈' : '비'} 오는 날엔 부츠가 든든해요`);
        if (s === 'sandals' && wx.snowy) add(-10, '');
        if (s === 'sneakers' && Lof(o.shoes) > 82) add(-3, '비 오는 날 흰 신발은 얼룩 주의');
      }
    }
    if ((wx.rainy || wx.snowy) && o.bottom && Lof(o.bottom) > 85) add(-2, '');
    if (wx.feel <= 6 && !o.scarf && C.scarfAvail) add(-2, '머플러를 두르면 훨씬 따뜻해요');
    if (o.scarf && wx.feel > 12) add(-6, '');
  }

  // 3) 스타일
  const sItems = [...core, o.shoes].filter(Boolean);
  if (C.styles.length) {
    const hit = sItems.filter(it => itemStyles(it).some(s => C.styles.includes(s))).length / sItems.length;
    const names = C.styles.slice(0, 2).map(s => STYLE[s]?.name).join('·');
    add(Math.round(hit * 16), hit >= 0.75 ? `원하는 ${names} 스타일에 맞아요` : '');
  }
  const cnt = {};
  sItems.forEach(it => itemStyles(it).forEach(s => cnt[s] = (cnt[s] || 0) + 1));
  const ranked = Object.entries(cnt).sort((a, b) => b[1] - a[1] || (C.styles.includes(b[0]) - C.styles.includes(a[0])));
  if (ranked.length) {
    const top = ranked.find(([s, n]) => n === ranked[0][1] && C.styles.includes(s)) || ranked[0];
    R.styleId = top[0];
    add(Math.round(top[1] / sItems.length * 8));
  }

  // 4) 격식
  const fs = sItems.map(itemF);
  const mean = fs.reduce((a, b) => a + b, 0) / fs.length;
  const [lo, hi] = C.occ.f;
  const off = mean < lo ? lo - mean : mean > hi ? mean - hi : 0;
  if (off === 0) add(6);
  else add(-Math.round(off * 8), off > 0.6 ? (mean < lo ? `${C.occ.name}엔 조금 캐주얼해요` : `${C.occ.name}엔 조금 차려입은 느낌이에요`) : '');
  if (Math.max(...fs) - Math.min(...fs) > 3.2) add(-6, '격식이 아주 다른 옷이 섞여 있어요');
  if (C.occ.id === 'sport' && !sItems.some(it => itemStyles(it).includes('sporty'))) add(-6, '운동하기엔 불편할 수 있어요');

  // 5) 체형
  if (C.bt) {
    const top = topLike, bot = o.bottom;
    const Lt = top ? Lof(top) : 50, Lb = bot ? Lof(bot) : 50;
    const T = BODY_TYPES[C.bt].name;
    const structured = o.outer && ['jacket', 'trench', 'denimjk', 'leather'].includes(o.outer.sub);
    if (C.bt === 'A') {
      if (bot && Lt > Lb + 12) add(5, `밝은 상의·어두운 하의로 시선을 위로 (${T})`);
      if (bot && bot.fit === 'slim' && Lb > 60) add(-5, '밝고 붙는 하의는 하체를 강조해요');
      if (bot && (bot.fit === 'over' || ['cargo', 'skirt', 'slacks'].includes(bot.sub))) add(2);
      if (structured) add(2, '어깨에 구조감 있는 아우터가 균형을 잡아 줘요');
    } else if (C.bt === 'V') {
      if (bot && Lb >= Lt - 5) add(4, `하의를 밝게 해서 상·하체 균형 (${T})`);
      if (bot && (bot.fit === 'over' || ['cargo', 'skirt', 'cotton'].includes(bot.sub))) add(3, '볼륨 있는 하의로 균형');
      if (top && top.pattern === 'stripe') add(-4, '가로 줄무늬 상의는 어깨를 넓어 보이게 해요');
    } else if (C.bt === 'H') {
      if (o.outer) add(3, `레이어드로 입체감 (${T})`);
      if (o.belt) add(3, '벨트로 허리선을 만들어요');
      if (C.tuck && o.top) add(3, '넣어 입어서 허리선이 생겨요');
    } else if (C.bt === 'X') {
      if (top && top.fit !== 'over') add(3, `몸에 맞는 핏이 굴곡을 살려요 (${T})`);
      if (top && bot && top.fit === 'over' && bot.fit === 'over') add(-5, '위아래 모두 오버핏이라 라인이 묻혀요');
      if (o.dress || o.belt || (C.tuck && o.top)) add(2);
    } else if (C.bt === 'O') {
      if (top && bot && Math.abs(Lt - Lb) < 15) add(5, `위아래 비슷한 톤으로 길어 보여요 (${T})`);
      if (o.outer && ['coat', 'trench', 'cardigan', 'jacket'].includes(o.outer.sub)) add(3, '긴 아우터를 열어 입으면 세로 라인이 생겨요');
      if (top && top.fit === 'slim') add(-4, '붙는 상의보다 여유 있는 핏이 좋아요');
      if (o.belt) add(-2, '');
    }
  }
  if (C.hc === 'short' && core.length >= 2) {
    const Ls = core.map(Lof);
    if (Math.max(...Ls) - Math.min(...Ls) < 20) add(3, '톤을 맞춰서 키가 커 보여요');
  } else if (C.hc === 'tall' && o.outer && ['coat', 'trench'].includes(o.outer.sub)) add(2, '긴 코트가 잘 어울리는 키예요');

  // 6) 퍼스널컬러 (얼굴 가까운 옷)
  if (C.pc && topLike) {
    const P = PCOLORS[C.pc];
    const f = pcFit(mainColor(topLike).hex, C.pc);
    if (f === 'good') add(6, `${P.short}에 잘 받는 ${colorName(topLike)} ${o.dress ? '원피스' : '상의'}`);
    else if (f === 'bad') add(-4, `${josa(colorName(topLike), '은는')} ${P.short}에겐 얼굴이 칙칙해 보일 수 있어요`);
    if (o.outer) { const fo = pcFit(mainColor(o.outer).hex, C.pc); if (fo === 'good') add(2); else if (fo === 'bad') add(-2); }
  }

  // 7) 최근 착용
  if (C.fresh) {
    for (const it of core) {
      const d = daysSinceWorn(it, C.day);
      if (d !== null && d >= 0 && d <= 1) add(-7, `${josa(itemName(it), '은는')} ${d === 0 ? '오늘' : '어제'} 입었어요`);
      else if (d !== null && d > 1 && d <= 3) add(-3);
      else if ((d === null && daysOwned(it, C.day) >= 21) || (d !== null && d >= 30)) add(2, `오랜만에 꺼내는 ${itemName(it)}`);
    }
  }

  if (C.jitter) add(C.rand() * C.jitter);
  return R;
}

function maxScore(C) {
  return 29 + (C.wx ? 26 : 0) + (C.styles.length ? 24 : 8) + 6 + (C.bt ? 8 : 0) + (C.hc ? 3 : 0) + (C.pc ? 8 : 0);
}
function gradeOf(pct) {
  if (pct >= 85) return '아주 잘 어울려요';
  if (pct >= 70) return '잘 어울려요';
  if (pct >= 55) return '괜찮아요';
  return '조금 아쉬워요';
}
function finishScore(R, C) {
  const pct = clamp(Math.round(100 * R.s / maxScore(C)), 0, 99);
  return {
    score: pct, grade: gradeOf(pct), styleId: R.styleId,
    good: R.good.sort((a, b) => b.p - a.p).slice(0, 3).map(g => g.t),
    warn: R.warn.sort((a, b) => b.p - a.p).slice(0, 2).map(g => g.t),
  };
}

const Stylist = {
  // 지금 입은(고른) 코디 평가
  evaluate(ids, opts = {}) {
    const C = makeCtx({ ...opts, fresh: opts.fresh ?? false });
    C.scarfAvail = activeItems().some(i => i.sub === 'scarf');
    const o = outfitFromIds(ids);
    if (!o.top && !o.bottom && !o.dress && !o.outer) return null;
    return finishScore(scoreOutfit(o, C), C);
  },

  // 코디 추천
  recommend({ day = today(), occasion, count = 3, seed = 0, force = null } = {}) {
    const C = makeCtx({ day, occasion, jitter: 7 });
    const pool = activeItems();
    const by = (cat) => pool.filter(i => i.cat === cat);
    let tops = by('top'), bottoms = by('bottom'), dresses = by('dress'), outers = by('outer');
    const shoes = by('shoes'), bags = by('bag'), hats = by('hat');
    const scarves = pool.filter(i => i.sub === 'scarf'), belts = pool.filter(i => i.sub === 'belt');
    C.scarfAvail = scarves.length > 0;
    const f = force ? itemById(force) : null;
    if (f) {
      if (f.cat === 'top') { tops = [f]; dresses = []; }
      else if (f.cat === 'bottom') { bottoms = [f]; dresses = []; }
      else if (f.cat === 'dress') { tops = []; dresses = [f]; }
      else if (f.cat === 'outer') outers = [f];
    }
    const rnd = (ids) => seededRand(`${day}|${seed}|${ids}`);
    const scoreWith = (o) => { C.rand = rnd(outfitIds(o).join(',')); return scoreOutfit(o, C).s; };

    const bases = [];
    for (const t of tops) for (const b of bottoms) bases.push({ o: { top: t, bottom: b } });
    for (const d of dresses) bases.push({ o: { dress: d } });
    if (!bases.length) return [];
    bases.forEach(b => b.s = scoreWith(b.o));
    bases.sort((a, b) => b.s - a.s);
    const wx = C.wx;
    const results = [];
    for (const base of bases.slice(0, 60)) {
      let best = { ...base.o };
      // 아우터: 없는 것과 비교해 더 나은 걸로 (특정 아우터로 추천할 땐 반드시 포함)
      if (outers.length) {
        let bs = f && f.cat === 'outer' ? -1e9 : scoreWith(best), bo = null;
        for (const ot of outers) { const s = scoreWith({ ...best, outer: ot }); if (s > bs) { bs = s; bo = ot; } }
        if (bo) best.outer = bo;
      }
      if (wx && wx.feel <= 6 && scarves.length) {
        let bs = scoreWith(best), bsc = null;
        for (const sc of scarves) { const s = scoreWith({ ...best, scarf: sc }); if (s > bs) { bs = s; bsc = sc; } }
        if (bsc) best.scarf = bsc;
      }
      if (shoes.length) {
        let bs = -1e9, bsh = null;
        for (const sh of shoes) { const s = scoreWith({ ...best, shoes: sh }); if (s > bs) { bs = s; bsh = sh; } }
        best.shoes = bsh;
      }
      if (bags.length) best.bag = this.pickAcc(bags, best, C);
      if (belts.length && best.bottom && (C.bt === 'H' || C.bt === 'X') && itemF(best.bottom) >= 1.5) best.belt = this.pickAcc(belts, best, C);
      if (hats.length) {
        const r = rnd('hat' + outfitIds(best).join(','))();
        const okHat = hats.filter(h => !(h.sub === 'beanie' && wx && wx.feel > 12) && !(h.sub === 'buckethat' && wx && wx.feel < 8));
        const casual = C.occ.id === 'daily' || C.occ.id === 'sport';
        if (okHat.length && casual && r < 0.35) best.hat = this.pickAcc(okHat, best, C);
      }
      results.push({ o: best, s: scoreWith(best) });
    }
    results.sort((a, b) => b.s - a.s);
    // 서로 다른 코디로 고르기
    const picked = [];
    const overlap = (a, b) => ['top', 'bottom', 'dress'].some(k => a[k] && b[k] && a[k].id === b[k].id);
    for (const r of results) { if (picked.length >= count) break; if (!picked.some(p => overlap(p.o, r.o))) picked.push(r); }
    for (const r of results) { if (picked.length >= count) break; if (!picked.includes(r) && !picked.some(p => outfitIds(p.o).join() === outfitIds(r.o).join())) picked.push(r); }
    return picked.map(r => {
      C.rand = () => 0; const C2 = { ...C, jitter: 0 };
      const fin = finishScore(scoreOutfit(r.o, C2), C2);
      return { ids: outfitIds(r.o), ...fin };
    });
  },

  pickAcc(list, o, C) {
    const core = [o.top, o.bottom, o.dress, o.outer].filter(Boolean);
    const f = core.reduce((a, it) => a + itemF(it), 0) / core.length;
    let best = null, bs = -1e9;
    for (const it of list) {
      let s = -Math.abs(itemF(it) - f) * 2;
      if (itemStyles(it).some(x => C.styles.includes(x))) s += 2;
      if (isNeutral(mainColor(it))) s += 1.5;
      s += seededRand(it.id + C.day)() * 1.5;
      if (s > bs) { bs = s; best = it; }
    }
    return best;
  },

  // 두 옷이 같이 입을 만한지 (날씨 빼고 색·무늬·격식만)
  pairOk(a, b) {
    const ca = mainColor(a), cb = mainColor(b);
    const na = COLOR[ca.id]?.n ?? 0, nb = COLOR[cb.id]?.n ?? 0;
    if (a.pattern && a.pattern !== 'solid' && b.pattern && b.pattern !== 'solid') return false;
    if (Math.abs(itemF(a) - itemF(b)) > 3) return false;
    if (na === 0 && nb === 0 && ca.id !== cb.id) {
      const d = hueDiff(hexHsl(ca.hex)[0], hexHsl(cb.hex)[0]);
      if (d >= 35 && d <= 150) return false;
    }
    if (ca.id === cb.id && ca.id === 'denim' && a.cat !== b.cat) return false;
    return true;
  },

  combosFor(items) {
    const tops = items.filter(i => i.cat === 'top'), bottoms = items.filter(i => i.cat === 'bottom');
    let n = items.filter(i => i.cat === 'dress').length;
    for (const t of tops) for (const b of bottoms) if (this.pairOk(t, b)) n++;
    return n;
  },

  // 가상의 옷 하나를 더하면 새로 생기는 코디 수
  gainOf(v, items = db.items.filter(i => i.status !== 'gone')) {
    const tops = items.filter(i => i.cat === 'top'), bottoms = items.filter(i => i.cat === 'bottom'), dresses = items.filter(i => i.cat === 'dress');
    if (v.cat === 'top') return bottoms.filter(b => this.pairOk(v, b)).length;
    if (v.cat === 'bottom') return tops.filter(t => this.pairOk(t, v)).length;
    if (v.cat === 'dress') return 1 + items.filter(i => i.cat === 'outer' || i.cat === 'shoes').filter(x => this.pairOk(v, x)).length;
    // 아우터·신발·가방: 지금 가능한 기본 코디 중 같이 입을 수 있는 수
    let n = 0;
    for (const t of tops) for (const b of bottoms) if (this.pairOk(t, b) && this.pairOk(v, t) && this.pairOk(v, b)) n++;
    n += dresses.filter(d => this.pairOk(v, d)).length;
    return n;
  },

  // ── 옷장 분석 ──
  analyze() {
    const items = db.items;
    const byCat = Object.fromEntries(CATS.map(c => [c.id, 0]));
    items.forEach(i => byCat[i.cat]++);
    const colors = {};
    items.filter(i => ['top', 'bottom', 'outer', 'dress'].includes(i.cat)).forEach(i => { const c = mainColor(i).id; colors[c] = (colors[c] || 0) + 1; });
    const clothes = items.filter(i => ['top', 'bottom', 'outer', 'dress'].includes(i.cat));
    const neutralN = clothes.filter(i => isNeutral(mainColor(i))).length;
    const styleW = {};
    const addStyles = (it, w) => { const st = itemStyles(it); st.forEach(s => styleW[s] = (styleW[s] || 0) + w / st.length); };
    items.filter(i => i.cat !== 'acc').forEach(it => addStyles(it, 1));
    const totalW = Object.values(styleW).reduce((a, b) => a + b, 0) || 1;
    const styles = Object.entries(styleW).map(([id, w]) => ({ id, pct: w / totalW })).sort((a, b) => b.pct - a.pct);
    // 실제로 입은 스타일 (최근 90일)
    const worn = {};
    const from = addDays(today(), -90);
    for (const [day, w] of Object.entries(db.wears)) {
      if (day < from) continue;
      (w.items || []).map(itemById).filter(Boolean).filter(i => i.cat !== 'acc').forEach(it => { const st = itemStyles(it); st.forEach(s => worn[s] = (worn[s] || 0) + 1 / st.length); });
    }
    const wornTotal = Object.values(worn).reduce((a, b) => a + b, 0);
    const wornStyles = wornTotal ? Object.entries(worn).map(([id, w]) => ({ id, pct: w / wornTotal })).sort((a, b) => b.pct - a.pct) : [];
    const prefs = userStyles();
    const desiredPct = prefs.length ? prefs.reduce((a, s) => a + (styles.find(x => x.id === s)?.pct || 0), 0) : null;
    const pc = db.profile.pcolor?.season;
    let pcGood = 0, pcBad = 0, pcTotal = 0;
    if (pc) clothes.filter(i => i.cat !== 'bottom').forEach(i => { pcTotal++; const f = pcFit(mainColor(i).hex, pc); if (f === 'good') pcGood++; if (f === 'bad') pcBad++; });
    const combos = this.combosFor(items);
    const notes = [];
    const t = byCat.top, b = byCat.bottom;
    if (t + b > 0) {
      if (b === 0) notes.push('하의가 없어서 코디를 만들 수 없어요. 하의를 먼저 등록해 주세요.');
      else if (t / b > 4) notes.push(`상의 ${t}벌에 하의 ${b}벌이에요. 무난한 하의 한두 벌만 늘려도 코디가 크게 늘어요.`);
      else if (b / Math.max(t, 1) > 2) notes.push(`하의에 비해 상의(${t}벌)가 적어요. 기본 티셔츠·셔츠를 더해 보세요.`);
    }
    if (clothes.length >= 6 && neutralN / clothes.length < 0.4) notes.push('포인트 색 옷이 많아요. 무채색 기본템이 있으면 조합이 쉬워져요.');
    if (clothes.length >= 6 && neutralN / clothes.length > 0.9) notes.push('거의 무채색이에요. 퍼스널컬러에 맞는 포인트 색 하나로 분위기를 바꿔 보세요.');
    if (byCat.shoes === 0 && clothes.length) notes.push('신발을 등록하면 코디 완성도까지 봐 드려요.');
    if (pc && pcTotal >= 4 && pcBad / pcTotal > 0.35) notes.push(`상의·아우터 중 ${PCOLORS[pc].short}와 덜 맞는 색이 ${Math.round(pcBad / pcTotal * 100)}%예요. 얼굴 가까이엔 잘 받는 색을 두고 하의로 돌려 입어 보세요.`);
    if (prefs.length && desiredPct !== null && desiredPct < 0.35 && items.length >= 8) notes.push(`원하는 스타일(${prefs.map(s => STYLE[s].name).join(', ')})과 지금 옷장이 아직 거리가 있어요. 쇼핑 탭의 '스타일 핵심템'을 참고하세요.`);
    if (wornStyles.length && styles.length && wornStyles[0].id !== styles[0].id) notes.push(`가진 옷은 ${STYLE[styles[0].id]?.name} 위주인데, 실제로는 ${STYLE[wornStyles[0].id]?.name} 옷을 더 자주 입어요.`);
    return {
      total: items.length, byCat, colors: Object.entries(colors).sort((a, b) => b[1] - a[1]),
      neutralPct: clothes.length ? neutralN / clothes.length : 0,
      styles, wornStyles, desiredPct, pc, pcGood, pcBad, pcTotal, combos, notes,
      typeName: styles.length ? styles.slice(0, styles[1] && styles[1].pct > 0.18 ? 2 : 1).map(s => STYLE[s.id].name).join(' + ') : '',
    };
  },

  // ── 기본템 체크 ──
  basics() {
    const pref = db.profile.pref;
    const pc = db.profile.pcolor?.season;
    const need = upcomingSeasons();
    return BASICS.filter(b => !b.only || pref !== (b.only === 'f' ? 'm' : 'f')).map(b => {
      const sub = SUB[b.sub];
      const owned = db.items.find(it => it.sub === b.sub && b.colors.includes(mainColor(it).id));
      let pick = b.colors[0];
      if (pc) pick = b.colors.find(c => pcFit(COLOR[c].hex, pc) === 'good') || b.colors.find(c => pcFit(COLOR[c].hex, pc) !== 'bad') || pick;
      const v = { cat: sub.cat, sub: b.sub, colors: [{ id: pick, hex: COLOR[pick].hex }], pattern: 'solid', fit: 'regular' };
      if (owned) return { ...b, owned, pick, gain: 0, rank: 0, note: '' };
      // 상의·하의·원피스는 새로 생기는 코디 수로, 나머지는 '없는 종류인지·곧 필요한 계절인지'로 순서를 매김
      if (['top', 'bottom', 'dress'].includes(sub.cat)) {
        const gain = this.gainOf(v);
        return { ...b, pick, gain, rank: gain * 2 + (sub.se || []).some(s => need.includes(s)) * 2, note: '' };
      }
      const same = sub.cat === 'acc' ? db.items.filter(i => i.sub === b.sub) : db.items.filter(i => i.cat === sub.cat);
      const seasonal = (sub.se || []).some(s => need.includes(s)) && (sub.se || []).length < 4;
      const haveSeason = same.some(i => (SUB[i.sub]?.se || []).some(s => need.includes(s)) && Math.abs((SUB[i.sub]?.w || 0) - (sub.w || 0)) <= 1);
      let rank = 0, note = '';
      if (!same.length) { rank += 30; note = `${josa(sub.cat === 'acc' ? sub.name : CAT_NAME[sub.cat], '이가')} 아직 없어요`; }
      if (seasonal && !haveSeason) { rank += 20; note = note || `다가오는 ${need.map(s => SEASONS.find(x => x.id === s).name).join('·')}에 필요해요`; }
      else if (seasonal) rank += 4;
      return { ...b, pick, gain: 0, rank: rank + Math.min(6, this.gainOf(v) / 4), note };
    });
  },

  // 원하는 스타일 핵심템 중 없는 것
  styleKeys() {
    const own = new Set(db.items.map(i => i.sub));
    const pref = db.profile.pref;
    return userStyles().map(s => ({
      style: s,
      missing: STYLE[s].keys.filter(k => !own.has(k) && !(SUB[k].only && pref === 'm' && SUB[k].only === 'f')),
      have: STYLE[s].keys.filter(k => own.has(k)),
    }));
  },

  // 퍼스널컬러 팔레트 중 옷장에 없는 색
  colorPicks() {
    const pc = db.profile.pcolor?.season;
    if (!pc) return [];
    const owned = new Set(db.items.filter(i => i.cat !== 'bottom').map(i => mainColor(i).id));
    const seen = new Set();
    return PCOLORS[pc].good.map(hex => ({ hex, c: nearestColor(hex) }))
      .filter(x => { if (seen.has(x.c.id) || owned.has(x.c.id)) return false; seen.add(x.c.id); return true; })
      .slice(0, 6);
  },

  // ── 체형 메모 (한 벌 기준) ──
  bodyNote(it) {
    const bt = bodyType();
    if (!bt) return null;
    const L = Lof(it);
    if (bt === 'A' && it.cat === 'bottom' && it.fit === 'slim' && L > 60) return { ok: false, t: '밝고 붙는 하의는 하체가 강조돼요' };
    if (bt === 'A' && it.cat === 'top' && (L > 65 || it.pattern !== 'solid')) return { ok: true, t: '밝은·무늬 상의는 시선을 위로 올려 줘요' };
    if (bt === 'V' && it.cat === 'top' && it.pattern === 'stripe') return { ok: false, t: '가로 줄무늬 상의는 어깨를 넓어 보이게 해요' };
    if (bt === 'V' && it.cat === 'bottom' && (it.fit === 'over' || ['cargo', 'skirt'].includes(it.sub))) return { ok: true, t: '볼륨 있는 하의가 상체와 균형을 맞춰요' };
    if (bt === 'O' && it.cat === 'top' && it.fit === 'slim') return { ok: false, t: '배에 붙는 상의는 피하는 게 좋아요' };
    if (bt === 'O' && it.cat === 'outer' && ['coat', 'trench', 'cardigan'].includes(it.sub)) return { ok: true, t: '긴 아우터가 세로 라인을 만들어요' };
    if (bt === 'X' && it.fit === 'over' && it.cat !== 'outer') return { ok: false, t: '너무 박시하면 굴곡이 묻혀요' };
    if (bt === 'X' && (it.cat === 'dress' || it.sub === 'belt')) return { ok: true, t: '허리 라인을 살리기 좋아요' };
    if (bt === 'H' && (it.sub === 'belt' || it.cat === 'outer')) return { ok: true, t: '허리선·레이어드로 입체감을 줘요' };
    return null;
  },

  // ── 위시리스트 판단 ──
  wishCheck(w) {
    const v = { cat: w.cat, sub: w.sub, colors: w.colors && w.colors.length ? w.colors : [{ id: 'gray', hex: COLOR.gray.hex }], pattern: w.pattern || 'solid', fit: w.fit || 'regular' };
    const gain = this.gainOf(v);
    const mc = mainColor(v);
    const similar = db.items.filter(it => it.sub === v.sub && (mainColor(it).id === mc.id || labDist(hexLab(mainColor(it).hex), hexLab(mc.hex)) < 14));
    const pc = db.profile.pcolor?.season;
    const pcf = pc && v.cat !== 'bottom' && v.cat !== 'shoes' ? pcFit(mc.hex, pc) : null;
    const prefs = userStyles();
    const styleHit = prefs.length ? (SUB[v.sub]?.st || []).some(s => prefs.includes(s)) : null;
    const body = this.bodyNote(v);
    let pts = 0;
    const why = [];
    const core = ['top', 'bottom', 'dress'].includes(v.cat);
    const gt = core ? `내 옷장과 새 코디 ${gain}개` : `지금 코디 ${gain}개와 어울려요`;
    if (gain >= 5) { pts += 2; why.push({ ok: true, t: gt }); }
    else if (gain >= 2) { pts += 1; why.push({ ok: true, t: gt }); }
    else { pts -= 2; why.push({ ok: false, t: gain ? `같이 입을 옷이 ${gain}개뿐이에요` : '지금 옷장과 같이 입을 옷이 거의 없어요' }); }
    if (!core && !db.items.some(i => i.cat === v.cat)) { pts += 1; why.push({ ok: true, t: `${josa(CAT_NAME[v.cat], '이가')} 아직 없어서 쓸모가 커요` }); }
    if (similar.length) { pts -= 2; why.push({ ok: false, t: `비슷한 옷이 이미 ${similar.length}벌 있어요` }); }
    if (pcf === 'good') { pts += 1; why.push({ ok: true, t: `${PCOLORS[pc].short}에 잘 받는 색` }); }
    if (pcf === 'bad') { pts -= 1; why.push({ ok: false, t: `${PCOLORS[pc].short}에는 덜 어울리는 색` }); }
    if (styleHit === true) { pts += 1; why.push({ ok: true, t: '원하는 스타일과 맞아요' }); }
    if (styleHit === false) { pts -= 1; why.push({ ok: false, t: '원하는 스타일과는 조금 달라요' }); }
    if (body) { pts += body.ok ? 1 : -1; why.push(body); }
    const verdict = pts >= 2 ? 'buy' : pts >= 0 ? 'think' : 'skip';
    return { gain, similar, verdict, why };
  },

  // ── 안 입는 옷 ──
  unused(days = 60) {
    return db.items.map(it => {
      const d = daysSinceWorn(it);
      const owned = daysOwned(it);
      const stale = d !== null ? d : owned;
      return { it, d, owned, stale };
    }).filter(x => x.it.cat !== 'acc' && ((x.d !== null && x.d >= days) || (x.d === null && x.owned >= 30)))
      .sort((a, b) => b.stale - a.stale);
  },
};
