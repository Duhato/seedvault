// ==================== THEME ====================
function getTheme() { return localStorage.getItem('seedvault_theme') || 'light'; }
function setTheme(theme) {
  localStorage.setItem('seedvault_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
  render();
}

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
    if (test.error === 'Unauthorized' || test.error === 'Invalid or expired token') {
      clearToken(); showLogin(); return false;
    }
    showApp(); return true;
  } catch (err) { showLogin(); return false; }
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
  harvest: [], species: [], stats: {}, viability: [], germination: [], users: []
};

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

async function loadAll() {
  const calls = [
    api('/api/varieties'), api('/api/seed-lots'), api('/api/plants'), api('/api/projects'),
    api('/api/harvest'), api('/api/species'), api('/api/stats'), api('/api/viability'), api('/api/germination'),
  ];
  if (getRole() === 'admin') calls.push(api('/api/users'));
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
  state.users = results[9] && Array.isArray(results[9]) ? results[9] : [];
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
    case 'dashboard': main.innerHTML = renderDashboard(); break;
    case 'varieties': main.innerHTML = renderVarieties(); break;
    case 'seedlots': main.innerHTML = renderSeedLots(); break;
    case 'plants': main.innerHTML = renderPlants(); break;
    case 'harvest': main.innerHTML = renderHarvest(); break;
    case 'projects': main.innerHTML = renderProjects(); break;
    case 'germination': main.innerHTML = renderGermination(); break;
    case 'settings': main.innerHTML = renderSettings(); break;
  }
}

function renderDashboard() {
  const s = state.stats;
  const recentLots = [...state.seedLots].slice(0, 5);
  const selectedPlants = state.plants.filter(p => p.selected_for_seed);
  return `
    <div class="page-header">
      <h1 class="page-title">🌱 SeedVault Dashboard</h1>
      <span style="color:var(--text-muted);font-size:0.9rem;">${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span>
    </div>
    <div class="stats-grid">
      <div class="stat-card clickable" onclick="navigate('varieties')"><div class="stat-number">${s.varieties || 0}</div><div class="stat-label">Varieties</div></div>
      <div class="stat-card clickable" onclick="navigate('seedlots')"><div class="stat-number">${s.seedLots || 0}</div><div class="stat-label">Seed Lots</div></div>
      <div class="stat-card clickable" onclick="navigate('plants')"><div class="stat-number">${s.activePlants || 0}</div><div class="stat-label">Plants This Season</div></div>
      <div class="stat-card clickable" onclick="navigate('projects')"><div class="stat-number">${s.activeProjects || 0}</div><div class="stat-label">Active Projects</div></div>
    </div>
    ${state.viability.length > 0 ? `
    <div class="card" style="border-left:4px solid #ef4444;">
      <div class="card-title">⚠️ Seed Viability Warnings</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${state.viability.map(lot => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:${lot.status === 'expired' ? '#fee2e2' : '#fef3c7'};border-radius:6px;">
            <div><span class="designation" style="cursor:pointer;" onclick="navigate('seedlots')">${lot.designation}</span>
            <span style="margin-left:8px;font-size:0.85rem;color:var(--text-muted);">${lot.variety_name}</span></div>
            <span style="font-size:0.85rem;font-weight:700;color:${lot.status === 'expired' ? '#991b1b' : '#92400e'};">
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
            <div class="clickable-row" onclick="navigate('seedlots')" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
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
  `;
}

function renderVarieties() {
  return `
    <div class="page-header"><h1 class="page-title">🌿 Varieties</h1><button class="btn btn-primary" onclick="showAddVariety()">+ Add Variety</button></div>
    <div class="card">
      ${state.varieties.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>No varieties yet.</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Code</th><th>Name</th><th>Species</th><th>Type</th><th>Source</th><th>Year</th><th>Lots</th><th>Actions</th></tr></thead>
        <tbody>${state.varieties.map(v => {
          const lots = state.seedLots.filter(l => l.variety_code === v.code).length;
          return `<tr>
            <td><span class="designation">${v.code}</span></td>
            <td><strong>${v.name}</strong></td>
            <td>${v.species_name || v.species_code}</td>
            <td><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></td>
            <td>${v.source || '—'}</td><td>${v.year_acquired || '—'}</td>
            <td><span class="gen-badge">${lots}</span></td>
            <td style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-sm" onclick="showEditVariety('${v.code}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteVariety('${v.code}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
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
          <option value="OP" ${v && v.type === 'OP' ? 'selected' : ''}>Open Pollinated</option>
          <option value="Heirloom" ${v && v.type === 'Heirloom' ? 'selected' : ''}>Heirloom</option>
          <option value="Hybrid" ${v && v.type === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
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
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3 };
  return `
    <div class="page-header"><h1 class="page-title">🫙 Seed Lots</h1><button class="btn btn-primary" onclick="showAddSeedLot()">+ Add Seed Lot</button></div>
    <div class="card">
      ${state.seedLots.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🫙</div><p>No seed lots yet.</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Qty</th><th>Storage</th><th>Germination</th><th>Viability</th><th>Actions</th></tr></thead>
        <tbody>${state.seedLots.map(lot => {
          const maxYears = viabilityYears[lot.species_code] || 3;
          const yearsLeft = maxYears - (currentYear - lot.year_saved);
          let viabilityBadge = '<span style="color:#16a34a;font-weight:600;">🟢 Good</span>';
          if (yearsLeft <= 0) viabilityBadge = '<span style="color:#dc2626;font-weight:600;">🔴 Expired</span>';
          else if (yearsLeft <= 1) viabilityBadge = '<span style="color:#d97706;font-weight:600;">🟡 Expiring</span>';
          return `<tr>
            <td><span class="designation">${lot.designation}</span></td>
            <td>${lot.variety_name || lot.variety_code}</td>
            <td><span class="gen-badge">G${lot.generation}</span></td>
            <td>${lot.year_saved}</td>
            <td>${lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—'}</td>
            <td>${lot.storage_location || '—'}</td>
            <td>${lot.germination_rate ? lot.germination_rate + '%' : '—'}</td>
            <td>${viabilityBadge}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="showAddPlants('${lot.designation}')">+ Plants</button>
              <button class="btn btn-secondary btn-sm" onclick="showEditSeedLot('${lot.designation}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSeedLot('${lot.designation}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function showAddSeedLot() { openModal('Add Seed Lot', seedLotForm(null)); }
function showEditSeedLot(designation) { openModal('Edit Seed Lot — ' + designation, seedLotForm(state.seedLots.find(l => l.designation === designation))); }

function seedLotForm(lot) {
  return `
    ${!lot ? '<div class="alert alert-info">Designation code is generated automatically.</div>' : ''}
    ${!lot ? `
    <div class="form-group"><label class="form-label">Variety *</label>
      <select class="form-control" id="f-variety">
        <option value="">Select variety...</option>
        ${state.varieties.map(v => `<option value="${v.code}">${v.name} (${v.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Generation *</label><input class="form-control" id="f-gen" type="number" min="1" value="1"></div>
      <div class="form-group"><label class="form-label">Year Saved *</label><input class="form-control" id="f-yearsaved" type="number" value="${new Date().getFullYear()}"></div>
    </div>` : ''}
    <div class="form-row">
      <div class="form-group"><label class="form-label">Quantity Estimate (seeds)</label><input class="form-control" id="f-qty" type="number" value="${lot ? lot.quantity_estimate || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Storage Location</label><input class="form-control" id="f-storage" value="${lot ? lot.storage_location || '' : ''}" placeholder="e.g. Ammo box"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Germination Rate %</label><input class="form-control" id="f-germrate" type="number" min="0" max="100" value="${lot ? lot.germination_rate || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Last Tested Date</label><input class="form-control" id="f-lasttest" type="date" value="${lot && lot.last_tested ? lot.last_tested.split('T')[0] : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Mother Plant Designation</label><input class="form-control" id="f-mother" value="${lot ? lot.mother_designation || '' : ''}"></div>
    <div class="form-group"><label class="form-label">Father Plant Designation</label><input class="form-control" id="f-father" value="${lot ? lot.father_designation || '' : ''}"></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="3">${lot ? lot.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${lot ? `submitEditSeedLot('${lot.designation}')` : 'submitSeedLot()'}">${lot ? 'Save Changes' : 'Save Seed Lot'}</button>
    </div>
  `;
}

async function submitSeedLot() {
  const variety_code = document.getElementById('f-variety').value;
  const generation = document.getElementById('f-gen').value;
  const year_saved = document.getElementById('f-yearsaved').value;
  if (!variety_code || !generation || !year_saved) return alert('Variety, generation and year are required');
  const result = await api('/api/seed-lots', 'POST', { variety_code, generation: parseInt(generation), year_saved: parseInt(year_saved), quantity_estimate: document.getElementById('f-qty').value || null, storage_location: document.getElementById('f-storage').value, mother_designation: document.getElementById('f-mother').value, father_designation: document.getElementById('f-father').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ Seed lot created!\nDesignation: ' + result.designation), 100);
}

async function submitEditSeedLot(designation) {
  await api('/api/seed-lots/' + designation, 'PUT', { quantity_estimate: document.getElementById('f-qty').value || null, storage_location: document.getElementById('f-storage').value, germination_rate: document.getElementById('f-germrate').value || null, last_tested: document.getElementById('f-lasttest').value || null, mother_designation: document.getElementById('f-mother').value, father_designation: document.getElementById('f-father').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteSeedLot(designation) {
  if (!confirm('Delete seed lot ' + designation + '? This cannot be undone.')) return;
  await api('/api/seed-lots/' + designation, 'DELETE'); await loadAll(); render();
}

function renderPlants() {
  const year = new Date().getFullYear();
  const thisYear = state.plants.filter(p => p.season_year === year);
  return `
    <div class="page-header"><h1 class="page-title">🪴 Plants — ${year}</h1><button class="btn btn-primary" onclick="showAddPlants()">+ Add Plants</button></div>
    <div class="card">
      ${thisYear.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🪴</div><p>No plants logged this season yet.</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Seed Lot</th><th>Season</th><th>Seed Save</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${thisYear.map(p => `<tr>
          <td><span class="designation">${p.designation}</span></td>
          <td>${p.variety_name || '—'}</td>
          <td><span class="designation" style="font-size:0.75rem;">${p.seed_lot_designation}</span></td>
          <td>${p.season_type}</td>
          <td>${p.selected_for_seed ? '<span class="seed-star">⭐ Selected</span>' : '—'}</td>
          <td style="max-width:150px;font-size:0.85rem;">${p.notes || '—'}</td>
          <td style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${p.designation}', ${!p.selected_for_seed})">${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}</button>
            <button class="btn btn-secondary btn-sm" onclick="showEditPlant('${p.designation}')">✏️</button>
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
  const result = await api('/api/plants', 'POST', { seed_lot_designation, season_year: new Date().getFullYear(), season_type: document.getElementById('f-season').value, count: parseInt(document.getElementById('f-count').value), notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ ' + result.length + ' plant(s) added!\nFirst: ' + result[0].designation), 100);
}

async function submitEditPlant(designation) {
  const plant = state.plants.find(p => p.designation === designation);
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: document.getElementById('f-seedsave').value === 'true', notes: document.getElementById('f-notes').value, season_type: document.getElementById('f-season').value, traits: plant.traits || {} });
  closeModal(); await loadAll(); render();
}

async function toggleSeedSelect(designation, selected) {
  const plant = state.plants.find(p => p.designation === designation);
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: selected, notes: plant.notes, season_type: plant.season_type, traits: plant.traits || {} });
  await loadAll(); render();
}

async function deletePlant(designation) {
  if (!confirm('Delete plant ' + designation + '? This cannot be undone.')) return;
  await api('/api/plants/' + designation, 'DELETE'); await loadAll(); render();
}

function renderHarvest() {
  return `
    <div class="page-header"><h1 class="page-title">📋 Harvest Log</h1><button class="btn btn-primary" onclick="showAddHarvest()">+ Log Harvest</button></div>
    <div class="card">
      ${state.harvest.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No harvest records yet.</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Diameter</th><th>Weight</th><th>Seeds</th><th>Method</th><th>Actions</th></tr></thead>
        <tbody>${state.harvest.map(h => `<tr>
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
  return `
    <div class="page-header"><h1 class="page-title">🌿 Germination</h1><button class="btn btn-primary" onclick="showAddGermination()">+ Start Test</button></div>
    <div class="card">
      ${state.germination.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>No germination tests yet. Start one to track your seeds!</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Seed Lot</th><th>Variety</th><th>Started</th><th>Planted</th><th>Germinated</th><th>Rate</th><th>Days</th><th>Thinned</th><th>Remaining</th><th>Actions</th></tr></thead>
        <tbody>${state.germination.map(g => {
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
      <div class="form-group"><label class="form-label">Seeds Germinated *</label><input class="form-control" id="f-germinated" type="number" min="0" max="${g.seeds_planted}" placeholder="How many came up?"></div>
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
      <strong>${g.seeds_germinated} of ${g.seeds_planted} germinated</strong> — log thinning below
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Seeds Thinned *</label><input class="form-control" id="f-thinned" type="number" min="0" max="${g.seeds_germinated}" placeholder="How many removed?"></div>
      <div class="form-group"><label class="form-label">Date Thinned</label><input class="form-control" id="f-datethinned" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-group"><label class="form-label">Plants Remaining *</label><input class="form-control" id="f-remaining" type="number" min="0" placeholder="How many kept?"></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2" placeholder="Kept strongest seedling from each pot..."></textarea></div>
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

function renderProjects() {
  return `
    <div class="page-header"><h1 class="page-title">🧬 Breeding Projects</h1><button class="btn btn-primary" onclick="showAddProject()">+ New Project</button></div>
    ${state.projects.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🧬</div><p>No breeding projects yet.</p></div></div>`
    : state.projects.map(p => `
      <div class="card">
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
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditProject('${p.code}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.code}')">🗑️</button>
          </div>
        </div>
        ${p.target_traits && p.target_traits.length > 0 ? `
        <div style="margin-top:16px;">
          <div style="font-size:0.85rem;font-weight:700;color:var(--green-dark);margin-bottom:8px;">Target Traits:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}</div>
        </div>` : ''}
        <div style="margin-top:16px;">
          <div style="font-size:0.85rem;font-weight:700;color:var(--green-dark);margin-bottom:8px;">Plants in this project:</div>
          ${state.plants.filter(pl => pl.designation.startsWith(p.code)).length === 0
            ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants logged yet.</p>'
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${state.plants.filter(pl => pl.designation.startsWith(p.code)).map(pl => `<span class="designation">${pl.designation}</span>`).join('')}</div>`}
        </div>
      </div>
    `).join('')}
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
    <div class="form-group"><label class="form-label">Target Traits (comma separated)</label><input class="form-control" id="f-traits" value="${p && p.target_traits ? p.target_traits.join(', ') : ''}" placeholder="e.g. mild heat, thick walls, poblano size"></div>
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
        <div class="settings-row-info">
          <h4>Dark Mode</h4>
          <p>Switch between light and dark theme.</p>
        </div>
        <button class="btn ${isDark ? 'btn-primary' : 'btn-secondary'}" onclick="toggleTheme()">
          ${isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">💾 Backup & Restore</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export JSON Backup</h4><p>Download a full backup of all your data as a JSON file.</p></div>
        <button class="btn btn-primary" onclick="exportBackup()">⬇️ Export JSON</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export CSV</h4><p>Download all data as a CSV file — open in Excel or any spreadsheet app.</p></div>
        <button class="btn btn-secondary" onclick="exportCSV()">⬇️ Export CSV</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Import Backup</h4><p>Restore from a previously exported JSON backup. Existing records will not be overwritten.</p></div>
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
              <td><span class="tag ${u.role === 'admin' ? 'tag-active' : 'tag-op'}">${u.role}</span></td>
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
      <div class="settings-section-title">ℹ️ About SeedVault</div>
      <div class="settings-row"><div class="settings-row-info"><h4>Version</h4><p>SeedVault v1.0.0</p></div></div>
      <div class="settings-row"><div class="settings-row-info"><h4>Database Records</h4><p>${state.stats.varieties || 0} varieties · ${state.stats.seedLots || 0} seed lots · ${state.stats.activePlants || 0} plants this season</p></div></div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Source Code</h4><p>github.com/Duhato/seedvault — AGPL-3.0 License</p></div>
        <a href="https://github.com/Duhato/seedvault" target="_blank" class="btn btn-secondary">View on GitHub</a>
      </div>
    </div>
  `;
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
      <div class="form-group"><label class="form-label">Code * (e.g. HERB)</label><input class="form-control" id="f-scode" placeholder="e.g. HERB" maxlength="10"></div>
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
    if (backup.app !== 'SeedVault') return alert('❌ This does not appear to be a valid SeedVault backup file.');
    const preview = await api('/api/backup/preview', 'POST', backup);
    const backupData = backup;
    openModal('Import Backup — Preview', `
      <div class="alert alert-warn">⚠️ Review what will be imported. Existing records will be skipped.</div>
      <div style="background:var(--green-bg);border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Exported: ${preview.exported_at ? new Date(preview.exported_at).toLocaleString() : 'Unknown'}</div>
        <table style="width:100%;font-size:0.9rem;">
          <tr><td style="padding:4px 0;"><strong>Varieties</strong></td><td>${preview.varieties}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Seed Lots</strong></td><td>${preview.seed_lots}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Plants</strong></td><td>${preview.plants}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Projects</strong></td><td>${preview.breeding_projects}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Harvest Log</strong></td><td>${preview.harvest_log}</td></tr>
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
  await checkAuth();
  if (getToken()) { await loadAll(); render(); }
});
