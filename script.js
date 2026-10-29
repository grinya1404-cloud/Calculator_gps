const MINSK_CENTER = [53.9006, 27.5590];
const MINSK_RADIUS_KM = 15;

function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371.0;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isInMinsk([lat, lon]) {
  return haversine([lat, lon], MINSK_CENTER) <= MINSK_RADIUS_KM;
}

function splitRouteByRegion(points) {
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1];
    const b = points[i];
    const km = haversine(a, b);
    const from = isInMinsk(a) ? 'Минск' : 'Минская обл.';
    const to = isInMinsk(b) ? 'Минск' : 'Минская обл.';
    segments.push({ from, to, km, mixed: from !== to });
  }
  return segments;
}

function buildReport(points) {
  const segments = splitRouteByRegion(points);
  if (segments.length === 0) return 'Нет данных для отчёта.';

  const rows = [];
  let mixedKm = 0;
  let pendingTransition = null;

  for (const seg of segments) {
    if (seg.mixed) {
      mixedKm += seg.km;
      pendingTransition = { from: seg.from, to: seg.to };
      continue;
    }
    if (pendingTransition) {
      rows.push({ from: pendingTransition.from, to: pendingTransition.to, km: null });
      pendingTransition = null;
    }
    const last = rows[rows.length - 1];
    if (last && last.from === seg.from && last.to === seg.to) {
      last.km = (last.km || 0) + seg.km;
    } else {
      rows.push({ from: seg.from, to: seg.to, km: seg.km });
    }
  }

  if (pendingTransition) {
    rows.push({ from: pendingTransition.from, to: pendingTransition.to, km: 0 });
  }

  if (mixedKm > 0) {
    const cityRow = rows.find(r => r.from === 'Минск' && r.to === 'Минск');
    if (cityRow) cityRow.km = (cityRow.km || 0) + mixedKm;
    else rows.unshift({ from: 'Минск', to: 'Минск', km: mixedKm });
  }

  return rows
    .map(r => `${r.from}\t${r.to}\t${(r.km || 0).toFixed(1)}`)
    .join('\n');
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.add('show');
}
function hideError() {
  document.getElementById('error').classList.remove('show');
}

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

function loadExample() {
  document.getElementById('input').value =
`53.9006,27.5590
53.9100,27.5700
53.9300,27.6000
54.1000,27.8000
54.2000,28.0000
54.3000,28.1000
53.9300,27.6500
53.9006,27.5590`;
  hideError();
}

function clearAll() {
  document.getElementById('input').value = '';
  document.getElementById('result').innerHTML = '<div class="placeholder">Здесь появится отчёт…</div>';
  hideError();
}

loadExample();
