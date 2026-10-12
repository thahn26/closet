// 누끼: 휴대폰 안에서 도는 무료 AI(@imgly/background-removal) → 실패하면 단색 배경 지우기
// 결과는 손으로 지우개·복원 붓으로 다듬을 수 있다
const BG_LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';
let bgLibP = null;
const loadBgLib = () => bgLibP || (bgLibP = import(BG_LIB).catch(e => { bgLibP = null; throw e; }));

const Cutout = {
  // 사진 → { src: 원본 캔버스, cut: 배경 지운 캔버스(같은 크기), how: 'ai'|'flood' }
  async run(file, onProgress = () => {}) {
    const src = await fileToCanvas(file, 1280);
    try {
      onProgress('누끼 도구 준비 중', 0);
      const lib = await loadBgLib();
      const inBlob = await canvasBlob(src, 'image/jpeg', 0.92);
      const seen = {};
      const out = await lib.removeBackground(inBlob, {
        model: 'isnet_quint8',
        output: { format: 'image/png' },
        progress: (key, cur, total) => {
          if (key.startsWith('fetch')) {
            seen[key] = [cur, total];
            const c = Object.values(seen).reduce((a, v) => a + v[0], 0), t = Object.values(seen).reduce((a, v) => a + v[1], 0);
            onProgress('처음 한 번만 누끼 도구를 받는 중 (약 55MB)', t ? c / t : 0);
          } else onProgress('배경 지우는 중', cur / (total || 1));
        },
      });
      const cut = await blobToCanvas(out, src.width, src.height);
      cleanAlpha(cut);
      if (opaqueRatio(cut) < 0.01) throw new Error('empty');
      return { src, cut, how: 'ai' };
    } catch (e) {
      console.warn('AI 누끼 실패, 단색 배경 지우기로 대신', e);
      onProgress('배경 지우는 중', 0.5);
      const cut = floodRemove(src, 26);
      return { src, cut, how: 'flood' };
    }
  },

  // 다듬은 결과 → 저장용 (투명 여백 잘라내기, 크기 줄이기)
  async finalize(cut) {
    const box = alphaBox(cut);
    const m = Math.round(Math.max(box.w, box.h) * 0.02);
    const x = Math.max(0, box.x - m), y = Math.max(0, box.y - m);
    const w = Math.min(cut.width - x, box.w + m * 2), h = Math.min(cut.height - y, box.h + m * 2);
    const scale = Math.min(1, 900 / Math.max(w, h));
    const big = document.createElement('canvas');
    big.width = Math.max(1, Math.round(w * scale)); big.height = Math.max(1, Math.round(h * scale));
    big.getContext('2d').drawImage(cut, x, y, w, h, 0, 0, big.width, big.height);
    const ts = Math.min(1, 320 / Math.max(big.width, big.height));
    const th = document.createElement('canvas');
    th.width = Math.max(1, Math.round(big.width * ts)); th.height = Math.max(1, Math.round(big.height * ts));
    const tg = th.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(big, 0, 0, th.width, th.height);
    return { canvas: big, blob: await canvasBlob(big), thumb: await canvasBlob(th), w: big.width, h: big.height };
  },
};

async function blobToCanvas(blob, w, h) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = w || bmp.width; c.height = h || bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

function cleanAlpha(c) {
  const g = c.getContext('2d');
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) { if (d[i] < 24) d[i] = 0; else if (d[i] > 235) d[i] = 255; }
  g.putImageData(im, 0, 0);
}
function opaqueRatio(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, t = 0;
  for (let i = 3; i < d.length; i += 64) { t++; if (d[i] > 128) n++; }
  return n / t;
}
function alphaBox(c) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// 단색 배경 지우기: 가장자리에서 시작해 배경색과 비슷한 곳을 지움
function floodRemove(src, tol = 26) {
  const W = src.width, H = src.height;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, W, H), d = im.data;
  const lab = new Float32Array(W * H * 3);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 3) { const l = rgbLab(d[i], d[i + 1], d[i + 2]); lab[p] = l[0]; lab[p + 1] = l[1]; lab[p + 2] = l[2]; }
  // 가장자리 색 3개 정도로 묶기
  const border = [];
  for (let x = 0; x < W; x += 4) { border.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y += 4) { border.push(y * W, y * W + W - 1); }
  let refs = [[lab[border[0] * 3], lab[border[0] * 3 + 1], lab[border[0] * 3 + 2]]];
  for (const p of border) {
    const c = [lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]];
    if (refs.every(r => labDist(r, c) > tol * 0.8) && refs.length < 4) refs.push(c);
  }
  const near = (p) => { const c = [lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]]; return refs.some(r => labDist(r, c) < tol); };
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (const p of border) if (near(p)) { bg[p] = 1; stack.push(p); }
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p / W) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
    for (const q of nb) {
      if (q < 0 || bg[q]) continue;
      // 이웃 픽셀끼리도 비슷해야 번지게 (그림자 경계 대응)
      const dq = Math.hypot(lab[q * 3] - lab[p * 3], lab[q * 3 + 1] - lab[p * 3 + 1], lab[q * 3 + 2] - lab[p * 3 + 2]);
      if (near(q) || dq < tol * 0.35) { bg[q] = 1; stack.push(q); }
    }
  }
  // 경계 부드럽게
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (bg[p]) { d[p * 4 + 3] = 0; continue; }
    let n = 0;
    if (x > 0 && bg[p - 1]) n++; if (x < W - 1 && bg[p + 1]) n++; if (y > 0 && bg[p - W]) n++; if (y < H - 1 && bg[p + W]) n++;
    if (n) d[p * 4 + 3] = 255 - n * 50;
  }
  g.putImageData(im, 0, 0);
  return out;
}

// ── 누끼 다듬기 화면 ── (Promise<canvas|null>)
function openCutoutEditor(src, cut0) {
  return new Promise(resolve => {
    const W = src.width, H = src.height;
    const cut = document.createElement('canvas');
    cut.width = W; cut.height = H;
    const cg = cut.getContext('2d');
    cg.drawImage(cut0, 0, 0);
    const undo = [];
    let mode = 'erase', size = 28, tol = 26, done = null;
    const p = openSheet(`
      ${sheetHeader('누끼 다듬기', '<button class="link b" data-a="done">완료</button>', '<button class="link" data-x="close">취소</button>')}
      <div class="ed-stage checker"><canvas class="ed-cv"></canvas></div>
      <div class="seg ed-tools">
        <button data-mode="erase" class="on">${ic('eraser')}지우개</button>
        <button data-mode="restore">${ic('brush')}되살리기</button>
        <button data-a="undo">${ic('undo')}취소</button>
      </div>
      <label class="slider"><span>붓 크기</span><input type="range" min="6" max="90" value="${size}" data-k="size"></label>
      <details class="ed-more"><summary>배경이 단색이면: 자동 지우기</summary>
        <label class="slider"><span>민감도</span><input type="range" min="8" max="60" value="${tol}" data-k="tol"></label>
        <div class="btn-row"><button class="btn" data-a="flood">단색 배경 지우기</button><button class="btn" data-a="reset">원본 사진으로</button></div>
      </details>
      <p class="hint">손가락으로 문질러 남은 배경을 지우거나, 잘못 지워진 옷 부분을 되살려요.</p>
    `, { full: true, onClose: () => resolve(done) });
    const cv = $('.ed-cv', p), stage = $('.ed-stage', p);
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const k = Math.min(r.width / W, (r.height || 400) / H);
      cv.width = Math.round(W * k); cv.height = Math.round(H * k);
      draw();
    };
    const vg = cv.getContext('2d');
    const draw = () => { vg.clearRect(0, 0, cv.width, cv.height); vg.drawImage(cut, 0, 0, cv.width, cv.height); };
    const snap = () => { undo.push(cg.getImageData(0, 0, W, H)); if (undo.length > 12) undo.shift(); };
    const toImg = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const dab = (x0, y0, x1, y1) => {
      const rad = size * (W / cv.width) / 2;
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (rad / 3)));
      for (let i = 0; i <= steps; i++) {
        const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
        cg.save();
        cg.beginPath(); cg.arc(x, y, rad, 0, Math.PI * 2);
        if (mode === 'erase') { cg.globalCompositeOperation = 'destination-out'; cg.fill(); }
        else { cg.clip(); cg.drawImage(src, 0, 0); }
        cg.restore();
      }
      draw();
    };
    let last = null;
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); snap(); last = toImg(e); dab(...last, ...last); });
    cv.addEventListener('pointermove', (e) => { if (!last) return; const pt = toImg(e); dab(...last, ...pt); last = pt; });
    const up = () => { last = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    p.addEventListener('input', (e) => { if (e.target.dataset.k === 'size') size = +e.target.value; if (e.target.dataset.k === 'tol') tol = +e.target.value; });
    p.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mode]');
      if (m) { mode = m.dataset.mode; $$('[data-mode]', p).forEach(b => b.classList.toggle('on', b === m)); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'undo' && undo.length) { cg.putImageData(undo.pop(), 0, 0); draw(); }
      if (a === 'flood') { snap(); const f = floodRemove(src, tol); cg.clearRect(0, 0, W, H); cg.drawImage(f, 0, 0); draw(); }
      if (a === 'reset') { snap(); cg.clearRect(0, 0, W, H); cg.drawImage(src, 0, 0); draw(); }
      if (a === 'done') { done = cut; closeSheet(); }
    });
    requestAnimationFrame(fit);
  });
}
