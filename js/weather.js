// 날씨: Open-Meteo (무료, 키 없음). 위치는 휴대폰 위치 또는 직접 고른 도시
const WX_KEY = 'closet-wx';
const DEFAULT_LOC = { lat: 37.5665, lon: 126.978, name: '서울' };

const WX_CODE = (c) => {
  if (c === 0) return '맑음';
  if (c <= 2) return '구름 조금';
  if (c === 3) return '흐림';
  if (c <= 48) return '안개';
  if (c <= 57) return '이슬비';
  if (c <= 67) return '비';
  if (c <= 77) return '눈';
  if (c <= 82) return '소나기';
  if (c <= 86) return '눈';
  return '뇌우';
};
const isRainCode = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
const isSnowCode = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;

const Weather = {
  data: null,
  loading: null,

  loc() { return db.profile.loc || DEFAULT_LOC; },

  async load(force = false) {
    const loc = this.loc();
    try {
      const cached = JSON.parse(localStorage.getItem(WX_KEY) || 'null');
      if (!force && cached && cached.lat === loc.lat && cached.lon === loc.lon && Date.now() - cached.at < 60 * 60 * 1000) {
        this.data = cached; return cached;
      }
    } catch (e) { /* 캐시 없음 */ }
    if (this.loading) return this.loading;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      '&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode' +
      '&timezone=auto&forecast_days=3';
    this.loading = fetch(url).then(r => r.json()).then(j => {
      const d = { lat: loc.lat, lon: loc.lon, at: Date.now(), hourly: j.hourly, daily: j.daily };
      localStorage.setItem(WX_KEY, JSON.stringify(d));
      this.data = d; return d;
    }).catch(() => {
      try { this.data = JSON.parse(localStorage.getItem(WX_KEY) || 'null'); } catch (e) { this.data = null; }
      return this.data;
    }).finally(() => { this.loading = null; });
    return this.loading;
  },

  // 하루 요약: 활동 시간(8~20시) 기준 체감 최저·최고, 비 확률
  day(dayKey) {
    const d = this.data;
    if (!d || !d.hourly) return null;
    const H = d.hourly;
    const idx = [];
    H.time.forEach((t, i) => { if (t.startsWith(dayKey)) { const h = +t.slice(11, 13); if (h >= 8 && h <= 20) idx.push(i); } });
    if (!idx.length) return null;
    const feels = idx.map(i => H.apparent_temperature[i]);
    const temps = idx.map(i => H.temperature_2m[i]);
    const rainP = Math.max(...idx.map(i => H.precipitation_probability[i] || 0));
    const codes = idx.map(i => H.weathercode[i]);
    const di = (d.daily.time || []).indexOf(dayKey);
    const rainy = rainP >= 50 || codes.some(isRainCode);
    const snowy = codes.some(isSnowCode);
    // 대표 날씨: 비/눈 우선, 아니면 가장 흔한 코드
    const freq = {}; codes.forEach(c => freq[c] = (freq[c] || 0) + 1);
    let code = +Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    if (snowy) code = codes.find(isSnowCode);
    else if (rainy && codes.some(isRainCode)) code = codes.find(isRainCode);
    return {
      day: dayKey,
      min: Math.round(di >= 0 ? d.daily.temperature_2m_min[di] : Math.min(...temps)),
      max: Math.round(di >= 0 ? d.daily.temperature_2m_max[di] : Math.max(...temps)),
      feelMin: Math.min(...feels), feelMax: Math.max(...feels),
      feel: feels.reduce((a, b) => a + b, 0) / feels.length,
      rainP, rainy, snowy, code, text: WX_CODE(code),
    };
  },

  async useMyLocation() {
    const pos = await new Promise((res, rej) => navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, maximumAge: 3600000 })
      : rej(new Error('no geo')));
    db.profile.loc = { lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), name: '현재 위치' };
    save();
    return this.load(true);
  },

  async searchCity(q) {
    const j = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=ko`).then(r => r.json());
    return (j.results || []).map(r => ({ lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3), name: r.name, sub: [r.admin1, r.country].filter(Boolean).join(', ') }));
  },
};

function targetWarmth(feel) {
  for (const g of TEMP_GUIDE) if (feel >= g.min) return g.w;
  return 9.5;
}
function tempGuideText(feel) {
  for (const g of TEMP_GUIDE) if (feel >= g.min) return g.text;
  return TEMP_GUIDE[TEMP_GUIDE.length - 1].text;
}
