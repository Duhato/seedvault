const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seedvault-secret-change-me';
const SESSION_DAYS = 30;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'seedvault',
  user: process.env.DB_USER || 'seedvault',
  password: process.env.DB_PASSWORD || 'seedvault',
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS varieties (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        species_code VARCHAR(10) REFERENCES species(code),
        type VARCHAR(20) DEFAULT 'OP',
        description TEXT,
        source VARCHAR(100),
        year_acquired INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS seed_lots (
        id SERIAL PRIMARY KEY,
        designation VARCHAR(50) UNIQUE NOT NULL,
        variety_code VARCHAR(20) REFERENCES varieties(code),
        generation INTEGER NOT NULL DEFAULT 1,
        year_saved INTEGER NOT NULL,
        quantity_estimate INTEGER,
        mother_designation VARCHAR(50),
        father_designation VARCHAR(50),
        notes TEXT,
        storage_location VARCHAR(100),
        germination_rate INTEGER,
        last_tested DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS plants (
        id SERIAL PRIMARY KEY,
        designation VARCHAR(50) UNIQUE NOT NULL,
        seed_lot_designation VARCHAR(50) REFERENCES seed_lots(designation),
        season_year INTEGER NOT NULL,
        season_type VARCHAR(10) DEFAULT 'summer',
        selected_for_seed BOOLEAN DEFAULT FALSE,
        notes TEXT,
        traits JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS breeding_projects (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        target_traits JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'active',
        started_year INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS harvest_log (
        id SERIAL PRIMARY KEY,
        plant_designation VARCHAR(50) REFERENCES plants(designation),
        harvest_date DATE,
        fruit_length_inches DECIMAL(4,1),
        fruit_diameter_inches DECIMAL(4,1),
        fruit_weight_oz DECIMAL(5,1),
        condition VARCHAR(50),
        processing_method VARCHAR(50),
        seed_count INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO species (code, name) VALUES
        ('CUC', 'Cucumber'),
        ('TOM', 'Tomato'),
        ('PEP', 'Pepper')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// ==================== AUTH MIDDLEWARE ====================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ==================== AUTH ROUTES ====================
app.get('/api/auth/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ hasUsers: parseInt(result.rows[0].count) > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/setup', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Setup already complete' });
    }
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
    res.json({ success: true, token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
    res.json({ success: true, token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [req.user.username]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE username=$2', [hash, req.user.username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PROTECTED STATIC FILES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ==================== SPECIES ====================
app.get('/api/species', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM species ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/species', authMiddleware, async (req, res) => {
  const { code, name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO species (code, name) VALUES ($1, $2) RETURNING *',
      [code.toUpperCase(), name]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/species/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query('UPDATE species SET name=$1 WHERE code=$2 RETURNING *', [name, code]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/species/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  try {
    const check = await pool.query('SELECT COUNT(*) FROM varieties WHERE species_code=$1', [code]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete species with existing varieties' });
    }
    await pool.query('DELETE FROM species WHERE code=$1', [code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== VARIETIES ====================
app.get('/api/varieties', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, s.name as species_name 
      FROM varieties v
      LEFT JOIN species s ON v.species_code = s.code
      ORDER BY v.species_code, v.name
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/varieties', authMiddleware, async (req, res) => {
  const { name, species_code, type, description, source, year_acquired } = req.body;
  try {
    const abbrev = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    const code = `${species_code}-${abbrev}`;
    const result = await pool.query(
      `INSERT INTO varieties (code, name, species_code, type, description, source, year_acquired)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [code, name, species_code, type || 'OP', description, source, year_acquired]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/varieties/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const { name, type, description, source, year_acquired } = req.body;
  try {
    const result = await pool.query(
      `UPDATE varieties SET name=$1, type=$2, description=$3, source=$4, year_acquired=$5 WHERE code=$6 RETURNING *`,
      [name, type, description, source, year_acquired, code]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/varieties/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  try {
    await pool.query('DELETE FROM varieties WHERE code=$1', [code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== SEED LOTS ====================
app.get('/api/seed-lots', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, v.name as variety_name, v.species_code
      FROM seed_lots sl
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY sl.year_saved DESC, sl.designation
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/seed-lots', authMiddleware, async (req, res) => {
  const { variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location } = req.body;
  try {
    const designation = `${variety_code}-G${generation}-${year_saved}`;
    const result = await pool.query(
      `INSERT INTO seed_lots (designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/seed-lots/:designation', authMiddleware, async (req, res) => {
  const { designation } = req.params;
  const { quantity_estimate, notes, storage_location, germination_rate, last_tested, mother_designation, father_designation } = req.body;
  try {
    const result = await pool.query(
      `UPDATE seed_lots SET quantity_estimate=$1, notes=$2, storage_location=$3,
       germination_rate=$4, last_tested=$5, mother_designation=$6, father_designation=$7
       WHERE designation=$8 RETURNING *`,
      [quantity_estimate, notes, storage_location, germination_rate, last_tested, mother_designation, father_designation, designation]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/seed-lots/:designation', authMiddleware, async (req, res) => {
  const { designation } = req.params;
  try {
    await pool.query('DELETE FROM seed_lots WHERE designation=$1', [designation]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PLANTS ====================
app.get('/api/plants', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, sl.variety_code, v.name as variety_name
      FROM plants p
      LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY p.season_year DESC, p.designation
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/plants', authMiddleware, async (req, res) => {
  const { seed_lot_designation, season_year, season_type, count, notes } = req.body;
  try {
    const existing = await pool.query(
      `SELECT COUNT(*) FROM plants WHERE seed_lot_designation=$1 AND season_year=$2`,
      [seed_lot_designation, season_year]
    );
    const startNum = parseInt(existing.rows[0].count) + 1;
    const plantCount = count || 1;
    const created = [];
    for (let i = 0; i < plantCount; i++) {
      const plantNum = String(startNum + i).padStart(2, '0');
      const designation = `${seed_lot_designation}-P${plantNum}`;
      const result = await pool.query(
        `INSERT INTO plants (designation, seed_lot_designation, season_year, season_type, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [designation, seed_lot_designation, season_year, season_type || 'summer', notes]
      );
      created.push(result.rows[0]);
    }
    res.json(created);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/plants/:designation', authMiddleware, async (req, res) => {
  const { designation } = req.params;
  const { selected_for_seed, notes, traits, season_type } = req.body;
  try {
    const result = await pool.query(
      `UPDATE plants SET selected_for_seed=$1, notes=$2, traits=$3, season_type=$4 WHERE designation=$5 RETURNING *`,
      [selected_for_seed, notes, JSON.stringify(traits || {}), season_type, designation]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/plants/:designation', authMiddleware, async (req, res) => {
  const { designation } = req.params;
  try {
    await pool.query('DELETE FROM plants WHERE designation=$1', [designation]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== BREEDING PROJECTS ====================
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM breeding_projects ORDER BY started_year DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, description, target_traits, started_year } = req.body;
  try {
    const abbrev = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 6);
    const code = `WV-${abbrev}-${started_year}`;
    const result = await pool.query(
      `INSERT INTO breeding_projects (code, name, description, target_traits, started_year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, name, description, JSON.stringify(target_traits || []), started_year]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projects/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const { name, description, target_traits, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE breeding_projects SET name=$1, description=$2, target_traits=$3, status=$4 WHERE code=$5 RETURNING *`,
      [name, description, JSON.stringify(target_traits || []), status, code]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projects/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  try {
    await pool.query('DELETE FROM breeding_projects WHERE code=$1', [code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== HARVEST LOG ====================
app.get('/api/harvest', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, p.seed_lot_designation, v.name as variety_name
      FROM harvest_log h
      LEFT JOIN plants p ON h.plant_designation = p.designation
      LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY h.harvest_date DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/harvest', authMiddleware, async (req, res) => {
  const { plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/harvest/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE harvest_log SET harvest_date=$1, fruit_length_inches=$2, fruit_diameter_inches=$3,
       fruit_weight_oz=$4, condition=$5, processing_method=$6, seed_count=$7, notes=$8
       WHERE id=$9 RETURNING *`,
      [harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes, id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/harvest/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM harvest_log WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== STATS ====================
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [varieties, seedLots, plants, projects] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM varieties'),
      pool.query('SELECT COUNT(*) FROM seed_lots'),
      pool.query('SELECT COUNT(*) FROM plants WHERE season_year = EXTRACT(YEAR FROM NOW())'),
      pool.query("SELECT COUNT(*) FROM breeding_projects WHERE status = 'active'"),
    ]);
    res.json({
      varieties: parseInt(varieties.rows[0].count),
      seedLots: parseInt(seedLots.rows[0].count),
      activePlants: parseInt(plants.rows[0].count),
      activeProjects: parseInt(projects.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== VIABILITY ====================
app.get('/api/viability', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, v.name as variety_name, v.species_code
      FROM seed_lots sl
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY sl.designation
    `);
    const currentYear = new Date().getFullYear();
    const viabilityYears = { CUC: 5, TOM: 4, PEP: 3 };
    const warnings = result.rows.map(lot => {
      const maxYears = viabilityYears[lot.species_code] || 3;
      const age = currentYear - lot.year_saved;
      const yearsLeft = maxYears - age;
      let status = 'good';
      if (yearsLeft <= 0) status = 'expired';
      else if (yearsLeft <= 1) status = 'warning';
      return { ...lot, age, yearsLeft, maxYears, status };
    }).filter(l => l.status !== 'good');
    res.json(warnings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== BACKUP ====================
app.get('/api/backup/export', authMiddleware, async (req, res) => {
  try {
    const [species, varieties, seedLots, plants, projects, harvest] = await Promise.all([
      pool.query('SELECT * FROM species ORDER BY code'),
      pool.query('SELECT * FROM varieties ORDER BY code'),
      pool.query('SELECT * FROM seed_lots ORDER BY designation'),
      pool.query('SELECT * FROM plants ORDER BY designation'),
      pool.query('SELECT * FROM breeding_projects ORDER BY code'),
      pool.query('SELECT * FROM harvest_log ORDER BY harvest_date'),
    ]);
    const backup = {
      app: 'SeedVault',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      data: {
        species: species.rows,
        varieties: varieties.rows,
        seed_lots: seedLots.rows,
        plants: plants.rows,
        breeding_projects: projects.rows,
        harvest_log: harvest.rows,
      }
    };
    const filename = `seedvault-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/backup/export-csv', authMiddleware, async (req, res) => {
  try {
    const [varieties, seedLots, plants, harvest] = await Promise.all([
      pool.query(`SELECT v.*, s.name as species_name FROM varieties v LEFT JOIN species s ON v.species_code = s.code ORDER BY v.code`),
      pool.query(`SELECT sl.*, v.name as variety_name FROM seed_lots sl LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY sl.designation`),
      pool.query(`SELECT p.*, v.name as variety_name FROM plants p LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY p.designation`),
      pool.query(`SELECT h.*, v.name as variety_name FROM harvest_log h LEFT JOIN plants p ON h.plant_designation = p.designation LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY h.harvest_date`),
    ]);
    const toCSV = (rows, cols) => {
      if (!rows.length) return cols.join(',') + '\n';
      const lines = rows.map(r => cols.map(c => {
        const val = r[c] === null || r[c] === undefined ? '' : String(r[c]);
        return '"' + val.replace(/"/g, '""') + '"';
      }).join(','));
      return [cols.join(','), ...lines].join('\n');
    };
    const sections = [
      '=== VARIETIES ===\n' + toCSV(varieties.rows, ['code','name','species_name','type','source','year_acquired','description']),
      '=== SEED LOTS ===\n' + toCSV(seedLots.rows, ['designation','variety_name','generation','year_saved','quantity_estimate','storage_location','germination_rate','last_tested','notes']),
      '=== PLANTS ===\n' + toCSV(plants.rows, ['designation','variety_name','seed_lot_designation','season_year','season_type','selected_for_seed','notes']),
      '=== HARVEST LOG ===\n' + toCSV(harvest.rows, ['plant_designation','variety_name','harvest_date','fruit_length_inches','fruit_diameter_inches','fruit_weight_oz','seed_count','condition','processing_method','notes']),
    ];
    const filename = `seedvault-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(sections.join('\n\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/backup/preview', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    res.json({
      species: data.species?.length || 0,
      varieties: data.varieties?.length || 0,
      seed_lots: data.seed_lots?.length || 0,
      plants: data.plants?.length || 0,
      breeding_projects: data.breeding_projects?.length || 0,
      harvest_log: data.harvest_log?.length || 0,
      exported_at: req.body.exported_at,
      version: req.body.version,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/backup/import', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { data } = req.body;
    let imported = { species: 0, varieties: 0, seed_lots: 0, plants: 0, breeding_projects: 0, harvest_log: 0 };
    let skipped = { species: 0, varieties: 0, seed_lots: 0, plants: 0, breeding_projects: 0, harvest_log: 0 };
    await client.query('BEGIN');
    for (const s of (data.species || [])) {
      const r = await client.query('INSERT INTO species (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING *', [s.code, s.name]);
      r.rowCount > 0 ? imported.species++ : skipped.species++;
    }
    for (const v of (data.varieties || [])) {
      const r = await client.query(`INSERT INTO varieties (code, name, species_code, type, description, source, year_acquired) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING RETURNING *`, [v.code, v.name, v.species_code, v.type, v.description, v.source, v.year_acquired]);
      r.rowCount > 0 ? imported.varieties++ : skipped.varieties++;
    }
    for (const sl of (data.seed_lots || [])) {
      const r = await client.query(`INSERT INTO seed_lots (designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location, germination_rate, last_tested) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (designation) DO NOTHING RETURNING *`, [sl.designation, sl.variety_code, sl.generation, sl.year_saved, sl.quantity_estimate, sl.mother_designation, sl.father_designation, sl.notes, sl.storage_location, sl.germination_rate, sl.last_tested]);
      r.rowCount > 0 ? imported.seed_lots++ : skipped.seed_lots++;
    }
    for (const p of (data.plants || [])) {
      const r = await client.query(`INSERT INTO plants (designation, seed_lot_designation, season_year, season_type, selected_for_seed, notes, traits) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (designation) DO NOTHING RETURNING *`, [p.designation, p.seed_lot_designation, p.season_year, p.season_type, p.selected_for_seed, p.notes, p.traits]);
      r.rowCount > 0 ? imported.plants++ : skipped.plants++;
    }
    for (const bp of (data.breeding_projects || [])) {
      const r = await client.query(`INSERT INTO breeding_projects (code, name, description, target_traits, status, started_year) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING RETURNING *`, [bp.code, bp.name, bp.description, bp.target_traits, bp.status, bp.started_year]);
      r.rowCount > 0 ? imported.breeding_projects++ : skipped.breeding_projects++;
    }
    for (const h of (data.harvest_log || [])) {
      const r = await client.query(`INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [h.plant_designation, h.harvest_date, h.fruit_length_inches, h.fruit_diameter_inches, h.fruit_weight_oz, h.condition, h.processing_method, h.seed_count, h.notes]);
      r.rowCount > 0 ? imported.harvest_log++ : skipped.harvest_log++;
    }
    await client.query('COMMIT');
    res.json({ success: true, imported, skipped });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`SeedVault running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
