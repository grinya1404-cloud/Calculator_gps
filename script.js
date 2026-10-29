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

  const blocks = [];
  for (const seg of segments) {
    const cat = seg.mixed ? 'transition' : (seg.from === 'Минск' ? 'city' : 'region');
    const last = blocks[blocks.length - 1];
    if (last && last.cat === cat) {
      last.km += seg.km;
      if (cat === 'transition' && !last.dir) last.dir = { from: seg.from, to: seg.to };
    } else {
      blocks.push({
        cat, km: seg.km,
        dir: cat === 'transition' ? { from: seg.from, to: seg.to } : null
      });
    }
  }

  let mixedKm = 0;
  for (const b of blocks) if (b.cat === 'transition') mixedKm += b.km;

  const rows = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.cat === 'transition') {
      const next = blocks[i+1];
      if (next && next.cat === 'region') {
        rows.push({ from: 'Минск', to: 'Минская обл.', km: next.km });
        i += 2;
        continue;
      }
      if (next && next.cat === 'city') {
        rows.push({ from: 'Минская обл.', to: 'Минск', km: next.km + mixedKm });
        mixedKm = 0;
        i += 2;
        continue;
      }
      rows.push({ from: b.dir.from, to: b.dir.to, km: 0 });
      i += 1;
      continue;
    }
    if (b.cat === 'city') {
      rows.push({ from: 'Минск', to: 'Минск', km: b.km + mixedKm });
      mixedKm = 0;
    } else {
      rows.push({ from: 'Минская обл.', to: 'Минская обл.', km: b.km });
    }
    i += 1;
  }

  return rows
    .map(r => `${r.from}\t${r.to}\t${r.km.toFixed(1)}`)
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
`53.9006,27.5592
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
