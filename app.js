const M = window.MILTON, $ = s => document.querySelector(s);
const K = M.track;
let city = M.cities[0], H = M.steps[0];

// ---- map
const map = L.map('map', { zoomControl: false }).setView([25.8, -84], 5);
L.control.zoom({ position: 'bottomright' }).addTo(map);
const base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors', maxZoom: 9 }).addTo(map);
let swapped = false;
base.on('tileerror', () => { if (swapped) return; swapped = true; map.removeLayer(base);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 9, className: 'osm-dark' }).addTo(map); });
const layer = L.layerGroup().addTo(map);
M.cities.forEach(c => c.m = L.circleMarker([c.lat, c.lon], { radius: 6, color: '#eaf2ff', weight: 2, fillColor: '#06122a', fillOpacity: 1 }).addTo(map).on('click', () => pick(c)));

// ---- storm position at any hour (linear interpolation)
function at(h) {
  h = Math.max(K[K.length - 1][0], Math.min(K[0][0], h));
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i], b = K[i + 1];
    if (h <= a[0] && h >= b[0]) { const t = (a[0] - h) / (a[0] - b[0]); return [h, a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])]; }
  }
}
const coneMi = lead => 20 + 1.45 * Math.max(0, lead);
function miles(la1, lo1, la2, lo2) {
  const r = x => x * Math.PI / 180, a = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
  return 3959 * 2 * Math.asin(Math.sqrt(a));
}

// ---- risk logic: worst point on the remaining forecast path, softened by uncertainty
function risk(c) {
  let best = { p: 0, w: 0, d: 0, h: 0 };
  for (let h = H; h >= -14; h -= 3) {
    const s = at(h), d = miles(c.lat, c.lon, s[1], s[2]), R = 60 + .6 * s[3];
    const sg = .5 * coneMi(H - h) + 8;
    let p = 1 / (1 + Math.exp((d - R) / sg));
    if (c.surge && s[3] >= 100) p = Math.min(1, p + .08);
    if (p > best.p) best = { p, w: s[3], d, h };
  }
  let lv = best.p < .3 ? 0 : best.p < .6 ? 1 : best.p < .85 ? 2 : 3;
  if (lv === 3 && best.w < 100) lv = 2; // top level needs strong winds
  return { ...best, lv };
}

const NAMES = ['Low', 'Elevated', 'High', 'Extreme'];
const ACTIONS = [
  ['Learn your evacuation zone.', 'Sign up for local alerts.'],
  ['Review your plan and check supplies.', 'Refill prescriptions.', 'Know your evacuation zone.'],
  ['Gather 3+ days of water, food and medicine.', 'Charge phones and fill your fuel tank.', 'Be ready to leave quickly.'],
  ['Leave now if an evacuation is ordered for your area.', 'Take medicine, documents, pets and chargers.', 'Do not stay in a mobile home or flood zone.']
];
function timeText() {
  if (H === 0) return 'Landfall';
  return H >= 48 ? `about ${Math.round(H / 24 * 10) / 10} days to landfall` : `about ${H} hours to landfall`;
}
function warning(c, r) {
  const t = timeText();
  const w = [
    `${c.name} is unlikely to see serious impacts from Milton. Keep checking updates.`,
    `Milton could affect ${c.name} (${t}). Review your plan now.`,
    `${c.name} is likely to see dangerous conditions (${t}). Finish preparing today.`,
    `Dangerous winds and flooding are expected in ${c.name} (${t}). ${c.zone}`
  ];
  return w[r.lv];
}

// ---- drawing
function draw() {
  layer.clearLayers();
  const now = at(H), obs = [], fut = [];
  for (let h = K[0][0]; h >= H; h -= 3) obs.push(at(h).slice(1, 3));
  for (let h = H; h >= -14; h -= 3) fut.push(at(h).slice(1, 3));
  L.polyline(obs, { color: '#5bc0ff', weight: 3 }).addTo(layer);
  L.polyline(fut, { color: '#5bc0ff', weight: 2, dashArray: '6 8' }).addTo(layer);
  for (let h = H; h >= -14; h -= 6) { const s = at(h); L.circle([s[1], s[2]], { radius: coneMi(H - h) * 1609, stroke: false, fillColor: '#5bc0ff', fillOpacity: .09 }).addTo(layer); }
  L.circleMarker([now[1], now[2]], { radius: 9, color: '#eaf2ff', weight: 3, fillColor: '#5bc0ff', fillOpacity: 1 }).addTo(layer).bindTooltip(`Milton · ${Math.round(now[3])} mph`);
  M.cities.forEach(c => { const lv = risk(c).lv; c.m.setStyle({ color: lv > 1 ? '#ff6b4a' : '#eaf2ff', fillColor: lv > 1 ? '#ff6b4a' : '#06122a', weight: 2 + lv }); if (c === city && c.m.getTooltip()) { c.m.setTooltipContent(`${c.name} · ${NAMES[lv]}`); const t = c.m.getTooltip().getElement(); if (t) t.classList.toggle('hi', lv > 1); } });
}
function render() {
  const r = risk(city), now = at(H);
  const when = new Date(M.landfall - H * 36e5).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  $('#when').textContent = `${when} ET`; $('#lead').textContent = H === 0 ? 'Landfall' : (H >= 48 ? `${Math.round(H / 24 * 10) / 10} days before landfall` : `${H} hours before landfall`);
  const trackConf = H > 72 ? 'Moderate' : H > 24 ? 'High' : 'Very high';
  $('#risk').innerHTML = `
    <p class="k">${city.name}</p>
    <div class="lvlname">${NAMES[r.lv]} risk</div>
    <div class="lvl ${r.lv > 1 ? 'hot' : ''}" role="img" aria-label="Risk level ${r.lv + 1} of 4">${[0, 1, 2, 3].map(i => `<i class="${i <= r.lv ? 'f' : ''}"></i>`).join('')}</div>
    <p class="warn">${warning(city, r)}</p>
    <h3>How sure is this?</h3>
    <p><b>Path:</b> ${trackConf} confidence. It could be off by about ${Math.round(coneMi(H))} miles at this range.</p>
    <p><b>Strength:</b> Lower confidence. Wind speed could differ by ${Math.round(10 + .2 * H)} mph or more.</p>
    <details><summary>Why this warning</summary>
      <p class="k">Milton is now at ${Math.round(now[3])} mph. Its closest forecast approach to ${city.name} is about ${Math.round(r.d)} miles, with winds near ${Math.round(r.w)} mph. Chance of damaging impacts: roughly ${Math.round(r.p * 100)}%.</p></details>`;
  $('#act').innerHTML = `<h2>What to do</h2><p class="k">Steps for ${NAMES[r.lv].toLowerCase()} risk in ${city.name}.</p>
    <ul>${ACTIONS[r.lv].map(a => `<li>${a}</li>`).join('')}</ul>
    <h3>If something is in your way</h3>
    <ul><li><b>No car:</b> ask your county about free evacuation transport.</li><li><b>Medical needs:</b> register with your county's special-needs program.</li><li><b>Pets:</b> look for pet-friendly shelters before you need one.</li><li><b>Cost:</b> public shelters are free.</li></ul>`;
  draw();
}

// ---- controls
function pick(c) { city = c; M.cities.forEach(x => x.m.unbindTooltip()); c.m.bindTooltip(c.name, { permanent: true, direction: 'right', offset: [8, 0], className: 'ct' }); document.querySelectorAll('#cities button').forEach(b => b.classList.toggle('sel', b.dataset.n === c.name)); map.panTo([c.lat, c.lon]); render(); }
$('#cities').innerHTML = M.cities.map(c => `<button data-n="${c.name}">${c.name}</button>`).join('');
$('#cities').onclick = e => { const b = e.target.closest('button'); if (b) { pick(M.cities.find(c => c.name === b.dataset.n)); toggle(false); } };
const sl = $('#slider'); sl.max = M.steps.length - 1;
sl.oninput = () => { H = M.steps[sl.value]; render(); };
function openPanel(id) { document.querySelectorAll('#panel section').forEach(t => t.classList.toggle('on', t.id === id)); $('#panel').classList.add('open'); $('#panel').setAttribute('aria-hidden', 'false'); document.body.classList.add('pop'); }
function closePanel() { $('#panel').classList.remove('open'); $('#panel').setAttribute('aria-hidden', 'true'); document.body.classList.remove('pop'); }
document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { openPanel(b.dataset.open); toggle(false); });
$('#closeBtn').onclick = closePanel;
function toggle(o) { $('#drawer').classList.toggle('open', o); $('#scrim').classList.toggle('on', o); $('#menuBtn').setAttribute('aria-expanded', o); }
$('#menuBtn').onclick = () => toggle(!$('#drawer').classList.contains('open'));
$('#scrim').onclick = () => toggle(false);
document.onkeydown = e => { if (e.key === 'Escape') { toggle(false); closePanel(); } };
pick(city);
