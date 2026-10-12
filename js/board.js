// 코디 보드: 옷 사진을 룩북처럼 펼쳐 배치 (상의 위·하의 아래·아우터 옆·신발·가방·모자·소품)
// 자리는 상자 안의 % (x, y, 너비, 높이)
function boardLayout(ids) {
  const o = outfitFromIds(ids);
  const L = [];
  if (o.outer) {
    if (o.bottom) L.push([o.bottom, 30, 42, 42, 56]);
    if (o.dress) L.push([o.dress, 44, 6, 52, 80]);
    L.push([o.outer, 2, 3, 50, 60]);
    if (o.top) L.push([o.top, 48, 3, 48, 40]);
  } else {
    if (o.bottom) L.push([o.bottom, 22, 44, 46, 54]);
    if (o.dress) L.push([o.dress, 16, 3, 58, 88]);
    if (o.top) L.push([o.top, 12, 2, 60, 45]);
  }
  if (o.shoes) L.push([o.shoes, 68, 79, 30, 19]);
  const side = [o.hat, o.bag, o.scarf, o.belt, ...(o.accs || [])].filter(Boolean);
  const slots = o.outer
    ? [[2, 64, 26, 17], [74, 45, 24, 17], [2, 82, 24, 16], [74, 62, 24, 15], [30, 2, 16, 12]]
    : [[74, 3, 24, 18], [74, 25, 24, 22], [74, 51, 24, 17], [2, 52, 20, 16], [2, 70, 20, 14]];
  side.forEach((it, i) => { if (slots[i]) L.push([it, ...slots[i]]); });
  return L;
}

function outfitBoard(ids, { cls = '' } = {}) {
  const L = boardLayout(ids);
  return `<div class="board ${cls}">${L.map(([it, x, y, w, h]) =>
    `<img data-img="${thumbKey(it.id)}" data-item="${it.id}" alt="${esc(itemName(it))}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">`).join('')}
    ${L.length ? '' : '<span class="board-empty">옷을 골라 코디를 만들어 보세요</span>'}</div>`;
}

// 큰 보드에서는 선명한 원본 사진을 쓴다
function outfitBoardBig(ids) {
  return outfitBoard(ids, { cls: 'big' }).replace(/data-img="([^"]+)_t"/g, 'data-img="$1"');
}
