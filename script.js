function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371.0;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestNeighbor(points, startIdx = 0) {
  const remaining = points.slice();
  const route = [{ idx: startIdx, coord: remaining.splice(startIdx, 1)[0] }];
  while (remaining.length) {
    const last = route[route.length - 1].coord;
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    route.push({ coord: remaining.splice(bestIdx, 1)[0] });
  }
  return route;
}

function parseCoords(text) {
  const points = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      throw new Error(`Строка ${i+1}: ожидается "широта,долгота", получено "${line}"`);
    }
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) throw new Error(`Строка ${i+1}: не число "${line}"`);
    if (lat < -90 || lat > 90) throw new Error(`Строка ${i+1}: широта вне [-90, 90]`);
    if (lon < -180 || lon > 180) throw new Error(`Строка ${i+1}: долгота вне [-180, 180]`);
    points.push([lat, lon]);
  }
  return points;
}

function parseNames(text) {
  return text.split(/\r?\n/).map(s => s.trim());
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.add('show');
}
function hideError() {
  document.getElementById('error').classList.remove('show');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function calculate() {
  hideError();
  const result = document.getElementById('result');
  try {
    const points = parseCoords(document.getElementById('input').value);
    if (points.length < 2) throw new Error('Нужно минимум 2 точки');

    const names = parseNames(document.getElementById('names').value);
    const route = nearestNeighbor(points, 0);

    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += haversine(route[i-1].coord, route[i].coord);
    }

    const startPoint = route[0];
    const finishPoint = route[route.length - 1];
    const startLabel = names[startPoint.idx] || `${startPoint.coord[0].toFixed(4)}, ${startPoint.coord[1].toFixed(4)}`;
    const finishLabel = names[finishPoint.idx] || `${finishPoint.coord[0].toFixed(4)}, ${finishPoint.coord[1].toFixed(4)}`;

    result.innerHTML = `
      <div class="route-line">
        <span class="start">${escapeHtml(startLabel)}</span>
        <span class="arrow">→</span>
        <span class="finish">${escapeHtml(finishLabel)}</span>
      </div>
      <div class="distance-line">
        Пройдено: <span class="num">${total.toFixed(2)}</span> км
      </div>
    `;
  } catch (e) {
    result.innerHTML = '<div class="placeholder">Здесь появится маршрут…</div>';
    showError(e.message);
  }
}

function loadExample() {
  document.getElementById('input').value =
`55.7558,37.6173
59.9343,30.3351
56.8389,60.6057
54.9885,73.3242
56.0153,92.8932`;
  document.getElementById('names').value =
`Москва
Санкт-Петербург
Екатеринбург
Омск
Красноярск`;
  hideError();
}

function clearAll() {
  document.getElementById('input').value = '';
  document.getElementById('names').value = '';
  document.getElementById('result').innerHTML = '<div class="placeholder">Здесь появится маршрут…</div>';
  hideError();
}

// Инициализация при загрузке страницы
loadExample();
