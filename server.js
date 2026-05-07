const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'seedvault',
  user: process.env.DB_USER || 'seedvault',
  password: process.env.DB_PASSWORD || 'seedvault',
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
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

app.get('/api/species', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM species ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/species', async (req, res) => {
  const { code, name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO species (code, name) VALUES ($1, $2) RETURNING *',
      [code.toUpperCase(), name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/varieties', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, s.name as species_name 
      FROM varieties v
      LEFT JOIN species s ON v.species_code = s.code
      ORDER BY v.species_code, v.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/varieties', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seed-lots', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, v.name as variety_name, v.species_code
      FROM seed_lots sl
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY sl.year_saved DESC, sl.designation
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed-lots', async (req, res) => {
  const { variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location } = req.body;
  try {
    const designation = `${variety_code}-G${generation}-${year_saved}`;
    const result = await pool.query(
      `INSERT INTO seed_lots (designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/seed-lots/:designation', async (req, res) => {
  const { designation } = req.params;
  const { quantity_estimate, notes, storage_location, germination_rate, last_tested } = req.body;
  try {
    const result = await pool.query(
      `UPDATE seed_lots SET quantity_estimate=$1, notes=$2, storage_location=$3, germination_rate=$4, last_tested=$5
       WHERE designation=$6 RETURNING *`,
      [quantity_estimate, notes, storage_location, germination_rate, last_tested, designation]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plants', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, sl.variety_code, v.name as variety_name
      FROM plants p
      LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation
      LEFT JOIN varieties v ON sl.variety_code = v.code
      ORDER BY p.season_year DESC, p.designation
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plants', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plants/:designation', async (req, res) => {
  const { designation } = req.params;
  const { selected_for_seed, notes, traits } = req.body;
  try {
    const result = await pool.query(
      `UPDATE plants SET selected_for_seed=$1, notes=$2, traits=$3 WHERE designation=$4 RETURNING *`,
      [selected_for_seed, notes, JSON.stringify(traits || {}), designation]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM breeding_projects ORDER BY started_year DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/harvest', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/harvest', async (req, res) => {
  const { plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SeedVault running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
