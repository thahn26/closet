// 옷 종류·색·스타일·체형·퍼스널컬러·기본템 기준 데이터 (스타일리스트 규칙의 바탕)

// ── 큰 분류 ──
const CATS = [
  { id: 'top', name: '상의' },
  { id: 'bottom', name: '하의' },
  { id: 'outer', name: '아우터' },
  { id: 'dress', name: '원피스' },
  { id: 'shoes', name: '신발' },
  { id: 'bag', name: '가방' },
  { id: 'hat', name: '모자' },
  { id: 'acc', name: '소품' },
];
const CAT_NAME = Object.fromEntries(CATS.map(c => [c.id, c.name]));

// ── 세부 종류 ──
// w: 보온(상체·아우터 합산용), leg: 하의 보온(0 짧음 ~ 2 긴바지), f: 격식(0 운동복 ~ 5 정장),
// st: 어울리는 스타일, se: 계절(봄 여름 가을 겨울), only: 'f' 주로 여성복, 'm' 주로 남성복
const SUBS = [
  // 상의
  { id: 'tee', cat: 'top', name: '반팔 티셔츠', w: 1, f: 1, st: ['casual', 'minimal', 'street'], se: ['spring', 'summer'] },
  { id: 'longtee', cat: 'top', name: '긴팔 티셔츠', w: 2, f: 1, st: ['casual', 'minimal', 'street'], se: ['spring', 'fall'] },
  { id: 'sleeveless', cat: 'top', name: '민소매·나시', w: 0.3, f: 1, st: ['casual', 'sporty', 'feminine'], se: ['summer'] },
  { id: 'shirt', cat: 'top', name: '셔츠', w: 2, f: 3, st: ['classic', 'minimal', 'dandy'], se: ['spring', 'summer', 'fall'] },
  { id: 'blouse', cat: 'top', name: '블라우스', w: 1.8, f: 3, st: ['feminine', 'classic'], se: ['spring', 'summer', 'fall'], only: 'f' },
  { id: 'polo', cat: 'top', name: '카라 티셔츠', w: 1.2, f: 2, st: ['classic', 'dandy', 'casual'], se: ['spring', 'summer'] },
  { id: 'knit', cat: 'top', name: '니트', w: 3, f: 2.5, st: ['minimal', 'classic', 'feminine', 'dandy'], se: ['fall', 'winter'] },
  { id: 'sweatshirt', cat: 'top', name: '맨투맨', w: 3, f: 1, st: ['casual', 'street'], se: ['spring', 'fall', 'winter'] },
  { id: 'hoodie', cat: 'top', name: '후드티', w: 3.2, f: 0.8, st: ['street', 'casual', 'sporty'], se: ['spring', 'fall', 'winter'] },
  { id: 'sporttop', cat: 'top', name: '운동복 상의', w: 1, f: 0, st: ['sporty'], se: ['spring', 'summer', 'fall'] },
  // 하의
  { id: 'jeans', cat: 'bottom', name: '청바지', leg: 2, f: 1.5, st: ['casual', 'street', 'amekaji', 'minimal'], se: ['spring', 'fall', 'winter'] },
  { id: 'slacks', cat: 'bottom', name: '슬랙스', leg: 2, f: 3.5, st: ['minimal', 'classic', 'dandy', 'chic'], se: ['spring', 'fall', 'winter'] },
  { id: 'cotton', cat: 'bottom', name: '면바지', leg: 2, f: 2, st: ['casual', 'dandy', 'amekaji'], se: ['spring', 'fall'] },
  { id: 'cargo', cat: 'bottom', name: '카고·와이드 팬츠', leg: 2, f: 1, st: ['street', 'gorp', 'amekaji'], se: ['spring', 'fall'] },
  { id: 'jogger', cat: 'bottom', name: '트레이닝 팬츠', leg: 2, f: 0.3, st: ['sporty', 'street'], se: ['spring', 'fall', 'winter'] },
  { id: 'shorts', cat: 'bottom', name: '반바지', leg: 0, f: 0.8, st: ['casual', 'street', 'sporty'], se: ['summer'] },
  { id: 'miniskirt', cat: 'bottom', name: '미니스커트', leg: 0, f: 1.5, st: ['feminine', 'street'], se: ['spring', 'summer'], only: 'f' },
  { id: 'skirt', cat: 'bottom', name: '미디·롱스커트', leg: 1, f: 2.5, st: ['feminine', 'classic', 'minimal'], se: ['spring', 'summer', 'fall'], only: 'f' },
  { id: 'leggings', cat: 'bottom', name: '레깅스', leg: 1.5, f: 0.2, st: ['sporty'], se: ['spring', 'fall', 'winter'] },
  // 아우터
  { id: 'cardigan', cat: 'outer', name: '가디건', w: 1.5, f: 2.5, st: ['minimal', 'feminine', 'classic', 'casual'], se: ['spring', 'fall'] },
  { id: 'jacket', cat: 'outer', name: '자켓·블레이저', w: 2.2, f: 4, st: ['classic', 'minimal', 'dandy', 'chic'], se: ['spring', 'fall'] },
  { id: 'denimjk', cat: 'outer', name: '데님·셔츠 자켓', w: 2, f: 1.5, st: ['casual', 'amekaji', 'street'], se: ['spring', 'fall'] },
  { id: 'windbreaker', cat: 'outer', name: '바람막이', w: 1.5, f: 0.8, st: ['sporty', 'gorp', 'street'], se: ['spring', 'fall'] },
  { id: 'jumper', cat: 'outer', name: '점퍼·블루종', w: 3, f: 1.5, st: ['casual', 'street', 'amekaji'], se: ['fall', 'winter'] },
  { id: 'fleece', cat: 'outer', name: '플리스', w: 3, f: 1, st: ['gorp', 'casual'], se: ['fall', 'winter'] },
  { id: 'trench', cat: 'outer', name: '트렌치코트', w: 3, f: 3.5, st: ['classic', 'minimal', 'chic'], se: ['spring', 'fall'] },
  { id: 'leather', cat: 'outer', name: '가죽 자켓', w: 3, f: 2.5, st: ['chic', 'street'], se: ['spring', 'fall'] },
  { id: 'coat', cat: 'outer', name: '코트', w: 4.2, f: 3.8, st: ['classic', 'minimal', 'chic', 'dandy'], se: ['winter'] },
  { id: 'padding', cat: 'outer', name: '패딩', w: 5.8, f: 1, st: ['casual', 'sporty', 'gorp', 'street'], se: ['winter'] },
  // 원피스
  { id: 'dress', cat: 'dress', name: '원피스', w: 1.5, leg: 1, f: 3, st: ['feminine', 'classic', 'minimal'], se: ['spring', 'summer', 'fall'], only: 'f' },
  { id: 'knitdress', cat: 'dress', name: '니트 원피스', w: 3, leg: 1.2, f: 2.5, st: ['feminine', 'minimal'], se: ['fall', 'winter'], only: 'f' },
  { id: 'jumpsuit', cat: 'dress', name: '점프수트·멜빵', w: 1.8, leg: 2, f: 1.5, st: ['casual', 'amekaji'], se: ['spring', 'summer', 'fall'] },
  // 신발
  { id: 'sneakers', cat: 'shoes', name: '스니커즈', f: 1.5, st: ['casual', 'minimal', 'street', 'amekaji'], se: ['spring', 'summer', 'fall', 'winter'] },
  { id: 'running', cat: 'shoes', name: '운동화', f: 0.5, st: ['sporty', 'gorp', 'street'], se: ['spring', 'summer', 'fall', 'winter'] },
  { id: 'loafer', cat: 'shoes', name: '로퍼·구두', f: 4, st: ['classic', 'dandy', 'minimal', 'chic'], se: ['spring', 'fall', 'winter'] },
  { id: 'boots', cat: 'shoes', name: '부츠', f: 2.5, st: ['chic', 'amekaji', 'classic', 'gorp'], se: ['fall', 'winter'] },
  { id: 'sandals', cat: 'shoes', name: '샌들·슬리퍼', f: 1, st: ['casual', 'feminine', 'gorp'], se: ['summer'] },
  { id: 'heels', cat: 'shoes', name: '힐·플랫', f: 3.5, st: ['feminine', 'classic', 'chic'], se: ['spring', 'summer', 'fall'], only: 'f' },
  // 가방
  { id: 'tote', cat: 'bag', name: '토트·숄더백', f: 3, st: ['classic', 'minimal', 'feminine', 'chic'] },
  { id: 'cross', cat: 'bag', name: '크로스백', f: 1.5, st: ['casual', 'street', 'minimal'] },
  { id: 'backpack', cat: 'bag', name: '백팩', f: 1, st: ['casual', 'sporty', 'gorp', 'street'] },
  { id: 'minibag', cat: 'bag', name: '미니백·클러치', f: 3, st: ['feminine', 'chic', 'classic'] },
  // 모자
  { id: 'cap', cat: 'hat', name: '볼캡', f: 0.5, st: ['casual', 'street', 'sporty'], se: ['spring', 'summer', 'fall', 'winter'] },
  { id: 'beanie', cat: 'hat', name: '비니', f: 1, st: ['street', 'casual', 'gorp'], se: ['fall', 'winter'] },
  { id: 'buckethat', cat: 'hat', name: '버킷햇', f: 1, st: ['street', 'gorp', 'casual'], se: ['spring', 'summer', 'fall'] },
  // 소품
  { id: 'scarf', cat: 'acc', name: '머플러·스카프', w: 1, f: 2.5, st: ['classic', 'minimal', 'feminine'], se: ['fall', 'winter'] },
  { id: 'belt', cat: 'acc', name: '벨트', f: 3, st: ['classic', 'minimal', 'dandy'] },
  { id: 'glasses', cat: 'acc', name: '안경·선글라스', f: 2, st: ['minimal', 'chic', 'street'] },
  { id: 'jewelry', cat: 'acc', name: '주얼리·시계', f: 3, st: ['classic', 'feminine', 'chic'] },
];
const SUB = Object.fromEntries(SUBS.map(s => [s.id, s]));
const subsOf = (cat) => SUBS.filter(s => s.cat === cat);

const SEASONS = [
  { id: 'spring', name: '봄' }, { id: 'summer', name: '여름' }, { id: 'fall', name: '가을' }, { id: 'winter', name: '겨울' },
];
const FITS = [{ id: 'slim', name: '슬림' }, { id: 'regular', name: '레귤러' }, { id: 'over', name: '오버' }];
const THICKS = [{ id: 'thin', name: '얇음', adj: -0.6 }, { id: 'normal', name: '보통', adj: 0 }, { id: 'thick', name: '두꺼움', adj: 0.8 }];
const PATTERNS = [
  { id: 'solid', name: '무지' }, { id: 'stripe', name: '스트라이프' }, { id: 'check', name: '체크' },
  { id: 'print', name: '프린트·그래픽' }, { id: 'etc', name: '기타 무늬' },
];
const STATUS = { ok: '', laundry: '세탁 중', repair: '수선 필요' };

// ── 스타일 ──
const STYLES = [
  { id: 'minimal', name: '미니멀', desc: '무채색, 군더더기 없는 실루엣',
    colors: ['black', 'white', 'gray', 'charcoal', 'navy', 'beige', 'ivory'], keys: ['slacks', 'shirt', 'knit', 'coat', 'loafer', 'tee'] },
  { id: 'casual', name: '캐주얼', desc: '편하게 매일 입는 데일리룩',
    colors: ['white', 'navy', 'denim', 'gray', 'beige', 'lightblue'], keys: ['tee', 'jeans', 'sweatshirt', 'sneakers', 'cardigan'] },
  { id: 'classic', name: '클래식·오피스', desc: '단정하고 깔끔한 출근룩',
    colors: ['navy', 'white', 'beige', 'camel', 'charcoal', 'brown'], keys: ['shirt', 'slacks', 'jacket', 'trench', 'loafer', 'tote'] },
  { id: 'street', name: '스트릿', desc: '오버핏, 그래픽, 힙한 무드',
    colors: ['black', 'white', 'gray', 'khaki', 'red'], keys: ['hoodie', 'cargo', 'sneakers', 'cap', 'jumper'] },
  { id: 'feminine', name: '페미닌·러블리', desc: '부드러운 색, 여리여리한 라인',
    colors: ['ivory', 'pink', 'white', 'beige', 'lavender', 'lightblue'], keys: ['blouse', 'skirt', 'dress', 'cardigan', 'heels', 'minibag'] },
  { id: 'dandy', name: '댄디', desc: '셔츠·니트·슬랙스의 깔끔한 단정함',
    colors: ['navy', 'white', 'lightblue', 'beige', 'gray', 'brown'], keys: ['shirt', 'knit', 'slacks', 'cotton', 'loafer', 'jacket'] },
  { id: 'amekaji', name: '아메카지·빈티지', desc: '데님, 워크웨어, 따뜻한 흙색',
    colors: ['denim', 'brown', 'khaki', 'olive', 'ivory', 'navy', 'camel'], keys: ['denimjk', 'jeans', 'cotton', 'boots', 'jumper'] },
  { id: 'sporty', name: '스포티·애슬레저', desc: '운동복을 일상에, 활동적인 룩',
    colors: ['black', 'white', 'gray', 'navy'], keys: ['sporttop', 'jogger', 'running', 'windbreaker', 'cap'] },
  { id: 'gorp', name: '고프코어', desc: '아웃도어 기능성 옷을 멋스럽게',
    colors: ['khaki', 'olive', 'black', 'beige', 'gray', 'orange'], keys: ['windbreaker', 'fleece', 'cargo', 'running', 'buckethat'] },
  { id: 'chic', name: '시크·모던', desc: '블랙과 가죽, 도시적인 분위기',
    colors: ['black', 'charcoal', 'white', 'gray', 'burgundy'], keys: ['leather', 'slacks', 'boots', 'coat', 'tote'] },
];
const STYLE = Object.fromEntries(STYLES.map(s => [s.id, s]));

// ── 이름 붙은 색 (옷 색 자동 인식용) ──
// n: 무채색 정도 (1 무채색, 0.5 흙색 계열, 0 포인트색)
const COLORS = [
  { id: 'black', name: '블랙', hex: '#1b1b1d', n: 1 },
  { id: 'charcoal', name: '차콜', hex: '#3e3f43', n: 1 },
  { id: 'gray', name: '그레이', hex: '#8f9094', n: 1 },
  { id: 'lightgray', name: '라이트그레이', hex: '#c9cacd', n: 1 },
  { id: 'white', name: '화이트', hex: '#f4f4f1', n: 1 },
  { id: 'ivory', name: '아이보리', hex: '#efe6d2', n: 1 },
  { id: 'beige', name: '베이지', hex: '#d6c1a1', n: 1 },
  { id: 'navy', name: '네이비', hex: '#1f2b48', n: 1 },
  { id: 'denim', name: '데님', hex: '#4a6890', n: 1 },
  { id: 'lightdenim', name: '연청', hex: '#8eaacb', n: 1 },
  { id: 'camel', name: '카멜', hex: '#b3824f', n: 0.5 },
  { id: 'brown', name: '브라운', hex: '#6a4630', n: 0.5 },
  { id: 'khaki', name: '카키', hex: '#6f6b47', n: 0.5 },
  { id: 'olive', name: '올리브', hex: '#57592e', n: 0.5 },
  { id: 'lightblue', name: '하늘색', hex: '#a9c6e6', n: 0 },
  { id: 'blue', name: '블루', hex: '#2d5db8', n: 0 },
  { id: 'red', name: '레드', hex: '#c4302b', n: 0 },
  { id: 'burgundy', name: '버건디', hex: '#6b2232', n: 0 },
  { id: 'pink', name: '핑크', hex: '#efa9bb', n: 0 },
  { id: 'hotpink', name: '핫핑크', hex: '#d63a7a', n: 0 },
  { id: 'coral', name: '코랄', hex: '#f0806a', n: 0 },
  { id: 'orange', name: '오렌지', hex: '#e8792c', n: 0 },
  { id: 'mustard', name: '머스타드', hex: '#c9a228', n: 0 },
  { id: 'yellow', name: '옐로우', hex: '#f1d559', n: 0 },
  { id: 'mint', name: '민트', hex: '#a6dbc9', n: 0 },
  { id: 'green', name: '그린', hex: '#2f7d50', n: 0 },
  { id: 'lavender', name: '라벤더', hex: '#b8a9dc', n: 0 },
  { id: 'purple', name: '퍼플', hex: '#5d3489', n: 0 },
];
const COLOR = Object.fromEntries(COLORS.map(c => [c.id, c]));

// ── 퍼스널컬러 ──
const PCOLORS = {
  spring: { name: '봄 웜', short: '봄웜', desc: '밝고 따뜻하고 생기 있는 색이 잘 받아요. 노란 기운이 도는 맑은 색, 아이보리·코랄·피치가 얼굴을 화사하게 만들어요.',
    good: ['#ff8a70', '#ffb38a', '#f7d154', '#fff3d9', '#e7cda4', '#c9996b', '#8dc63f', '#3dbfad', '#f58a8a', '#fa9e76', '#a86b32', '#4a5e9a'],
    avoid: ['#111111', '#5b2c83', '#6a7fa8', '#c8c8cc'], tip: '새하얀색보다 아이보리, 블랙보다 브라운·네이비가 좋아요. 액세서리는 골드.' },
  summer: { name: '여름 쿨', short: '여름쿨', desc: '부드럽고 시원한 파스텔·뮤트 색이 잘 받아요. 푸른 기운의 은은한 색이 피부를 맑아 보이게 해요.',
    good: ['#b9a8d9', '#a7c4e5', '#e8a0b4', '#f5f5f2', '#c8c8cc', '#b98aa0', '#8db8e0', '#a8dccb', '#4a5a80', '#8e6e72', '#c04b73', '#6a7fa8'],
    avoid: ['#e8792c', '#c9a228', '#6a4630', '#111111'], tip: '쨍한 원색이나 진한 블랙보다 그레이·네이비·로즈 계열. 액세서리는 실버.' },
  autumn: { name: '가을 웜', short: '가을웜', desc: '깊고 차분한 따뜻한 색이 잘 받아요. 카멜·카키·브라운·머스타드 같은 흙빛 색이 고급스럽게 어울려요.',
    good: ['#b3824f', '#7a7a4a', '#6b6b3a', '#a84a32', '#c9a228', '#7a2e2e', '#5a3a26', '#c0643f', '#d6bf9b', '#2e6e6a', '#3e5a3a', '#d9782e'],
    avoid: ['#ff6fb5', '#a7c4e5', '#ffffff', '#b8a9dc'], tip: '파스텔이나 쨍한 쿨톤 대신 톤 다운된 흙색. 블랙보다 다크 브라운·카키. 액세서리는 골드.' },
  winter: { name: '겨울 쿨', short: '겨울쿨', desc: '선명하고 대비가 강한 차가운 색이 잘 받아요. 블랙·퓨어 화이트·비비드 색이 또렷한 인상을 줘요.',
    good: ['#111111', '#ffffff', '#333638', '#1b2440', '#2a4fc7', '#d0213c', '#c2185b', '#0f8a5f', '#d9dde3', '#6a1b3a', '#5b2c83', '#a0a4aa'],
    avoid: ['#d6bf9b', '#b3824f', '#ffb38a', '#c9a228'], tip: '탁한 베이지·카멜보다 블랙·화이트·원색 포인트. 대비를 크게 줄수록 좋아요. 액세서리는 실버.' },
};

// 진단 질문 (점수: warm +, cool -, light/deep, clear/soft)
const PC_QUESTIONS = [
  { q: '손목 안쪽 혈관 색은?', opts: [
    { t: '초록빛에 가까워요', w: 2 }, { t: '파란·보랏빛에 가까워요', w: -2 }, { t: '잘 모르겠어요', w: 0 }] },
  { q: '더 잘 어울리는 액세서리는?', opts: [
    { t: '골드', w: 2 }, { t: '실버', w: -2 }, { t: '둘 다 비슷해요', w: 0 }] },
  { q: '햇볕에 오래 있으면?', opts: [
    { t: '금방 까맣게 타요', w: 1, d: 1 }, { t: '빨개졌다가 원래대로 돌아와요', w: -1, d: -1 }, { t: '둘 다 조금씩', w: 0 }] },
  { q: '머리카락·눈동자 색은?', opts: [
    { t: '밝은 갈색이에요', d: -2, w: 1 }, { t: '짙은 갈색이에요', d: 0 }, { t: '아주 검은색이에요', d: 2, c: 1 }] },
  { q: '얼굴에 대면 더 나은 흰색은?', opts: [
    { t: '따뜻한 아이보리', w: 2 }, { t: '새하얀 흰색', w: -2, c: 1 }, { t: '모르겠어요', w: 0 }] },
  { q: '사람들이 자주 하는 말은?', opts: [
    { t: '인상이 부드러워 보여', c: -2 }, { t: '이목구비가 또렷해', c: 2 }, { t: '딱히 없어요', c: 0 }] },
  { q: '잘 어울린다는 말을 듣는 색은?', opts: [
    { t: '파스텔·밝은 색', d: -2 }, { t: '진하고 깊은 색', d: 2 }, { t: '쨍한 원색', c: 2 }, { t: '탁하고 차분한 색', c: -2 }] },
];

// 드레이핑(사진 위 색 비교) 짝
const DRAPES = [
  { key: 'w', a: { hex: '#e7b97a', label: '골드' }, b: { hex: '#c9ccd2', label: '실버' } },
  { key: 'w', a: { hex: '#ff8a70', label: '코랄' }, b: { hex: '#e8a0c0', label: '로즈핑크' } },
  { key: 'd', a: { hex: '#f6e7c8', label: '밝은 색' }, b: { hex: '#4a2f2a', label: '어두운 색' } },
  { key: 'c', a: { hex: '#e3263a', label: '선명한 색' }, b: { hex: '#b48a86', label: '차분한 색' } },
];

// ── 체형 ──
const BODY_TYPES = {
  X: { name: '모래시계형', short: '균형 잡힌 굴곡', desc: '어깨·가슴과 골반 너비가 비슷하고 허리가 잘록해요. 가장 다양한 옷이 어울리는 체형이에요.',
    do: ['허리 라인이 보이게 입기 (벨트, 넣어 입기, 랩 디자인)', '몸에 적당히 맞는 슬림·레귤러 핏', '하이웨이스트 하의 + 핏한 니트', '랩 원피스, 허리 잡힌 자켓'],
    avoid: ['위아래 모두 박시한 오버핏 (굴곡이 묻혀요)', '허리선이 없는 일자 원피스'] },
  A: { name: '삼각형', short: '하체가 발달', desc: '어깨·가슴보다 골반·허벅지가 넓은 편이에요. 상체에 시선을 모으면 균형이 맞아요.',
    do: ['상의는 밝은 색·무늬·디테일로 시선을 위로', '하의는 어두운 색 + 일자·와이드·A라인', '어깨에 구조감 있는 자켓, 보트넥·스퀘어넥', '엉덩이를 살짝 덮는 기장의 아우터'],
    avoid: ['밝고 붙는 스키니 하의', '골반 위치에 주머니·장식이 많은 하의', '어깨가 좁아 보이는 홀터넥'] },
  V: { name: '역삼각형', short: '상체·어깨가 발달', desc: '어깨·가슴이 골반보다 넓은 편이에요. 하체에 볼륨을 주면 균형이 맞아요.',
    do: ['상의는 심플하고 어두운 색, V넥', '하의는 밝은 색·와이드·카고 등 볼륨 있는 핏', '라글란 소매, 드롭 숄더', 'A라인·플리츠 스커트, 와이드 팬츠'],
    avoid: ['어깨 패드·퍼프 소매', '가로 줄무늬 상의', '아주 붙는 스키니 하의'] },
  H: { name: '직사각형', short: '일자형 실루엣', desc: '어깨·허리·골반 너비가 비슷한 일자형이에요. 허리에 포인트를 주거나 레이어드로 입체감을 더해요.',
    do: ['벨트·넣어 입기로 허리선 만들기', '크롭 상의 + 하이웨이스트', '레이어드(셔츠+니트, 자켓)로 입체감', '페플럼·랩·셔링 디테일'],
    avoid: ['위아래 같은 일자 박스핏만 입기', '허리선 없는 긴 일자 원피스'] },
  O: { name: '둥근형', short: '복부·상체에 볼륨', desc: '허리 둘레가 가슴·골반과 비슷하거나 넓은 편이에요. 세로 라인을 만들면 길고 날씬해 보여요.',
    do: ['V넥·깊은 네크라인, 세로 라인', '위아래 같은 톤(원톤)으로 길어 보이게', '엉덩이를 덮는 긴 아우터를 열어 입기', '스트레이트·세미와이드 하의, 적당히 여유 있는 상의'],
    avoid: ['배에 딱 붙는 상의', '허리에 굵은 벨트', '부피감 큰 패딩만 단독으로'] },
};

// 기온별 옷차림(체감 기온) → 상체 보온 목표값
const TEMP_GUIDE = [
  { min: 28, w: 1, text: '민소매·반팔, 반바지·린넨' },
  { min: 25, w: 1.4, text: '반팔·얇은 셔츠, 면바지·반바지' },
  { min: 22, w: 2, text: '긴팔 티·얇은 셔츠, 면바지·청바지' },
  { min: 19, w: 2.9, text: '얇은 니트·맨투맨, 얇은 가디건' },
  { min: 16, w: 3.8, text: '니트·맨투맨 + 가디건·얇은 자켓' },
  { min: 12, w: 4.8, text: '자켓·트렌치·점퍼 + 긴팔' },
  { min: 9, w: 5.8, text: '트렌치·점퍼 + 니트' },
  { min: 5, w: 7, text: '코트·가죽 자켓 + 니트, 히트텍' },
  { min: 0, w: 8.3, text: '두꺼운 코트·패딩 + 니트, 목도리' },
  { min: -99, w: 9.5, text: '패딩·두꺼운 코트, 목도리·장갑' },
];

// 오늘의 상황 → 격식 범위
const OCCASIONS = [
  { id: 'daily', name: '일상', f: [0.8, 2.8] },
  { id: 'work', name: '출근', f: [2.2, 4.3] },
  { id: 'date', name: '약속·데이트', f: [1.6, 3.8] },
  { id: 'formal', name: '격식', f: [3.4, 5] },
  { id: 'sport', name: '운동', f: [0, 1.3] },
];

// ── 기본템 (캡슐 옷장) ──  only: 'f' 여성복, 'm' 남성복 위주일 때만
const BASICS = [
  { sub: 'tee', colors: ['white', 'ivory'], name: '흰 반팔 티셔츠', why: '모든 하의·아우터와 맞는 1순위 기본템' },
  { sub: 'tee', colors: ['black', 'navy', 'charcoal'], name: '블랙·네이비 반팔 티', why: '흰 티 다음으로 활용도 높은 어두운 티' },
  { sub: 'longtee', colors: ['white', 'ivory', 'gray', 'lightgray'], name: '흰·그레이 긴팔 티', why: '봄·가을 단독, 겨울 이너로 사계절 활용' },
  { sub: 'shirt', colors: ['white', 'ivory'], name: '흰 셔츠', why: '출근·데이트·캐주얼 어디에나 단정함을 더해요' },
  { sub: 'shirt', colors: ['lightblue', 'blue', 'denim', 'lightdenim'], name: '하늘색 셔츠', why: '흰 셔츠보다 부드럽고 청바지·슬랙스 모두 맞아요' },
  { sub: 'knit', colors: ['beige', 'ivory', 'camel', 'gray', 'lightgray', 'navy', 'charcoal'], name: '무채색 니트', why: '가을·겨울 코디의 중심, 셔츠 위 레이어드도 좋아요' },
  { sub: 'sweatshirt', colors: ['gray', 'lightgray', 'navy', 'black', 'ivory', 'white'], name: '그레이 맨투맨', why: '편한 주말룩 기본, 셔츠 레이어드도 가능' },
  { sub: 'blouse', colors: ['white', 'ivory', 'beige'], name: '아이보리 블라우스', why: '스커트·슬랙스와 단정한 여성스러운 룩', only: 'f' },
  { sub: 'jeans', colors: ['denim', 'navy'], name: '진청 일자 청바지', why: '가장 많은 상의와 어울리는 하의' },
  { sub: 'jeans', colors: ['lightdenim', 'lightblue'], name: '연청 청바지', why: '봄·여름 밝은 캐주얼에 필수' },
  { sub: 'slacks', colors: ['black', 'charcoal', 'gray', 'navy'], name: '블랙·그레이 슬랙스', why: '출근·격식 자리를 책임지는 하의' },
  { sub: 'cotton', colors: ['beige', 'ivory', 'khaki', 'camel'], name: '베이지 면바지', why: '청바지 대신 부드러운 인상, 네이비·화이트와 찰떡' },
  { sub: 'skirt', colors: ['black', 'beige', 'navy', 'gray', 'charcoal'], name: '무채색 미디스커트', why: '니트·블라우스·티셔츠 모두 맞는 스커트', only: 'f' },
  { sub: 'dress', colors: ['black', 'navy', 'charcoal'], name: '블랙 원피스', why: '격식 있는 자리에 하나로 끝나는 옷', only: 'f' },
  { sub: 'cardigan', colors: ['navy', 'beige', 'gray', 'black', 'ivory', 'charcoal'], name: '무채색 가디건', why: '일교차 큰 날 벗고 입기 쉬운 겉옷' },
  { sub: 'jacket', colors: ['navy', 'black', 'charcoal', 'beige', 'gray'], name: '네이비·블랙 자켓', why: '티셔츠 위에 걸쳐도 단정해지는 마법템' },
  { sub: 'trench', colors: ['beige', 'camel', 'khaki', 'ivory'], name: '베이지 트렌치코트', why: '봄·가을 아우터의 정석' },
  { sub: 'coat', colors: ['camel', 'charcoal', 'black', 'navy', 'gray', 'beige'], name: '카멜·차콜 코트', why: '겨울 출근·약속 아우터' },
  { sub: 'padding', colors: ['black', 'navy', 'charcoal', 'beige', 'ivory'], name: '블랙 패딩', why: '한겨울 필수, 무채색이 오래 입기 좋아요' },
  { sub: 'sneakers', colors: ['white', 'ivory'], name: '흰 스니커즈', why: '캐주얼부터 세미 정장까지 다 받아 주는 신발' },
  { sub: 'loafer', colors: ['black', 'brown'], name: '블랙·브라운 로퍼', why: '슬랙스·스커트를 단정하게 마무리' },
  { sub: 'boots', colors: ['black', 'brown'], name: '첼시·앵클 부츠', why: '가을·겨울 코디에 무게감' },
  { sub: 'cross', colors: ['black', 'brown', 'beige', 'camel'], name: '블랙 크로스백', why: '매일 드는 가방, 무채색이 무난해요' },
  { sub: 'tote', colors: ['black', 'brown', 'beige', 'camel', 'ivory'], name: '숄더·토트백', why: '출근·약속용 가방' },
  { sub: 'belt', colors: ['black', 'brown'], name: '가죽 벨트', why: '넣어 입을 때 완성도를 올려요' },
];

const WEEKDAY = '일월화수목금토';
