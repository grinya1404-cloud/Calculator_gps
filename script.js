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
