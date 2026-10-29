// ─── Условная граница Минска (потом заменим на полигон) ───
const MINSK_CENTER = [53.9006, 27.5590];
const MINSK_RADIUS_KM = 15;

function isInMinsk([lat, lon]) {
  return haversine([lat, lon], MINSK_CENTER) <= MINSK_RADIUS_KM;
}

// ─── Геометрия ───
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371.0;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Разбиение маршрута на участки по принадлежности ───
// Возвращает массив { from, to, km }
// где from/to — 'Минск' или 'Минская обл.'
function splitRouteByRegion(points) {
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1];
    const b = points[i];
    const km = haversine(a, b);
    const inA = isInMinsk(a);
    const inB = isInMinsk(b);

    // Определяем категорию сегмента.
    // Если обе точки в одной зоне — сегмент целиком в этой зоне.
    // Если точки в разных зонах — считаем сегмент переходным
    // и относим его к зоне, где находится его середина.
    let zoneA, zoneB;
    if (inA && inB) {
      zoneA = zoneB = 'Минск';
    } else if (!inA && !inB) {
      zoneA = zoneB = 'Минская обл.';
    } else {
      // переход: относим к зоне середины сегмента
      const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2];
      const midZone = isInMinsk(mid) ? 'Минск' : 'Минская обл.';
      zoneA = zoneB = midZone;
    }
    segments.push({ from: zoneA, to: zoneB, km });
  }
  return segments;
}

// ─── Группировка подряд идущих сегментов одной категории ───
function groupSegments(segments) {
  const groups = [];
  for (const seg of segments) {
    const last = groups[groups.length - 1];
    if (last && last.from === seg.from && last.to === seg.to) {
      last.km += seg.km;
    } else {
      groups.push({ from: seg.from, to: seg.to, km: seg.km });
    }
  }
  return groups;
}

// ─── Формирование отчёта ───
function buildReport(points) {
  const segments = splitRouteByRegion(points);
  const groups = groupSegments(segments);
  if (groups.length === 0) return 'Нет данных для отчёта.';
  return groups.map(g => `${g.from} ${g.to} ${g.km.toFixed(1)}км`).join('\n');
}

// ─── Парсинг координат (без изменений) ───
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

// ─── UI ───
function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.add('show');
}
function hideError() { document.getElementById('error').classList.remove('show'); }

function calculate() {
  hideError();
  const result = document.getElementById('result');
  try {
    const points = parseCoords(document.getElementById('input').value);
    if (points.length < 2) throw new Error('Нужно минимум 2 точки');
    const report = buildReport(points);
    result.innerHTML = `<pre class="report">${escapeHtml(report)}</pre>`;
  } catch (e) {
    result.innerHTML = '<div class="placeholder">Здесь появится отчёт…</div>';
    showError(e.message);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function loadExample() {
  // Пример: старт в Минске, выезд за город, возврат в Минск
  document.getElementById('input').value =
`53.9006,27.5590
53.9500,27.6000
54.1000,27.8000
54.2000,28.0000
53.9500,27.6500
53.9006,27.5590`;
  hideError();
}

function clearAll() {
  document.getElementById('input').value = '';
  document.getElementById('result').innerHTML = '<div class="placeholder">Здесь появится отчёт…</div>';
  hideError();
}

loadExample();
