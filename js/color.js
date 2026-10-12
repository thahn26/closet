// 색 계산: 옷 사진에서 대표색 뽑기, 이름 붙이기, 색 조합·퍼스널컬러 판단
function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

function rgbLab(r, g, b) {
  const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = g3(x); y = g3(y); z = g3(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const hexLab = (hex) => rgbLab(...hexRgb(hex));
function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

// HSL (색상 0-360, 채도·밝기 0-1)
function hexHsl(hex) {
  let [r, g, b] = hexRgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const COLOR_LAB = COLORS.map(c => ({ ...c, lab: hexLab(c.hex) }));
function nearestColor(hex) {
  const lab = hexLab(hex);
  let best = null, bd = 1e9;
  for (const c of COLOR_LAB) {
    // 채도 있는 색이 회색으로 잘못 붙지 않게 a,b 차이에 가중치
    const d = Math.hypot((lab[0] - c.lab[0]) * 0.8, (lab[1] - c.lab[1]) * 1.2, (lab[2] - c.lab[2]) * 1.2);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// 누끼 캔버스에서 대표색 (불투명 픽셀만, k-means)
function extractColors(canvas, k = 4) {
  const w = canvas.width, h = canvas.height;
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 6000)));
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const px = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 200) px.push(rgbLab(data[i], data[i + 1], data[i + 2]));
  }
  if (!px.length) return [];
  // 초기 중심: 밝기 순으로 고르게
  const sorted = [...px].sort((a, b) => a[0] - b[0]);
  let cents = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / k)].slice());
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 10; it++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) {
      let bi = 0, bd = 1e9;
      for (let j = 0; j < cents.length; j++) { const d = labDist(px[i], cents[j]); if (d < bd) { bd = d; bi = j; } }
      assign[i] = bi;
      const s = sum[bi]; s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; s[3]++;
    }
    cents = cents.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c);
  }
  const counts = cents.map((_, j) => assign.filter(a => a === j).length);
  let groups = cents.map((c, j) => ({ lab: c, pct: counts[j] / px.length })).filter(g => g.pct > 0.04);
  // 이름이 같은 색끼리 합치기
  const out = {};
  for (const g of groups) {
    const hex = labHex(g.lab);
    const nc = nearestColor(hex);
    if (!out[nc.id]) out[nc.id] = { id: nc.id, hex, pct: 0 };
    if (g.pct > out[nc.id].pct) out[nc.id].hex = hex;
    out[nc.id].pct += g.pct;
  }
  return Object.values(out).sort((a, b) => b.pct - a.pct).slice(0, 3).map(c => ({ ...c, pct: Math.round(c.pct * 100) / 100 }));
}

function labHex([L, a, b]) {
  let y = (L + 16) / 116, x = a / 500 + y, z = y - b / 200;
  const f = (t) => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  x = f(x) * 0.95047; y = f(y); z = f(z) * 1.08883;
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 + y * -0.2040 + z * 1.0570;
  const gm = (c) => c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c;
  return rgbHex(gm(r) * 255, gm(g) * 255, gm(bl) * 255);
}

// 무늬 추정: 색이 여러 개로 고르게 나뉘면 무늬일 가능성
function guessPattern(colors) {
  if (colors.length >= 2 && colors[1].pct > 0.22 && labDist(hexLab(colors[0].hex), hexLab(colors[1].hex)) > 30) return 'etc';
  return 'solid';
}

// 옷의 대표색 정보
function mainColor(it) {
  const c = it.colors && it.colors[0];
  if (!c) return { id: 'gray', hex: '#8f9094', n: 1 };
  return { ...c, n: COLOR[c.id] ? COLOR[c.id].n : 0 };
}
const isNeutral = (c) => (COLOR[c.id] ? COLOR[c.id].n : 0) >= 1;

// 퍼스널컬러 팔레트와 얼마나 맞는지: 'good' | 'ok' | 'bad'
const pcLabCache = {};
function pcFit(hex, season) {
  const P = PCOLORS[season];
  if (!P) return 'ok';
  const pal = pcLabCache[season] || (pcLabCache[season] = { good: P.good.map(hexLab), avoid: P.avoid.map(hexLab) });
  const lab = hexLab(hex);
  const dg = Math.min(...pal.good.map(g => labDist(lab, g)));
  const da = Math.min(...pal.avoid.map(g => labDist(lab, g)));
  if (dg < 18) return 'good';
  if (da < 16 && da < dg) return 'bad';
  // 온도감: 노랑 쪽(b+) vs 파랑 쪽, 채도 있는 색만
  // 아주 어두운 색(네이비·차콜 등)은 온도감이 약해서 빼고 본다
  const chroma = Math.hypot(lab[1], lab[2]);
  if (lab[0] > 32 && chroma > 22) {
    const warm = lab[2] > 8 && lab[2] > -lab[1] * 0.2;
    const isWarmSeason = season === 'spring' || season === 'autumn';
    if (warm !== isWarmSeason && Math.abs(lab[2]) > 18) return 'bad';
  }
  return dg < 24 ? 'good' : 'ok';
}
