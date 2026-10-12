// 사진 분석 (MediaPipe, 무료·휴대폰 안에서만 처리): 전신 사진 → 체형 비율, 얼굴 사진 → 피부·머리색
const MP_VER = '0.10.14';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MP_MODELS = {
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  seg: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
};

const Vision = {
  _lib: null, _fs: null, _pose: null, _seg: null,
  async lib() {
    if (!this._lib) {
      this._lib = await import(`${MP_BASE}/vision_bundle.mjs`);
      this._fs = await this._lib.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    }
    return this._lib;
  },
  async create(Task, opts) {
    for (const delegate of ['GPU', 'CPU']) {
      try { return await Task.createFromOptions(this._fs, { ...opts, baseOptions: { ...opts.baseOptions, delegate } }); }
      catch (e) { if (delegate === 'CPU') throw e; }
    }
  },
  async pose() {
    const L = await this.lib();
    return this._pose || (this._pose = await this.create(L.PoseLandmarker, {
      baseOptions: { modelAssetPath: MP_MODELS.pose }, runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: true,
    }));
  },
  async seg() {
    const L = await this.lib();
    return this._seg || (this._seg = await this.create(L.ImageSegmenter, {
      baseOptions: { modelAssetPath: MP_MODELS.seg }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false,
    }));
  },

  // 전신 사진 → 치수 추정 (키를 알아야 cm로 바꿀 수 있음)
  async analyzeBody(canvas, heightCm) {
    const pose = await this.pose();
    const res = pose.detect(canvas);
    const lm = res.landmarks && res.landmarks[0];
    if (!lm) throw new Error('사진에서 사람을 찾지 못했어요. 전신이 다 나오게 찍어 주세요.');
    const mk = res.segmentationMasks[0];
    const MW = mk.width, MH = mk.height;
    const mask = mk.getAsFloat32Array().slice();
    mk.close && mk.close();
    const W = canvas.width, H = canvas.height;
    const sx = MW / W, sy = MH / H;
    const on = (x, y) => { const xi = Math.round(x * sx), yi = Math.round(y * sy); return xi >= 0 && yi >= 0 && xi < MW && yi < MH && mask[yi * MW + xi] > 0.5; };
    const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 });
    const need = [0, 11, 12, 23, 24, 27, 28];
    if (need.some(i => P(i).y < 0 || P(i).y > H * 1.02)) throw new Error('머리부터 발끝까지 다 나오게 찍어 주세요.');
    const nose = P(0), sL = P(11), sR = P(12), hL = P(23), hR = P(24);
    // 정수리: 코 위로 올라가며 사람 영역이 끝나는 곳
    let top = nose.y;
    for (let y = Math.round(nose.y); y >= 0; y--) {
      let any = false;
      for (let dx = -W * 0.03; dx <= W * 0.03; dx += 2) if (on(nose.x + dx, y)) { any = true; break; }
      if (!any) break;
      top = y;
    }
    const feet = Math.max(...[27, 28, 29, 30, 31, 32].map(i => P(i).y)) + H * 0.008;
    const hPx = feet - top;
    if (hPx < H * 0.4) throw new Error('몸이 너무 작게 나왔어요. 조금 더 가까이에서 찍어 주세요.');
    const cmPx = heightCm / hPx;
    const shY = (sL.y + sR.y) / 2, hipY = (hL.y + hR.y) / 2, torso = hipY - shY;
    const midAt = (y) => { const t = (y - shY) / torso; return (sL.x + sR.x) / 2 * (1 - t) + (hL.x + hR.x) / 2 * t; };
    // 팔이 몸통에 붙어 있으면 그 부분은 빼고 잰다.
    // 위팔: 어깨→팔꿈치 선이 몸통 가장자리와 거의 같음 / 아래팔·손: 팔꿈치→손목(→손끝) 선에서 팔 두께 절반만큼 안쪽
    const armHalf = 4 / cmPx;
    const armEdge = (iS, iE, iW, y) => {
      const S = P(iS), E = P(iE), Wr = P(iW);
      const T = { x: Wr.x + (Wr.x - E.x) * 0.45, y: Wr.y + (Wr.y - E.y) * 0.45 };   // 손끝 근처
      const seg = (p, q) => (y >= Math.min(p.y, q.y) && y <= Math.max(p.y, q.y)) ? p.x + (q.x - p.x) * ((y - p.y) / ((q.y - p.y) || 1)) : null;
      let x = seg(S, E);
      if (x !== null) return { x, off: 0 };
      x = seg(E, Wr); if (x === null) x = seg(Wr, T);
      return x !== null ? { x, off: armHalf * 0.8 } : null;
    };
    const runAt = (y) => {
      const m = midAt(y);
      if (!on(m, y)) return null;
      let a = m, b = m;
      while (a > 0 && on(a - 1, y)) a--;
      while (b < W - 1 && on(b + 1, y)) b++;
      for (const [iS, iE, iW] of [[11, 13, 15], [12, 14, 16]]) {
        const e = armEdge(iS, iE, iW, y);
        if (!e) continue;
        if (e.x < m && a < e.x - armHalf * 0.3) a = Math.min(m - 1, e.x + e.off);
        if (e.x > m && b > e.x + armHalf * 0.3) b = Math.max(m + 1, e.x - e.off);
      }
      return { a, b, w: b - a };
    };
    const shoulderPx = Math.hypot(sL.x - sR.x, sL.y - sR.y) * 1.2;
    const chestY = shY + torso * 0.3;
    const chest = runAt(chestY);
    let waist = null, waistY = 0;
    for (let y = shY + torso * 0.45; y <= shY + torso * 0.88; y += 2) { const r = runAt(y); if (r && (!waist || r.w < waist.w)) { waist = r; waistY = y; } }
    let hip = null, hipRowY = 0;
    for (let y = hipY - torso * 0.06; y <= hipY + torso * 0.3; y += 2) { const r = runAt(y); if (r && (!hip || r.w > hip.w)) { hip = r; hipRowY = y; } }
    // 가랑이 높이 ≈ 골반 관절보다 키의 5% 아래 (다리를 붙이고 서도 흔들리지 않게)
    const crotch = hipY + hPx * 0.05;
    if (!chest || !waist || !hip) throw new Error('몸 윤곽을 찾지 못했어요. 배경이 단순한 곳에서 다시 찍어 주세요.');
    // 팔이 몸에 붙으면 너비가 커짐 → 어깨보다 넓게 나온 가슴은 어깨 기준으로 줄임
    const chestW = Math.min(chest.w, shoulderPx * 0.95);
    const r1 = (v) => Math.round(v);
    const out = {
      shoulder: r1(shoulderPx * cmPx + 1),
      bust: r1(chestW * cmPx * 2.67),
      waist: r1(waist.w * cmPx * 2.75),
      hip: r1(hip.w * cmPx * 2.7),
      legRatio: Math.round(clamp((feet - crotch) / hPx, 0.4, 0.54) * 1000) / 1000,
    };
    const lines = [
      { y: shY, a: (sL.x + sR.x) / 2 - shoulderPx / 2, b: (sL.x + sR.x) / 2 + shoulderPx / 2, t: '어깨' },
      { y: chestY, a: chest.a, b: chest.a + chestW, t: '가슴' },
      { y: waistY, a: waist.a, b: waist.b, t: '허리' },
      { y: hipRowY, a: hip.a, b: hip.b, t: '골반' },
      { y: top, a: nose.x - 30, b: nose.x + 30, t: '' }, { y: feet, a: nose.x - 30, b: nose.x + 30, t: '' },
    ];
    // 비율이 너무 튀면 옷·자세 때문일 가능성이 큼
    const odd = out.bust / out.hip < 0.78 || out.bust / out.hip > 1.3 || out.waist > out.bust * 1.15;
    return { ...out, lines, odd };
  },

  // 얼굴 사진 → 피부·머리색과 웜/쿨, 밝기, 대비 추정
  async analyzeFace(canvas) {
    const seg = await this.seg();
    const res = seg.segment(canvas);
    const cm = res.categoryMask;
    const MW = cm.width, MH = cm.height, cat = cm.getAsUint8Array().slice();
    cm.close && cm.close();
    const W = canvas.width, H = canvas.height;
    const d = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    const skin = [], hair = [];
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const c = cat[Math.floor(y * MH / H) * MW + Math.floor(x * MW / W)];
      if (c !== 3 && c !== 1) continue;
      const i = (y * W + x) * 4;
      const L = rgbLab(d[i], d[i + 1], d[i + 2]);
      if (c === 3) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (L[0] > 22 && L[0] < 94) skin.push(L);
      } else hair.push(L);
    }
    if (skin.length < 200) throw new Error('얼굴을 찾지 못했어요. 얼굴이 크게 나오게 찍어 주세요.');
    const trimMean = (arr) => {
      const s = [...arr].sort((a, b) => a[0] - b[0]);
      const cut = s.slice(Math.floor(s.length * 0.15), Math.ceil(s.length * 0.85));
      return [0, 1, 2].map(j => cut.reduce((a, v) => a + v[j], 0) / cut.length);
    };
    const sk = trimMean(skin);
    const hr = hair.length > 100 ? trimMean(hair) : null;
    const hue = Math.atan2(sk[2], sk[1]) * 180 / Math.PI;     // 피부 색상각 (클수록 노란 기)
    const w = clamp((hue - 56) / 5, -2, 2);
    const dpt = clamp((62 - sk[0]) / 8 + (hr && hr[0] < 22 ? 0.8 : hr && hr[0] > 38 ? -0.8 : 0), -2, 2);
    const ctr = hr ? clamp(((sk[0] - hr[0]) - 40) / 8, -2, 2) : 0;
    return {
      skin: labHex(sk), hair: hr ? labHex(hr) : null, w, d: dpt, c: ctr, hue: Math.round(hue),
      face: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    };
  },
};
