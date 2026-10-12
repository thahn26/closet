// 내 치수로 만드는 2D 마네킹 + 옷 사진 겹쳐 입히기
const MQ_W = 400, MQ_H = 780, MQ_TOP = 34, MQ_FIG = 712;

function defaultBody() {
  const p = db.profile.pref;
  if (p === 'm') return { height: 174, weight: 68, shoulder: 45, bust: 96, waist: 80, hip: 95 };
  if (p === 'f') return { height: 162, weight: 54, shoulder: 38, bust: 84, waist: 66, hip: 91 };
  return { height: 168, weight: 60, shoulder: 41, bust: 89, waist: 72, hip: 93 };
}

// 체형 기준점 계산
function bodyGeometry(b0 = db.profile.body) {
  const d = defaultBody();
  const num = (v, def) => (+v > 0 ? +v : def);
  const b = {
    height: num(b0.height, d.height), weight: num(b0.weight, 0),
    shoulder: num(b0.shoulder, d.shoulder), bust: num(b0.bust, d.bust), waist: num(b0.waist, d.waist), hip: num(b0.hip, d.hip),
    legRatio: b0.legRatio || null,
  };
  const k = MQ_FIG / b.height;               // cm → px
  const cx = MQ_W / 2;
  const Y = (f) => MQ_TOP + f * MQ_FIG;
  const bmi = b.weight ? b.weight / ((b.height / 100) ** 2) : (b.hip / 2.7 / 2) / 17.5 * 21;
  const full = clamp((bmi - 21) / 10, -0.25, 0.7);   // 팔·다리 굵기 보정
  const legR = clamp(b.legRatio || 0.47, 0.42, 0.52);
  const crotchF = 1 - legR;
  const g = {
    k, cx, b, full,
    headTop: Y(0), headH: 0.125 * MQ_FIG, headW: 15.6 * k,
    chin: Y(0.125), neck: Y(0.148), shoulder: Y(0.172), armpit: Y(0.212), bust: Y(0.255),
    waist: Y(0.375), hip: Y(crotchF - 0.045), crotch: Y(crotchF),
    knee: Y(crotchF + (0.955 - crotchF) * 0.52), ankle: Y(0.955), floor: Y(1),
    neckHW: 5.6 * k,
    shHW: b.shoulder / 2 * k,
    bustHW: b.bust / 2.67 / 2 * k,
    waistHW: b.waist / 2.75 / 2 * k,
    hipHW: b.hip / 2.7 / 2 * k,
  };
  g.kneeHW = 5.4 * k * (1 + full * 0.5);
  g.ankleHW = 3.3 * k;
  g.legC = g.hipHW * 0.47;           // 다리 중심선 (가랑이 높이)
  g.legCA = g.hipHW * 0.42 + 0.8 * k; // 발목 높이
  return g;
}

// 점들을 부드러운 곡선으로 (Catmull-Rom → 베지어)
function smoothPath(pts, closed = true) {
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t = p1[2] === 'c' || p2[2] === 'c' ? 0 : 1 / 6; // 'c' = 모서리
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}

function bodySvg(g) {
  const { cx, k } = g;
  // 몸통 + 다리 (왼쪽 절반을 만들고 오른쪽은 대칭)
  const half = [
    [cx - g.neckHW, g.neck - 1 * k],
    [cx - g.neckHW - 2.2 * k, g.neck + 1.6 * k],
    [cx - g.shHW + 3.2 * k, g.shoulder - 0.2 * k],
    [cx - g.shHW + 0.6 * k, g.shoulder + 2 * k],
    [cx - g.shHW, g.shoulder + 4.6 * k],
    [cx - g.bustHW * 1.04, g.armpit + 1 * k],
    [cx - g.bustHW, g.bust],
    [cx - (g.bustHW + g.waistHW) / 2, (g.bust + g.waist) / 2],
    [cx - g.waistHW, g.waist],
    [cx - g.hipHW * 0.97, (g.waist + g.hip) / 2 + 1 * k],
    [cx - g.hipHW, g.hip],
    [cx - g.hipHW * 0.96, g.crotch + 3 * k],
    [cx - g.legC - g.kneeHW * 1.25, (g.crotch + g.knee) / 2],
    [cx - g.legC * 0.92 - g.kneeHW, g.knee],
    [cx - g.legCA - g.kneeHW * 0.92, (g.knee + g.ankle) / 2 - 3 * k],
    [cx - g.legCA - g.ankleHW, g.ankle],
    [cx - g.legCA - g.ankleHW - 2.2 * k, g.floor - 1 * k],
    [cx - g.legCA - g.ankleHW - 1.6 * k, g.floor, 'c'],
    [cx - g.legCA + g.ankleHW + 0.8 * k, g.floor, 'c'],
    [cx - g.legCA + g.ankleHW, g.ankle],
    [cx - g.legCA + g.kneeHW * 0.55, (g.knee + g.ankle) / 2 - 3 * k],
    [cx - g.legC * 0.92 + g.kneeHW * 0.85, g.knee],
    [cx - Math.max(1.2 * k, g.legC - g.kneeHW * 1.1), (g.crotch + g.knee) / 2],
    [cx - 0.6 * k, g.crotch + 1.5 * k],
  ];
  const right = half.slice().reverse().map(([x, y, c]) => [2 * cx - x, y, c]);
  const body = smoothPath([...half, [cx, g.crotch], ...right]);

  // 팔 (살짝 벌린 A자세)
  const arm = (side) => {
    const s = side;  // -1 왼쪽, 1 오른쪽
    const ang = 15 * Math.PI / 180;
    const sx = cx + s * (g.shHW - 2.4 * k), sy = g.shoulder + 3 * k;
    const L1 = g.waist - g.shoulder, L2 = (g.crotch - 1 * k) - g.waist;
    const ex = sx + s * Math.sin(ang) * L1, ey = sy + Math.cos(ang) * L1;
    const wx = ex + s * Math.sin(ang * 0.8) * L2, wy = ey + Math.cos(ang * 0.8) * L2;
    const ua = 4.3 * k * (1 + g.full * 0.6), el = 3.4 * k * (1 + g.full * 0.4), wr = 2.6 * k;
    const nx = Math.cos(ang), ny = -Math.sin(ang);   // 팔에 수직인 바깥 방향 (x는 s를 곱해 씀)
    const pts = [
      [sx + s * 0.8 * k, sy - 1.6 * k],
      [sx + s * (ua * 0.75) * nx, sy + 1 * k],
      [sx + s * (ua + 0.6 * k) * nx, sy + 7 * k],
      [ex + s * el * nx, ey + ny * el],
      [wx + s * wr * nx, wy],
      [wx + s * 2.6 * k, wy + 4.5 * k],
      [wx + s * 0.6 * k, wy + 8.6 * k],
      [wx - s * 1.8 * k, wy + 7 * k],
      [wx - s * wr * nx, wy],
      [ex - s * el * nx, ey - ny * el],
      [sx - s * ua * nx, g.armpit + 3 * k],
      [sx - s * 2 * k, sy + 2 * k],
    ];
    return { d: smoothPath(pts), hand: [wx + s * 0.4 * k, wy + 4.5 * k] };
  };
  const L = arm(-1), Rr = arm(1);
  g.handL = L.hand; g.handR = Rr.hand;
  const headCy = g.headTop + g.headH / 2;
  return `
    <g class="mq-body">
      <path d="${L.d}"/><path d="${Rr.d}"/>
      <rect x="${(cx - g.neckHW).toFixed(1)}" y="${(g.chin - 4 * k).toFixed(1)}" width="${(g.neckHW * 2).toFixed(1)}" height="${(g.neck - g.chin + 6 * k).toFixed(1)}" rx="${(2 * k).toFixed(1)}"/>
      <path d="${body}"/>
      <ellipse cx="${cx}" cy="${headCy.toFixed(1)}" rx="${(g.headW / 2).toFixed(1)}" ry="${(g.headH / 2).toFixed(1)}"/>
    </g>`;
}

// 옷 한 벌의 기본 위치 (x, y 왼쪽 위, w, h)
function garmentBox(it, g) {
  const a = (it.imgH && it.imgW) ? it.imgH / it.imgW : 1.1;
  const wide = a < 0.95;
  const fitK = it.fit === 'over' ? 1.1 : it.fit === 'slim' ? 0.95 : 1;
  const shW = g.shHW * 2, hipW = g.hipHW * 2, k = g.k;
  let w, y, x;
  const cx = g.cx;
  switch (it.cat) {
    case 'top': w = shW * (wide ? 1.75 : 1.3) * fitK; y = g.neck - 2.2 * k; break;
    case 'outer': w = shW * (wide ? 1.85 : 1.42) * fitK; y = g.neck - 3 * k; break;
    case 'dress': w = shW * (wide ? 1.75 : 1.32) * fitK; y = g.neck - 2.2 * k; break;
    case 'bottom': {
      y = g.waist - 1.5 * k;
      const leg = itemLeg(it);
      if (leg >= 2 || it.sub === 'skirt') {
        const target = (it.sub === 'skirt' ? (g.knee + g.ankle) / 2 + 4 * k : g.floor - 2 * k) - y;
        w = clamp(target / a, hipW * 0.9, hipW * 1.9);
      } else w = hipW * 1.12 * fitK;
      break;
    }
    case 'shoes': w = hipW * 1.0; y = g.floor + 2 * k - w * a; break;
    case 'bag': {
      w = (it.sub === 'tote' ? 0.2 : it.sub === 'backpack' ? 0.22 : 0.14) * MQ_FIG;
      const h = w * a;
      x = g.handR[0] - w * 0.35; y = g.handR[1] - h * (it.sub === 'cross' ? 0.55 : 0.25);
      break;
    }
    case 'hat': w = g.headW * 1.5; y = g.headTop - w * a * 0.42; break;
    case 'acc':
      if (it.sub === 'scarf') { w = shW * 0.82; y = g.neck - 4 * k; }
      else if (it.sub === 'belt') { w = g.waistHW * 2 * 1.35; y = g.waist - w * a / 2; }
      else if (it.sub === 'glasses') { w = g.headW * 1.0; y = g.headTop + g.headH * 0.42 - w * a / 2; }
      else { w = 6 * k * 2; y = g.handL[1] - 6 * k; x = g.handL[0] - w / 2; }
      break;
    default: w = shW; y = g.shoulder;
  }
  if (x === undefined) x = cx - w / 2;
  const adj = it.fitAdj || {};
  const s = adj.s || 1;
  const w2 = w * s, h2 = w2 * a;
  x = x - (w2 - w) / 2 + (adj.dx || 0) * shW;
  y = y + (adj.dy || 0) * shW;
  return { x, y, w: w2, h: h2 };
}

const LAYER_ORDER = ['shoes', 'bottom', 'top', 'dress', 'belt', 'outer', 'scarf', 'bag', 'hat', 'glasses', 'acc'];
function layerKey(it) { return it.cat === 'acc' ? (['scarf', 'belt', 'glasses'].includes(it.sub) ? it.sub : 'acc') : it.cat; }

// 마네킹 SVG 문자열 (ids: 입힐 옷, tuck: 상의 넣어 입기)
function mannequinSvg(ids = [], { tuck = false, cls = '', body = db.profile.body, select = null } = {}) {
  const g = bodyGeometry(body);
  const bodyMarkup = bodySvg(g);
  const order = tuck ? ['shoes', 'top', 'bottom', 'dress', 'belt', 'outer', 'scarf', 'bag', 'hat', 'glasses', 'acc'] : LAYER_ORDER;
  const items = ids.map(itemById).filter(Boolean).sort((a, b) => order.indexOf(layerKey(a)) - order.indexOf(layerKey(b)));
  const imgs = items.map(it => {
    const bx = garmentBox(it, g);
    return `<image data-img="${it.id}" data-item="${it.id}" class="mq-item${select === it.id ? ' sel' : ''}" x="${bx.x.toFixed(1)}" y="${bx.y.toFixed(1)}" width="${bx.w.toFixed(1)}" height="${bx.h.toFixed(1)}" preserveAspectRatio="none"/>`;
  }).join('');
  return `<svg class="mq ${cls}" viewBox="0 0 ${MQ_W} ${MQ_H}" xmlns="http://www.w3.org/2000/svg">
    <ellipse class="mq-shadow" cx="${g.cx}" cy="${(g.floor + 4).toFixed(1)}" rx="${(g.hipHW * 1.5).toFixed(1)}" ry="7"/>
    ${bodyMarkup}${imgs}</svg>`;
}

// SVG image[data-img] 에 사진 채우기
function hydrateSvg(root = document) {
  $$('image[data-img]', root).forEach(async (im) => {
    const key = im.dataset.img;
    if (im.dataset.loaded === key) return;
    const u = await imgUrl(key);
    if (u) { im.setAttribute('href', u); im.dataset.loaded = key; }
  });
}
