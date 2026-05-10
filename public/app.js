// ==================== THEME ====================
function getTheme() { return localStorage.getItem('seedvault_theme') || 'light'; }
function setTheme(theme) {
  localStorage.setItem('seedvault_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() { setTheme(getTheme() === 'light' ? 'dark' : 'light'); render(); }

// ==================== AUTH ====================
const TOKEN_KEY = 'seedvault_token';
const USERNAME_KEY = 'seedvault_username';
const ROLE_KEY = 'seedvault_role';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getRole() { return localStorage.getItem(ROLE_KEY); }
function setToken(token, username, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(ROLE_KEY, role || 'standard');
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
}

async function checkAuth() {
  try {
    const status = await fetch('/api/auth/status').then(r => r.json());
    if (!status.hasUsers) { showSetup(); return false; }
    const token = getToken();
    if (!token) { showLogin(); return false; }
    const test = await api('/api/stats');
    if (test.error === 'Unauthorized' || test.error === 'Invalid or expired token' || test.error) {
      clearToken(); showLogin(); return false;
    }
    showApp(); return true;
  } catch (err) { clearToken(); showLogin(); return false; }
}

function showLogin() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('setup-form').classList.add('hidden');
}

function showSetup() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('setup-form').classList.remove('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const username = localStorage.getItem(USERNAME_KEY);
  if (username) document.getElementById('nav-username').textContent = username;
}

async function submitLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Please enter username and password'; errEl.classList.remove('hidden'); return; }
  clearToken();
  try {
    const result = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
    if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
    setToken(result.token, result.username, result.role);
    showApp(); await loadAll(); render();
  } catch (err) { errEl.textContent = 'Login failed. Please try again.'; errEl.classList.remove('hidden'); }
}

async function submitSetup() {
  const username = document.getElementById('setup-username').value.trim();
  const password = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-confirm').value;
  const errEl = document.getElementById('setup-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Please fill in all fields'; errEl.classList.remove('hidden'); return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  if (password !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
  try {
    const result = await fetch('/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
    if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
    setToken(result.token, result.username, result.role);
    showApp(); await loadAll(); render();
  } catch (err) { errEl.textContent = 'Setup failed. Please try again.'; errEl.classList.remove('hidden'); }
}

function logout() { clearToken(); showLogin(); }

// ==================== STATE ====================
const state = {
  page: 'dashboard',
  varieties: [], seedLots: [], plants: [], projects: [],
  harvest: [], species: [], stats: {}, viability: [],
  germination: [], users: [], locations: [], sources: [],
  crosses: [], observations: [], amendments: [],
  settings: {}
};

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

async function uploadPhoto(url, file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: formData });
  return res.json();
}

async function loadAll() {
  const calls = [
    api('/api/varieties'), api('/api/seed-lots'), api('/api/plants'), api('/api/projects'),
    api('/api/harvest'), api('/api/species'), api('/api/stats'), api('/api/viability'),
    api('/api/germination'), api('/api/locations'), api('/api/sources'),
    api('/api/crosses'), api('/api/observations'), api('/api/amendments'),
    api('/api/settings'),
  ];
  if (getRole() === 'admin') calls.push(api('/api/users')); // index 15
  const results = await Promise.all(calls);
  state.varieties = Array.isArray(results[0]) ? results[0] : [];
  state.seedLots = Array.isArray(results[1]) ? results[1] : [];
  state.plants = Array.isArray(results[2]) ? results[2] : [];
  state.projects = Array.isArray(results[3]) ? results[3] : [];
  state.harvest = Array.isArray(results[4]) ? results[4] : [];
  state.species = Array.isArray(results[5]) ? results[5] : [];
  state.stats = results[6] || {};
  state.viability = Array.isArray(results[7]) ? results[7] : [];
  state.germination = Array.isArray(results[8]) ? results[8] : [];
  state.locations = Array.isArray(results[9]) ? results[9] : [];
  state.sources = Array.isArray(results[10]) ? results[10] : [];
  state.crosses = Array.isArray(results[11]) ? results[11] : [];
  state.observations = Array.isArray(results[12]) ? results[12] : [];
  state.amendments = Array.isArray(results[13]) ? results[13] : [];
  state.settings = results[14] && !Array.isArray(results[14]) ? results[14] : {};
  state.users = results[15] && Array.isArray(results[15]) ? results[15] : [];
}

function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.nav-gear').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.getElementById('mobile-menu').classList.add('hidden');
  render();
}

function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function render() {
  const main = document.getElementById('main-content');
  switch (state.page) {
    case 'dashboard': main.innerHTML = renderDashboard(); setTimeout(loadWeather, 100); break;
    case 'varieties': main.innerHTML = renderVarieties(); break;
    case 'seedlots': main.innerHTML = renderSeedLots(); break;
    case 'plants': main.innerHTML = renderPlants(); break;
    case 'harvest': main.innerHTML = renderHarvest(); break;
    case 'projects': main.innerHTML = renderProjects(); break;
    case 'germination': main.innerHTML = renderGermination(); break;
    case 'locations': main.innerHTML = renderLocations(); break;
    case 'crosses': main.innerHTML = renderCrosses(); break;
    case 'observations': main.innerHTML = renderObservations(); break;
    case 'amendments': main.innerHTML = renderAmendments(); break;
    case 'settings': main.innerHTML = renderSettings(); break;
  }
}

function formatFrostDate(mmdd) {
  if (!mmdd) return '—';
  const [m, d] = mmdd.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m)-1] + ' ' + parseInt(d);
}

function getPlantingWindow(lot) {
  const settings = state.settings;
  if (!settings.last_frost_date) return '';
  const year = new Date().getFullYear();
  const [lm, ld] = settings.last_frost_date.split('-').map(Number);
  const [fm, fd] = (settings.first_frost_date || '10-15').split('-').map(Number);
  const lastFrost = new Date(year, lm-1, ld);
  const firstFrost = new Date(year, fm-1, fd);
  const today = new Date();
  let lines = [];

  if (lot.start_indoors_weeks && !lot.direct_sow) {
    const startIndoors = new Date(lastFrost);
    startIndoors.setDate(startIndoors.getDate() - (lot.start_indoors_weeks * 7));
    const isPast = startIndoors < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>🏠 Start Indoors</span>
      <span style="font-weight:600;color:${isPast ? '#ef4444' : '#22c55e'};">${startIndoors.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (past)' : ''}</span>
    </div>`);
  }

  if (lot.direct_sow !== false) {
    const directSow = new Date(lastFrost);
    const isPast = directSow < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>🌱 Direct Sow After</span>
      <span style="font-weight:600;color:${isPast ? '#f59e0b' : '#22c55e'};">${directSow.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (ongoing)' : ''}</span>
    </div>`);
  }

  if (lot.days_to_harvest) {
    const dth = parseInt(lot.days_to_harvest) || parseInt((lot.days_to_harvest || '').split('-')[1]) || 70;
    const lastPlant = new Date(firstFrost);
    lastPlant.setDate(lastPlant.getDate() - dth);
    const isPast = lastPlant < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>⏰ Last Planting Date</span>
      <span style="font-weight:600;color:${isPast ? '#ef4444' : '#22c55e'};">${lastPlant.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (past)' : ''}</span>
    </div>`);

    if (lot.days_to_harvest) {
      lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span>🎯 Expected Harvest</span>
        <span style="font-weight:600;">${lot.days_to_harvest} days after planting</span>
      </div>`);
    }
  }

  if (lot.soil_temp_min_f) {
    lines.push(`<div style="display:flex;justify-content:space-between;">
      <span>🌡️ Min Soil Temp</span>
      <span style="font-weight:600;">${lot.soil_temp_min_f}°F</span>
    </div>`);
  }

  return lines.length > 0 ? lines.join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">Add growing info to see planting dates.</p>';
}

async function loadWeather() {
  const zip = state.settings.zip_code;
  if (!zip) return;
  const weatherEl = document.getElementById('weather-data');
  if (!weatherEl) return;
  try {
    // Convert zip to lat/long using free geocoding
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&language=en&format=json`).then(r => r.json());
    if (!geo.results || geo.results.length === 0) { weatherEl.textContent = 'Location not found'; return; }
    const { latitude, longitude, name, admin1 } = geo.results[0];
    const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`).then(r => r.json());
    const c = weather.current;
    const codes = {0:'☀️ Clear',1:'🌤️ Mainly Clear',2:'⛅ Partly Cloudy',3:'☁️ Overcast',45:'🌫️ Foggy',48:'🌫️ Icy Fog',51:'🌦️ Light Drizzle',61:'🌧️ Light Rain',63:'🌧️ Rain',65:'🌧️ Heavy Rain',71:'🌨️ Light Snow',73:'❄️ Snow',75:'❄️ Heavy Snow',80:'🌦️ Showers',95:'⛈️ Thunderstorm'};
    const desc = codes[c.weather_code] || '🌡️';
    weatherEl.innerHTML = `<strong style="font-size:1.1rem;">${Math.round(c.temperature_2m)}°F</strong> <span>${desc}</span> <span style="color:var(--text-muted);font-size:0.85rem;">💨 ${Math.round(c.wind_speed_10m)} mph${c.precipitation > 0 ? ' · 🌧️ ' + c.precipitation + '"' : ''}</span>`;
    if (state.settings.location_name !== (name + ', ' + admin1)) {
      await api('/api/settings', 'PUT', { key: 'location_name', value: name + ', ' + admin1 });
    }
  } catch (err) { if (weatherEl) weatherEl.textContent = 'Weather unavailable'; }
}

function printSeasonSummary() {
  const currentYear = new Date().getFullYear();
  const thisYearPlants = state.plants.filter(p => p.season_year === currentYear);
  const thisYearHarvest = state.harvest.filter(h => h.harvest_date && h.harvest_date.startsWith(currentYear.toString()));
  const thisYearAmendments = state.amendments.filter(a => a.amendment_date && a.amendment_date.startsWith(currentYear.toString()));
  const thisYearGerm = state.germination.filter(g => g.date_started && g.date_started.startsWith(currentYear.toString()));
  const selectedPlants = thisYearPlants.filter(p => p.selected_for_seed);

  const avgGermRate = thisYearGerm.filter(g => g.seeds_germinated !== null).length > 0
    ? Math.round(thisYearGerm.filter(g => g.seeds_germinated !== null)
        .reduce((sum, g) => sum + (g.seeds_germinated / g.seeds_planted * 100), 0)
        / thisYearGerm.filter(g => g.seeds_germinated !== null).length)
    : null;

  const plantsByVariety = {};
  thisYearPlants.forEach(p => {
    const v = p.variety_name || 'Unknown';
    plantsByVariety[v] = (plantsByVariety[v] || 0) + 1;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SeedVault Season Summary ${currentYear}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24pt; color: #2d5a27; margin-bottom: 4px; }
        h2 { font-size: 14pt; color: #2d5a27; margin: 20px 0 10px; border-bottom: 2px solid #2d5a27; padding-bottom: 4px; }
        h3 { font-size: 11pt; margin-bottom: 6px; }
        .subtitle { font-size: 11pt; color: #666; margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; }
        .stat-number { font-size: 22pt; font-weight: bold; color: #2d5a27; }
        .stat-label { font-size: 8pt; color: #666; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
        th { background: #2d5a27; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-star { color: #f59e0b; }
        .footer { margin-top: 30px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 15px; } }
      </style>
    </head>
    <body>
      <h1>🌱 SeedVault</h1>
      <div class="subtitle">Season Summary — ${currentYear} · Generated ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>

      <div class="stats-grid">
        <div class="stat-box"><div class="stat-number">${thisYearPlants.length}</div><div class="stat-label">Plants This Season</div></div>
        <div class="stat-box"><div class="stat-number">${selectedPlants.length}</div><div class="stat-label">Selected for Seed Saving</div></div>
        <div class="stat-box"><div class="stat-number">${thisYearHarvest.length}</div><div class="stat-label">Harvest Records</div></div>
        <div class="stat-box"><div class="stat-number">${avgGermRate !== null ? avgGermRate + '%' : '—'}</div><div class="stat-label">Avg Germination Rate</div></div>
      </div>

      <h2>🪴 Plants This Season</h2>
      ${thisYearPlants.length === 0 ? '<p style="color:#666;font-size:9pt;">No plants logged this season.</p>' : `
      <table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Location</th><th>Season</th><th>Seed Save</th></tr></thead>
        <tbody>
          ${thisYearPlants.map(p => `<tr>
            <td><code>${p.designation}</code></td>
            <td>${p.variety_name || '—'}</td>
            <td>${p.location_name || '—'}</td>
            <td>${p.season_type}</td>
            <td>${p.selected_for_seed ? '<span class="badge-star">⭐ Selected</span>' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}

      <h2>🫙 Seed Lots in Vault</h2>
      <table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Quantity</th><th>Storage</th><th>Germ Rate</th></tr></thead>
        <tbody>
          ${state.seedLots.map(l => {
            const qty = l.quantity_unit === 'seeds' || !l.quantity_unit
              ? (l.quantity_estimate ? l.quantity_estimate + ' seeds' : '—')
              : (l.quantity_weight ? l.quantity_weight + l.quantity_unit : '—');
            return `<tr>
              <td><code>${l.designation}</code></td>
              <td>${l.variety_name || l.variety_code}</td>
              <td><span class="badge badge-green">G${l.generation}</span></td>
              <td>${l.year_saved}</td>
              <td>${qty}</td>
              <td>${l.storage_location || '—'}</td>
              <td>${l.germination_rate ? l.germination_rate + '%' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      ${thisYearGerm.length > 0 ? `
      <h2>🌿 Germination Tests</h2>
      <table>
        <thead><tr><th>Seed Lot</th><th>Started</th><th>Planted</th><th>Germinated</th><th>Rate</th><th>Days</th></tr></thead>
        <tbody>
          ${thisYearGerm.map(g => {
            const rate = g.seeds_germinated !== null ? Math.round(g.seeds_germinated / g.seeds_planted * 100) : null;
            return `<tr>
              <td><code>${g.seed_lot_designation}</code></td>
              <td>${new Date(g.date_started).toLocaleDateString()}</td>
              <td>${g.seeds_planted}</td>
              <td>${g.seeds_germinated !== null ? g.seeds_germinated : '—'}</td>
              <td>${rate !== null ? rate + '%' : '—'}</td>
              <td>${g.days_to_germination !== null ? g.days_to_germination + 'd' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}

      ${thisYearAmendments.length > 0 ? `
      <h2>🌿 Amendments & Fertilizer</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Plant/Location</th><th>Amount</th><th>Method</th></tr></thead>
        <tbody>
          ${thisYearAmendments.map(a => `<tr>
            <td>${new Date(a.amendment_date).toLocaleDateString()}</td>
            <td>${a.type}</td>
            <td>${a.product_name || '—'}</td>
            <td>${a.plant_designation || a.location_name || '—'}</td>
            <td>${a.amount || '—'}</td>
            <td>${a.method || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}

      ${thisYearHarvest.length > 0 ? `
      <h2>📋 Harvest Log</h2>
      <table>
        <thead><tr><th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Weight</th><th>Seeds</th><th>Method</th></tr></thead>
        <tbody>
          ${thisYearHarvest.map(h => `<tr>
            <td>${new Date(h.harvest_date).toLocaleDateString()}</td>
            <td><code>${h.plant_designation}</code></td>
            <td>${h.variety_name || '—'}</td>
            <td>${h.fruit_length_inches ? h.fruit_length_inches + '"' : '—'}</td>
            <td>${h.fruit_weight_oz ? h.fruit_weight_oz + ' oz' : '—'}</td>
            <td>${h.seed_count || '—'}</td>
            <td>${h.processing_method || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}

      <div class="footer">Generated by SeedVault · github.com/Duhato/seedvault · ${new Date().toISOString()}</div>
      <script>setTimeout(() => window.print(), 400);</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function renderDashboard() {
  const s = state.stats;
  const recentLots = [...state.seedLots].slice(0, 5);
  const selectedPlants = state.plants.filter(p => p.selected_for_seed);
  const pendingCrosses = state.crosses.filter(c => c.success === null);
  const currentYear = new Date().getFullYear();

  // Chart data
  const speciesCounts = {};
  state.seedLots.forEach(l => {
    const sp = l.species_code || 'Other';
    speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
  });

  const plantsByVariety = {};
  state.plants.filter(p => p.season_year === currentYear).forEach(p => {
    const v = p.variety_name || p.variety_code || 'Unknown';
    plantsByVariety[v] = (plantsByVariety[v] || 0) + 1;
  });

  const recentAmendments = state.amendments.slice(0, 5);
  const totalHarvest = state.harvest.length;
  const totalGermTests = state.germination.length;
  const avgGermRate = state.germination.filter(g => g.seeds_germinated !== null).length > 0
    ? Math.round(state.germination.filter(g => g.seeds_germinated !== null)
        .reduce((sum, g) => sum + (g.seeds_germinated / g.seeds_planted * 100), 0)
        / state.germination.filter(g => g.seeds_germinated !== null).length)
    : null;

  return `
    <div class="page-header">
      <h1 class="page-title">🌱 SeedVault Dashboard</h1>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="color:var(--text-muted);font-size:0.9rem;">${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span>
        <button class="btn btn-secondary btn-sm" onclick="printSeasonSummary()">🖨️ Season Summary</button>
      </div>
    </div>
    ${(() => {
      if (!state.settings.last_frost_date) return '';
      const today = new Date();
      const year = today.getFullYear();
      const [lm, ld] = state.settings.last_frost_date.split('-').map(Number);
      const lastFrost = new Date(year, lm-1, ld);
      const daysUntil = Math.ceil((lastFrost - today) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 14) {
        return `<div class="card" style="border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">🌡️</span>
            <div>
              <div style="font-weight:700;color:#f59e0b;">Frost Risk — Last Average Frost in ${daysUntil === 0 ? 'Today' : daysUntil + ' days'}</div>
              <div style="font-size:0.85rem;color:var(--text-muted);">Average last frost date is ${formatFrostDate(state.settings.last_frost_date)}. Protect tender plants.</div>
            </div>
          </div>
        </div>`;
      }
      const [fm, fd] = (state.settings.first_frost_date || '10-15').split('-').map(Number);
      const firstFrost = new Date(year, fm-1, fd);
      const daysUntilFirst = Math.ceil((firstFrost - today) / (1000 * 60 * 60 * 24));
      if (daysUntilFirst >= 0 && daysUntilFirst <= 30) {
        return `<div class="card" style="border-left:4px solid #ef4444;padding:12px 16px;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">❄️</span>
            <div>
              <div style="font-weight:700;color:#ef4444;">First Fall Frost in ${daysUntilFirst} days</div>
              <div style="font-size:0.85rem;color:var(--text-muted);">Average first frost date is ${formatFrostDate(state.settings.first_frost_date)}. Plan your final harvests.</div>
            </div>
          </div>
        </div>`;
      }
      return '';
    })()}
    ${state.settings.zip_code ? `
    <div id="weather-widget" class="card" style="padding:12px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:0.85rem;font-weight:700;color:var(--text-muted);margin-bottom:4px;">🌤️ ${state.settings.location_name || 'Local Weather'}</div>
          <div id="weather-data" style="font-size:0.9rem;color:var(--text-muted);">Loading weather...</div>
        </div>
        ${state.settings.last_frost_date ? `
        <div style="text-align:right;">
          <div style="font-size:0.8rem;color:var(--text-muted);">Last Frost</div>
          <div style="font-weight:600;color:var(--green-mid);">${formatFrostDate(state.settings.last_frost_date)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">First Frost</div>
          <div style="font-weight:600;color:#f59e0b;">${formatFrostDate(state.settings.first_frost_date)}</div>
        </div>` : ''}
      </div>
    </div>` : ''}
    <div class="card" style="padding:12px 16px;">
      <div style="font-size:0.85rem;font-weight:700;color:var(--text-muted);margin-bottom:10px;">⚡ Quick Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="showAddHarvest()">📋 Log Harvest</button>
        <button class="btn btn-primary btn-sm" onclick="showAddAmendment()">🌿 Log Amendment</button>
        <button class="btn btn-primary btn-sm" onclick="showAddObservation()">🔍 Log Observation</button>
        <button class="btn btn-primary btn-sm" onclick="showAddGermination()">🌱 Start Germ Test</button>
        <button class="btn btn-secondary btn-sm" onclick="showAddPlants()">🪴 Add Plants</button>
        <button class="btn btn-secondary btn-sm" onclick="showAddSeedLot()">🫙 Add Seed Lot</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card clickable" onclick="navigate('varieties')"><div class="stat-number">${s.varieties || 0}</div><div class="stat-label">Varieties</div></div>
      <div class="stat-card clickable" onclick="navigate('seedlots')"><div class="stat-number">${s.seedLots || 0}</div><div class="stat-label">Seed Lots</div></div>
      <div class="stat-card clickable" onclick="navigate('plants')"><div class="stat-number">${s.activePlants || 0}</div><div class="stat-label">Plants This Season</div></div>
      <div class="stat-card clickable" onclick="navigate('projects')"><div class="stat-number">${s.activeProjects || 0}</div><div class="stat-label">Active Projects</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
      <div class="stat-card" style="cursor:default;">
        <div class="stat-number" style="color:${avgGermRate >= 80 ? '#22c55e' : avgGermRate >= 50 ? '#f59e0b' : '#ef4444'}">${avgGermRate !== null ? avgGermRate + '%' : '—'}</div>
        <div class="stat-label">Avg Germination Rate</div>
      </div>
      <div class="stat-card clickable" onclick="navigate('harvest')">
        <div class="stat-number">${totalHarvest}</div>
        <div class="stat-label">Harvest Records</div>
      </div>
      <div class="stat-card clickable" onclick="navigate('amendments')">
        <div class="stat-number">${state.amendments.length}</div>
        <div class="stat-label">Amendments Logged</div>
      </div>
    </div>
    ${Object.keys(speciesCounts).length > 0 ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div class="card">
        <div class="card-title">🫙 Seed Lots by Species</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${Object.entries(speciesCounts).sort((a,b) => b[1]-a[1]).map(([sp, count]) => {
            const pct = Math.round(count / state.seedLots.length * 100);
            const colors = {CUC:'#22c55e', TOM:'#ef4444', PEP:'#f59e0b', CAR:'#f97316', Other:'#6b7280'};
            const color = colors[sp] || '#6b7280';
            return `<div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;">
                <span>${sp}</span><span style="color:var(--text-muted);">${count} lot${count !== 1 ? 's' : ''}</span>
              </div>
              <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:${color};width:${pct}%;height:8px;border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">🪴 Plants This Season by Variety</div>
        ${Object.keys(plantsByVariety).length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No plants this season yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${Object.entries(plantsByVariety).sort((a,b) => b[1]-a[1]).map(([v, count]) => {
            const total = Object.values(plantsByVariety).reduce((a,b) => a+b, 0);
            const pct = Math.round(count / total * 100);
            return `<div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;">
                <span>${v}</span><span style="color:var(--text-muted);">${count} plant${count !== 1 ? 's' : ''}</span>
              </div>
              <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:var(--green-mid);width:${pct}%;height:8px;border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>
    </div>` : ''}
    ${recentAmendments.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">🌿 Recent Amendments</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${recentAmendments.map(a => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;font-size:0.85rem;">
            <div>
              <span class="tag tag-active">${a.type}</span>
              ${a.product_name ? `<strong style="margin-left:6px;">${a.product_name}</strong>` : ''}
              ${a.plant_designation ? `<span style="margin-left:6px;color:var(--text-muted);">${a.plant_designation}</span>` : ''}
              ${a.location_name ? `<span style="margin-left:6px;color:var(--text-muted);">📍 ${a.location_name}</span>` : ''}
            </div>
            <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    ${state.viability.length > 0 ? `
    <div class="card" style="border-left:4px solid #ef4444;">
      <div class="card-title">⚠️ Seed Viability Warnings</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${state.viability.map(lot => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:${lot.status === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};border-radius:6px;">
            <div><span class="designation" style="cursor:pointer;" onclick="showSeedLotDetail('${lot.designation}')">${lot.designation}</span>
            <span style="margin-left:8px;font-size:0.85rem;color:var(--text-muted);">${lot.variety_name}</span></div>
            <span style="font-size:0.85rem;font-weight:700;color:${lot.status === 'expired' ? '#ef4444' : '#f59e0b'};">
              ${lot.status === 'expired' ? '🔴 Expired' : '🟡 Expires in ' + lot.yearsLeft + ' year' + (lot.yearsLeft === 1 ? '' : 's')}
            </span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card">
        <div class="card-title">🫙 Recent Seed Lots</div>
        ${recentLots.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No seed lots yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentLots.map(lot => `
            <div class="clickable-row" onclick="showSeedLotDetail('${lot.designation}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${lot.designation}</span>
              <span class="gen-badge">G${lot.generation}</span>
            </div>
          `).join('')}
        </div>`}
      </div>
      <div class="card">
        <div class="card-title">⭐ Selected for Seed Saving</div>
        ${selectedPlants.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No plants flagged yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${selectedPlants.map(p => `
            <div class="clickable-row" onclick="navigate('plants')" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${p.designation}</span>
              <span class="seed-star">⭐</span>
            </div>
          `).join('')}
        </div>`}
      </div>
    </div>
    ${pendingCrosses.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--green-mid);">
      <div class="card-title">🌸 Pending Cross Pollinations</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${pendingCrosses.map(c => `
          <div class="clickable-row" onclick="navigate('crosses')" style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
            <div>
              <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
              <span style="margin:0 6px;color:var(--text-muted);">×</span>
              <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-muted);">${c.date_pollinated ? new Date(c.date_pollinated).toLocaleDateString() : 'Not yet pollinated'}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    <div class="card">
      <div class="card-title">🧬 Active Breeding Projects</div>
      ${state.projects.filter(p => p.status === 'active').length === 0
        ? '<p style="color:var(--text-muted);font-size:0.9rem;">No active breeding projects.</p>'
        : state.projects.filter(p => p.status === 'active').map(p => `
          <div class="clickable-row" onclick="navigate('projects')" style="padding:12px;background:var(--green-bg);border-radius:6px;margin-bottom:8px;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${p.name}</strong><span class="designation">${p.code}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${p.description || ''}</div>
          </div>
        `).join('')}
    </div>
    ${state.locations.length > 0 ? `
    <div class="card">
      <div class="card-title">📍 Garden Locations</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
        ${state.locations.filter(l => l.active).map(loc => {
          const plantCount = state.plants.filter(p => p.location_id === loc.id && p.season_year === new Date().getFullYear()).length;
          return `<div class="clickable-row" onclick="navigate('locations')" style="padding:12px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
            <div style="font-weight:700;font-size:0.9rem;">${loc.name}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${loc.type}</div>
            <div style="font-size:0.8rem;margin-top:4px;"><span class="gen-badge">${plantCount}</span> plant${plantCount !== 1 ? 's' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;
}

// FULL PHOTO VIEWER
function showFullPhoto(path, title) {
  openModal(title, `
    <img src="${path}" style="width:100%;border-radius:8px;border:2px solid var(--border);">
    <div class="form-actions" style="margin-top:12px;">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `);
}

// LINEAGE TREE
function showLineageTree(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;

  // Build lineage chain - find all related lots by variety
  const varietyLots = state.seedLots
    .filter(l => l.variety_code === lot.variety_code)
    .sort((a, b) => a.generation - b.generation);

  // Build ancestor chain
  function buildChain(desig, visited = new Set()) {
    if (!desig || visited.has(desig)) return null;
    visited.add(desig);
    const l = state.seedLots.find(x => x.designation === desig);
    if (!l) return { designation: desig, unknown: true };
    const plants = state.plants.filter(p => p.seed_lot_designation === desig);
    const children = state.seedLots.filter(x =>
      x.mother_designation && plants.some(p => p.designation === x.mother_designation) ||
      x.variety_code === l.variety_code && x.generation === l.generation + 1
    );
    return {
      designation: desig,
      lot: l,
      plants: plants.length,
      children: children.map(c => buildChain(c.designation, visited)).filter(Boolean)
    };
  }

  // Find root — G0 or earliest generation of this variety
  const root = varietyLots[0];
  const chain = buildChain(root.designation);

  function renderNode(node, depth = 0, isTarget = false) {
    if (!node) return '';
    const isCurrentLot = node.designation === designation;
    const bgColor = isCurrentLot ? 'var(--green-mid)' : 'var(--green-bg)';
    const textColor = isCurrentLot ? '#fff' : 'var(--text)';
    const borderColor = isCurrentLot ? 'var(--green-mid)' : 'var(--border)';
    const l = node.lot;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
        ${depth > 0 ? '<div style="width:2px;height:20px;background:var(--border);"></div>' : ''}
        <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:8px;padding:10px 14px;min-width:180px;text-align:center;cursor:pointer;" onclick="closeModal();showSeedLotDetail('${node.designation}')">
          <div style="font-family:monospace;font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};">${node.designation}</div>
          ${l ? `<div style="font-weight:700;font-size:0.9rem;color:${textColor};margin-top:2px;">${l.variety_name || l.variety_code}</div>` : ''}
          ${l ? `<div style="font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};">G${l.generation} · ${l.year_saved}</div>` : ''}
          ${node.plants > 0 ? `<div style="font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.7)' : 'var(--green-mid)'};">${node.plants} plant${node.plants !== 1 ? 's' : ''} grown</div>` : ''}
        </div>
        ${node.children && node.children.length > 0 ? `
          <div style="display:flex;gap:16px;align-items:flex-start;">
            ${node.children.map(child => renderNode(child, depth + 1)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  openModal('🌿 Lineage — ' + (lot.variety_name || lot.variety_code), `
    <div style="overflow-x:auto;padding:8px;">
      <div style="display:flex;justify-content:center;min-width:300px;">
        ${chain ? renderNode(chain) : '<p style="color:var(--text-muted);">No lineage data found.</p>'}
      </div>
    </div>
    <div style="margin-top:16px;font-size:0.85rem;color:var(--text-muted);text-align:center;">
      Highlighted node is the current seed lot. Click any node to view details.
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `);
}

// SEED LOT DETAIL VIEW
function showSeedLotDetail(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const plants = state.plants.filter(p => p.seed_lot_designation === designation);
  const germTests = state.germination.filter(g => g.seed_lot_designation === designation);
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3, BEAN: 3, LETT: 3, SPIN: 3, CORN: 2, ONI: 1, PEA: 3, SQUA: 4, MELO: 5, HERB: 3 };
  const maxYears = viabilityYears[lot.species_code] || 3;
  const yearsLeft = maxYears - (new Date().getFullYear() - lot.year_saved);
  const viabilityColor = yearsLeft <= 0 ? '#ef4444' : yearsLeft <= 1 ? '#f59e0b' : '#22c55e';
  const viabilityText = yearsLeft <= 0 ? '🔴 Expired' : yearsLeft <= 1 ? '🟡 Expires in ' + yearsLeft + ' year' + (yearsLeft === 1 ? '' : 's') : '🟢 Good — ' + yearsLeft + ' years left';

  const qtyDisplay = lot.quantity_unit === 'seeds' || !lot.quantity_unit
    ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—')
    : (lot.quantity_weight ? (parseFloat(lot.quantity_weight) % 1 === 0 ? parseInt(lot.quantity_weight) : parseFloat(lot.quantity_weight)) + ' ' + lot.quantity_unit : '—');

  openModal('🫙 ' + designation, `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;">${lot.variety_name || lot.variety_code}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Generation ${lot.generation} · Saved ${lot.year_saved}</div>
        </div>
        <span style="font-weight:700;color:${viabilityColor};">${viabilityText}</span>
      </div>

      ${lot.packet_front_path || lot.packet_back_path ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${lot.packet_front_path ? `<div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Front</div>
          <img src="${lot.packet_front_path}" style="width:100%;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showFullPhoto('${lot.packet_front_path}', 'Front — ${designation}')">
        </div>` : ''}
        ${lot.packet_back_path ? `<div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Back</div>
          <img src="${lot.packet_back_path}" style="width:100%;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showFullPhoto('${lot.packet_back_path}', 'Back — ${designation}')">
        </div>` : ''}
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--green-bg);padding:12px;border-radius:8px;">
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Quantity</span><div style="font-weight:600;">${qtyDisplay}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Storage</span><div style="font-weight:600;">${lot.storage_location || '—'}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Germination Rate</span><div style="font-weight:600;">${lot.germination_rate ? lot.germination_rate + '%' : '—'}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Last Tested</span><div style="font-weight:600;">${lot.last_tested ? new Date(lot.last_tested).toLocaleDateString() : '—'}</div></div>
        ${lot.lot_number ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Lot Number</span><div style="font-weight:600;">${lot.lot_number}</div></div>` : ''}
        ${lot.packed_for_year ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Packed For</span><div style="font-weight:600;">${lot.packed_for_year}</div></div>` : ''}
        ${lot.sell_by_date ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sell By</span><div style="font-weight:600;">${lot.sell_by_date}</div></div>` : ''}
        ${lot.upc_code ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">UPC</span><div style="font-weight:600;">${lot.upc_code}</div></div>` : ''}
      </div>

      ${lot.days_to_germination || lot.days_to_harvest || lot.planting_depth_inches || lot.spacing_inches || lot.sun_requirements ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌱 Growing Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--green-bg);padding:12px;border-radius:8px;">
          ${lot.days_to_germination ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Days to Germinate</span><div style="font-weight:600;">${lot.days_to_germination} days</div></div>` : ''}
          ${lot.days_to_harvest ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Days to Harvest</span><div style="font-weight:600;">${lot.days_to_harvest} days</div></div>` : ''}
          ${lot.planting_depth_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Planting Depth</span><div style="font-weight:600;">${lot.planting_depth_inches}</div></div>` : ''}
          ${lot.spacing_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Spacing</span><div style="font-weight:600;">${lot.spacing_inches}</div></div>` : ''}
          ${lot.row_spacing_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Row Spacing</span><div style="font-weight:600;">${lot.row_spacing_inches}</div></div>` : ''}
          ${lot.sun_requirements ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sun</span><div style="font-weight:600;">${lot.sun_requirements}</div></div>` : ''}
          ${lot.watering_needs ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Watering</span><div style="font-weight:600;">${lot.watering_needs}</div></div>` : ''}
          ${lot.soil_temp_min_f ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Min Soil Temp</span><div style="font-weight:600;">${lot.soil_temp_min_f}°F</div></div>` : ''}
          ${lot.start_indoors_weeks ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Start Indoors</span><div style="font-weight:600;">${lot.start_indoors_weeks} weeks before last frost</div></div>` : ''}
          ${lot.frost_tolerance ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Frost Tolerance</span><div style="font-weight:600;">${lot.frost_tolerance}</div></div>` : ''}
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Direct Sow</span><div style="font-weight:600;">${lot.direct_sow ? 'Yes' : 'No — start indoors'}</div></div>
          ${lot.container_variety ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Container Variety</span><div style="font-weight:600;">✅ Yes</div></div>` : ''}
          ${lot.container_size ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Container Size</span><div style="font-weight:600;">${lot.container_size}</div></div>` : ''}
          ${lot.origin ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Origin</span><div style="font-weight:600;">${lot.origin}</div></div>` : ''}
        </div>
      </div>` : ''}

      ${lot.notes ? `<div><div style="font-weight:700;margin-bottom:4px;font-size:0.9rem;">Notes</div><div style="font-size:0.9rem;color:var(--text-muted);">${lot.notes}</div></div>` : ''}

      ${state.settings.last_frost_date && (lot.days_to_harvest || lot.start_indoors_weeks || lot.direct_sow !== undefined) ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📅 Planting Window — ${new Date().getFullYear()}</div>
        <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
          ${getPlantingWindow(lot)}
        </div>
      </div>` : ''}

      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🪴 Plants from this lot (${plants.length})</div>
        ${plants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants logged yet.</p>'
        : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${plants.map(p => `<span class="designation" style="font-size:0.75rem;">${p.designation}${p.selected_for_seed ? ' ⭐' : ''}</span>`).join('')}</div>`}
      </div>

      ${germTests.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Germination Tests</div>
        ${germTests.map(g => {
          const rate = g.seeds_germinated !== null && g.seeds_planted ? Math.round((g.seeds_germinated / g.seeds_planted) * 100) : null;
          return `<div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            ${new Date(g.date_started).toLocaleDateString()} — ${g.seeds_planted} planted
            ${rate !== null ? `→ <strong>${rate}%</strong> germination` : '(pending)'}
            ${g.days_to_germination ? `in ${g.days_to_germination} days` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal(); showEditSeedLot('${designation}');">✏️ Edit</button>
        <button class="btn btn-brown btn-sm" onclick="closeModal(); showPacketPhotos('${designation}');">📷 Photos</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal(); showAddPlants('${designation}');">+ Add Plants</button>
        <button class="btn btn-secondary btn-sm" onclick="showLineageTree('${designation}');">🌿 Lineage</button>
      </div>
    </div>
  `);
}

function renderVarieties() {
  const searchTerm = (document.getElementById('variety-search')?.value || '').toLowerCase();
  const filterSpecies = document.getElementById('variety-filter-species')?.value || '';
  let filteredVarieties = state.varieties.filter(v => {
    const matchSearch = !searchTerm ||
      v.name.toLowerCase().includes(searchTerm) ||
      v.code.toLowerCase().includes(searchTerm) ||
      (v.source || '').toLowerCase().includes(searchTerm);
    const matchSpecies = !filterSpecies || v.species_code === filterSpecies;
    return matchSearch && matchSpecies;
  });
  return `
    <div class="page-header"><h1 class="page-title">🌿 Varieties</h1><button class="btn btn-primary" onclick="showAddVariety()">+ Add Variety</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="variety-search" placeholder="🔍 Search varieties..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="variety-filter-species" style="max-width:150px;" onchange="render()">
          <option value="">All Species</option>
          ${state.species.map(s => `<option value="${s.code}" ${filterSpecies === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        ${searchTerm || filterSpecies ? `<button class="btn btn-secondary btn-sm" onclick="clearVarietyFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredVarieties.length} of ${state.varieties.length} varieties</span>
      </div>
    </div>
    <div class="card">
      ${filteredVarieties.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.varieties.length === 0 ? 'No varieties yet.' : 'No varieties match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Code</th><th>Name</th><th>Species</th><th>Type</th><th>Source</th><th>Year</th><th>Lots</th><th>Actions</th></tr></thead>
        <tbody>${filteredVarieties.map(v => {
          const lots = state.seedLots.filter(l => l.variety_code === v.code).length;
          return `<tr style="cursor:pointer;" onclick="showVarietyDetail('${v.code}')">
            <td><span class="designation">${v.code}</span></td>
            <td><strong>${v.name}</strong></td>
            <td>${v.species_name || v.species_code}</td>
            <td><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></td>
            <td>${v.source || '—'}</td><td>${v.year_acquired || '—'}</td>
            <td><span class="gen-badge">${lots}</span></td>
            <td onclick="event.stopPropagation()" style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-sm" onclick="showEditVariety('${v.code}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteVariety('${v.code}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function clearPlantFilters() {
  const s = document.getElementById('plant-search');
  const fs = document.getElementById('plant-filter-seedsave');
  const fl = document.getElementById('plant-filter-location');
  if (s) s.value = '';
  if (fs) fs.value = '';
  if (fl) fl.value = '';
  render();
}

function clearSeedLotFilters() {
  const s = document.getElementById('seedlot-search');
  const fs = document.getElementById('seedlot-filter-species');
  const fg = document.getElementById('seedlot-filter-gen');
  if (s) s.value = '';
  if (fs) fs.value = '';
  if (fg) fg.value = '';
  render();
}

function clearVarietyFilters() {
  const s = document.getElementById('variety-search');
  const fs = document.getElementById('variety-filter-species');
  if (s) s.value = '';
  if (fs) fs.value = '';
  render();
}

function showVarietyDetail(code) {
  const v = state.varieties.find(x => x.code === code);
  const lots = state.seedLots.filter(l => l.variety_code === code);
  openModal('🌿 ' + v.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Code</span><div><span class="designation">${v.code}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Species</span><div style="font-weight:600;">${v.species_name || v.species_code}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Type</span><div><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Source</span><div style="font-weight:600;">${v.source || '—'}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Year Acquired</span><div style="font-weight:600;">${v.year_acquired || '—'}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Seed Lots</span><div><span class="gen-badge">${lots.length}</span></div></div>
        </div>
        ${v.description ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${v.description}</div>` : ''}
      </div>
      ${lots.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">Seed Lots</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${lots.map(l => `
            <div class="clickable-row" onclick="closeModal(); showSeedLotDetail('${l.designation}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${l.designation}</span>
              <div style="display:flex;gap:8px;align-items:center;">
                ${l.germination_rate ? `<span style="font-size:0.8rem;">${l.germination_rate}% germ</span>` : ''}
                <span class="gen-badge">G${l.generation}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="closeModal(); showEditVariety('${code}');">✏️ Edit</button>
      </div>
    </div>
  `);
}

function showAddVariety() { openModal('Add New Variety', varietyForm(null)); }
function showEditVariety(code) { openModal('Edit Variety — ' + code, varietyForm(state.varieties.find(x => x.code === code))); }

function varietyForm(v) {
  return `
    <div class="form-group"><label class="form-label">Species *</label>
      <select class="form-control" id="f-species" ${v ? 'disabled' : ''}>
        ${state.species.map(s => `<option value="${s.code}" ${v && v.species_code === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Variety Name *</label><input class="form-control" id="f-vname" placeholder="e.g. Straight 8" value="${v ? v.name : ''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-control" id="f-type">
          <option value="OP" ${v && v.type === 'OP' ? 'selected' : ''}>Open Pollinated (OP)</option>
          <option value="Heirloom" ${v && v.type === 'Heirloom' ? 'selected' : ''}>Heirloom (open pollinated 50+ years)</option>
          <option value="Hybrid" ${v && v.type === 'Hybrid' ? 'selected' : ''}>Hybrid (F1)</option>
          <option value="AOP" ${v && v.type === 'AOP' ? 'selected' : ''}>Hybrid OP (stabilizing)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Year Acquired</label><input class="form-control" id="f-year" type="number" value="${v ? v.year_acquired || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Source</label><input class="form-control" id="f-source" value="${v ? v.source || '' : ''}" placeholder="e.g. Burpee"></div>
    <div class="form-group"><label class="form-label">Description / Notes</label><textarea class="form-control" id="f-desc" rows="3">${v ? v.description || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${v ? `submitEditVariety('${v.code}')` : 'submitVariety()'}">${v ? 'Save Changes' : 'Save Variety'}</button>
    </div>
  `;
}

async function submitVariety() {
  const name = document.getElementById('f-vname').value.trim();
  const species_code = document.getElementById('f-species').value;
  if (!name || !species_code) return alert('Name and species are required');
  await api('/api/varieties', 'POST', { name, species_code, type: document.getElementById('f-type').value, year_acquired: document.getElementById('f-year').value || null, source: document.getElementById('f-source').value, description: document.getElementById('f-desc').value });
  closeModal(); await loadAll(); render();
}

async function submitEditVariety(code) {
  const name = document.getElementById('f-vname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/varieties/' + code, 'PUT', { name, type: document.getElementById('f-type').value, year_acquired: document.getElementById('f-year').value || null, source: document.getElementById('f-source').value, description: document.getElementById('f-desc').value });
  closeModal(); await loadAll(); render();
}

async function deleteVariety(code) {
  if (!confirm('Delete variety ' + code + '? This cannot be undone.')) return;
  await api('/api/varieties/' + code, 'DELETE'); await loadAll(); render();
}

function renderSeedLots() {
  const currentYear = new Date().getFullYear();
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3, BEAN: 3, LETT: 3, SPIN: 3, CORN: 2, ONI: 1, PEA: 3, SQUA: 4, MELO: 5, HERB: 3 };
  const searchTerm = (document.getElementById('seedlot-search')?.value || '').toLowerCase();
  const filterSpecies = document.getElementById('seedlot-filter-species')?.value || '';
  const filterGen = document.getElementById('seedlot-filter-gen')?.value || '';
  let filteredLots = state.seedLots.filter(lot => {
    const matchSearch = !searchTerm ||
      lot.designation.toLowerCase().includes(searchTerm) ||
      (lot.variety_name || '').toLowerCase().includes(searchTerm) ||
      (lot.storage_location || '').toLowerCase().includes(searchTerm) ||
      (lot.lot_number || '').toLowerCase().includes(searchTerm);
    const matchSpecies = !filterSpecies || lot.species_code === filterSpecies;
    const matchGen = !filterGen || String(lot.generation) === filterGen;
    return matchSearch && matchSpecies && matchGen;
  });
  return `
    <div class="page-header"><h1 class="page-title">🫙 Seed Lots</h1><button class="btn btn-primary" onclick="showAddSeedLot()">+ Add Seed Lot</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="seedlot-search" placeholder="🔍 Search lots..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="seedlot-filter-species" style="max-width:150px;" onchange="render()">
          <option value="">All Species</option>
          ${state.species.map(s => `<option value="${s.code}" ${filterSpecies === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <select class="form-control" id="seedlot-filter-gen" style="max-width:130px;" onchange="render()">
          <option value="">All Generations</option>
          <option value="0" ${filterGen === '0' ? 'selected' : ''}>G0 — Commercial</option>
          <option value="1" ${filterGen === '1' ? 'selected' : ''}>G1 — First Saved</option>
          <option value="2" ${filterGen === '2' ? 'selected' : ''}>G2</option>
          <option value="3" ${filterGen === '3' ? 'selected' : ''}>G3+</option>
        </select>
        ${searchTerm || filterSpecies || filterGen ? `<button class="btn btn-secondary btn-sm" onclick="clearSeedLotFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredLots.length} of ${state.seedLots.length} lots</span>
      </div>
    </div>
    <div class="card">
      ${filteredLots.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🫙</div><p>${state.seedLots.length === 0 ? 'No seed lots yet.' : 'No lots match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Quantity</th><th>Storage</th><th>Germination</th><th>Viability</th><th>Actions</th></tr></thead>
        <tbody>${filteredLots.map(lot => {
          const maxYears = viabilityYears[lot.species_code] || 3;
          const yearsLeft = maxYears - (currentYear - lot.year_saved);
          let viabilityBadge = '<span style="color:#22c55e;font-weight:600;">🟢 Good</span>';
          if (yearsLeft <= 0) viabilityBadge = '<span style="color:#ef4444;font-weight:600;">🔴 Expired</span>';
          else if (yearsLeft <= 1) viabilityBadge = '<span style="color:#f59e0b;font-weight:600;">🟡 Expiring</span>';
          const qtyRaw = lot.quantity_unit === 'seeds' || !lot.quantity_unit
            ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—')
            : (lot.quantity_weight ? (parseFloat(lot.quantity_weight) % 1 === 0 ? parseInt(lot.quantity_weight) : parseFloat(lot.quantity_weight)) + ' ' + lot.quantity_unit : '—');
          const qtyDisplay = qtyRaw;
          return `<tr style="cursor:pointer;" onclick="showSeedLotDetail('${lot.designation}')">
            <td><span class="designation">${lot.designation}</span></td>
            <td>${lot.variety_name || lot.variety_code}</td>
            <td><span class="gen-badge">G${lot.generation}</span></td>
            <td>${lot.year_saved}</td>
            <td>${qtyDisplay}</td>
            <td>${lot.storage_location || '—'}</td>
            <td>${lot.germination_rate ? lot.germination_rate + '%' : '—'}</td>
            <td>${viabilityBadge}</td>
            <td onclick="event.stopPropagation()" style="display:flex;gap:4px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="showEditSeedLot('${lot.designation}')">✏️</button>
              <button class="btn btn-brown btn-sm" onclick="showPacketPhotos('${lot.designation}')">📷</button>
              <button class="btn btn-secondary btn-sm" onclick="showSeedLotQR('${lot.designation}')">⬛ QR</button>
              <button class="btn btn-secondary btn-sm" onclick="printSeedLabel('${lot.designation}')">🏷️ Label</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSeedLot('${lot.designation}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function printSeedLabel(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  openModal('🏷️ Print Label — ' + designation, `
    <div class="form-group">
      <label class="form-label">Label Size</label>
      <select class="form-control" id="f-labelsize">
        <option value="30346">Dymo 30346 — 1" x 2-1/8" (Small seed label)</option>
        <option value="1933081" selected>Dymo 1933081 — 1" x 3-1/2" (Standard seed label)</option>
        <option value="30252">Dymo 30252 — 1-1/8" x 3-1/2" (Address label)</option>
        <option value="30321">Dymo 30321 — 2-1/8" x 4" (Large label)</option>
        <option value="custom">Custom size</option>
      </select>
    </div>
    <div id="custom-size-fields" class="hidden">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Width (inches)</label><input class="form-control" id="f-labelw" type="number" step="0.125" value="3.5"></div>
        <div class="form-group"><label class="form-label">Height (inches)</label><input class="form-control" id="f-labelh" type="number" step="0.125" value="1"></div>
      </div>
    </div>
    <div class="form-group" style="margin-top:12px;">
      <label class="form-label">Include on label</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-qr" checked> QR Code</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-variety" checked> Variety Name</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-designation" checked> Designation Code</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-storage" checked> Storage Location</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-growing" checked> Growing Info (days to germ/harvest)</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-dates" checked> Packed/Sell By Dates</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-qty" checked> Quantity</label>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="generateSeedLabel('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('f-labelsize').addEventListener('change', e => {
      document.getElementById('custom-size-fields').classList.toggle('hidden', e.target.value !== 'custom');
    });
  }, 50);
}

const LABEL_SIZES = {
  '30346':   { width: 2.125, height: 1 },
  '1933081': { width: 3.5,   height: 1 },
  '30252':   { width: 3.5,   height: 1.125 },
  '30321':   { width: 4,     height: 2.125 },
};

function generateSeedLabel(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const sizeKey = document.getElementById('f-labelsize').value;
  let w, h;
  if (sizeKey === 'custom') {
    w = parseFloat(document.getElementById('f-labelw').value) || 3.5;
    h = parseFloat(document.getElementById('f-labelh').value) || 1;
  } else {
    w = LABEL_SIZES[sizeKey].width;
    h = LABEL_SIZES[sizeKey].height;
  }
  const showQR = document.getElementById('lbl-qr').checked;
  const showVariety = document.getElementById('lbl-variety').checked;
  const showDesignation = document.getElementById('lbl-designation').checked;
  const showStorage = document.getElementById('lbl-storage').checked;
  const showGrowing = document.getElementById('lbl-growing').checked;
  const showDates = document.getElementById('lbl-dates').checked;
  const showQty = document.getElementById('lbl-qty').checked;

  const qrSize = Math.round(h * 82);
  const isSmall = w <= 2.2;
  const baseFontSize = isSmall ? 5.5 : 7;
  const varietyFontSize = isSmall ? 8 : 11;

  const qtyDisplay = lot.quantity_unit === 'seeds' || !lot.quantity_unit
    ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '')
    : (lot.quantity_weight ? lot.quantity_weight + lot.quantity_unit : '');

  closeModal();
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: ${w}in ${h}in; margin:0; }
        body { width:${w}in; height:${h}in; font-family:Arial,sans-serif; overflow:hidden; }
        .label { width:${w}in; height:${h}in; display:flex; flex-direction:row; align-items:center; padding:3px 5px; gap:4px; }
        .qr-section { flex-shrink:0; width:${qrSize}px; height:${qrSize}px; display:flex; align-items:center; justify-content:center; }
        .info-section { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:1px; }
        .brand { font-size:5pt; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
        .variety { font-size:${varietyFontSize}pt; font-weight:bold; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .designation { font-family:monospace; font-size:${baseFontSize}pt; color:#333; }
        .details { font-size:${baseFontSize}pt; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .growing { font-size:${baseFontSize - 0.5}pt; color:#444; }
      </style>
    </head>
    <body>
      <div class="label">
        ${showQR ? `<div class="qr-section" id="qr"></div>` : ''}
        <div class="info-section">
          <div class="brand">🌱 SeedVault</div>
          ${showVariety ? `<div class="variety">${lot.variety_name || lot.variety_code}</div>` : ''}
          ${showDesignation ? `<div class="designation">${designation}</div>` : ''}
          ${showStorage && lot.storage_location ? `<div class="details">📦 ${lot.storage_location}${showQty && qtyDisplay ? ' · ' + qtyDisplay : ''}</div>` : (showQty && qtyDisplay ? `<div class="details">${qtyDisplay}</div>` : '')}
          ${showGrowing && (lot.days_to_germination || lot.days_to_harvest) ? `<div class="growing">${lot.days_to_germination ? 'Germ: ' + lot.days_to_germination + 'd' : ''}${lot.days_to_germination && lot.days_to_harvest ? ' · ' : ''}${lot.days_to_harvest ? 'Harvest: ' + lot.days_to_harvest + 'd' : ''}</div>` : ''}
          ${showDates && (lot.packed_for_year || lot.sell_by_date) ? `<div class="details">${lot.packed_for_year ? 'Packed: ' + lot.packed_for_year : ''}${lot.packed_for_year && lot.sell_by_date ? ' · ' : ''}${lot.sell_by_date ? 'Sell by: ' + lot.sell_by_date : ''}</div>` : ''}
        </div>
      </div>
      ${showQR ? `<script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: ${qrSize},
          height: ${qrSize},
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 600);
      </script>` : `<script>setTimeout(() => window.print(), 300);</script>`}
    </body>
    </html>
  `);
  printWindow.document.close();
}

function _oldPrintSeedLabel_unused(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page {
          size: 3.5in 1in;
          margin: 0;
        }
        body {
          width: 3.5in;
          height: 1in;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .label {
          width: 3.5in;
          height: 1in;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 4px 6px;
          gap: 6px;
        }
        .qr-section {
          flex-shrink: 0;
          width: 0.85in;
          height: 0.85in;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-section img {
          width: 0.85in;
          height: 0.85in;
        }
        .info-section {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1px;
        }
        .brand {
          font-size: 6pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .variety {
          font-size: 11pt;
          font-weight: bold;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .designation {
          font-family: monospace;
          font-size: 7pt;
          color: #333;
        }
        .details {
          font-size: 7pt;
          color: #555;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .growing {
          font-size: 6.5pt;
          color: #444;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="qr-section" id="qr"></div>
        <div class="info-section">
          <div class="brand">🌱 SeedVault</div>
          <div class="variety">${lot.variety_name || lot.variety_code}</div>
          <div class="designation">${designation}</div>
          <div class="details">G${lot.generation} · ${lot.year_saved}${lot.storage_location ? ' · ' + lot.storage_location : ''}${lot.quantity_estimate ? ' · ' + lot.quantity_estimate + ' seeds' : lot.quantity_weight ? ' · ' + lot.quantity_weight + lot.quantity_unit : ''}</div>
          ${lot.days_to_germination || lot.days_to_harvest ? `<div class="growing">${lot.days_to_germination ? 'Germ: ' + lot.days_to_germination + 'd' : ''}${lot.days_to_germination && lot.days_to_harvest ? ' · ' : ''}${lot.days_to_harvest ? 'Harvest: ' + lot.days_to_harvest + 'd' : ''}</div>` : ''}
          ${lot.sell_by_date || lot.packed_for_year ? `<div class="details">${lot.packed_for_year ? 'Packed: ' + lot.packed_for_year : ''}${lot.packed_for_year && lot.sell_by_date ? ' · ' : ''}${lot.sell_by_date ? 'Sell by: ' + lot.sell_by_date : ''}</div>` : ''}
        </div>
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 82,
          height: 82,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 600);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function showSeedLotQR(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  openModal('QR Code — ' + designation, `
    <div style="text-align:center;padding:16px;">
      <div id="qr-container" style="display:inline-block;padding:16px;background:white;border-radius:8px;margin-bottom:16px;"></div>
      <div style="font-family:monospace;font-size:0.9rem;font-weight:700;margin-bottom:4px;">${designation}</div>
      <div style="font-size:0.85rem;color:var(--text-muted);">${lot.variety_name || ''}</div>
      ${lot.storage_location ? `<div style="font-size:0.8rem;color:var(--text-muted);">📦 ${lot.storage_location}</div>` : ''}
    </div>
    <div class="alert alert-info">Print and attach to your seed envelope or packet. Scan to open this seed lot instantly.</div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printSeedLotQR('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    const container = document.getElementById('qr-container');
    if (container && typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: designation,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

function printSeedLotQR(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        .label { border: 2px solid #000; display: inline-block; padding: 16px; border-radius: 8px; min-width: 180px; }
        .designation { font-family: monospace; font-size: 13px; font-weight: bold; margin-top: 8px; }
        .variety { font-size: 11px; color: #555; margin-top: 4px; }
        .storage { font-size: 11px; color: #777; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="label">
        <div id="qr"></div>
        <div class="designation">${designation}</div>
        <div class="variety">${lot.variety_name || ''}</div>
        ${lot.storage_location ? `<div class="storage">${lot.storage_location}</div>` : ''}
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 150,
          height: 150,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function showPacketPhotos(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  openModal('Seed Packet Photos — ' + designation, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-weight:700;margin-bottom:8px;">Front of Packet</div>
        ${lot.packet_front_path ? `
          <img src="${lot.packet_front_path}" style="width:100%;border-radius:8px;margin-bottom:8px;border:2px solid var(--border);">
          <button class="btn btn-danger btn-sm" onclick="deletePacketPhoto('${designation}', 'front')">🗑️ Remove</button>
        ` : '<div style="background:var(--green-bg);border-radius:8px;padding:20px;text-align:center;color:var(--text-muted);margin-bottom:8px;">No photo</div>'}
        <div style="margin-top:8px;">
          <input type="file" id="front-upload" accept="image/*" style="display:none" onchange="uploadPacketPhoto('${designation}', 'front')">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('front-upload').click()">📷 ${lot.packet_front_path ? 'Replace' : 'Upload'} Front</button>
        </div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:8px;">Back of Packet</div>
        ${lot.packet_back_path ? `
          <img src="${lot.packet_back_path}" style="width:100%;border-radius:8px;margin-bottom:8px;border:2px solid var(--border);">
          <button class="btn btn-danger btn-sm" onclick="deletePacketPhoto('${designation}', 'back')">🗑️ Remove</button>
        ` : '<div style="background:var(--green-bg);border-radius:8px;padding:20px;text-align:center;color:var(--text-muted);margin-bottom:8px;">No photo</div>'}
        <div style="margin-top:8px;">
          <input type="file" id="back-upload" accept="image/*" style="display:none" onchange="uploadPacketPhoto('${designation}', 'back')">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('back-upload').click()">📷 ${lot.packet_back_path ? 'Replace' : 'Upload'} Back</button>
        </div>
      </div>
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `);
}

async function uploadPacketPhoto(designation, side) {
  const input = document.getElementById(side + '-upload');
  const file = input.files[0];
  if (!file) return;
  const result = await uploadPhoto('/api/seed-lots/' + designation + '/packet/' + side, file);
  if (result.error) return alert('Upload failed: ' + result.error);
  await loadAll(); showPacketPhotos(designation);
}

async function deletePacketPhoto(designation, side) {
  if (!confirm('Remove this photo?')) return;
  await api('/api/seed-lots/' + designation + '/packet/' + side, 'DELETE');
  await loadAll(); showPacketPhotos(designation);
}

function showAddSeedLot() { openModal('Add Seed Lot', seedLotForm(null)); }
function showEditSeedLot(designation) { openModal('Edit Seed Lot — ' + designation, seedLotForm(state.seedLots.find(l => l.designation === designation))); }

function seedLotForm(lot) {
  const sunOptions = ['Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'];
  const waterOptions = ['Low', 'Medium', 'High'];
  const frostOptions = ['Hardy — survives hard frost', 'Semi-hardy — light frost ok', 'Tender — no frost'];
  return `
    ${!lot ? '<div class="alert alert-info">Designation is auto-generated from variety + generation + year.</div>' : ''}
    ${!lot ? '<div id="seedlot-form-error" class="alert alert-danger hidden"></div>' : ''}
    ${!lot ? `
    <div class="form-group"><label class="form-label">Variety *</label>
      <select class="form-control" id="f-variety">
        <option value="">Select variety...</option>
        ${state.varieties.map(v => `<option value="${v.code}">${v.name} (${v.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Generation * (0=commercial, 1=first saved)</label><input class="form-control" id="f-gen" type="number" min="0" value="0"></div>
      <div class="form-group"><label class="form-label">Year Saved/Bought *</label><input class="form-control" id="f-yearsaved" type="number" value="${new Date().getFullYear()}"></div>
    </div>` : ''}

    ${lot ? `<div class="alert alert-info" style="margin-bottom:8px;">Changing generation or year will update the designation.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Generation</label><input class="form-control" id="f-editgen" type="number" min="0" value="${lot.generation}"></div>
      <div class="form-group"><label class="form-label">Year</label><input class="form-control" id="f-edityear" type="number" value="${lot.year_saved}"></div>
    </div>` : ''}

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📦 Packet Info</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Lot Number</label><input class="form-control" id="f-lotnum" value="${lot ? lot.lot_number || '' : ''}" placeholder="e.g. A2847"></div>
      <div class="form-group"><label class="form-label">Packed For Year</label><input class="form-control" id="f-packedyear" type="number" value="${lot ? lot.packed_for_year || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">UPC Code</label><input class="form-control" id="f-upc" value="${lot ? lot.upc_code || '' : ''}" placeholder="Barcode number from packet"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sell By Date</label><input class="form-control" id="f-sellby" value="${lot ? lot.sell_by_date || '' : ''}" placeholder="e.g. 12/26 or 12/2026"></div>
    </div>

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">🌱 Quantity</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Unit</label>
        <select class="form-control" id="f-qtyunit" onchange="toggleQtyFields()">
          <option value="seeds" ${!lot || lot.quantity_unit === 'seeds' ? 'selected' : ''}>Seeds (count)</option>
          <option value="mg" ${lot && lot.quantity_unit === 'mg' ? 'selected' : ''}>Milligrams (mg)</option>
          <option value="g" ${lot && lot.quantity_unit === 'g' ? 'selected' : ''}>Grams (g)</option>
          <option value="oz" ${lot && lot.quantity_unit === 'oz' ? 'selected' : ''}>Ounces (oz)</option>
        </select>
      </div>
      <div class="form-group" id="qty-count-group">
        <label class="form-label">Seed Count</label>
        <input class="form-control" id="f-qty" type="number" value="${lot ? lot.quantity_estimate || '' : ''}">
      </div>
      <div class="form-group hidden" id="qty-weight-group">
        <label class="form-label">Weight</label>
        <input class="form-control" id="f-qtyweight" type="number" step="0.01" value="${lot ? lot.quantity_weight || '' : ''}">
      </div>
    </div>

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📍 Storage</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Storage Location</label><input class="form-control" id="f-storage" value="${lot ? lot.storage_location || '' : ''}" placeholder="e.g. Ammo box"></div>
      <div class="form-group"><label class="form-label">Germination Rate %</label><input class="form-control" id="f-germrate" type="number" min="0" max="100" value="${lot ? lot.germination_rate || '' : ''}"></div>
    </div>
    ${lot ? `<div class="form-group"><label class="form-label">Last Tested Date</label><input class="form-control" id="f-lasttest" type="date" value="${lot && lot.last_tested ? lot.last_tested.split('T')[0] : ''}"></div>` : ''}
    <div class="form-group"><label class="form-label">Mother Plant Designation</label><input class="form-control" id="f-mother" value="${lot ? lot.mother_designation || '' : ''}"></div>
    <div class="form-group"><label class="form-label">Father Plant Designation</label><input class="form-control" id="f-father" value="${lot ? lot.father_designation || '' : ''}"></div>

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">🌱 Growing Information</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Days to Germination</label><input class="form-control" id="f-dtg" placeholder="e.g. 7-14 or 10" value="${lot ? lot.days_to_germination || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Days to Harvest</label><input class="form-control" id="f-dth" placeholder="e.g. 60-70 or 67" value="${lot ? lot.days_to_harvest || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Planting Depth</label><input class="form-control" id="f-depth" placeholder="e.g. 1/4 - 1/2 in" value="${lot ? lot.planting_depth_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Plant Spacing</label><input class="form-control" id="f-spacing" placeholder="e.g. 15 in / 3 in" value="${lot ? lot.spacing_inches || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Row Spacing</label><input class="form-control" id="f-rowspacing" placeholder="e.g. 12 in" value="${lot ? lot.row_spacing_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Min Soil Temp (°F)</label><input class="form-control" id="f-soiltemp" type="number" value="${lot ? lot.soil_temp_min_f || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sun Requirements</label>
        <select class="form-control" id="f-sun">
          <option value="">Select...</option>
          ${sunOptions.map(s => `<option value="${s}" ${lot && lot.sun_requirements === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Watering Needs</label>
        <select class="form-control" id="f-water">
          <option value="">Select...</option>
          ${waterOptions.map(w => `<option value="${w}" ${lot && lot.watering_needs === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Frost Tolerance</label>
        <select class="form-control" id="f-frost">
          <option value="">Select...</option>
          ${frostOptions.map(f => `<option value="${f}" ${lot && lot.frost_tolerance === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Start Indoors (weeks before last frost)</label>
        <input class="form-control" id="f-indoor" type="number" value="${lot ? lot.start_indoors_weeks || '' : ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sowing Method</label>
        <select class="form-control" id="f-directsow">
          <option value="true" ${!lot || lot.direct_sow ? 'selected' : ''}>Direct Sow</option>
          <option value="false" ${lot && !lot.direct_sow ? 'selected' : ''}>Start Indoors / Transplant</option>
          <option value="both">Both OK</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Container Variety</label>
        <select class="form-control" id="f-container">
          <option value="false" ${!lot || !lot.container_variety ? 'selected' : ''}>No</option>
          <option value="true" ${lot && lot.container_variety ? 'selected' : ''}>Yes</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group"><label class="form-label">Origin</label><input class="form-control" id="f-origin" value="${lot ? lot.origin || '' : ''}" placeholder="e.g. Italy, Appalachia, Netherlands"></div>
      <div class="form-group"><label class="form-label">Container Size (if container variety)</label><input class="form-control" id="f-contsize" value="${lot ? lot.container_size || '' : ''}" placeholder="e.g. 5 gallon minimum, 12 inch pot"></div>
    </div>
    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📝 Notes</div>
    <div class="form-group"><textarea class="form-control" id="f-notes" rows="3">${lot ? lot.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${lot ? `submitEditSeedLot('${lot.designation}')` : 'submitSeedLot()'}">${lot ? 'Save Changes' : 'Save Seed Lot'}</button>
    </div>
  `;
}

function toggleQtyFields() {
  const unit = document.getElementById('f-qtyunit').value;
  const isSeeds = unit === 'seeds';
  document.getElementById('qty-count-group').classList.toggle('hidden', !isSeeds);
  document.getElementById('qty-weight-group').classList.toggle('hidden', isSeeds);
}

function getSeedLotFormData(lot) {
  const unit = document.getElementById('f-qtyunit').value;
  return {
    quantity_estimate: unit === 'seeds' ? (document.getElementById('f-qty').value || null) : null,
    quantity_weight: unit !== 'seeds' ? (document.getElementById('f-qtyweight').value || null) : null,
    quantity_unit: unit,
    storage_location: document.getElementById('f-storage').value,
    germination_rate: document.getElementById('f-germrate').value || null,
    last_tested: lot && document.getElementById('f-lasttest') ? document.getElementById('f-lasttest').value || null : null,
    mother_designation: document.getElementById('f-mother').value,
    father_designation: document.getElementById('f-father').value,
    lot_number: document.getElementById('f-lotnum').value,
    upc_code: document.getElementById('f-upc').value,
    packed_for_year: document.getElementById('f-packedyear').value || null,
    sell_by_date: document.getElementById('f-sellby').value || null,
    days_to_germination: document.getElementById('f-dtg').value || null,
    days_to_harvest: document.getElementById('f-dth').value || null,
    origin: document.getElementById('f-origin') ? document.getElementById('f-origin').value || null : null,
    container_size: document.getElementById('f-contsize') ? document.getElementById('f-contsize').value || null : null,
    planting_depth_inches: document.getElementById('f-depth').value || null,
    spacing_inches: document.getElementById('f-spacing').value || null,
    row_spacing_inches: document.getElementById('f-rowspacing').value || null,
    sun_requirements: document.getElementById('f-sun').value || null,
    watering_needs: document.getElementById('f-water').value || null,
    frost_tolerance: document.getElementById('f-frost').value || null,
    start_indoors_weeks: document.getElementById('f-indoor').value || null,
    direct_sow: document.getElementById('f-directsow').value !== 'false',
    container_variety: document.getElementById('f-container').value === 'true',
    notes: document.getElementById('f-notes').value,
  };
}

async function submitSeedLot() {
  const variety_code = document.getElementById('f-variety').value;
  const generation = document.getElementById('f-gen').value;
  const year_saved = document.getElementById('f-yearsaved').value;
  let hasError = false;

  const varietyEl = document.getElementById('f-variety');
  const genEl = document.getElementById('f-gen');
  const yearEl = document.getElementById('f-yearsaved');

  [varietyEl, genEl, yearEl].forEach(el => el.style.borderColor = '');

  if (!variety_code) { varietyEl.style.borderColor = '#ef4444'; hasError = true; }
  if (generation === '' || generation === null) { genEl.style.borderColor = '#ef4444'; hasError = true; }
  if (!year_saved) { yearEl.style.borderColor = '#ef4444'; hasError = true; }

  if (hasError) {
    const errDiv = document.getElementById('seedlot-form-error');
    if (errDiv) { errDiv.textContent = 'Please fill in the fields highlighted in red.'; errDiv.classList.remove('hidden'); }
    return;
  }

  const result = await api('/api/seed-lots', 'POST', { variety_code, generation: parseInt(generation), year_saved: parseInt(year_saved), ...getSeedLotFormData(null) });

  if (result && result.error) {
    const errDiv = document.getElementById('seedlot-form-error');
    if (errDiv) { errDiv.textContent = '❌ ' + result.error; errDiv.classList.remove('hidden'); }
    return;
  }

  closeModal(); await loadAll(); render();
  if (result && result.designation) {
    setTimeout(() => alert('✅ Seed lot created!\nDesignation: ' + result.designation), 100);
  }
}

async function submitEditSeedLot(designation) {
  const data = getSeedLotFormData(true);
  const genEl = document.getElementById('f-editgen');
  const yearEl = document.getElementById('f-edityear');
  if (genEl) data.generation = parseInt(genEl.value);
  if (yearEl) data.year_saved = parseInt(yearEl.value);
  await api('/api/seed-lots/' + designation, 'PUT', data);
  closeModal(); await loadAll(); render();
}

async function deleteSeedLot(designation) {
  if (!confirm('Delete seed lot ' + designation + '? This cannot be undone.')) return;
  await api('/api/seed-lots/' + designation, 'DELETE'); await loadAll(); render();
}

function showPlantDetail(designation) {
  const p = state.plants.find(x => x.designation === designation);
  if (!p) return;
  const lot = state.seedLots.find(l => l.designation === p.seed_lot_designation);
  const plantHarvest = state.harvest.filter(h => h.plant_designation === designation);
  const plantObs = state.observations.filter(o => o.plant_designation === designation);
  const plantAmendments = state.amendments.filter(a => a.plant_designation === designation);
  const plantCrosses = state.crosses.filter(c => c.mother_designation === designation || c.father_designation === designation);

  openModal('🪴 ' + designation, `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;">${p.variety_name || '—'}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">${p.season_type} ${p.season_year} · ${p.location_name ? '📍 ' + p.location_name : 'No location'}</div>
          ${p.selected_for_seed ? '<span class="seed-star" style="font-size:0.9rem;">⭐ Selected for Seed Saving</span>' : ''}
        </div>
        ${p.photo_path ? `<img src="${p.photo_path}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showPlantPhoto('${designation}')">` : ''}
      </div>

      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Seed Lot</span>
            <div style="font-weight:600;cursor:pointer;" onclick="closeModal();showSeedLotDetail('${p.seed_lot_designation}')">${p.seed_lot_designation}</div>
          </div>
          ${lot ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Generation</span><div style="font-weight:600;">G${lot.generation}</div></div>` : ''}
          ${lot && lot.storage_location ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Storage</span><div style="font-weight:600;">${lot.storage_location}</div></div>` : ''}
        </div>
        ${p.notes ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${p.notes}</div>` : ''}
      </div>

      ${plantHarvest.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📋 Harvest Records (${plantHarvest.length})</div>
        ${plantHarvest.map(h => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
              <span>${h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</span>
              <span style="color:var(--text-muted);">${h.condition || ''}</span>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;color:var(--text-muted);">
              ${h.fruit_length_inches ? `<span>📏 ${h.fruit_length_inches}"</span>` : ''}
              ${h.fruit_weight_oz ? `<span>⚖️ ${h.fruit_weight_oz}oz</span>` : ''}
              ${h.seed_count ? `<span>🌱 ${h.seed_count} seeds</span>` : ''}
              ${h.processing_method ? `<span>${h.processing_method}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      ${plantObs.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🔍 Observations (${plantObs.length})</div>
        ${plantObs.map(o => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;">
              <span>${new Date(o.observation_date).toLocaleDateString()}</span>
              ${o.fruit_count !== null ? `<span>🍅 ${o.fruit_count} fruit</span>` : ''}
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;color:var(--text-muted);">
              ${o.color ? `<span>🎨 ${o.color}</span>` : ''}
              ${o.avg_length_inches ? `<span>📏 ${o.avg_length_inches}"</span>` : ''}
              ${o.flavor_notes ? `<span>😋 ${o.flavor_notes}</span>` : ''}
            </div>
            ${o.health_notes ? `<div style="color:#f59e0b;margin-top:4px;">⚕️ ${o.health_notes}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      ${plantAmendments.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Amendments (${plantAmendments.length})</div>
        ${plantAmendments.map(a => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
              <span><span class="tag tag-active">${a.type}</span>${a.product_name ? ' ' + a.product_name : ''}</span>
              <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            ${a.amount || a.method ? `<div style="color:var(--text-muted);margin-top:4px;">${a.amount || ''} ${a.method || ''}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      ${plantCrosses.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌸 Cross Pollinations (${plantCrosses.length})</div>
        ${plantCrosses.map(c => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
            <span style="margin:0 6px;">×</span>
            <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
            <span style="margin-left:8px;color:${c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b'};">${c.success === true ? '✅' : c.success === false ? '❌' : '⏳'}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showEditPlant('${designation}');">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showPlantPhotoUpload('${designation}');">📷 Photo</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showPlantQR('${designation}');">⬛ QR</button>
        <button class="btn btn-primary btn-sm" onclick="closeModal();showAddAmendment('${designation}');">🌿 Amend</button>
        <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${designation}', ${!p.selected_for_seed});closeModal();">${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();printSeedLabel('${p.seed_lot_designation}');">🏷️ Label</button>
      </div>
    </div>
  `);
}

function renderPlants() {
  const year = new Date().getFullYear();
  const searchTerm = (document.getElementById('plant-search')?.value || '').toLowerCase();
  const filterSeedSave = document.getElementById('plant-filter-seedsave')?.value || '';
  const filterLocation = document.getElementById('plant-filter-location')?.value || '';
  let thisYear = state.plants.filter(p => {
    if (p.season_year !== year) return false;
    const matchSearch = !searchTerm ||
      p.designation.toLowerCase().includes(searchTerm) ||
      (p.variety_name || '').toLowerCase().includes(searchTerm) ||
      (p.location_name || '').toLowerCase().includes(searchTerm);
    const matchSeedSave = !filterSeedSave || (filterSeedSave === 'yes' ? p.selected_for_seed : !p.selected_for_seed);
    const matchLocation = !filterLocation || String(p.location_id) === filterLocation;
    return matchSearch && matchSeedSave && matchLocation;
  });
  const allThisYear = state.plants.filter(p => p.season_year === year);
  return `
    <div class="page-header"><h1 class="page-title">🪴 Plants — ${year}</h1><button class="btn btn-primary" onclick="showAddPlants()">+ Add Plants</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="plant-search" placeholder="🔍 Search plants..." style="max-width:200px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="plant-filter-seedsave" style="max-width:150px;" onchange="render()">
          <option value="">All Plants</option>
          <option value="yes" ${filterSeedSave === 'yes' ? 'selected' : ''}>⭐ Seed Save Selected</option>
          <option value="no" ${filterSeedSave === 'no' ? 'selected' : ''}>Not Selected</option>
        </select>
        <select class="form-control" id="plant-filter-location" style="max-width:150px;" onchange="render()">
          <option value="">All Locations</option>
          ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${filterLocation === String(l.id) ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
        ${searchTerm || filterSeedSave || filterLocation ? `<button class="btn btn-secondary btn-sm" onclick="clearPlantFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${thisYear.length} of ${allThisYear.length} plants</span>
      </div>
    </div>
    <div class="card">
      ${thisYear.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🪴</div><p>${allThisYear.length === 0 ? 'No plants logged this season yet.' : 'No plants match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Location</th><th>Photo</th><th>Season</th><th>Seed Save</th><th>Actions</th></tr></thead>
        <tbody>${thisYear.map(p => `<tr style="cursor:pointer;" onclick="showPlantDetail('${p.designation}')">
          <td><span class="designation">${p.designation}</span></td>
          <td>${p.variety_name || '—'}</td>
          <td>${p.location_name ? '<span style="font-size:0.85rem;">📍 ' + p.location_name + '</span>' : '—'}</td>
          <td onclick="event.stopPropagation()">${p.photo_path ? `<img src="${p.photo_path}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="showPlantPhoto('${p.designation}')">` : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>'}</td>
          <td>${p.season_type}</td>
          <td>${p.selected_for_seed ? '<span class="seed-star">⭐ Selected</span>' : '—'}</td>
          <td onclick="event.stopPropagation()" style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${p.designation}', ${!p.selected_for_seed})">${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}</button>
            <button class="btn btn-secondary btn-sm" onclick="showEditPlant('${p.designation}')">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="showPlantPhotoUpload('${p.designation}')">📷</button>
            <button class="btn btn-secondary btn-sm" onclick="showPlantQR('${p.designation}')">⬛ QR</button>
            <button class="btn btn-primary btn-sm" onclick="showAddAmendment('${p.designation}')">🌿 Amend</button>
            <button class="btn btn-danger btn-sm" onclick="deletePlant('${p.designation}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
    ${state.plants.filter(p => p.season_year !== year).length > 0 ? `
    <div class="card">
      <div class="card-title">📚 Previous Seasons</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Year</th><th>Seed Save</th><th>Actions</th></tr></thead>
        <tbody>${state.plants.filter(p => p.season_year !== year).map(p => `<tr>
          <td><span class="designation">${p.designation}</span></td>
          <td>${p.variety_name || '—'}</td>
          <td>${p.season_year}</td>
          <td>${p.selected_for_seed ? '⭐' : '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditPlant('${p.designation}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deletePlant('${p.designation}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : ''}
  `;
}

function showPlantPhoto(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Photo — ' + designation, `
    <img src="${p.photo_path}" style="width:100%;border-radius:8px;margin-bottom:16px;">
    <div class="form-actions">
      <button class="btn btn-danger" onclick="deletePlantPhoto('${designation}')">🗑️ Remove Photo</button>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `);
}

function showPlantPhotoUpload(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Plant Photo — ' + designation, `
    ${p.photo_path ? `
      <img src="${p.photo_path}" style="width:100%;border-radius:8px;margin-bottom:16px;border:2px solid var(--border);">
      <button class="btn btn-danger btn-sm" style="margin-bottom:16px;" onclick="deletePlantPhoto('${designation}')">🗑️ Remove Photo</button>
    ` : '<div style="background:var(--green-bg);border-radius:8px;padding:30px;text-align:center;color:var(--text-muted);margin-bottom:16px;">No photo yet</div>'}
    <div class="form-group">
      <label class="form-label">Upload Plant Photo</label>
      <input type="file" id="plant-photo-upload" accept="image/*" class="form-control">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitPlantPhoto('${designation}')">📷 Upload Photo</button>
    </div>
  `);
}

async function submitPlantPhoto(designation) {
  const input = document.getElementById('plant-photo-upload');
  const file = input.files[0];
  if (!file) return alert('Please select a photo');
  const result = await uploadPhoto('/api/plants/' + designation + '/photo', file);
  if (result.error) return alert('Upload failed: ' + result.error);
  await loadAll(); closeModal(); render();
  alert('✅ Photo uploaded successfully!');
}

async function deletePlantPhoto(designation) {
  if (!confirm('Remove this photo?')) return;
  await api('/api/plants/' + designation + '/photo', 'DELETE');
  await loadAll(); closeModal(); render();
}

function showAddPlants(preselectedLot = '') {
  openModal('Add Plants to Season', `
    <div class="alert alert-info">Plant designations are auto-generated.</div>
    <div class="form-group"><label class="form-label">Seed Lot *</label>
      <select class="form-control" id="f-lot">
        <option value="">Select seed lot...</option>
        ${state.seedLots.map(l => `<option value="${l.designation}" ${l.designation === preselectedLot ? 'selected' : ''}>${l.designation} — ${l.variety_name || l.variety_code}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Number of Plants *</label><input class="form-control" id="f-count" type="number" min="1" value="1"></div>
      <div class="form-group"><label class="form-label">Season</label>
        <select class="form-control" id="f-season">
          <option value="summer">Summer</option><option value="winter">Winter (Greenhouse)</option>
          <option value="spring">Spring</option><option value="fall">Fall</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Garden Location</label>
      <select class="form-control" id="f-location">
        <option value="">No location assigned</option>
        ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}">${l.name} (${l.type})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitPlants()">Add Plants</button>
    </div>
  `);
}

function showEditPlant(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Edit Plant — ' + designation, `
    <div class="form-group"><label class="form-label">Season</label>
      <select class="form-control" id="f-season">
        <option value="summer" ${p.season_type === 'summer' ? 'selected' : ''}>Summer</option>
        <option value="winter" ${p.season_type === 'winter' ? 'selected' : ''}>Winter (Greenhouse)</option>
        <option value="spring" ${p.season_type === 'spring' ? 'selected' : ''}>Spring</option>
        <option value="fall" ${p.season_type === 'fall' ? 'selected' : ''}>Fall</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Garden Location</label>
      <select class="form-control" id="f-location">
        <option value="">No location assigned</option>
        ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${p.location_id === l.id ? 'selected' : ''}>${l.name} (${l.type})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Selected for Seed Save</label>
      <select class="form-control" id="f-seedsave">
        <option value="false" ${!p.selected_for_seed ? 'selected' : ''}>No</option>
        <option value="true" ${p.selected_for_seed ? 'selected' : ''}>Yes ⭐</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="3">${p.notes || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditPlant('${designation}')">Save Changes</button>
    </div>
  `);
}

async function submitPlants() {
  const seed_lot_designation = document.getElementById('f-lot').value;
  if (!seed_lot_designation) return alert('Select a seed lot');
  const location_id = document.getElementById('f-location').value;
  const result = await api('/api/plants', 'POST', { seed_lot_designation, season_year: new Date().getFullYear(), season_type: document.getElementById('f-season').value, count: parseInt(document.getElementById('f-count').value), location_id: location_id || null, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ ' + result.length + ' plant(s) added!\nFirst: ' + result[0].designation), 100);
}

async function submitEditPlant(designation) {
  const plant = state.plants.find(p => p.designation === designation);
  const location_id = document.getElementById('f-location').value;
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: document.getElementById('f-seedsave').value === 'true', notes: document.getElementById('f-notes').value, season_type: document.getElementById('f-season').value, location_id: location_id || null, traits: plant.traits || {} });
  closeModal(); await loadAll(); render();
}

async function toggleSeedSelect(designation, selected) {
  const plant = state.plants.find(p => p.designation === designation);
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: selected, notes: plant.notes, season_type: plant.season_type, location_id: plant.location_id, traits: plant.traits || {} });
  await loadAll(); render();
}

async function deletePlant(designation) {
  if (!confirm('Delete plant ' + designation + '? This cannot be undone.')) return;
  await api('/api/plants/' + designation, 'DELETE'); await loadAll(); render();
}

// AMENDMENTS
function renderAmendments() {
  const searchTerm = (document.getElementById('amend-search')?.value || '').toLowerCase();
  const filterType = document.getElementById('amend-filter-type')?.value || '';
  let filteredAmendments = state.amendments.filter(a => {
    const matchSearch = !searchTerm ||
      (a.plant_designation || '').toLowerCase().includes(searchTerm) ||
      (a.product_name || '').toLowerCase().includes(searchTerm) ||
      (a.location_name || '').toLowerCase().includes(searchTerm) ||
      (a.notes || '').toLowerCase().includes(searchTerm);
    const matchType = !filterType || a.type === filterType;
    return matchSearch && matchType;
  });
  const types = [...new Set(state.amendments.map(a => a.type))].sort();
  return `
    <div class="page-header"><h1 class="page-title">🌿 Amendments & Fertilizer</h1><button class="btn btn-primary" onclick="showAddAmendment()">+ Log Amendment</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="amend-search" placeholder="🔍 Search amendments..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="amend-filter-type" style="max-width:150px;" onchange="render()">
          <option value="">All Types</option>
          ${types.map(t => `<option value="${t}" ${filterType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        ${searchTerm || filterType ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('amend-search').value='';document.getElementById('amend-filter-type').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredAmendments.length} of ${state.amendments.length} records</span>
      </div>
    </div>
    ${filteredAmendments.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.amendments.length === 0 ? 'No amendments logged yet. Use the 🌿 Amend button on a plant or location.' : 'No amendments match your search.'}</p></div></div>`
    : filteredAmendments.map(a => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span class="tag tag-active">${a.type}</span>
              ${a.product_name ? `<strong>${a.product_name}</strong>` : ''}
              <span style="font-size:0.85rem;color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--text-muted);">
              ${a.plant_designation ? `<span>🪴 ${a.plant_designation}</span>` : ''}
              ${a.location_name ? `<span>📍 ${a.location_name}</span>` : ''}
              ${a.amount ? `<span>📏 ${a.amount}</span>` : ''}
              ${a.method ? `<span>🔧 ${a.method}</span>` : ''}
            </div>
            ${a.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${a.notes}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditAmendment(${a.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAmendment(${a.id})">🗑️</button>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

function amendmentForm(a, preselectedPlant = '') {
  const types = ['Fertilizer', 'Amendment', 'Pesticide', 'Fungicide', 'Herbicide', 'Other'];
  const methods = ['Top dress', 'Side dress', 'Soil drench', 'Foliar spray', 'Mixed into soil', 'Other'];
  return `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Apply to Plant</label>
        <select class="form-control" id="f-aplant">
          <option value="">No specific plant</option>
          ${state.plants.filter(p => p.season_year === new Date().getFullYear()).map(p => `<option value="${p.designation}" ${(a && a.plant_designation === p.designation) || preselectedPlant === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Apply to Location</label>
        <select class="form-control" id="f-alocation">
          <option value="">No specific location</option>
          ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${a && a.location_id === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-adate" type="date" value="${a && a.amendment_date ? a.amendment_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Type *</label>
        <select class="form-control" id="f-atype">
          ${types.map(t => `<option value="${t}" ${a && a.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Product Name</label><input class="form-control" id="f-aproduct" value="${a ? a.product_name || '' : ''}" placeholder="e.g. Tomato-tone, Miracle-Gro, Lime"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Amount / Rate</label><input class="form-control" id="f-aamount" value="${a ? a.amount || '' : ''}" placeholder="e.g. 1 tbsp per gallon, 1 cup per plant"></div>
      <div class="form-group"><label class="form-label">Method</label>
        <select class="form-control" id="f-amethod">
          <option value="">Select...</option>
          ${methods.map(m => `<option value="${m}" ${a && a.method === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-anotes" rows="2">${a ? a.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${a ? `submitEditAmendment(${a.id})` : 'submitAmendment()'}">${a ? 'Save Changes' : 'Log Amendment'}</button>
    </div>
  `;
}

function showAddAmendment(preselectedPlant = '') { openModal('Log Amendment / Fertilizer', amendmentForm(null, preselectedPlant)); }
function showEditAmendment(id) { openModal('Edit Amendment', amendmentForm(state.amendments.find(x => x.id === id))); }

async function submitAmendment() {
  const amendment_date = document.getElementById('f-adate').value;
  const type = document.getElementById('f-atype').value;
  if (!amendment_date || !type) return alert('Date and type are required');
  await api('/api/amendments', 'POST', { plant_designation: document.getElementById('f-aplant').value || null, location_id: document.getElementById('f-alocation').value || null, amendment_date, type, product_name: document.getElementById('f-aproduct').value, amount: document.getElementById('f-aamount').value, method: document.getElementById('f-amethod').value, notes: document.getElementById('f-anotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditAmendment(id) {
  await api('/api/amendments/' + id, 'PUT', { amendment_date: document.getElementById('f-adate').value, type: document.getElementById('f-atype').value, product_name: document.getElementById('f-aproduct').value, amount: document.getElementById('f-aamount').value, method: document.getElementById('f-amethod').value, notes: document.getElementById('f-anotes').value });
  closeModal(); await loadAll(); render();
}

async function deleteAmendment(id) {
  if (!confirm('Delete this amendment record? This cannot be undone.')) return;
  await api('/api/amendments/' + id, 'DELETE'); await loadAll(); render();
}

function showPlantQR(designation) {
  const p = state.plants.find(x => x.designation === designation);
  const lot = state.seedLots.find(l => l.designation === p.seed_lot_designation);
  openModal('QR Code — ' + designation, `
    <div style="text-align:center;padding:16px;">
      <div id="qr-container" style="display:inline-block;padding:16px;background:white;border-radius:8px;margin-bottom:16px;"></div>
      <div style="font-family:monospace;font-size:0.85rem;margin-bottom:4px;">${designation}</div>
      <div style="font-size:0.85rem;color:var(--text-muted);">${p.variety_name || ''} · ${p.season_year}</div>
      ${lot && lot.storage_location ? `<div style="font-size:0.8rem;color:var(--text-muted);">${lot.storage_location}</div>` : ''}
    </div>
    <div class="alert alert-info">Print this QR code and attach it to your plant stake. Scan next season to pull up this plant instantly.</div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printQR('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    const container = document.getElementById('qr-container');
    if (container && typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: designation,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

function printQR(designation) {
  const p = state.plants.find(x => x.designation === designation);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        .label { border: 2px solid #000; display: inline-block; padding: 12px; border-radius: 8px; }
        .designation { font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 8px; }
        .variety { font-size: 12px; color: #555; }
      </style>
    </head>
    <body>
      <div class="label">
        <div id="qr"></div>
        <div class="designation">${designation}</div>
        <div class="variety">${p.variety_name || ''} · ${p.season_year}</div>
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 150,
          height: 150,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function renderHarvest() {
  const searchTerm = (document.getElementById('harvest-search')?.value || '').toLowerCase();
  let filteredHarvest = state.harvest.filter(h => {
    return !searchTerm ||
      h.plant_designation.toLowerCase().includes(searchTerm) ||
      (h.variety_name || '').toLowerCase().includes(searchTerm) ||
      (h.processing_method || '').toLowerCase().includes(searchTerm) ||
      (h.condition || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">📋 Harvest Log</h1><button class="btn btn-primary" onclick="showAddHarvest()">+ Log Harvest</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="harvest-search" placeholder="🔍 Search harvest..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('harvest-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredHarvest.length} of ${state.harvest.length} records</span>
      </div>
    </div>
    <div class="card">
      ${filteredHarvest.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📋</div><p>${state.harvest.length === 0 ? 'No harvest records yet.' : 'No records match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Diameter</th><th>Weight</th><th>Seeds</th><th>Method</th><th>Actions</th></tr></thead>
        <tbody>${filteredHarvest.map(h => `<tr>
          <td>${h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</td>
          <td><span class="designation" style="font-size:0.75rem;">${h.plant_designation}</span></td>
          <td>${h.variety_name || '—'}</td>
          <td>${h.fruit_length_inches ? h.fruit_length_inches + '"' : '—'}</td>
          <td>${h.fruit_diameter_inches ? h.fruit_diameter_inches + '"' : '—'}</td>
          <td>${h.fruit_weight_oz ? h.fruit_weight_oz + ' oz' : '—'}</td>
          <td>${h.seed_count || '—'}</td>
          <td>${h.processing_method || '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditHarvest(${h.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteHarvest(${h.id})">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function harvestForm(h) {
  return `
    <div class="form-group"><label class="form-label">Plant *</label>
      <select class="form-control" id="f-plant" ${h ? 'disabled' : ''}>
        <option value="">Select plant...</option>
        ${state.plants.map(p => `<option value="${p.designation}" ${h && h.plant_designation === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Harvest Date</label><input class="form-control" id="f-date" type="date" value="${h && h.harvest_date ? h.harvest_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Condition</label>
        <select class="form-control" id="f-condition">
          <option value="perfect" ${h && h.condition === 'perfect' ? 'selected' : ''}>Perfect</option>
          <option value="good" ${h && h.condition === 'good' ? 'selected' : ''}>Good</option>
          <option value="overripe" ${h && h.condition === 'overripe' ? 'selected' : ''}>Overripe (ideal for seeds)</option>
          <option value="damaged" ${h && h.condition === 'damaged' ? 'selected' : ''}>Damaged</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Length (inches)</label><input class="form-control" id="f-length" type="number" step="0.1" value="${h ? h.fruit_length_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Fruit Diameter (inches)</label><input class="form-control" id="f-diameter" type="number" step="0.1" value="${h ? h.fruit_diameter_inches || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Weight (oz)</label><input class="form-control" id="f-weight" type="number" step="0.1" value="${h ? h.fruit_weight_oz || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Seed Count</label><input class="form-control" id="f-seeds" type="number" value="${h ? h.seed_count || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Processing Method</label>
      <select class="form-control" id="f-method">
        <option value="direct dry" ${h && h.processing_method === 'direct dry' ? 'selected' : ''}>Direct Dry (cucumbers, peppers)</option>
        <option value="wet ferment" ${h && h.processing_method === 'wet ferment' ? 'selected' : ''}>Wet Ferment (tomatoes)</option>
        <option value="rinse dry" ${h && h.processing_method === 'rinse dry' ? 'selected' : ''}>Rinse and Dry</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${h ? h.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${h ? `submitEditHarvest(${h.id})` : 'submitHarvest()'}">${h ? 'Save Changes' : 'Log Harvest'}</button>
    </div>
  `;
}

function showAddHarvest() { openModal('Log Seed Harvest', harvestForm(null)); }
function showEditHarvest(id) { openModal('Edit Harvest Record', harvestForm(state.harvest.find(x => x.id === id))); }

async function submitHarvest() {
  const plant_designation = document.getElementById('f-plant').value;
  if (!plant_designation) return alert('Select a plant');
  await api('/api/harvest', 'POST', { plant_designation, harvest_date: document.getElementById('f-date').value, fruit_length_inches: document.getElementById('f-length').value || null, fruit_diameter_inches: document.getElementById('f-diameter').value || null, fruit_weight_oz: document.getElementById('f-weight').value || null, seed_count: document.getElementById('f-seeds').value || null, condition: document.getElementById('f-condition').value, processing_method: document.getElementById('f-method').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditHarvest(id) {
  await api('/api/harvest/' + id, 'PUT', { harvest_date: document.getElementById('f-date').value, fruit_length_inches: document.getElementById('f-length').value || null, fruit_diameter_inches: document.getElementById('f-diameter').value || null, fruit_weight_oz: document.getElementById('f-weight').value || null, seed_count: document.getElementById('f-seeds').value || null, condition: document.getElementById('f-condition').value, processing_method: document.getElementById('f-method').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteHarvest(id) {
  if (!confirm('Delete this harvest record? This cannot be undone.')) return;
  await api('/api/harvest/' + id, 'DELETE'); await loadAll(); render();
}

function renderGermination() {
  const searchTerm = (document.getElementById('germ-search')?.value || '').toLowerCase();
  let filteredGerm = state.germination.filter(g => {
    return !searchTerm ||
      g.seed_lot_designation.toLowerCase().includes(searchTerm) ||
      (g.variety_name || '').toLowerCase().includes(searchTerm) ||
      (g.notes || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">🌿 Germination</h1><button class="btn btn-primary" onclick="showAddGermination()">+ Start Test</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="germ-search" placeholder="🔍 Search tests..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('germ-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredGerm.length} of ${state.germination.length} tests</span>
      </div>
    </div>
    <div class="card">
      ${filteredGerm.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.germination.length === 0 ? 'No germination tests yet.' : 'No tests match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Seed Lot</th><th>Variety</th><th>Started</th><th>Planted</th><th>Germinated</th><th>Rate</th><th>Days</th><th>Thinned</th><th>Remaining</th><th>Actions</th></tr></thead>
        <tbody>${filteredGerm.map(g => {
          const rate = g.seeds_germinated !== null && g.seeds_planted ? Math.round((g.seeds_germinated / g.seeds_planted) * 100) : null;
          return `<tr>
            <td><span class="designation" style="font-size:0.75rem;">${g.seed_lot_designation}</span></td>
            <td>${g.variety_name || '—'}</td>
            <td>${g.date_started ? new Date(g.date_started).toLocaleDateString() : '—'}</td>
            <td>${g.seeds_planted}</td>
            <td>${g.seeds_germinated !== null ? g.seeds_germinated : '—'}</td>
            <td>${rate !== null ? `<span class="gen-badge" style="background:${rate >= 80 ? 'var(--green-mid)' : rate >= 50 ? '#d97706' : '#dc2626'}">${rate}%</span>` : '—'}</td>
            <td>${g.days_to_germination !== null ? g.days_to_germination + ' days' : '—'}</td>
            <td>${g.seeds_thinned !== null ? g.seeds_thinned : '—'}</td>
            <td>${g.plants_remaining !== null ? g.plants_remaining : '—'}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap;">
              ${g.seeds_germinated === null ? `<button class="btn btn-primary btn-sm" onclick="showUpdateGermination(${g.id})">📊 Update</button>` : ''}
              ${g.seeds_thinned === null && g.seeds_germinated !== null ? `<button class="btn btn-brown btn-sm" onclick="showThinningLog(${g.id})">✂️ Thinning</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteGermination(${g.id})">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function showAddGermination() {
  openModal('Start Germination Test', `
    <div class="alert alert-info">Track seeds from planting through germination and thinning.</div>
    <div class="form-group"><label class="form-label">Seed Lot *</label>
      <select class="form-control" id="f-lot">
        <option value="">Select seed lot...</option>
        ${state.seedLots.map(l => `<option value="${l.designation}">${l.designation} — ${l.variety_name || l.variety_code}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Started *</label><input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Seeds Planted *</label><input class="form-control" id="f-planted" type="number" min="1" placeholder="e.g. 8"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2" placeholder="Soil mix, indoor/outdoor, conditions..."></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitGermination()">Start Test</button>
    </div>
  `);
}

function showUpdateGermination(id) {
  const g = state.germination.find(x => x.id === id);
  openModal('Update Germination — ' + g.seed_lot_designation, `
    <div style="background:var(--green-bg);padding:12px;border-radius:6px;margin-bottom:16px;">
      <strong>${g.seeds_planted} seeds planted</strong> on ${new Date(g.date_started).toLocaleDateString()}
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Seeds Germinated *</label><input class="form-control" id="f-germinated" type="number" min="0" max="${g.seeds_planted}"></div>
      <div class="form-group"><label class="form-label">Date Germinated *</label><input class="form-control" id="f-dategerm" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${g.notes || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitUpdateGermination(${id})">Save Results</button>
    </div>
  `);
}

function showThinningLog(id) {
  const g = state.germination.find(x => x.id === id);
  openModal('Log Thinning — ' + g.seed_lot_designation, `
    <div style="background:var(--green-bg);padding:12px;border-radius:6px;margin-bottom:16px;">
      <strong>${g.seeds_germinated} of ${g.seeds_planted} germinated</strong>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Seeds Thinned *</label><input class="form-control" id="f-thinned" type="number" min="0" max="${g.seeds_germinated}"></div>
      <div class="form-group"><label class="form-label">Date Thinned</label><input class="form-control" id="f-datethinned" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-group"><label class="form-label">Plants Remaining *</label><input class="form-control" id="f-remaining" type="number" min="0"></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitThinning(${id})">Log Thinning</button>
    </div>
  `);
}

async function submitGermination() {
  const seed_lot_designation = document.getElementById('f-lot').value;
  const date_started = document.getElementById('f-date').value;
  const seeds_planted = document.getElementById('f-planted').value;
  if (!seed_lot_designation || !date_started || !seeds_planted) return alert('Seed lot, date and seeds planted are required');
  await api('/api/germination', 'POST', { seed_lot_designation, date_started, seeds_planted: parseInt(seeds_planted), notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitUpdateGermination(id) {
  const seeds_germinated = document.getElementById('f-germinated').value;
  const date_germinated = document.getElementById('f-dategerm').value;
  if (!seeds_germinated || !date_germinated) return alert('Seeds germinated and date are required');
  await api('/api/germination/' + id, 'PUT', { seeds_germinated: parseInt(seeds_germinated), date_germinated, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitThinning(id) {
  const g = state.germination.find(x => x.id === id);
  const seeds_thinned = document.getElementById('f-thinned').value;
  const plants_remaining = document.getElementById('f-remaining').value;
  if (!seeds_thinned || !plants_remaining) return alert('Seeds thinned and plants remaining are required');
  await api('/api/germination/' + id, 'PUT', { seeds_germinated: g.seeds_germinated, date_germinated: g.date_germinated ? g.date_germinated.split('T')[0] : null, seeds_thinned: parseInt(seeds_thinned), date_thinned: document.getElementById('f-datethinned').value, plants_remaining: parseInt(plants_remaining), notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteGermination(id) {
  if (!confirm('Delete this germination test? This cannot be undone.')) return;
  await api('/api/germination/' + id, 'DELETE'); await loadAll(); render();
}

function showLocationDetail(id) {
  const loc = state.locations.find(l => l.id === id);
  if (!loc) return;
  const currentYear = new Date().getFullYear();
  const plants = state.plants.filter(p => p.location_id === id);
  const thisYearPlants = plants.filter(p => p.season_year === currentYear);
  const locAmendments = state.amendments.filter(a => a.location_id === id);
  const allYears = [...new Set(plants.map(p => p.season_year))].sort((a,b) => b-a);

  openModal('📍 ' + loc.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Type</span><div style="font-weight:600;">${loc.type}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Status</span><div><span class="tag tag-${loc.active ? 'active' : 'complete'}">${loc.active ? 'Active' : 'Inactive'}</span></div></div>
          ${loc.size_description ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Size</span><div style="font-weight:600;">${loc.size_description}</div></div>` : ''}
          ${loc.sun_exposure ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sun</span><div style="font-weight:600;">${loc.sun_exposure}</div></div>` : ''}
        </div>
        ${loc.soil_notes ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">🌱 ${loc.soil_notes}</div>` : ''}
        ${loc.notes ? `<div style="margin-top:4px;font-size:0.85rem;color:var(--text-muted);">${loc.notes}</div>` : ''}
      </div>

      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🪴 Plants This Season (${thisYearPlants.length})</div>
        ${thisYearPlants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants this season.</p>' : `
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${thisYearPlants.map(p => `<span class="designation" style="font-size:0.75rem;cursor:pointer;" onclick="closeModal();showPlantDetail('${p.designation}')">${p.designation}${p.selected_for_seed ? ' ⭐' : ''}</span>`).join('')}
        </div>`}
      </div>

      ${allYears.filter(y => y !== currentYear).length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📚 Previous Seasons</div>
        ${allYears.filter(y => y !== currentYear).map(year => {
          const yearPlants = plants.filter(p => p.season_year === year);
          return `<div style="font-size:0.85rem;margin-bottom:4px;"><strong>${year}:</strong> ${yearPlants.map(p => p.designation).join(', ')}</div>`;
        }).join('')}
      </div>` : ''}

      ${locAmendments.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Amendment History (${locAmendments.length})</div>
        ${locAmendments.map(a => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;">
              <span><span class="tag tag-active">${a.type}</span>${a.product_name ? ' ' + a.product_name : ''}</span>
              <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            ${a.amount || a.method ? `<div style="color:var(--text-muted);margin-top:4px;">${a.amount || ''} ${a.method || ''}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showAddAmendmentLocation(${id});">🌿 Amend</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showEditLocation(${id});">✏️ Edit</button>
      </div>
    </div>
  `);
}

function renderLocations() {
  const searchTerm = (document.getElementById('loc-search')?.value || '').toLowerCase();
  const filterActive = document.getElementById('loc-filter-active')?.value || '';
  let filteredLocations = state.locations.filter(loc => {
    const matchSearch = !searchTerm ||
      loc.name.toLowerCase().includes(searchTerm) ||
      loc.type.toLowerCase().includes(searchTerm) ||
      (loc.notes || '').toLowerCase().includes(searchTerm);
    const matchActive = !filterActive ||
      (filterActive === 'active' ? loc.active : !loc.active);
    return matchSearch && matchActive;
  });
  return `
    <div class="page-header"><h1 class="page-title">📍 Garden Locations</h1><button class="btn btn-primary" onclick="showAddLocation()">+ Add Location</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="loc-search" placeholder="🔍 Search locations..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="loc-filter-active" style="max-width:150px;" onchange="render()">
          <option value="">All Locations</option>
          <option value="active" ${filterActive === 'active' ? 'selected' : ''}>Active Only</option>
          <option value="inactive" ${filterActive === 'inactive' ? 'selected' : ''}>Inactive Only</option>
        </select>
        ${searchTerm || filterActive ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('loc-search').value='';document.getElementById('loc-filter-active').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredLocations.length} of ${state.locations.length} locations</span>
      </div>
    </div>
    ${filteredLocations.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">📍</div><p>${state.locations.length === 0 ? 'No garden locations yet.' : 'No locations match your search.'}</p></div></div>`
    : filteredLocations.map(loc => {
      const plants = state.plants.filter(p => p.location_id === loc.id && p.season_year === new Date().getFullYear());
      const locAmendments = state.amendments.filter(a => a.location_id === loc.id).slice(0, 3);
      return `
        <div class="card" style="cursor:pointer;" onclick="showLocationDetail(${loc.id})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                <strong style="font-size:1.1rem;">${loc.name}</strong>
                <span class="tag tag-active">${loc.type}</span>
                ${!loc.active ? '<span class="tag tag-complete">Inactive</span>' : ''}
              </div>
              ${loc.size_description ? `<div style="font-size:0.85rem;color:var(--text-muted);">📐 ${loc.size_description}</div>` : ''}
              ${loc.sun_exposure ? `<div style="font-size:0.85rem;color:var(--text-muted);">☀️ ${loc.sun_exposure}</div>` : ''}
              ${loc.soil_notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">🌱 ${loc.soil_notes}</div>` : ''}
              ${loc.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${loc.notes}</div>` : ''}
            </div>
            <div onclick="event.stopPropagation()" style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" onclick="showAddAmendmentLocation(${loc.id})">🌿 Amend</button>
              <button class="btn btn-secondary btn-sm" onclick="showEditLocation(${loc.id})">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteLocation(${loc.id})">🗑️</button>
            </div>
          </div>
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Plants this season (${plants.length}):</div>
            ${plants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants assigned yet.</p>'
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${plants.map(p => `<span class="designation" style="font-size:0.75rem;">${p.designation}</span>`).join('')}</div>`}
          </div>
          ${locAmendments.length > 0 ? `
          <div style="margin-top:12px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:6px;">Recent amendments:</div>
            ${locAmendments.map(a => `<div style="font-size:0.8rem;color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()} — ${a.type}${a.product_name ? ': ' + a.product_name : ''}</div>`).join('')}
          </div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

function showAddAmendmentLocation(locationId) {
  openModal('Log Amendment for Location', amendmentForm(null, ''));
  setTimeout(() => {
    const sel = document.getElementById('f-alocation');
    if (sel) sel.value = locationId;
  }, 50);
}

function locationForm(loc) {
  const types = ['Raised Bed', 'Fabric Grow Bag', 'In Ground', 'Container/Pot', 'Greenhouse Bed', 'Greenhouse Bench', 'Other'];
  const sunOptions = ['Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'];
  return `
    <div class="form-group"><label class="form-label">Location Name *</label><input class="form-control" id="f-lname" value="${loc ? loc.name : ''}" placeholder="e.g. Front Bed, Grow Bag Table"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type *</label>
        <select class="form-control" id="f-ltype">
          ${types.map(t => `<option value="${t}" ${loc && loc.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Size / Dimensions</label><input class="form-control" id="f-lsize" value="${loc ? loc.size_description || '' : ''}" placeholder="e.g. 4x5 ft, 5 gallon"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sun Exposure</label>
        <select class="form-control" id="f-lsun">
          <option value="">Select...</option>
          ${sunOptions.map(s => `<option value="${s}" ${loc && loc.sun_exposure === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      ${loc ? `<div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="f-lactive">
          <option value="true" ${loc.active ? 'selected' : ''}>Active</option>
          <option value="false" ${!loc.active ? 'selected' : ''}>Inactive</option>
        </select>
      </div>` : ''}
    </div>
    <div class="form-group"><label class="form-label">Soil / Mix Notes</label><textarea class="form-control" id="f-lsoil" rows="2">${loc ? loc.soil_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-lnotes" rows="2">${loc ? loc.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${loc ? `submitEditLocation(${loc.id})` : 'submitLocation()'}">${loc ? 'Save Changes' : 'Add Location'}</button>
    </div>
  `;
}

function showAddLocation() { openModal('Add Garden Location', locationForm(null)); }
function showEditLocation(id) { openModal('Edit Location', locationForm(state.locations.find(l => l.id === id))); }

async function submitLocation() {
  const name = document.getElementById('f-lname').value.trim();
  const type = document.getElementById('f-ltype').value;
  if (!name || !type) return alert('Name and type are required');
  await api('/api/locations', 'POST', { name, type, size_description: document.getElementById('f-lsize').value, sun_exposure: document.getElementById('f-lsun').value, soil_notes: document.getElementById('f-lsoil').value, notes: document.getElementById('f-lnotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditLocation(id) {
  const name = document.getElementById('f-lname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/locations/' + id, 'PUT', { name, type: document.getElementById('f-ltype').value, size_description: document.getElementById('f-lsize').value, sun_exposure: document.getElementById('f-lsun').value, soil_notes: document.getElementById('f-lsoil').value, notes: document.getElementById('f-lnotes').value, active: document.getElementById('f-lactive').value === 'true' });
  closeModal(); await loadAll(); render();
}

async function deleteLocation(id) {
  if (!confirm('Delete this location? This cannot be undone.')) return;
  await api('/api/locations/' + id, 'DELETE'); await loadAll(); render();
}

function renderCrosses() {
  const searchTerm = (document.getElementById('cross-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('cross-filter-status')?.value || '';
  let filteredCrosses = state.crosses.filter(c => {
    const matchSearch = !searchTerm ||
      c.mother_designation.toLowerCase().includes(searchTerm) ||
      (c.father_designation || '').toLowerCase().includes(searchTerm) ||
      (c.project_code || '').toLowerCase().includes(searchTerm) ||
      (c.notes || '').toLowerCase().includes(searchTerm);
    const matchStatus = !filterStatus ||
      (filterStatus === 'pending' && c.success === null) ||
      (filterStatus === 'success' && c.success === true) ||
      (filterStatus === 'failed' && c.success === false);
    return matchSearch && matchStatus;
  });
  return `
    <div class="page-header"><h1 class="page-title">🌸 Cross Pollination</h1><button class="btn btn-primary" onclick="showAddCross()">+ Log Cross</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="cross-search" placeholder="🔍 Search crosses..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="cross-filter-status" style="max-width:150px;" onchange="render()">
          <option value="">All Status</option>
          <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="success" ${filterStatus === 'success' ? 'selected' : ''}>✅ Success</option>
          <option value="failed" ${filterStatus === 'failed' ? 'selected' : ''}>❌ Failed</option>
        </select>
        ${searchTerm || filterStatus ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('cross-search').value='';document.getElementById('cross-filter-status').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredCrosses.length} of ${state.crosses.length} crosses</span>
      </div>
    </div>
    ${filteredCrosses.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🌸</div><p>${state.crosses.length === 0 ? 'No cross pollinations logged yet.' : 'No crosses match your search.'}</p></div></div>`
    : filteredCrosses.map(c => {
      const statusColor = c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b';
      const statusText = c.success === true ? '✅ Success' : c.success === false ? '❌ Failed' : '⏳ Pending';
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <span class="designation" style="font-size:0.8rem;">${c.mother_designation}</span>
                <span style="font-size:1.2rem;">×</span>
                <span class="designation" style="font-size:0.8rem;">${c.father_designation || '?'}</span>
                ${c.project_code ? `<span class="tag tag-active">${c.project_code}</span>` : ''}
              </div>
              <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--text-muted);">
                ${c.date_bagged ? `<span>🛍️ Bagged: ${new Date(c.date_bagged).toLocaleDateString()}</span>` : ''}
                ${c.date_pollinated ? `<span>🌸 Pollinated: ${new Date(c.date_pollinated).toLocaleDateString()}</span>` : ''}
                ${c.date_unbagged ? `<span>✂️ Unbagged: ${new Date(c.date_unbagged).toLocaleDateString()}</span>` : ''}
              </div>
              ${c.fruit_set ? '<div style="font-size:0.85rem;margin-top:4px;">🍅 Fruit set confirmed</div>' : ''}
              ${c.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${c.notes}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-weight:700;color:${statusColor};">${statusText}</span>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-secondary btn-sm" onclick="showUpdateCross(${c.id})">✏️ Update</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCross(${c.id})">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function showAddCross() {
  openModal('Log Cross Pollination', `
    <div class="alert alert-info">Log a hand pollination attempt between two plants.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Mother Plant (receives pollen) *</label>
        <select class="form-control" id="f-mother">
          <option value="">Select plant...</option>
          ${state.plants.map(p => `<option value="${p.designation}">${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Father Plant (donates pollen)</label>
        <select class="form-control" id="f-father">
          <option value="">Select plant...</option>
          ${state.plants.map(p => `<option value="${p.designation}">${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Breeding Project</label>
      <select class="form-control" id="f-project">
        <option value="">None</option>
        ${state.projects.filter(p => p.status === 'active').map(p => `<option value="${p.code}">${p.name} (${p.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Bagged</label><input class="form-control" id="f-bagged" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Date Pollinated</label><input class="form-control" id="f-pollinated" type="date"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCross()">Log Cross</button>
    </div>
  `);
}

function showUpdateCross(id) {
  const c = state.crosses.find(x => x.id === id);
  openModal('Update Cross — ' + c.mother_designation + ' × ' + (c.father_designation || '?'), `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Pollinated</label><input class="form-control" id="f-pollinated" type="date" value="${c.date_pollinated ? c.date_pollinated.split('T')[0] : ''}"></div>
      <div class="form-group"><label class="form-label">Date Unbagged</label><input class="form-control" id="f-unbagged" type="date" value="${c.date_unbagged ? c.date_unbagged.split('T')[0] : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Set?</label>
        <select class="form-control" id="f-fruitset">
          <option value="false" ${!c.fruit_set ? 'selected' : ''}>No</option>
          <option value="true" ${c.fruit_set ? 'selected' : ''}>Yes 🍅</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Result</label>
        <select class="form-control" id="f-success">
          <option value="" ${c.success === null ? 'selected' : ''}>Pending</option>
          <option value="true" ${c.success === true ? 'selected' : ''}>Success ✅</option>
          <option value="false" ${c.success === false ? 'selected' : ''}>Failed ❌</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${c.notes || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitUpdateCross(${id})">Save Update</button>
    </div>
  `);
}

async function submitCross() {
  const mother_designation = document.getElementById('f-mother').value;
  if (!mother_designation) return alert('Mother plant is required');
  await api('/api/crosses', 'POST', { mother_designation, father_designation: document.getElementById('f-father').value || null, project_code: document.getElementById('f-project').value || null, date_bagged: document.getElementById('f-bagged').value || null, date_pollinated: document.getElementById('f-pollinated').value || null, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitUpdateCross(id) {
  const successVal = document.getElementById('f-success').value;
  await api('/api/crosses/' + id, 'PUT', { date_pollinated: document.getElementById('f-pollinated').value || null, date_unbagged: document.getElementById('f-unbagged').value || null, fruit_set: document.getElementById('f-fruitset').value === 'true', success: successVal === '' ? null : successVal === 'true', notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteCross(id) {
  if (!confirm('Delete this cross pollination record? This cannot be undone.')) return;
  await api('/api/crosses/' + id, 'DELETE'); await loadAll(); render();
}

function renderObservations() {
  const searchTerm = (document.getElementById('obs-search')?.value || '').toLowerCase();
  let filteredObs = state.observations.filter(o => {
    return !searchTerm ||
      o.plant_designation.toLowerCase().includes(searchTerm) ||
      (o.variety_name || '').toLowerCase().includes(searchTerm) ||
      (o.color || '').toLowerCase().includes(searchTerm) ||
      (o.notes || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">🔍 Fruit Observations</h1><button class="btn btn-primary" onclick="showAddObservation()">+ Add Observation</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="obs-search" placeholder="🔍 Search observations..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('obs-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredObs.length} of ${state.observations.length} observations</span>
      </div>
    </div>
    ${filteredObs.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🔍</div><p>${state.observations.length === 0 ? 'No fruit observations yet.' : 'No observations match your search.'}</p></div></div>`
    : filteredObs.map(o => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span class="designation" style="font-size:0.8rem;">${o.plant_designation}</span>
              ${o.variety_name ? `<span style="font-size:0.85rem;color:var(--text-muted);">${o.variety_name}</span>` : ''}
              <span style="font-size:0.85rem;color:var(--text-muted);">${new Date(o.observation_date).toLocaleDateString()}</span>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;">
              ${o.fruit_count !== null ? `<span>🍅 Count: <strong>${o.fruit_count}</strong></span>` : ''}
              ${o.avg_length_inches ? `<span>📏 Length: <strong>${o.avg_length_inches}"</strong></span>` : ''}
              ${o.avg_diameter_inches ? `<span>⭕ Diameter: <strong>${o.avg_diameter_inches}"</strong></span>` : ''}
              ${o.color ? `<span>🎨 Color: <strong>${o.color}</strong></span>` : ''}
              ${o.texture ? `<span>✋ Texture: <strong>${o.texture}</strong></span>` : ''}
            </div>
            ${o.flavor_notes ? `<div style="font-size:0.85rem;margin-top:6px;">😋 <em>${o.flavor_notes}</em></div>` : ''}
            ${o.health_notes ? `<div style="font-size:0.85rem;margin-top:4px;color:#f59e0b;">⚕️ ${o.health_notes}</div>` : ''}
            ${o.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${o.notes}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditObservation(${o.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteObservation(${o.id})">🗑️</button>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

function observationForm(o) {
  return `
    <div class="form-group"><label class="form-label">Plant *</label>
      <select class="form-control" id="f-plant" ${o ? 'disabled' : ''}>
        <option value="">Select plant...</option>
        ${state.plants.map(p => `<option value="${p.designation}" ${o && o.plant_designation === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Observation Date *</label><input class="form-control" id="f-obsdate" type="date" value="${o && o.observation_date ? o.observation_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Count</label><input class="form-control" id="f-count" type="number" min="0" value="${o ? o.fruit_count || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Color</label><input class="form-control" id="f-color" value="${o ? o.color || '' : ''}" placeholder="e.g. Dark green"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Avg Length (inches)</label><input class="form-control" id="f-length" type="number" step="0.1" value="${o ? o.avg_length_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Avg Diameter (inches)</label><input class="form-control" id="f-diameter" type="number" step="0.1" value="${o ? o.avg_diameter_inches || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Texture Notes</label><input class="form-control" id="f-texture" value="${o ? o.texture || '' : ''}" placeholder="e.g. Firm, bumpy, smooth"></div>
    <div class="form-group"><label class="form-label">Flavor Notes</label><textarea class="form-control" id="f-flavor" rows="2">${o ? o.flavor_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">Health / Disease Notes</label><textarea class="form-control" id="f-health" rows="2">${o ? o.health_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">General Notes</label><textarea class="form-control" id="f-notes" rows="2">${o ? o.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${o ? `submitEditObservation(${o.id})` : 'submitObservation()'}">${o ? 'Save Changes' : 'Save Observation'}</button>
    </div>
  `;
}

function showAddObservation() { openModal('Add Fruit Observation', observationForm(null)); }
function showEditObservation(id) { openModal('Edit Observation', observationForm(state.observations.find(x => x.id === id))); }

async function submitObservation() {
  const plant_designation = document.getElementById('f-plant').value;
  const observation_date = document.getElementById('f-obsdate').value;
  if (!plant_designation || !observation_date) return alert('Plant and date are required');
  await api('/api/observations', 'POST', { plant_designation, observation_date, fruit_count: document.getElementById('f-count').value || null, color: document.getElementById('f-color').value, avg_length_inches: document.getElementById('f-length').value || null, avg_diameter_inches: document.getElementById('f-diameter').value || null, texture: document.getElementById('f-texture').value, flavor_notes: document.getElementById('f-flavor').value, health_notes: document.getElementById('f-health').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditObservation(id) {
  await api('/api/observations/' + id, 'PUT', { observation_date: document.getElementById('f-obsdate').value, fruit_count: document.getElementById('f-count').value || null, color: document.getElementById('f-color').value, avg_length_inches: document.getElementById('f-length').value || null, avg_diameter_inches: document.getElementById('f-diameter').value || null, texture: document.getElementById('f-texture').value, flavor_notes: document.getElementById('f-flavor').value, health_notes: document.getElementById('f-health').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteObservation(id) {
  if (!confirm('Delete this observation? This cannot be undone.')) return;
  await api('/api/observations/' + id, 'DELETE'); await loadAll(); render();
}

function showProjectDetail(code) {
  const p = state.projects.find(x => x.code === code);
  if (!p) return;
  const projectCrosses = state.crosses.filter(c => c.project_code === code);
  const successCount = projectCrosses.filter(c => c.success === true).length;
  const failCount = projectCrosses.filter(c => c.success === false).length;
  const pendingCount = projectCrosses.filter(c => c.success === null).length;

  openModal('🧬 ' + p.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Code</span><div><span class="designation">${p.code}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Status</span><div><span class="tag tag-${p.status}">${p.status}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Started</span><div style="font-weight:600;">${p.started_year}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Total Crosses</span><div style="font-weight:600;">${projectCrosses.length}</div></div>
        </div>
        ${p.description ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${p.description}</div>` : ''}
      </div>

      ${p.target_traits && p.target_traits.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🎯 Target Traits</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}</div>
      </div>` : ''}

      ${projectCrosses.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌸 Cross Results</div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <span style="color:#22c55e;font-weight:600;">✅ ${successCount} success</span>
          <span style="color:#ef4444;font-weight:600;">❌ ${failCount} failed</span>
          <span style="color:#f59e0b;font-weight:600;">⏳ ${pendingCount} pending</span>
        </div>
        ${projectCrosses.map(c => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
              <div>
                <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
                <span style="margin:0 6px;">×</span>
                <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
              </div>
              <span style="color:${c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b'};">${c.success === true ? '✅ Success' : c.success === false ? '❌ Failed' : '⏳ Pending'}</span>
            </div>
            ${c.date_pollinated ? `<div style="color:var(--text-muted);margin-top:4px;">Pollinated: ${new Date(c.date_pollinated).toLocaleDateString()}</div>` : ''}
            ${c.notes ? `<div style="color:var(--text-muted);margin-top:4px;">${c.notes}</div>` : ''}
          </div>
        `).join('')}
      </div>` : '<p style="color:var(--text-muted);font-size:0.9rem;">No crosses logged for this project yet.</p>'}

      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showEditProject('${code}');">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showAddCross();">+ Log Cross</button>
      </div>
    </div>
  `);
}

function renderProjects() {
  const searchTerm = (document.getElementById('project-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('project-filter-status')?.value || '';
  let filteredProjects = state.projects.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.code.toLowerCase().includes(searchTerm) ||
      (p.description || '').toLowerCase().includes(searchTerm);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });
  return `
    <div class="page-header"><h1 class="page-title">🧬 Breeding Projects</h1><button class="btn btn-primary" onclick="showAddProject()">+ New Project</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="project-search" placeholder="🔍 Search projects..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="project-filter-status" style="max-width:150px;" onchange="render()">
          <option value="">All Status</option>
          <option value="active" ${filterStatus === 'active' ? 'selected' : ''}>Active</option>
          <option value="complete" ${filterStatus === 'complete' ? 'selected' : ''}>Complete</option>
          <option value="paused" ${filterStatus === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
        ${searchTerm || filterStatus ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('project-search').value='';document.getElementById('project-filter-status').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredProjects.length} of ${state.projects.length} projects</span>
      </div>
    </div>
    ${filteredProjects.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🧬</div><p>${state.projects.length === 0 ? 'No breeding projects yet.' : 'No projects match your search.'}</p></div></div>`
    : filteredProjects.map(p => {
      const projectCrosses = state.crosses.filter(c => c.project_code === p.code);
      return `
        <div class="card" style="cursor:pointer;" onclick="showProjectDetail('${p.code}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                <strong style="font-size:1.1rem;">${p.name}</strong>
                <span class="designation">${p.code}</span>
                <span class="tag tag-${p.status}">${p.status}</span>
              </div>
              <div style="color:var(--text-muted);font-size:0.9rem;">${p.description || 'No description'}</div>
              <div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">Started: ${p.started_year}</div>
            </div>
            <div onclick="event.stopPropagation()" style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="showEditProject('${p.code}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.code}')">🗑️</button>
            </div>
          </div>
          ${p.target_traits && p.target_traits.length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Target Traits:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}</div>
          </div>` : ''}
          ${projectCrosses.length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Cross Pollinations (${projectCrosses.length}):</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${projectCrosses.map(c => `<span style="font-size:0.8rem;padding:3px 8px;border-radius:4px;background:var(--green-bg);">${c.mother_designation} × ${c.father_designation || '?'} ${c.success === true ? '✅' : c.success === false ? '❌' : '⏳'}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

function projectForm(p) {
  return `
    <div class="form-group"><label class="form-label">Project Name *</label><input class="form-control" id="f-pname" value="${p ? p.name : ''}" placeholder="e.g. West Virginia Pepper"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-pdesc" rows="3">${p ? p.description || '' : ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Started Year</label><input class="form-control" id="f-pyear" type="number" value="${p ? p.started_year : new Date().getFullYear()}"></div>
      ${p ? `<div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="f-status">
          <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="complete" ${p.status === 'complete' ? 'selected' : ''}>Complete</option>
          <option value="paused" ${p.status === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
      </div>` : ''}
    </div>
    <div class="form-group"><label class="form-label">Target Traits (comma separated)</label><input class="form-control" id="f-traits" value="${p && p.target_traits ? p.target_traits.join(', ') : ''}" placeholder="e.g. mild heat, thick walls"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${p ? `submitEditProject('${p.code}')` : 'submitProject()'}">${p ? 'Save Changes' : 'Create Project'}</button>
    </div>
  `;
}

function showAddProject() { openModal('New Breeding Project', projectForm(null)); }
function showEditProject(code) { openModal('Edit Project — ' + code, projectForm(state.projects.find(x => x.code === code))); }

async function submitProject() {
  const name = document.getElementById('f-pname').value.trim();
  if (!name) return alert('Project name is required');
  const traitsRaw = document.getElementById('f-traits').value;
  const target_traits = traitsRaw ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const result = await api('/api/projects', 'POST', { name, description: document.getElementById('f-pdesc').value, started_year: document.getElementById('f-pyear').value, target_traits });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ Project created!\nCode: ' + result.code), 100);
}

async function submitEditProject(code) {
  const traitsRaw = document.getElementById('f-traits').value;
  const target_traits = traitsRaw ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  await api('/api/projects/' + code, 'PUT', { name: document.getElementById('f-pname').value, description: document.getElementById('f-pdesc').value, target_traits, status: document.getElementById('f-status').value });
  closeModal(); await loadAll(); render();
}

async function deleteProject(code) {
  if (!confirm('Delete project ' + code + '? This cannot be undone.')) return;
  await api('/api/projects/' + code, 'DELETE'); await loadAll(); render();
}

function renderSettings() {
  const isAdmin = getRole() === 'admin';
  const isDark = getTheme() === 'dark';
  return `
    <div class="page-header"><h1 class="page-title">⚙️ Settings</h1></div>
    <div class="card">
      <div class="settings-section-title">🎨 Appearance</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Dark Mode</h4><p>Switch between light and dark theme.</p></div>
        <button class="btn ${isDark ? 'btn-primary' : 'btn-secondary'}" onclick="toggleTheme()">${isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">💾 Backup & Restore</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export JSON Backup</h4><p>Download a full backup of all your data.</p></div>
        <button class="btn btn-primary" onclick="exportBackup()">⬇️ Export JSON</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export CSV</h4><p>Download all data as a CSV file.</p></div>
        <button class="btn btn-secondary" onclick="exportCSV()">⬇️ Export CSV</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Import Backup</h4><p>Restore from a previously exported JSON backup.</p></div>
        <button class="btn btn-secondary" onclick="triggerImport()">⬆️ Import Backup</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">🔒 Account</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Change Password</h4><p>Update your SeedVault password.</p></div>
        <button class="btn btn-secondary" onclick="showChangePassword()">Change Password</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Sign Out</h4><p>Sign out of SeedVault on this device.</p></div>
        <button class="btn btn-danger" onclick="logout()">⏏️ Sign Out</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Install App</h4><p>Add SeedVault to your home screen for quick access.</p></div>
        <button class="btn btn-secondary" onclick="installPWA()">📱 Install</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">🌡️ Garden Location & Frost Dates</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Zip Code</h4><p>Used for local weather on the dashboard.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-zipcode" style="width:100px;" value="${state.settings.zip_code || ''}" placeholder="e.g. 26301">
          <button class="btn btn-secondary" onclick="saveSetting('zip_code', document.getElementById('s-zipcode').value)">Save</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Last Spring Frost</h4><p>Average date of last spring frost. Used for planting windows.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-lastfrost" style="width:120px;" value="${state.settings.last_frost_date || ''}" placeholder="MM-DD e.g. 04-22">
          <button class="btn btn-secondary" onclick="saveSetting('last_frost_date', document.getElementById('s-lastfrost').value)">Save</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>First Fall Frost</h4><p>Average date of first fall frost. Used for last planting date calculations.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-firstfrost" style="width:120px;" value="${state.settings.first_frost_date || ''}" placeholder="MM-DD e.g. 10-15">
          <button class="btn btn-secondary" onclick="saveSetting('first_frost_date', document.getElementById('s-firstfrost').value)">Save</button>
        </div>
      </div>
    </div>
    ${isAdmin ? `
    <div class="card">
      <div class="settings-section-title">👥 User Management</div>
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Username</th><th>Role</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.users.map(u => `<tr>
              <td><strong>${u.username}</strong></td>
              <td><span class="tag tag-${u.role === 'admin' ? 'active' : 'op'}">${u.role}</span></td>
              <td style="font-size:0.85rem;">${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td style="display:flex;gap:4px;">
                ${u.username !== localStorage.getItem('seedvault_username') ? `
                  <button class="btn btn-secondary btn-sm" onclick="toggleUserRole('${u.username}', '${u.role === 'admin' ? 'standard' : 'admin'}')">${u.role === 'admin' ? 'Make Standard' : 'Make Admin'}</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">🗑️</button>
                ` : '<span style="font-size:0.85rem;color:var(--text-muted);">You</span>'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showAddUser()">+ Add User</button>
    </div>` : ''}
    <div class="card">
      <div class="settings-section-title">🌿 Species Management</div>
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Code</th><th>Name</th><th>Varieties</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.species.map(s => {
              const count = state.varieties.filter(v => v.species_code === s.code).length;
              return `<tr>
                <td><span class="designation">${s.code}</span></td>
                <td>${s.name}</td>
                <td><span class="gen-badge">${count}</span></td>
                <td style="display:flex;gap:4px;">
                  <button class="btn btn-secondary btn-sm" onclick="showEditSpecies('${s.code}', '${s.name}')">✏️ Edit</button>
                  ${count === 0 ? `<button class="btn btn-danger btn-sm" onclick="deleteSpecies('${s.code}')">🗑️</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showAddSpecies()">+ Add Species</button>
    </div>
    <div class="card">
      <div class="settings-section-title">🏪 Seed Sources</div>
      ${state.sources.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">No seed sources added yet.</p>' : `
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Name</th><th>Type</th><th>Rating</th><th>Website</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.sources.map(s => `<tr>
              <td><strong>${s.name}</strong></td>
              <td>${s.type || '—'}</td>
              <td>${s.rating ? '⭐'.repeat(s.rating) : '—'}</td>
              <td>${s.website ? `<a href="${s.website}" target="_blank" style="color:var(--green-mid);font-size:0.85rem;">Visit</a>` : '—'}</td>
              <td style="display:flex;gap:4px;">
                <button class="btn btn-secondary btn-sm" onclick="showEditSource(${s.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSource(${s.id})">🗑️</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
      <button class="btn btn-primary btn-sm" onclick="showAddSource()">+ Add Source</button>
    </div>
    <div class="card">
      <div class="settings-section-title">ℹ️ About SeedVault</div>
      <div class="settings-row"><div class="settings-row-info"><h4>Version</h4><p>SeedVault v1.1.0</p></div></div>
      <div class="settings-row"><div class="settings-row-info"><h4>Database Records</h4><p>${state.stats.varieties || 0} varieties · ${state.stats.seedLots || 0} seed lots · ${state.stats.activePlants || 0} plants this season · ${state.germination.length} germination tests · ${state.harvest.length} harvest records · ${state.amendments.length} amendments</p></div></div>
      <div class="settings-row"><div class="settings-row-info"><h4>Photos</h4><p>${state.plants.filter(p => p.photo_path).length} plant photos · ${state.seedLots.filter(l => l.packet_front_path || l.packet_back_path).length} seed packets with photos</p></div></div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Source Code</h4><p>github.com/Duhato/seedvault — AGPL-3.0 License</p></div>
        <a href="https://github.com/Duhato/seedvault" target="_blank" class="btn btn-secondary">View on GitHub</a>
      </div>
    </div>
  `;
}

async function saveSetting(key, value) {
  await api('/api/settings', 'PUT', { key, value });
  await loadAll();
  render();
  alert('✅ Setting saved!');
}

function showAddUser() {
  openModal('Add User', `
    <div class="form-group"><label class="form-label">Username *</label><input class="form-control" id="f-uname" placeholder="e.g. Jess"></div>
    <div class="form-group"><label class="form-label">Password *</label><input class="form-control" id="f-upw" type="password" placeholder="Min 8 characters"></div>
    <div class="form-group"><label class="form-label">Role</label>
      <select class="form-control" id="f-urole">
        <option value="standard">Standard</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div id="user-error" class="alert alert-danger hidden"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddUser()">Add User</button>
    </div>
  `);
}

async function submitAddUser() {
  const username = document.getElementById('f-uname').value.trim();
  const password = document.getElementById('f-upw').value;
  const role = document.getElementById('f-urole').value;
  const errEl = document.getElementById('user-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Username and password required'; errEl.classList.remove('hidden'); return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  const result = await api('/api/users', 'POST', { username, password, role });
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
  closeModal(); await loadAll(); render();
  alert('✅ User ' + username + ' created successfully!');
}

async function deleteUser(username) {
  if (!confirm('Delete user ' + username + '? This cannot be undone.')) return;
  const result = await api('/api/users/' + username, 'DELETE');
  if (result.error) return alert('Error: ' + result.error);
  await loadAll(); render();
}

async function toggleUserRole(username, newRole) {
  if (!confirm('Change ' + username + ' to ' + newRole + '?')) return;
  await api('/api/users/' + username + '/role', 'PUT', { role: newRole });
  await loadAll(); render();
}

function showChangePassword() {
  openModal('Change Password', `
    <div class="form-group"><label class="form-label">Current Password</label><input class="form-control" id="f-curpw" type="password"></div>
    <div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="f-newpw" type="password" placeholder="Min 8 characters"></div>
    <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-control" id="f-confirmpw" type="password"></div>
    <div id="pw-error" class="alert alert-danger hidden"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitChangePassword()">Change Password</button>
    </div>
  `);
}

async function submitChangePassword() {
  const currentPassword = document.getElementById('f-curpw').value;
  const newPassword = document.getElementById('f-newpw').value;
  const confirm = document.getElementById('f-confirmpw').value;
  const errEl = document.getElementById('pw-error');
  errEl.classList.add('hidden');
  if (newPassword.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  if (newPassword !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
  const result = await api('/api/auth/change-password', 'POST', { currentPassword, newPassword });
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
  closeModal(); alert('✅ Password changed successfully!');
}

function showAddSpecies() {
  openModal('Add Species', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Code *</label><input class="form-control" id="f-scode" placeholder="e.g. HERB" maxlength="10"></div>
      <div class="form-group"><label class="form-label">Name *</label><input class="form-control" id="f-sname" placeholder="e.g. Herb"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddSpecies()">Add Species</button>
    </div>
  `);
}

function showEditSpecies(code, name) {
  openModal('Edit Species — ' + code, `
    <div class="form-group"><label class="form-label">Name *</label><input class="form-control" id="f-sname" value="${name}"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditSpecies('${code}')">Save Changes</button>
    </div>
  `);
}

async function submitAddSpecies() {
  const code = document.getElementById('f-scode').value.trim().toUpperCase();
  const name = document.getElementById('f-sname').value.trim();
  if (!code || !name) return alert('Code and name are required');
  await api('/api/species', 'POST', { code, name }); closeModal(); await loadAll(); render();
}

async function submitEditSpecies(code) {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/species/' + code, 'PUT', { name }); closeModal(); await loadAll(); render();
}

async function deleteSpecies(code) {
  if (!confirm('Delete species ' + code + '? This cannot be undone.')) return;
  const result = await api('/api/species/' + code, 'DELETE');
  if (result.error) return alert('Error: ' + result.error);
  await loadAll(); render();
}

function sourceForm(s) {
  const types = ['commercial', 'local greenhouse', 'seed swap', 'saved', 'online', 'other'];
  return `
    <div class="form-group"><label class="form-label">Source Name *</label><input class="form-control" id="f-sname" value="${s ? s.name : ''}" placeholder="e.g. Burpee"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-control" id="f-stype">
          ${types.map(t => `<option value="${t}" ${s && s.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Rating (1-5 ⭐)</label>
        <select class="form-control" id="f-srating">
          <option value="">No rating</option>
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${s && s.rating === n ? 'selected' : ''}>${'⭐'.repeat(n)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Website</label><input class="form-control" id="f-swebsite" value="${s ? s.website || '' : ''}" placeholder="https://..."></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-snotes" rows="2">${s ? s.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${s ? `submitEditSource(${s.id})` : 'submitSource()'}">${s ? 'Save Changes' : 'Add Source'}</button>
    </div>
  `;
}

function showAddSource() { openModal('Add Seed Source', sourceForm(null)); }
function showEditSource(id) { openModal('Edit Seed Source', sourceForm(state.sources.find(x => x.id === id))); }

async function submitSource() {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/sources', 'POST', { name, type: document.getElementById('f-stype').value, rating: document.getElementById('f-srating').value || null, website: document.getElementById('f-swebsite').value, notes: document.getElementById('f-snotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditSource(id) {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/sources/' + id, 'PUT', { name, type: document.getElementById('f-stype').value, rating: document.getElementById('f-srating').value || null, website: document.getElementById('f-swebsite').value, notes: document.getElementById('f-snotes').value });
  closeModal(); await loadAll(); render();
}

async function deleteSource(id) {
  if (!confirm('Delete this seed source? This cannot be undone.')) return;
  await api('/api/sources/' + id, 'DELETE'); await loadAll(); render();
}

async function exportBackup() {
  try {
    const res = await fetch('/api/backup/export', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seedvault-backup-' + new Date().toISOString().split('T')[0] + '.json'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { alert('Export failed: ' + err.message); }
}

async function exportCSV() {
  try {
    const res = await fetch('/api/backup/export-csv', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seedvault-export-' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { alert('CSV export failed: ' + err.message); }
}

function triggerImport() { document.getElementById('import-file-input').click(); }

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.app !== 'SeedVault') return alert('❌ Not a valid SeedVault backup file.');
    const preview = await api('/api/backup/preview', 'POST', backup);
    const backupData = backup;
    openModal('Import Backup — Preview', `
      <div class="alert alert-warn">⚠️ Existing records will be skipped. New records will be added.</div>
      <div style="background:var(--green-bg);border-radius:8px;padding:16px;margin-bottom:16px;">
        <table style="width:100%;font-size:0.9rem;">
          <tr><td style="padding:4px 0;"><strong>Species</strong></td><td>${preview.species || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Varieties</strong></td><td>${preview.varieties}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Seed Lots</strong></td><td>${preview.seed_lots}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Garden Locations</strong></td><td>${preview.garden_locations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Plants</strong></td><td>${preview.plants}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Breeding Projects</strong></td><td>${preview.breeding_projects}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Harvest Records</strong></td><td>${preview.harvest_log || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Germination Tests</strong></td><td>${preview.germination_tests || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Amendments</strong></td><td>${preview.plant_amendments || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Cross Pollinations</strong></td><td>${preview.cross_pollinations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Observations</strong></td><td>${preview.fruit_observations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Seed Sources</strong></td><td>${preview.seed_sources || 0}</td></tr>
        </table>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="confirm-import-btn">✅ Import</button>
      </div>
    `);
    document.getElementById('confirm-import-btn').onclick = () => confirmImport(backupData);
  } catch (err) { alert('Failed to read backup file: ' + err.message); }
  e.target.value = '';
}

async function confirmImport(backup) {
  try {
    const result = await api('/api/backup/import', 'POST', backup);
    closeModal(); await loadAll(); render();
    setTimeout(() => alert('✅ Import complete!\n\nImported:\n  Varieties: ' + result.imported.varieties + '\n  Seed Lots: ' + result.imported.seed_lots + '\n  Plants: ' + result.imported.plants), 100);
  } catch (err) { alert('Import failed: ' + err.message); }
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setTheme(getTheme());
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
  document.querySelectorAll('.nav-gear').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
  document.getElementById('hamburger').addEventListener('click', () => document.getElementById('mobile-menu').classList.toggle('hidden'));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });

  // Tooltip system
  let tooltipEl = document.getElementById('sv-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sv-tooltip';
    tooltipEl.style.cssText = 'position:fixed;background:#1a1a1a;color:#fff;padding:6px 10px;border-radius:6px;font-size:0.78rem;max-width:200px;text-align:center;z-index:99999;line-height:1.4;pointer-events:none;display:none;';
    document.body.appendChild(tooltipEl);
  }
  let tipTimer = null;
  document.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      tipTimer = setTimeout(() => {
        const tip = el.getAttribute('data-tip');
        tooltipEl.textContent = tip;
        tooltipEl.style.display = 'block';
        const rect = el.getBoundingClientRect();
        const left = Math.max(8, rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2);
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = (rect.bottom + 8) + 'px';
      }, 800);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(tipTimer);
      tooltipEl.style.display = 'none';
    });
  });

  await checkAuth();
  if (getToken()) { await loadAll(); render(); }
});
