const state = {
  page: 'dashboard',
  varieties: [],
  seedLots: [],
  plants: [],
  projects: [],
  harvest: [],
  species: [],
  stats: {}
};

const API = '';

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res.json();
}

async function loadAll() {
  const [varieties, seedLots, plants, projects, harvest, species, stats] = await Promise.all([
    api('/api/varieties'),
    api('/api/seed-lots'),
    api('/api/plants'),
    api('/api/projects'),
    api('/api/harvest'),
    api('/api/species'),
    api('/api/stats'),
  ]);
  state.varieties = varieties;
  state.seedLots = seedLots;
  state.plants = plants;
  state.projects = projects;
  state.harvest = harvest;
  state.species = species;
  state.stats = stats;
}

function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  document.getElementById('mobile-menu').classList.add('hidden');
  render();
}

function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function render() {
  const main = document.getElementById('main-content');
  switch (state.page) {
    case 'dashboard': main.innerHTML = renderDashboard(); break;
    case 'varieties': main.innerHTML = renderVarieties(); break;
    case 'seedlots': main.innerHTML = renderSeedLots(); break;
    case 'plants': main.innerHTML = renderPlants(); break;
    case 'harvest': main.innerHTML = renderHarvest(); break;
    case 'projects': main.innerHTML = renderProjects(); break;
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
      <div class="stat-card">
        <div class="stat-number">${s.varieties || 0}</div>
        <div class="stat-label">Varieties</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${s.seedLots || 0}</div>
        <div class="stat-label">Seed Lots</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${s.activePlants || 0}</div>
        <div class="stat-label">Plants This Season</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${s.activeProjects || 0}</div>
        <div class="stat-label">Active Projects</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card">
        <div class="card-title">🫙 Recent Seed Lots</div>
        ${recentLots.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No seed lots yet. Add your first variety!</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentLots.map(lot => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;">
              <span class="designation">${lot.designation}</span>
              <span class="gen-badge">G${lot.generation}</span>
            </div>
          `).join('')}
        </div>`}
      </div>
      <div class="card">
        <div class="card-title">⭐ Selected for Seed Saving</div>
        ${selectedPlants.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No plants flagged for seed saving yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${selectedPlants.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;">
              <span class="designation">${p.designation}</span>
              <span class="seed-star">⭐</span>
            </div>
          `).join('')}
        </div>`}
      </div>
    </div>
    <div class="card" style="margin-top:20px;">
      <div class="card-title">🧬 Active Breeding Projects</div>
      ${state.projects.filter(p => p.status === 'active').length === 0
        ? '<p style="color:var(--text-muted);font-size:0.9rem;">No active breeding projects. Start one in the Breeding tab!</p>'
        : state.projects.filter(p => p.status === 'active').map(p => `
          <div style="padding:12px;background:var(--green-bg);border-radius:6px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${p.name}</strong>
              <span class="designation">${p.code}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${p.description || ''}</div>
          </div>
        `).join('')}
    </div>
  `;
}

function renderVarieties() {
  return `
    <div class="page-header">
      <h1 class="page-title">🌿 Varieties</h1>
      <button class="btn btn-primary" onclick="showAddVariety()">+ Add Variety</button>
    </div>
    <div class="card">
      ${state.varieties.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>No varieties yet. Add your first one!</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr>
            <th>Code</th><th>Name</th><th>Species</th><th>Type</th><th>Source</th><th>Year</th><th>Lots</th>
          </tr></thead>
          <tbody>
            ${state.varieties.map(v => {
              const lots = state.seedLots.filter(l => l.variety_code === v.code).length;
              return `<tr>
                <td><span class="designation">${v.code}</span></td>
                <td><strong>${v.name}</strong></td>
                <td>${v.species_name || v.species_code}</td>
                <td><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></td>
                <td>${v.source || '—'}</td>
                <td>${v.year_acquired || '—'}</td>
                <td><span class="gen-badge">${lots}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`}
    </div>
  `;
}

function showAddVariety() {
  openModal('Add New Variety', `
    <div class="form-group">
      <label class="form-label">Species *</label>
      <select class="form-control" id="f-species">
        ${state.species.map(s => `<option value="${s.code}">${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Variety Name *</label>
      <input class="form-control" id="f-vname" placeholder="e.g. Straight 8">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-control" id="f-type">
          <option value="OP">Open Pollinated</option>
          <option value="Heirloom">Heirloom</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Year Acquired</label>
        <input class="form-control" id="f-year" type="number" placeholder="${new Date().getFullYear()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Source</label>
      <input class="form-control" id="f-source" placeholder="e.g. Burpee">
    </div>
    <div class="form-group">
      <label class="form-label">Description / Notes</label>
      <textarea class="form-control" id="f-desc" rows="3" placeholder="Variety notes..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitVariety()">Save Variety</button>
    </div>
  `);
}

async function submitVariety() {
  const name = document.getElementById('f-vname').value.trim();
  const species_code = document.getElementById('f-species').value;
  if (!name || !species_code) return alert('Name and species are required');
  await api('/api/varieties', 'POST', {
    name,
    species_code,
    type: document.getElementById('f-type').value,
    year_acquired: document.getElementById('f-year').value || null,
    source: document.getElementById('f-source').value,
    description: document.getElementById('f-desc').value,
  });
  closeModal();
  await loadAll();
  render();
}

function renderSeedLots() {
  return `
    <div class="page-header">
      <h1 class="page-title">🫙 Seed Lots</h1>
      <button class="btn btn-primary" onclick="showAddSeedLot()">+ Add Seed Lot</button>
    </div>
    <div class="card">
      ${state.seedLots.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🫙</div><p>No seed lots yet.</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr>
            <th>Designation</th><th>Variety</th><th>Generation</th><th>Year Saved</th><th>Qty</th><th>Storage</th><th>Germination</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${state.seedLots.map(lot => `<tr>
              <td><span class="designation">${lot.designation}</span></td>
              <td>${lot.variety_name || lot.variety_code}</td>
              <td><span class="gen-badge">G${lot.generation}</span></td>
              <td>${lot.year_saved}</td>
              <td>${lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—'}</td>
              <td>${lot.storage_location || '—'}</td>
              <td>${lot.germination_rate ? lot.germination_rate + '%' : '—'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="showAddPlants('${lot.designation}')">+ Plants</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
    </div>
  `;
}

function showAddSeedLot() {
  openModal('Add Seed Lot', `
    <div class="alert alert-info">Designation code is generated automatically.</div>
    <div class="form-group">
      <label class="form-label">Variety *</label>
      <select class="form-control" id="f-variety">
        <option value="">Select variety...</option>
        ${state.varieties.map(v => `<option value="${v.code}">${v.name} (${v.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Generation *</label>
        <input class="form-control" id="f-gen" type="number" min="1" value="1">
      </div>
      <div class="form-group">
        <label class="form-label">Year Saved *</label>
        <input class="form-control" id="f-yearsaved" type="number" value="${new Date().getFullYear()}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quantity Estimate (seeds)</label>
        <input class="form-control" id="f-qty" type="number" placeholder="e.g. 50">
      </div>
      <div class="form-group">
        <label class="form-label">Storage Location</label>
        <input class="form-control" id="f-storage" placeholder="e.g. Ammo box">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Mother Plant Designation</label>
      <input class="form-control" id="f-mother" placeholder="e.g. CUC-S8-G1-2024-P02">
    </div>
    <div class="form-group">
      <label class="form-label">Father Plant Designation (if cross)</label>
      <input class="form-control" id="f-father" placeholder="e.g. CUC-PB-G1-2024-P01">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="f-notes" rows="3" placeholder="Selection notes..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitSeedLot()">Save Seed Lot</button>
    </div>
  `);
}

async function submitSeedLot() {
  const variety_code = document.getElementById('f-variety').value;
  const generation = document.getElementById('f-gen').value;
  const year_saved = document.getElementById('f-yearsaved').value;
  if (!variety_code || !generation || !year_saved) return alert('Variety, generation and year are required');
  const result = await api('/api/seed-lots', 'POST', {
    variety_code,
    generation: parseInt(generation),
    year_saved: parseInt(year_saved),
    quantity_estimate: document.getElementById('f-qty').value || null,
    storage_location: document.getElementById('f-storage').value,
    mother_designation: document.getElementById('f-mother').value,
    father_designation: document.getElementById('f-father').value,
    notes: document.getElementById('f-notes').value,
  });
  closeModal();
  await loadAll();
  render();
  setTimeout(() => alert('✅ Seed lot created!\nDesignation: ' + result.designation), 100);
}

function renderPlants() {
  const year = new Date().getFullYear();
  const thisYear = state.plants.filter(p => p.season_year === year);
  return `
    <div class="page-header">
      <h1 class="page-title">🪴 Plants — ${year}</h1>
      <button class="btn btn-primary" onclick="showAddPlants()">+ Add Plants</button>
    </div>
    <div class="card">
      ${thisYear.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🪴</div><p>No plants logged this season yet.</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr>
            <th>Designation</th><th>Variety</th><th>Seed Lot</th><th>Season</th><th>Seed Save</th><th>Notes</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${thisYear.map(p => `<tr>
              <td><span class="designation">${p.designation}</span></td>
              <td>${p.variety_name || '—'}</td>
              <td><span class="designation" style="font-size:0.75rem;">${p.seed_lot_designation}</span></td>
              <td>${p.season_type}</td>
              <td>${p.selected_for_seed ? '<span class="seed-star">⭐ Selected</span>' : '—'}</td>
              <td style="max-width:200px;font-size:0.85rem;">${p.notes || '—'}</td>
              <td>
                <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${p.designation}', ${!p.selected_for_seed})">
                  ${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
    </div>
    ${state.plants.filter(p => p.season_year !== year).length > 0 ? `
    <div class="card" style="margin-top:20px;">
      <div class="card-title">📚 Previous Seasons</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Year</th><th>Seed Save</th></tr></thead>
        <tbody>
          ${state.plants.filter(p => p.season_year !== year).map(p => `<tr>
            <td><span class="designation">${p.designation}</span></td>
            <td>${p.variety_name || '—'}</td>
            <td>${p.season_year}</td>
            <td>${p.selected_for_seed ? '⭐' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : ''}
  `;
}

function showAddPlants(preselectedLot = '') {
  openModal('Add Plants to Season', `
    <div class="alert alert-info">Plant designations are auto-generated from the seed lot + sequential number.</div>
    <div class="form-group">
      <label class="form-label">Seed Lot *</label>
      <select class="form-control" id="f-lot">
        <option value="">Select seed lot...</option>
        ${state.seedLots.map(l => `<option value="${l.designation}" ${l.designation === preselectedLot ? 'selected' : ''}>${l.designation} — ${l.variety_name || l.variety_code}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Number of Plants *</label>
        <input class="form-control" id="f-count" type="number" min="1" value="1">
      </div>
      <div class="form-group">
        <label class="form-label">Season</label>
        <select class="form-control" id="f-season">
          <option value="summer">Summer</option>
          <option value="winter">Winter (Greenhouse)</option>
          <option value="spring">Spring</option>
          <option value="fall">Fall</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="f-notes" rows="2" placeholder="Planting notes..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitPlants()">Add Plants</button>
    </div>
  `);
}

async function submitPlants() {
  const seed_lot_designation = document.getElementById('f-lot').value;
  const count = document.getElementById('f-count').value;
  if (!seed_lot_designation) return alert('Select a seed lot');
  const result = await api('/api/plants', 'POST', {
    seed_lot_designation,
    season_year: new Date().getFullYear(),
    season_type: document.getElementById('f-season').value,
    count: parseInt(count),
    notes: document.getElementById('f-notes').value,
  });
  closeModal();
  await loadAll();
  render();
  setTimeout(() => alert('✅ ' + result.length + ' plant(s) added!\nFirst: ' + result[0].designation), 100);
}

async function toggleSeedSelect(designation, selected) {
  const plant = state.plants.find(p => p.designation === designation);
  await api('/api/plants/' + designation, 'PUT', {
    selected_for_seed: selected,
    notes: plant.notes,
    traits: plant.traits || {},
  });
  await loadAll();
  render();
}

function renderHarvest() {
  return `
    <div class="page-header">
      <h1 class="page-title">📋 Harvest Log</h1>
      <button class="btn btn-primary" onclick="showAddHarvest()">+ Log Harvest</button>
    </div>
    <div class="card">
      ${state.harvest.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No harvest records yet.</p></div>`
        : `<div class="table-wrap"><table>
          <thead><tr>
            <th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Diameter</th><th>Weight</th><th>Seeds</th><th>Method</th>
          </tr></thead>
          <tbody>
            ${state.harvest.map(h => `<tr>
              <td>${h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</td>
              <td><span class="designation" style="font-size:0.75rem;">${h.plant_designation}</span></td>
              <td>${h.variety_name || '—'}</td>
              <td>${h.fruit_length_inches ? h.fruit_length_inches + '"' : '—'}</td>
              <td>${h.fruit_diameter_inches ? h.fruit_diameter_inches + '"' : '—'}</td>
              <td>${h.fruit_weight_oz ? h.fruit_weight_oz + ' oz' : '—'}</td>
              <td>${h.seed_count || '—'}</td>
              <td>${h.processing_method || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
    </div>
  `;
}

function showAddHarvest() {
  openModal('Log Seed Harvest', `
    <div class="form-group">
      <label class="form-label">Plant *</label>
      <select class="form-control" id="f-plant">
        <option value="">Select plant...</option>
        ${state.plants.map(p => `<option value="${p.designation}">${p.designation} — ${p.variety_name || ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Harvest Date</label>
        <input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Condition</label>
        <select class="form-control" id="f-condition">
          <option value="perfect">Perfect</option>
          <option value="good">Good</option>
          <option value="overripe">Overripe (ideal for seeds)</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fruit Length (inches)</label>
        <input class="form-control" id="f-length" type="number" step="0.1" placeholder="e.g. 8.5">
      </div>
      <div class="form-group">
        <label class="form-label">Fruit Diameter (inches)</label>
        <input class="form-control" id="f-diameter" type="number" step="0.1" placeholder="e.g. 4.0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Weight (oz)</label>
        <input class="form-control" id="f-weight" type="number" step="0.1">
      </div>
      <div class="form-group">
        <label class="form-label">Seed Count</label>
        <input class="form-control" id="f-seeds" type="number">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Processing Method</label>
      <select class="form-control" id="f-method">
        <option value="direct dry">Direct Dry (cucumbers, peppers)</option>
        <option value="wet ferment">Wet Ferment (tomatoes)</option>
        <option value="rinse dry">Rinse and Dry</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="f-notes" rows="2" placeholder="Selection notes..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitHarvest()">Log Harvest</button>
    </div>
  `);
}

async function submitHarvest() {
  const plant_designation = document.getElementById('f-plant').value;
  if (!plant_designation) return alert('Select a plant');
  await api('/api/harvest', 'POST', {
    plant_designation,
    harvest_date: document.getElementById('f-date').value,
    fruit_length_inches: document.getElementById('f-length').value || null,
    fruit_diameter_inches: document.getElementById('f-diameter').value || null,
    fruit_weight_oz: document.getElementById('f-weight').value || null,
    seed_count: document.getElementById('f-seeds').value || null,
    condition: document.getElementById('f-condition').value,
    processing_method: document.getElementById('f-method').value,
    notes: document.getElementById('f-notes').value,
  });
  closeModal();
  await loadAll();
  render();
}

function renderProjects() {
  return `
    <div class="page-header">
      <h1 class="page-title">🧬 Breeding Projects</h1>
      <button class="btn btn-primary" onclick="showAddProject()">+ New Project</button>
    </div>
    ${state.projects.length === 0
      ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🧬</div><p>No breeding projects yet.</p></div></div>`
      : state.projects.map(p => `
        <div class="card" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                <strong style="font-size:1.1rem;">${p.name}</strong>
                <span class="designation">${p.code}</span>
                <span class="tag tag-${p.status}">${p.status}</span>
              </div>
              <div style="color:var(--text-muted);font-size:0.9rem;">${p.description || 'No description'}</div>
              <div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">Started: ${p.started_year}</div>
            </div>
          </div>
          ${p.target_traits && p.target_traits.length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--green-dark);margin-bottom:8px;">Target Traits:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}
            </div>
          </div>` : ''}
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--green-dark);margin-bottom:8px;">Plants in this project:</div>
            ${state.plants.filter(pl => pl.designation.startsWith(p.code)).length === 0
              ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants logged yet.</p>'
              : `<div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${state.plants.filter(pl => pl.designation.startsWith(p.code)).map(pl =>
                  `<span class="designation">${pl.designation}</span>`
                ).join('')}
              </div>`}
          </div>
        </div>
      `).join('')}
  `;
}

function showAddProject() {
  openModal('New Breeding Project', `
    <div class="alert alert-info">Project code is auto-generated with WV prefix.</div>
    <div class="form-group">
      <label class="form-label">Project Name *</label>
      <input class="form-control" id="f-pname" placeholder="e.g. West Virginia Pepper">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="f-pdesc" rows="3" placeholder="Goal of this breeding project..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Started Year</label>
      <input class="form-control" id="f-pyear" type="number" value="${new Date().getFullYear()}">
    </div>
    <div class="form-group">
      <label class="form-label">Target Traits (comma separated)</label>
      <input class="form-control" id="f-traits" placeholder="e.g. mild heat, thick walls, poblano size, smoky flavor">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitProject()">Create Project</button>
    </div>
  `);
}

async function submitProject() {
  const name = document.getElementById('f-pname').value.trim();
  if (!name) return alert('Project name is required');
  const traitsRaw = document.getElementById('f-traits').value;
  const target_traits = traitsRaw ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const result = await api('/api/projects', 'POST', {
    name,
    description: document.getElementById('f-pdesc').value,
    started_year: document.getElementById('f-pyear').value,
    target_traits,
  });
  closeModal();
  await loadAll();
  render();
  setTimeout(() => alert('✅ Project created!\nCode: ' + result.code), 100);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  await loadAll();
  render();
});
