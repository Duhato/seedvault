const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const https = require('https');
const http = require('http');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

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

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts.' }, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, message: { error: 'Too many requests.' }, standardHeaders: true, legacyHeaders: false });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/setup', authLimiter);
app.use('/uploads', express.static('/app/uploads'));

const plantStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/uploads/plants'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, req.params.designation.replace(/[^a-zA-Z0-9-_]/g, '_') + '_' + Date.now() + ext);
  }
});

const plantPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = '/app/uploads/plants/' + req.params.designation.replace(/[^a-zA-Z0-9-_]/g, '_');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + ext);
  }
});

const packetStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/uploads/packets'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const side = req.params.side || 'front';
    cb(null, req.params.designation.replace(/[^a-zA-Z0-9-_]/g, '_') + '_' + side + '_' + Date.now() + ext);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const uploadPlant = multer({ storage: plantStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadPacket = multer({ storage: packetStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadPlantPhoto = multer({ storage: plantPhotoStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

function sanitizeString(str, maxLen = 255) {
  if (str === null || str === undefined) return null;
  return String(str).trim().slice(0, maxLen);
}
function validateCode(code, maxLen = 20) {
  if (!code) return null;
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, maxLen);
}
function validateYear(year) {
  const y = parseInt(year);
  if (isNaN(y) || y < 1900 || y > 2100) return null;
  return y;
}
function validateInt(val, min = 0, max = 999999) {
  const n = parseInt(val);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
}
function validateDecimal(val, min = 0, max = 9999) {
  const n = parseFloat(val);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
}

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'standard',
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
        quantity_weight DECIMAL(8,2),
        quantity_unit VARCHAR(10) DEFAULT 'seeds',
        mother_designation VARCHAR(50),
        father_designation VARCHAR(50),
        notes TEXT,
        storage_location VARCHAR(100),
        germination_rate INTEGER,
        last_tested DATE,
        packet_front_path VARCHAR(255),
        packet_back_path VARCHAR(255),
        lot_number VARCHAR(50),
        upc_code VARCHAR(50),
        packed_for_year INTEGER,
        days_to_germination INTEGER,
        days_to_harvest INTEGER,
        planting_depth_inches DECIMAL(4,2),
        spacing_inches INTEGER,
        row_spacing_inches INTEGER,
        sun_requirements VARCHAR(50),
        watering_needs VARCHAR(20),
        container_variety BOOLEAN DEFAULT FALSE,
        direct_sow BOOLEAN DEFAULT TRUE,
        start_indoors_weeks INTEGER,
        soil_temp_min_f INTEGER,
        frost_tolerance VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS garden_locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        size_description VARCHAR(100),
        soil_notes TEXT,
        sun_exposure VARCHAR(50),
        notes TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS plants (
        id SERIAL PRIMARY KEY,
        designation VARCHAR(50) UNIQUE NOT NULL,
        seed_lot_designation VARCHAR(50) REFERENCES seed_lots(designation),
        season_year INTEGER NOT NULL,
        season_type VARCHAR(10) DEFAULT 'summer',
        location_id INTEGER REFERENCES garden_locations(id),
        selected_for_seed BOOLEAN DEFAULT FALSE,
        photo_path VARCHAR(255),
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
      CREATE TABLE IF NOT EXISTS germination_tests (
        id SERIAL PRIMARY KEY,
        seed_lot_designation VARCHAR(50) REFERENCES seed_lots(designation),
        date_started DATE NOT NULL,
        seeds_planted INTEGER NOT NULL,
        seeds_germinated INTEGER,
        date_germinated DATE,
        days_to_germination INTEGER,
        seeds_thinned INTEGER,
        date_thinned DATE,
        plants_remaining INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS seed_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        website VARCHAR(255),
        type VARCHAR(50) DEFAULT 'commercial',
        rating INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cross_pollinations (
        id SERIAL PRIMARY KEY,
        mother_designation VARCHAR(50) REFERENCES plants(designation),
        father_designation VARCHAR(50) REFERENCES plants(designation),
        project_code VARCHAR(20) REFERENCES breeding_projects(code),
        date_bagged DATE,
        date_pollinated DATE,
        date_unbagged DATE,
        success BOOLEAN,
        fruit_set BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS fruit_observations (
        id SERIAL PRIMARY KEY,
        plant_designation VARCHAR(50) REFERENCES plants(designation),
        observation_date DATE NOT NULL,
        fruit_count INTEGER,
        avg_length_inches DECIMAL(4,1),
        avg_diameter_inches DECIMAL(4,1),
        color VARCHAR(50),
        texture VARCHAR(50),
        flavor_notes TEXT,
        health_notes TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS plant_amendments (
        id SERIAL PRIMARY KEY,
        plant_designation VARCHAR(50) REFERENCES plants(designation),
        location_id INTEGER REFERENCES garden_locations(id),
        amendment_date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        product_name VARCHAR(100),
        amount VARCHAR(50),
        method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO species (code, name) VALUES
        ('CUC', 'Cucumber'),('TOM', 'Tomato'),('PEP', 'Pepper'),('CAR', 'Carrot')
      ON CONFLICT (code) DO NOTHING;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'standard';
      ALTER TABLE plants ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES garden_locations(id);
      ALTER TABLE plants ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS packet_front_path VARCHAR(255);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS packet_back_path VARCHAR(255);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS quantity_weight DECIMAL(8,2);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(10) DEFAULT 'seeds';
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS upc_code VARCHAR(50);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS packed_for_year INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS days_to_germination INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS days_to_harvest INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS planting_depth_inches DECIMAL(4,2);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS spacing_inches INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS row_spacing_inches INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS sun_requirements VARCHAR(50);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS watering_needs VARCHAR(20);
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS container_variety BOOLEAN DEFAULT FALSE;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS direct_sow BOOLEAN DEFAULT TRUE;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS start_indoors_weeks INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS soil_temp_min_f INTEGER;
      ALTER TABLE seed_lots ADD COLUMN IF NOT EXISTS frost_tolerance VARCHAR(50);
    `);
    console.log('Database initialized successfully');
  } finally { client.release(); }
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (err) { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

app.get('/api/auth/status', async (req, res) => {
  try { res.json({ hasUsers: parseInt((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count) > 0 }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/setup', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) > 0) return res.status(400).json({ error: 'Setup already complete' });
    const username = sanitizeString(req.body.username, 50);
    const { password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 8)
      return res.status(400).json({ error: 'Invalid username or password' });
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, hash, 'admin']);
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
    res.json({ success: true, token, username, role: 'admin' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 50);
    const { password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid username or password' });
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
    res.json({ success: true, token, username: user.username, role: user.role });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [req.user.username]);
    if (!await bcrypt.compare(currentPassword, result.rows[0].password_hash)) return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password_hash=$1 WHERE username=$2', [await bcrypt.hash(newPassword, 12), req.user.username]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 50);
    const { password } = req.body;
    const role = req.body.role === 'admin' ? 'admin' : 'standard';
    if (!username || !password || username.length < 3 || password.length < 8)
      return res.status(400).json({ error: 'Invalid username or password' });
    const result = await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at', [username, await bcrypt.hash(password, 12), role]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const username = sanitizeString(req.params.username, 50);
    if (username === req.user.username) return res.status(400).json({ error: 'Cannot delete your own account' });
    await pool.query('DELETE FROM users WHERE username=$1', [username]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/users/:username/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const username = sanitizeString(req.params.username, 50);
    if (username === req.user.username) return res.status(400).json({ error: 'Cannot change your own role' });
    const role = req.body.role === 'admin' ? 'admin' : 'standard';
    await pool.query('UPDATE users SET role=$1 WHERE username=$2', [role, username]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PLANT MULTI-PHOTO ROUTES
app.get('/api/plants/:designation/photos', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  try { res.json((await pool.query('SELECT * FROM plant_photos WHERE plant_designation=$1 ORDER BY created_at DESC', [designation])).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/plants/:designation/photos', authMiddleware, (req, res) => {
  uploadPlantPhoto.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const designation = sanitizeString(req.params.designation, 50);
    const photoPath = '/uploads/plants/' + designation.replace(/[^a-zA-Z0-9-_]/g, '_') + '/' + req.file.filename;
    try {
      const result = await pool.query('INSERT INTO plant_photos (plant_designation, photo_path, caption, taken_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [designation, photoPath, sanitizeString(req.body.caption, 255), sanitizeString(req.body.taken_date, 20) || null]);
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });
});

app.delete('/api/plants/:designation/photos/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  const designation = sanitizeString(req.params.designation, 50);
  try {
    const result = await pool.query('SELECT * FROM plant_photos WHERE id=$1 AND plant_designation=$2', [id, designation]);
    if (result.rows[0]?.photo_path) {
      const fullPath = '/app' + result.rows[0].photo_path;
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await pool.query('DELETE FROM plant_photos WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PHOTO UPLOAD ROUTES
app.post('/api/plants/:designation/photo', authMiddleware, (req, res) => {
  uploadPlant.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const designation = sanitizeString(req.params.designation, 50);
    const photoPath = '/uploads/plants/' + req.file.filename;
    try {
      const old = await pool.query('SELECT photo_path FROM plants WHERE designation=$1', [designation]);
      if (old.rows[0]?.photo_path) {
        const oldFile = '/app' + old.rows[0].photo_path;
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      await pool.query('UPDATE plants SET photo_path=$1 WHERE designation=$2', [photoPath, designation]);
      res.json({ success: true, photo_path: photoPath });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });
});

app.delete('/api/plants/:designation/photo', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  try {
    const result = await pool.query('SELECT photo_path FROM plants WHERE designation=$1', [designation]);
    const photoPath = result.rows[0]?.photo_path;
    if (photoPath) { const fullPath = '/app' + photoPath; if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); }
    await pool.query('UPDATE plants SET photo_path=NULL WHERE designation=$1', [designation]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/seed-lots/:designation/packet/:side', authMiddleware, (req, res) => {
  uploadPacket.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const designation = sanitizeString(req.params.designation, 50);
    const side = req.params.side === 'back' ? 'back' : 'front';
    const col = side === 'front' ? 'packet_front_path' : 'packet_back_path';
    const photoPath = '/uploads/packets/' + req.file.filename;
    try {
      const old = await pool.query('SELECT ' + col + ' FROM seed_lots WHERE designation=$1', [designation]);
      if (old.rows[0]?.[col]) { const oldFile = '/app' + old.rows[0][col]; if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile); }
      await pool.query('UPDATE seed_lots SET ' + col + '=$1 WHERE designation=$2', [photoPath, designation]);
      res.json({ success: true, photo_path: photoPath });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
  });
});

app.delete('/api/seed-lots/:designation/packet/:side', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  const side = req.params.side === 'back' ? 'back' : 'front';
  const col = side === 'front' ? 'packet_front_path' : 'packet_back_path';
  try {
    const result = await pool.query('SELECT ' + col + ' FROM seed_lots WHERE designation=$1', [designation]);
    const photoPath = result.rows[0]?.[col];
    if (photoPath) { const fullPath = '/app' + photoPath; if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); }
    await pool.query('UPDATE seed_lots SET ' + col + '=NULL WHERE designation=$1', [designation]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.use(express.static(path.join(__dirname, 'public')));

// AMENDMENTS
app.get('/api/amendments', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT a.*, p.seed_lot_designation, v.name as variety_name, gl.name as location_name FROM plant_amendments a LEFT JOIN plants p ON a.plant_designation = p.designation LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code LEFT JOIN garden_locations gl ON a.location_id = gl.id ORDER BY a.amendment_date DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/amendments', authMiddleware, async (req, res) => {
  const amendment_date = sanitizeString(req.body.amendment_date, 20);
  const type = sanitizeString(req.body.type, 50);
  if (!amendment_date || !type) return res.status(400).json({ error: 'Date and type required' });
  try { res.json((await pool.query('INSERT INTO plant_amendments (plant_designation, location_id, amendment_date, type, product_name, amount, method, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [sanitizeString(req.body.plant_designation, 50) || null, validateInt(req.body.location_id, 1) || null, amendment_date, type, sanitizeString(req.body.product_name, 100), sanitizeString(req.body.amount, 50), sanitizeString(req.body.method, 50), sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/amendments/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { res.json((await pool.query('UPDATE plant_amendments SET amendment_date=$1, type=$2, product_name=$3, amount=$4, method=$5, notes=$6 WHERE id=$7 RETURNING *', [sanitizeString(req.body.amendment_date, 20), sanitizeString(req.body.type, 50), sanitizeString(req.body.product_name, 100), sanitizeString(req.body.amount, 50), sanitizeString(req.body.method, 50), sanitizeString(req.body.notes, 2000), id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/amendments/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM plant_amendments WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GARDEN LOCATIONS
app.get('/api/locations', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM garden_locations ORDER BY name')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/locations', authMiddleware, async (req, res) => {
  const name = sanitizeString(req.body.name, 100);
  const type = sanitizeString(req.body.type, 50);
  if (!name || !type) return res.status(400).json({ error: 'Name and type required' });
  try { res.json((await pool.query('INSERT INTO garden_locations (name, type, size_description, soil_notes, sun_exposure, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, type, sanitizeString(req.body.size_description, 100), sanitizeString(req.body.soil_notes, 2000), sanitizeString(req.body.sun_exposure, 50), sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/locations/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  const name = sanitizeString(req.body.name, 100);
  if (!id || !name) return res.status(400).json({ error: 'Valid id and name required' });
  try { res.json((await pool.query('UPDATE garden_locations SET name=$1, type=$2, size_description=$3, soil_notes=$4, sun_exposure=$5, notes=$6, active=$7 WHERE id=$8 RETURNING *', [name, sanitizeString(req.body.type, 50), sanitizeString(req.body.size_description, 100), sanitizeString(req.body.soil_notes, 2000), sanitizeString(req.body.sun_exposure, 50), sanitizeString(req.body.notes, 2000), req.body.active !== false, id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/locations/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM garden_locations WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SEED SOURCES
app.get('/api/sources', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM seed_sources ORDER BY name')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/sources', authMiddleware, async (req, res) => {
  const name = sanitizeString(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Name required' });
  try { res.json((await pool.query('INSERT INTO seed_sources (name, website, type, rating, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, sanitizeString(req.body.website, 255), sanitizeString(req.body.type, 50) || 'commercial', validateInt(req.body.rating, 1, 5), sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/sources/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  const name = sanitizeString(req.body.name, 100);
  if (!id || !name) return res.status(400).json({ error: 'Valid id and name required' });
  try { res.json((await pool.query('UPDATE seed_sources SET name=$1, website=$2, type=$3, rating=$4, notes=$5 WHERE id=$6 RETURNING *', [name, sanitizeString(req.body.website, 255), sanitizeString(req.body.type, 50), validateInt(req.body.rating, 1, 5), sanitizeString(req.body.notes, 2000), id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/sources/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM seed_sources WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SPECIES
app.get('/api/species', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM species ORDER BY name')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/species', authMiddleware, async (req, res) => {
  const code = validateCode(req.body.code, 10);
  const name = sanitizeString(req.body.name, 100);
  if (!code || !name) return res.status(400).json({ error: 'Valid code and name required' });
  try { res.json((await pool.query('INSERT INTO species (code, name) VALUES ($1, $2) RETURNING *', [code, name])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/species/:code', authMiddleware, async (req, res) => {
  const code = validateCode(req.params.code, 10);
  const name = sanitizeString(req.body.name, 100);
  if (!code || !name) return res.status(400).json({ error: 'Valid name required' });
  try { res.json((await pool.query('UPDATE species SET name=$1 WHERE code=$2 RETURNING *', [name, code])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/species/:code', authMiddleware, async (req, res) => {
  const code = validateCode(req.params.code, 10);
  if (!code) return res.status(400).json({ error: 'Invalid code' });
  try {
    const check = await pool.query('SELECT COUNT(*) FROM varieties WHERE species_code=$1', [code]);
    if (parseInt(check.rows[0].count) > 0) return res.status(400).json({ error: 'Cannot delete species with existing varieties' });
    await pool.query('DELETE FROM species WHERE code=$1', [code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// VARIETIES
app.get('/api/varieties', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT v.*, s.name as species_name FROM varieties v LEFT JOIN species s ON v.species_code = s.code ORDER BY v.species_code, v.name')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/varieties', authMiddleware, async (req, res) => {
  const name = sanitizeString(req.body.name, 100);
  const species_code = validateCode(req.body.species_code, 10);
  if (!name || !species_code) return res.status(400).json({ error: 'Name and species required' });
  try {
    const code = species_code + '-' + name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    res.json((await pool.query('INSERT INTO varieties (code, name, species_code, type, description, source, year_acquired) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [code, name, species_code, sanitizeString(req.body.type, 20) || 'OP', sanitizeString(req.body.description, 2000), sanitizeString(req.body.source, 100), validateYear(req.body.year_acquired)])).rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/varieties/:code', authMiddleware, async (req, res) => {
  const code = validateCode(req.params.code, 20);
  const name = sanitizeString(req.body.name, 100);
  if (!code || !name) return res.status(400).json({ error: 'Valid name required' });
  try { res.json((await pool.query('UPDATE varieties SET name=$1, type=$2, description=$3, source=$4, year_acquired=$5 WHERE code=$6 RETURNING *', [name, sanitizeString(req.body.type, 20), sanitizeString(req.body.description, 2000), sanitizeString(req.body.source, 100), validateYear(req.body.year_acquired), code])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/varieties/:code', authMiddleware, async (req, res) => {
  const code = validateCode(req.params.code, 20);
  if (!code) return res.status(400).json({ error: 'Invalid code' });
  try { await pool.query('DELETE FROM varieties WHERE code=$1', [code]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SEED LOTS
app.get('/api/seed-lots', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT sl.*, v.name as variety_name, v.species_code FROM seed_lots sl LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY sl.year_saved DESC, sl.designation')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/seed-lots', authMiddleware, async (req, res) => {
  const variety_code = validateCode(req.body.variety_code, 20);
  const generation = req.body.generation !== undefined && req.body.generation !== null && req.body.generation !== "" ? parseInt(req.body.generation) : null;
  const year_saved = validateYear(req.body.year_saved);
  if (!variety_code || generation === null || isNaN(generation) || !year_saved) return res.status(400).json({ error: 'Variety, generation and year required' });
  try {
    const designation = variety_code + '-G' + generation + '-' + year_saved;
    res.json((await pool.query(`INSERT INTO seed_lots (designation, variety_code, generation, year_saved,
      quantity_estimate, quantity_weight, quantity_unit,
      mother_designation, father_designation, notes, storage_location,
      lot_number, upc_code, packed_for_year, sell_by_date,
      days_to_germination, days_to_harvest, planting_depth_inches,
      spacing_inches, row_spacing_inches, sun_requirements, watering_needs,
      container_variety, direct_sow, start_indoors_weeks, soil_temp_min_f, frost_tolerance,
      origin, container_size)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [designation, variety_code, generation, year_saved,
      validateInt(req.body.quantity_estimate, 0, 100000),
      validateDecimal(req.body.quantity_weight),
      sanitizeString(req.body.quantity_unit, 10) || 'seeds',
      sanitizeString(req.body.mother_designation, 50),
      sanitizeString(req.body.father_designation, 50),
      sanitizeString(req.body.notes, 2000),
      sanitizeString(req.body.storage_location, 100),
      sanitizeString(req.body.lot_number, 50),
      sanitizeString(req.body.upc_code, 50),
      validateYear(req.body.packed_for_year),
      sanitizeString(req.body.sell_by_date, 20),
      sanitizeString(req.body.days_to_germination, 20),
      sanitizeString(req.body.days_to_harvest, 20),
      sanitizeString(req.body.planting_depth_inches, 50),
      sanitizeString(req.body.spacing_inches, 50),
      sanitizeString(req.body.row_spacing_inches, 50),
      sanitizeString(req.body.sun_requirements, 50),
      sanitizeString(req.body.watering_needs, 20),
      req.body.container_variety === true || req.body.container_variety === 'true',
      req.body.direct_sow !== false && req.body.direct_sow !== 'false',
      validateInt(req.body.start_indoors_weeks, 1, 20),
      validateInt(req.body.soil_temp_min_f, 32, 100),
      sanitizeString(req.body.frost_tolerance, 50),
      sanitizeString(req.body.origin, 100),
      sanitizeString(req.body.container_size, 100)]
    )).rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/seed-lots/:designation', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  try {
    const editGen = req.body.generation !== undefined && req.body.generation !== '' ? parseInt(req.body.generation) : null;
    const editYear = validateYear(req.body.year_saved);
    if (editGen !== null && !isNaN(editGen) && editYear) {
      const lot = (await pool.query('SELECT variety_code FROM seed_lots WHERE designation=$1', [designation])).rows[0];
      if (lot) {
        const newDesignation = lot.variety_code + '-G' + editGen + '-' + editYear;
        if (newDesignation !== designation) {
          await pool.query('UPDATE seed_lots SET designation=$1, generation=$2, year_saved=$3 WHERE designation=$4', [newDesignation, editGen, editYear, designation]);
          designation = newDesignation;
        }
      }
    }
    res.json((await pool.query(`UPDATE seed_lots SET
      quantity_estimate=$1, quantity_weight=$2, quantity_unit=$3,
      notes=$4, storage_location=$5, germination_rate=$6, last_tested=$7,
      mother_designation=$8, father_designation=$9,
      lot_number=$10, upc_code=$11, packed_for_year=$12, sell_by_date=$13,
      days_to_germination=$14, days_to_harvest=$15, planting_depth_inches=$16,
      spacing_inches=$17, row_spacing_inches=$18, sun_requirements=$19, watering_needs=$20,
      container_variety=$21, direct_sow=$22, start_indoors_weeks=$23,
      soil_temp_min_f=$24, frost_tolerance=$25, origin=$26, container_size=$27
      WHERE designation=$28 RETURNING *`,
    [validateInt(req.body.quantity_estimate, 0, 100000),
    validateDecimal(req.body.quantity_weight),
    sanitizeString(req.body.quantity_unit, 10) || 'seeds',
    sanitizeString(req.body.notes, 2000),
    sanitizeString(req.body.storage_location, 100),
    validateInt(req.body.germination_rate, 0, 100),
    sanitizeString(req.body.last_tested, 20) || null,
    sanitizeString(req.body.mother_designation, 50),
    sanitizeString(req.body.father_designation, 50),
    sanitizeString(req.body.lot_number, 50),
    sanitizeString(req.body.upc_code, 50),
    validateYear(req.body.packed_for_year),
    sanitizeString(req.body.sell_by_date, 20),
    sanitizeString(req.body.days_to_germination, 20),
    sanitizeString(req.body.days_to_harvest, 20),
    sanitizeString(req.body.planting_depth_inches, 50),
    sanitizeString(req.body.spacing_inches, 50),
    sanitizeString(req.body.row_spacing_inches, 50),
    sanitizeString(req.body.sun_requirements, 50),
    sanitizeString(req.body.watering_needs, 20),
    req.body.container_variety === true || req.body.container_variety === 'true',
    req.body.direct_sow !== false && req.body.direct_sow !== 'false',
    validateInt(req.body.start_indoors_weeks, 1, 20),
    validateInt(req.body.soil_temp_min_f, 32, 100),
    sanitizeString(req.body.frost_tolerance, 50),
    sanitizeString(req.body.origin, 100),
    sanitizeString(req.body.container_size, 100),
    designation]
  )).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/seed-lots/:designation', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  try { await pool.query('DELETE FROM seed_lots WHERE designation=$1', [designation]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PLANTS
app.get('/api/plants', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT p.*, sl.variety_code, v.name as variety_name, gl.name as location_name, tl.name as transplant_location_name FROM plants p LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code LEFT JOIN garden_locations gl ON p.location_id = gl.id LEFT JOIN garden_locations tl ON p.transplant_location_id = tl.id ORDER BY p.season_year DESC, p.designation')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/plants', authMiddleware, async (req, res) => {
  const seed_lot_designation = sanitizeString(req.body.seed_lot_designation, 50);
  const season_year = validateYear(req.body.season_year);
  const count = validateInt(req.body.count, 1, 1000) || 1;
  const validSeasons = ['summer', 'winter', 'spring', 'fall'];
  const season_type = validSeasons.includes(req.body.season_type) ? req.body.season_type : 'summer';
  const location_id = validateInt(req.body.location_id, 1);
  if (!seed_lot_designation || !season_year) return res.status(400).json({ error: 'Seed lot and year required' });
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM plants WHERE seed_lot_designation=$1 AND season_year=$2', [seed_lot_designation, season_year]);
    const startNum = parseInt(existing.rows[0].count) + 1;
    const start_method = sanitizeString(req.body.start_method, 50) || 'direct_sow';
    const started_indoors_date = sanitizeString(req.body.started_indoors_date, 20) || null;
    const created = [];
    for (let i = 0; i < count; i++) {
      created.push((await pool.query('INSERT INTO plants (designation, seed_lot_designation, season_year, season_type, location_id, notes, start_method, started_indoors_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [seed_lot_designation + '-P' + String(startNum + i).padStart(2, '0'), seed_lot_designation, season_year, season_type, location_id || null, sanitizeString(req.body.notes, 2000), start_method, started_indoors_date])).rows[0]);
    }
    res.json(created);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/plants/:designation', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  const validSeasons = ['summer', 'winter', 'spring', 'fall'];
  const season_type = validSeasons.includes(req.body.season_type) ? req.body.season_type : 'summer';
  const location_id = validateInt(req.body.location_id, 1);
  const transplant_location_id = validateInt(req.body.transplant_location_id, 1);
  try { res.json((await pool.query('UPDATE plants SET selected_for_seed=$1, notes=$2, traits=$3, season_type=$4, location_id=$5, start_method=$6, started_indoors_date=$7, transplant_date=$8, transplant_location_id=$9, transplant_notes=$10 WHERE designation=$11 RETURNING *', [req.body.selected_for_seed === true || req.body.selected_for_seed === 'true', sanitizeString(req.body.notes, 2000), JSON.stringify(req.body.traits || {}), season_type, location_id || null, sanitizeString(req.body.start_method, 50) || 'direct_sow', sanitizeString(req.body.started_indoors_date, 20) || null, sanitizeString(req.body.transplant_date, 20) || null, transplant_location_id || null, sanitizeString(req.body.transplant_notes, 2000), designation])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/plants/:designation', authMiddleware, async (req, res) => {
  const designation = sanitizeString(req.params.designation, 50);
  try { await pool.query('DELETE FROM plants WHERE designation=$1', [designation]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// BREEDING PROJECTS
app.get('/api/projects', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM breeding_projects ORDER BY started_year DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/projects', authMiddleware, async (req, res) => {
  const name = sanitizeString(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Name required' });
  const started_year = validateYear(req.body.started_year);
  const target_traits = Array.isArray(req.body.target_traits) ? req.body.target_traits.map(t => sanitizeString(t, 100)).filter(Boolean) : [];
  try {
    const code = 'WV-' + name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 6) + '-' + started_year;
    res.json((await pool.query('INSERT INTO breeding_projects (code, name, description, target_traits, started_year) VALUES ($1, $2, $3, $4, $5) RETURNING *', [code, name, sanitizeString(req.body.description, 2000), JSON.stringify(target_traits), started_year])).rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/projects/:code', authMiddleware, async (req, res) => {
  const code = sanitizeString(req.params.code, 20);
  const name = sanitizeString(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Name required' });
  const validStatuses = ['active', 'complete', 'paused'];
  const status = validStatuses.includes(req.body.status) ? req.body.status : 'active';
  const target_traits = Array.isArray(req.body.target_traits) ? req.body.target_traits.map(t => sanitizeString(t, 100)).filter(Boolean) : [];
  try { res.json((await pool.query('UPDATE breeding_projects SET name=$1, description=$2, target_traits=$3, status=$4 WHERE code=$5 RETURNING *', [name, sanitizeString(req.body.description, 2000), JSON.stringify(target_traits), status, code])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/projects/:code', authMiddleware, async (req, res) => {
  const code = sanitizeString(req.params.code, 20);
  try { await pool.query('DELETE FROM breeding_projects WHERE code=$1', [code]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// HARVEST LOG
app.get('/api/harvest', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT h.*, p.seed_lot_designation, v.name as variety_name FROM harvest_log h LEFT JOIN plants p ON h.plant_designation = p.designation LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY h.harvest_date DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/harvest', authMiddleware, async (req, res) => {
  const plant_designation = sanitizeString(req.body.plant_designation, 50);
  if (!plant_designation) return res.status(400).json({ error: 'Plant required' });
  try { res.json((await pool.query('INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [plant_designation, sanitizeString(req.body.harvest_date, 20), validateDecimal(req.body.fruit_length_inches), validateDecimal(req.body.fruit_diameter_inches), validateDecimal(req.body.fruit_weight_oz), sanitizeString(req.body.condition, 50), sanitizeString(req.body.processing_method, 50), validateInt(req.body.seed_count, 0, 10000), sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/harvest/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { res.json((await pool.query('UPDATE harvest_log SET harvest_date=$1, fruit_length_inches=$2, fruit_diameter_inches=$3, fruit_weight_oz=$4, condition=$5, processing_method=$6, seed_count=$7, notes=$8 WHERE id=$9 RETURNING *', [sanitizeString(req.body.harvest_date, 20), validateDecimal(req.body.fruit_length_inches), validateDecimal(req.body.fruit_diameter_inches), validateDecimal(req.body.fruit_weight_oz), sanitizeString(req.body.condition, 50), sanitizeString(req.body.processing_method, 50), validateInt(req.body.seed_count, 0, 10000), sanitizeString(req.body.notes, 2000), id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/harvest/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM harvest_log WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GERMINATION
app.get('/api/germination', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT g.*, v.name as variety_name FROM germination_tests g LEFT JOIN seed_lots sl ON g.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY g.date_started DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/germination', authMiddleware, async (req, res) => {
  const seed_lot_designation = sanitizeString(req.body.seed_lot_designation, 50);
  const date_started = sanitizeString(req.body.date_started, 20);
  const seeds_planted = validateInt(req.body.seeds_planted, 1, 10000);
  if (!seed_lot_designation || !date_started || !seeds_planted) return res.status(400).json({ error: 'Seed lot, date and seeds planted required' });
  try { res.json((await pool.query('INSERT INTO germination_tests (seed_lot_designation, date_started, seeds_planted, notes) VALUES ($1, $2, $3, $4) RETURNING *', [seed_lot_designation, date_started, seeds_planted, sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/germination/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const seeds_germinated = validateInt(req.body.seeds_germinated, 0, 10000);
  const date_germinated = sanitizeString(req.body.date_germinated, 20);
  try {
    const test = (await pool.query('SELECT * FROM germination_tests WHERE id=$1', [id])).rows[0];
    let days_to_germination = null;
    if (date_germinated && test.date_started) {
      days_to_germination = Math.round((new Date(date_germinated) - new Date(test.date_started)) / (1000 * 60 * 60 * 24));
    }
    const germination_rate = seeds_germinated !== null && test.seeds_planted ? Math.round((seeds_germinated / test.seeds_planted) * 100) : null;
    const result = (await pool.query('UPDATE germination_tests SET seeds_germinated=$1, date_germinated=$2, days_to_germination=$3, seeds_thinned=$4, date_thinned=$5, plants_remaining=$6, notes=$7 WHERE id=$8 RETURNING *', [seeds_germinated, date_germinated || null, days_to_germination, validateInt(req.body.seeds_thinned, 0, 10000), sanitizeString(req.body.date_thinned, 20) || null, validateInt(req.body.plants_remaining, 0, 10000), sanitizeString(req.body.notes, 2000), id])).rows[0];
    if (germination_rate !== null) await pool.query('UPDATE seed_lots SET germination_rate=$1, last_tested=$2 WHERE designation=$3', [germination_rate, test.date_started, test.seed_lot_designation]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/germination/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM germination_tests WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// CROSS POLLINATION
app.get('/api/crosses', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT c.*, mp.seed_lot_designation as mother_lot, fp.seed_lot_designation as father_lot FROM cross_pollinations c LEFT JOIN plants mp ON c.mother_designation = mp.designation LEFT JOIN plants fp ON c.father_designation = fp.designation ORDER BY c.date_pollinated DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/crosses', authMiddleware, async (req, res) => {
  const mother_designation = sanitizeString(req.body.mother_designation, 50);
  if (!mother_designation) return res.status(400).json({ error: 'Mother plant required' });
  try { res.json((await pool.query('INSERT INTO cross_pollinations (mother_designation, father_designation, project_code, date_bagged, date_pollinated, date_unbagged, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [mother_designation, sanitizeString(req.body.father_designation, 50) || null, sanitizeString(req.body.project_code, 20) || null, sanitizeString(req.body.date_bagged, 20) || null, sanitizeString(req.body.date_pollinated, 20) || null, sanitizeString(req.body.date_unbagged, 20) || null, sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/crosses/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { res.json((await pool.query('UPDATE cross_pollinations SET date_bagged=$1, date_pollinated=$2, date_unbagged=$3, success=$4, fruit_set=$5, notes=$6 WHERE id=$7 RETURNING *', [sanitizeString(req.body.date_bagged, 20) || null, sanitizeString(req.body.date_pollinated, 20) || null, sanitizeString(req.body.date_unbagged, 20) || null, req.body.success === true || req.body.success === 'true' ? true : req.body.success === false || req.body.success === 'false' ? false : null, req.body.fruit_set === true || req.body.fruit_set === 'true', sanitizeString(req.body.notes, 2000), id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/crosses/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM cross_pollinations WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// FRUIT OBSERVATIONS
app.get('/api/observations', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT fo.*, v.name as variety_name FROM fruit_observations fo LEFT JOIN plants p ON fo.plant_designation = p.designation LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY fo.observation_date DESC')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/observations', authMiddleware, async (req, res) => {
  const plant_designation = sanitizeString(req.body.plant_designation, 50);
  const observation_date = sanitizeString(req.body.observation_date, 20);
  if (!plant_designation || !observation_date) return res.status(400).json({ error: 'Plant and date required' });
  try { res.json((await pool.query('INSERT INTO fruit_observations (plant_designation, observation_date, fruit_count, avg_length_inches, avg_diameter_inches, color, texture, flavor_notes, health_notes, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [plant_designation, observation_date, validateInt(req.body.fruit_count, 0, 10000), validateDecimal(req.body.avg_length_inches), validateDecimal(req.body.avg_diameter_inches), sanitizeString(req.body.color, 50), sanitizeString(req.body.texture, 50), sanitizeString(req.body.flavor_notes, 1000), sanitizeString(req.body.health_notes, 1000), sanitizeString(req.body.notes, 2000)])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/observations/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { res.json((await pool.query('UPDATE fruit_observations SET observation_date=$1, fruit_count=$2, avg_length_inches=$3, avg_diameter_inches=$4, color=$5, texture=$6, flavor_notes=$7, health_notes=$8, notes=$9 WHERE id=$10 RETURNING *', [sanitizeString(req.body.observation_date, 20), validateInt(req.body.fruit_count, 0, 10000), validateDecimal(req.body.avg_length_inches), validateDecimal(req.body.avg_diameter_inches), sanitizeString(req.body.color, 50), sanitizeString(req.body.texture, 50), sanitizeString(req.body.flavor_notes, 1000), sanitizeString(req.body.health_notes, 1000), sanitizeString(req.body.notes, 2000), id])).rows[0]); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/observations/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM fruit_observations WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// WEATHER LOG
app.get('/api/weather', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;
    res.json((await pool.query(`SELECT * FROM weather_log WHERE log_date >= NOW() - INTERVAL '${days} days' ORDER BY log_date DESC`)).rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/weather', authMiddleware, async (req, res) => {
  try {
    const { log_date, high_temp_f, low_temp_f, precip_inches, condition, wind_speed_mph, source, notes } = req.body;
    if (!log_date) return res.status(400).json({ error: 'Date required' });
    const src = sanitizeString(source, 20) || 'manual';
    const result = await pool.query(
      'INSERT INTO weather_log (log_date, high_temp_f, low_temp_f, precip_inches, condition, wind_speed_mph, source, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (log_date, source) DO UPDATE SET high_temp_f=$2, low_temp_f=$3, precip_inches=$4, condition=$5, wind_speed_mph=$6, notes=$8, created_at=NOW() RETURNING *',
      [log_date, validateDecimal(high_temp_f), validateDecimal(low_temp_f), validateDecimal(precip_inches), sanitizeString(condition, 100), validateDecimal(wind_speed_mph), src, sanitizeString(notes, 500)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/weather/:id', authMiddleware, async (req, res) => {
  const id = validateInt(req.params.id, 1);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try { await pool.query('DELETE FROM weather_log WHERE id=$1', [id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// FROST EVENTS
app.get('/api/frost-events', authMiddleware, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM frost_events ORDER BY year DESC, event_date')).rows); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/frost-events', authMiddleware, async (req, res) => {
  try {
    const { year, event_type, event_date, confirmed, notes } = req.body;
    if (!year || !event_type || !event_date) return res.status(400).json({ error: 'Year, type and date required' });
    const result = await pool.query(
      'INSERT INTO frost_events (year, event_type, event_date, confirmed, notes) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (year, event_type) DO UPDATE SET event_date=$3, confirmed=$4, notes=$5 RETURNING *',
      [validateYear(year), sanitizeString(event_type, 20), sanitizeString(event_date, 20), confirmed === true || confirmed === 'true', sanitizeString(notes, 500)]
    );
    // Update user settings with new frost date
    if (confirmed) {
      const mmdd = event_date.substring(5);
      const key = event_type === 'last_spring' ? 'last_frost_date' : 'first_frost_date';
      await pool.query('INSERT INTO user_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, mmdd]);
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/weather/summary', authMiddleware, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const result = await pool.query(`
      SELECT
        COUNT(*) as days_logged,
        ROUND(AVG(high_temp_f)::numeric, 1) as avg_high,
        ROUND(AVG(low_temp_f)::numeric, 1) as avg_low,
        ROUND(SUM(precip_inches)::numeric, 2) as total_precip,
        MAX(high_temp_f) as max_temp,
        MIN(low_temp_f) as min_temp,
        COUNT(CASE WHEN low_temp_f <= 32 THEN 1 END) as frost_days
      FROM weather_log
      WHERE EXTRACT(YEAR FROM log_date) = $1
    `, [year]);
    const frostEvents = (await pool.query('SELECT * FROM frost_events WHERE year=$1 ORDER BY event_date', [year])).rows;
    const avgFrost = await pool.query(`
      SELECT
        event_type,
        ROUND(AVG(EXTRACT(DOY FROM event_date))) as avg_doy,
        COUNT(*) as years_recorded
      FROM frost_events
      WHERE confirmed = true
      GROUP BY event_type
    `);
    res.json({ ...result.rows[0], frost_events: frostEvents, frost_averages: avgFrost.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// USER SETTINGS
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM user_settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });
    await pool.query('INSERT INTO user_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()', [sanitizeString(key, 50), sanitizeString(value, 255)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SEED INVENTORY
app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, v.name as variety_name, v.species_code,
        COUNT(DISTINCT p.designation) as plants_grown,
        MAX(p.season_year) as last_grown_year,
        COALESCE(SUM(hl.seed_count), 0) as seeds_harvested
      FROM seed_lots sl
      LEFT JOIN varieties v ON sl.variety_code = v.code
      LEFT JOIN plants p ON p.seed_lot_designation = sl.designation
      LEFT JOIN harvest_log hl ON hl.plant_designation = p.designation
      GROUP BY sl.id, v.name, v.species_code
      ORDER BY sl.designation
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// STATS
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [varieties, seedLots, plants, projects] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM varieties'),
      pool.query('SELECT COUNT(*) FROM seed_lots'),
      pool.query('SELECT COUNT(*) FROM plants WHERE season_year = EXTRACT(YEAR FROM NOW())'),
      pool.query("SELECT COUNT(*) FROM breeding_projects WHERE status = 'active'"),
    ]);
    res.json({ varieties: parseInt(varieties.rows[0].count), seedLots: parseInt(seedLots.rows[0].count), activePlants: parseInt(plants.rows[0].count), activeProjects: parseInt(projects.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// VIABILITY
app.get('/api/viability', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT sl.*, v.name as variety_name, v.species_code FROM seed_lots sl LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY sl.designation');
    const currentYear = new Date().getFullYear();
    const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3 };
    res.json(result.rows.map(lot => {
      const maxYears = viabilityYears[lot.species_code] || 3;
      const yearsLeft = maxYears - (currentYear - lot.year_saved);
      const status = yearsLeft <= 0 ? 'expired' : yearsLeft <= 1 ? 'warning' : 'good';
      return { ...lot, yearsLeft, maxYears, status };
    }).filter(l => l.status !== 'good'));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// BACKUP
app.get('/api/backup/export-zip', authMiddleware, async (req, res) => {
  try {
    const [species, varieties, seedLots, plants, projects, harvest, germination, amendments, crosses, observations, locations, sources] = await Promise.all([
      pool.query('SELECT * FROM species ORDER BY code'),
      pool.query('SELECT * FROM varieties ORDER BY code'),
      pool.query('SELECT * FROM seed_lots ORDER BY designation'),
      pool.query('SELECT * FROM plants ORDER BY designation'),
      pool.query('SELECT * FROM breeding_projects ORDER BY code'),
      pool.query('SELECT * FROM harvest_log ORDER BY harvest_date'),
      pool.query('SELECT * FROM germination_tests ORDER BY date_started'),
      pool.query('SELECT * FROM plant_amendments ORDER BY amendment_date'),
      pool.query('SELECT * FROM cross_pollinations ORDER BY created_at'),
      pool.query('SELECT * FROM fruit_observations ORDER BY observation_date'),
      pool.query('SELECT * FROM garden_locations ORDER BY name'),
      pool.query('SELECT * FROM seed_sources ORDER BY name'),
    ]);

    const filename = 'seedvault-backup-' + new Date().toISOString().split('T')[0] + '.zip';
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    const data = {
      app: 'SeedVault', version: '1.1.0', exported_at: new Date().toISOString(),
      data: { species: species.rows, varieties: varieties.rows, seed_lots: seedLots.rows,
        plants: plants.rows, breeding_projects: projects.rows, harvest_log: harvest.rows,
        germination_tests: germination.rows, plant_amendments: amendments.rows,
        cross_pollinations: crosses.rows, fruit_observations: observations.rows,
        garden_locations: locations.rows, seed_sources: sources.rows }
    };
    archive.append(JSON.stringify(data, null, 2), { name: 'seedvault-backup.json' });

    // Add photos if they exist
    const uploadsDir = '/app/uploads';
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    await archive.finalize();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/backup/import-zip', authMiddleware, async (req, res) => {
  const uploadZip = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
  uploadZip.single('backup')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const client = await pool.connect();
    try {
      const zip = await unzipper.Open.buffer(req.file.buffer);
      let backupData = null;

      // Extract and restore photos
      for (const file of zip.files) {
        if (file.path === 'seedvault-backup.json') {
          const content = await file.buffer();
          backupData = JSON.parse(content.toString());
        } else if (file.path.startsWith('uploads/')) {
          const destPath = '/app/' + file.path;
          const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          if (!file.path.endsWith('/')) {
            const buffer = await file.buffer();
            fs.writeFileSync(destPath, buffer);
          }
        }
      }

      if (!backupData || backupData.app !== 'SeedVault') {
        return res.status(400).json({ error: 'Invalid SeedVault backup file' });
      }

      const { data } = backupData;
      let imported = { species: 0, varieties: 0, seed_lots: 0, plants: 0, breeding_projects: 0, harvest_log: 0, germination_tests: 0, plant_amendments: 0, cross_pollinations: 0, fruit_observations: 0, garden_locations: 0, seed_sources: 0 };
      let skipped = { ...imported };

      await client.query('BEGIN');
      for (const s of (data.species || [])) { const r = await client.query('INSERT INTO species (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING *', [s.code, s.name]); r.rowCount > 0 ? imported.species++ : skipped.species++; }
      for (const v of (data.varieties || [])) { const r = await client.query('INSERT INTO varieties (code, name, species_code, type, description, source, year_acquired) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING RETURNING *', [v.code, v.name, v.species_code, v.type, v.description, v.source, v.year_acquired]); r.rowCount > 0 ? imported.varieties++ : skipped.varieties++; }
      for (const sl of (data.seed_lots || [])) { const r = await client.query('INSERT INTO seed_lots (designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location, germination_rate, last_tested, packet_front_path, packet_back_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (designation) DO NOTHING RETURNING *', [sl.designation, sl.variety_code, sl.generation, sl.year_saved, sl.quantity_estimate, sl.mother_designation, sl.father_designation, sl.notes, sl.storage_location, sl.germination_rate, sl.last_tested, sl.packet_front_path, sl.packet_back_path]); r.rowCount > 0 ? imported.seed_lots++ : skipped.seed_lots++; }
      for (const loc of (data.garden_locations || [])) { const r = await client.query('INSERT INTO garden_locations (name, type, size_description, soil_notes, sun_exposure, notes, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [loc.name, loc.type, loc.size_description, loc.soil_notes, loc.sun_exposure, loc.notes, loc.active]); r.rowCount > 0 ? imported.garden_locations++ : skipped.garden_locations++; }
      for (const p of (data.plants || [])) { const r = await client.query('INSERT INTO plants (designation, seed_lot_designation, season_year, season_type, selected_for_seed, notes, traits, photo_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (designation) DO NOTHING RETURNING *', [p.designation, p.seed_lot_designation, p.season_year, p.season_type, p.selected_for_seed, p.notes, p.traits, p.photo_path]); r.rowCount > 0 ? imported.plants++ : skipped.plants++; }
      for (const bp of (data.breeding_projects || [])) { const r = await client.query('INSERT INTO breeding_projects (code, name, description, target_traits, status, started_year) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING RETURNING *', [bp.code, bp.name, bp.description, bp.target_traits, bp.status, bp.started_year]); r.rowCount > 0 ? imported.breeding_projects++ : skipped.breeding_projects++; }
      for (const h of (data.harvest_log || [])) { const r = await client.query('INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [h.plant_designation, h.harvest_date, h.fruit_length_inches, h.fruit_diameter_inches, h.fruit_weight_oz, h.condition, h.processing_method, h.seed_count, h.notes]); r.rowCount > 0 ? imported.harvest_log++ : skipped.harvest_log++; }
      for (const g of (data.germination_tests || [])) { const r = await client.query('INSERT INTO germination_tests (seed_lot_designation, date_started, seeds_planted, seeds_germinated, date_germinated, days_to_germination, seeds_thinned, date_thinned, plants_remaining, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [g.seed_lot_designation, g.date_started, g.seeds_planted, g.seeds_germinated, g.date_germinated, g.days_to_germination, g.seeds_thinned, g.date_thinned, g.plants_remaining, g.notes]); r.rowCount > 0 ? imported.germination_tests++ : skipped.germination_tests++; }
      for (const a of (data.plant_amendments || [])) { const r = await client.query('INSERT INTO plant_amendments (plant_designation, amendment_date, type, product_name, amount, method, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [a.plant_designation, a.amendment_date, a.type, a.product_name, a.amount, a.method, a.notes]); r.rowCount > 0 ? imported.plant_amendments++ : skipped.plant_amendments++; }
      for (const c of (data.cross_pollinations || [])) { const r = await client.query('INSERT INTO cross_pollinations (mother_designation, father_designation, project_code, date_bagged, date_pollinated, date_unbagged, success, fruit_set, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [c.mother_designation, c.father_designation, c.project_code, c.date_bagged, c.date_pollinated, c.date_unbagged, c.success, c.fruit_set, c.notes]); r.rowCount > 0 ? imported.cross_pollinations++ : skipped.cross_pollinations++; }
      for (const o of (data.fruit_observations || [])) { const r = await client.query('INSERT INTO fruit_observations (plant_designation, observation_date, fruit_count, avg_length_inches, avg_diameter_inches, color, texture, flavor_notes, health_notes, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [o.plant_designation, o.observation_date, o.fruit_count, o.avg_length_inches, o.avg_diameter_inches, o.color, o.texture, o.flavor_notes, o.health_notes, o.notes]); r.rowCount > 0 ? imported.fruit_observations++ : skipped.fruit_observations++; }
      await client.query('COMMIT');
      res.json({ success: true, imported, skipped });
    } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: 'Server error: ' + err.message }); }
    finally { client.release(); }
  });
});

app.get('/api/backup/export', authMiddleware, async (req, res) => {
  try {
    const [species, varieties, seedLots, plants, projects, harvest, germination, amendments, crosses, observations, locations, sources] = await Promise.all([
      pool.query('SELECT * FROM species ORDER BY code'),
      pool.query('SELECT * FROM varieties ORDER BY code'),
      pool.query('SELECT * FROM seed_lots ORDER BY designation'),
      pool.query('SELECT * FROM plants ORDER BY designation'),
      pool.query('SELECT * FROM breeding_projects ORDER BY code'),
      pool.query('SELECT * FROM harvest_log ORDER BY harvest_date'),
      pool.query('SELECT * FROM germination_tests ORDER BY date_started'),
      pool.query('SELECT * FROM plant_amendments ORDER BY amendment_date'),
      pool.query('SELECT * FROM cross_pollinations ORDER BY created_at'),
      pool.query('SELECT * FROM fruit_observations ORDER BY observation_date'),
      pool.query('SELECT * FROM garden_locations ORDER BY name'),
      pool.query('SELECT * FROM seed_sources ORDER BY name'),
    ]);
    const filename = 'seedvault-backup-' + new Date().toISOString().split('T')[0] + '.json';
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'application/json');
    res.json({ app: 'SeedVault', version: '1.1.0', exported_at: new Date().toISOString(), data: {
      species: species.rows, varieties: varieties.rows, seed_lots: seedLots.rows,
      plants: plants.rows, breeding_projects: projects.rows, harvest_log: harvest.rows,
      germination_tests: germination.rows, plant_amendments: amendments.rows,
      cross_pollinations: crosses.rows, fruit_observations: observations.rows,
      garden_locations: locations.rows, seed_sources: sources.rows
    }});
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/backup/export-csv', authMiddleware, async (req, res) => {
  try {
    const [varieties, seedLots, plants, harvest] = await Promise.all([
      pool.query('SELECT v.*, s.name as species_name FROM varieties v LEFT JOIN species s ON v.species_code = s.code ORDER BY v.code'),
      pool.query('SELECT sl.*, v.name as variety_name FROM seed_lots sl LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY sl.designation'),
      pool.query('SELECT p.*, v.name as variety_name, gl.name as location_name FROM plants p LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code LEFT JOIN garden_locations gl ON p.location_id = gl.id ORDER BY p.designation'),
      pool.query('SELECT h.*, v.name as variety_name FROM harvest_log h LEFT JOIN plants p ON h.plant_designation = p.designation LEFT JOIN seed_lots sl ON p.seed_lot_designation = sl.designation LEFT JOIN varieties v ON sl.variety_code = v.code ORDER BY h.harvest_date'),
    ]);
    const toCSV = (rows, cols) => [cols.join(','), ...rows.map(r => cols.map(c => '"' + (r[c] === null || r[c] === undefined ? '' : String(r[c])).replace(/"/g, '""') + '"').join(','))].join('\n');
    const filename = 'seedvault-export-' + new Date().toISOString().split('T')[0] + '.csv';
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'text/csv');
    res.send([
      '=== VARIETIES ===\n' + toCSV(varieties.rows, ['code','name','species_name','type','source','year_acquired','description']),
      '=== SEED LOTS ===\n' + toCSV(seedLots.rows, ['designation','variety_name','generation','year_saved','quantity_estimate','quantity_weight','quantity_unit','storage_location','germination_rate','lot_number','packed_for_year','days_to_germination','days_to_harvest','spacing_inches','notes']),
      '=== PLANTS ===\n' + toCSV(plants.rows, ['designation','variety_name','seed_lot_designation','season_year','season_type','location_name','selected_for_seed','notes']),
      '=== HARVEST LOG ===\n' + toCSV(harvest.rows, ['plant_designation','variety_name','harvest_date','fruit_length_inches','fruit_diameter_inches','fruit_weight_oz','seed_count','condition','processing_method','notes']),
    ].join('\n\n'));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/backup/preview', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    res.json({ species: data.species?.length || 0, varieties: data.varieties?.length || 0, seed_lots: data.seed_lots?.length || 0, plants: data.plants?.length || 0, breeding_projects: data.breeding_projects?.length || 0, harvest_log: data.harvest_log?.length || 0, germination_tests: data.germination_tests?.length || 0, plant_amendments: data.plant_amendments?.length || 0, cross_pollinations: data.cross_pollinations?.length || 0, fruit_observations: data.fruit_observations?.length || 0, garden_locations: data.garden_locations?.length || 0, seed_sources: data.seed_sources?.length || 0, exported_at: req.body.exported_at, version: req.body.version });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/backup/import', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { data } = req.body;
    let imported = { species: 0, varieties: 0, seed_lots: 0, plants: 0, breeding_projects: 0, harvest_log: 0, germination_tests: 0, plant_amendments: 0, cross_pollinations: 0, fruit_observations: 0, garden_locations: 0, seed_sources: 0 };
    let skipped = { species: 0, varieties: 0, seed_lots: 0, plants: 0, breeding_projects: 0, harvest_log: 0, germination_tests: 0, plant_amendments: 0, cross_pollinations: 0, fruit_observations: 0, garden_locations: 0, seed_sources: 0 };
    await client.query('BEGIN');
    for (const s of (data.species || [])) { const r = await client.query('INSERT INTO species (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING *', [s.code, s.name]); r.rowCount > 0 ? imported.species++ : skipped.species++; }
    for (const v of (data.varieties || [])) { const r = await client.query('INSERT INTO varieties (code, name, species_code, type, description, source, year_acquired) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING RETURNING *', [v.code, v.name, v.species_code, v.type, v.description, v.source, v.year_acquired]); r.rowCount > 0 ? imported.varieties++ : skipped.varieties++; }
    for (const sl of (data.seed_lots || [])) { const r = await client.query('INSERT INTO seed_lots (designation, variety_code, generation, year_saved, quantity_estimate, mother_designation, father_designation, notes, storage_location, germination_rate, last_tested) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (designation) DO NOTHING RETURNING *', [sl.designation, sl.variety_code, sl.generation, sl.year_saved, sl.quantity_estimate, sl.mother_designation, sl.father_designation, sl.notes, sl.storage_location, sl.germination_rate, sl.last_tested]); r.rowCount > 0 ? imported.seed_lots++ : skipped.seed_lots++; }
    for (const loc of (data.garden_locations || [])) { const r = await client.query('INSERT INTO garden_locations (name, type, size_description, soil_notes, sun_exposure, notes, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [loc.name, loc.type, loc.size_description, loc.soil_notes, loc.sun_exposure, loc.notes, loc.active]); r.rowCount > 0 ? imported.garden_locations++ : skipped.garden_locations++; }
    for (const p of (data.plants || [])) { const r = await client.query('INSERT INTO plants (designation, seed_lot_designation, season_year, season_type, selected_for_seed, notes, traits) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (designation) DO NOTHING RETURNING *', [p.designation, p.seed_lot_designation, p.season_year, p.season_type, p.selected_for_seed, p.notes, p.traits]); r.rowCount > 0 ? imported.plants++ : skipped.plants++; }
    for (const bp of (data.breeding_projects || [])) { const r = await client.query('INSERT INTO breeding_projects (code, name, description, target_traits, status, started_year) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING RETURNING *', [bp.code, bp.name, bp.description, bp.target_traits, bp.status, bp.started_year]); r.rowCount > 0 ? imported.breeding_projects++ : skipped.breeding_projects++; }
    for (const h of (data.harvest_log || [])) { const r = await client.query('INSERT INTO harvest_log (plant_designation, harvest_date, fruit_length_inches, fruit_diameter_inches, fruit_weight_oz, condition, processing_method, seed_count, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [h.plant_designation, h.harvest_date, h.fruit_length_inches, h.fruit_diameter_inches, h.fruit_weight_oz, h.condition, h.processing_method, h.seed_count, h.notes]); r.rowCount > 0 ? imported.harvest_log++ : skipped.harvest_log++; }
    for (const g of (data.germination_tests || [])) { const r = await client.query('INSERT INTO germination_tests (seed_lot_designation, date_started, seeds_planted, seeds_germinated, date_germinated, days_to_germination, seeds_thinned, date_thinned, plants_remaining, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [g.seed_lot_designation, g.date_started, g.seeds_planted, g.seeds_germinated, g.date_germinated, g.days_to_germination, g.seeds_thinned, g.date_thinned, g.plants_remaining, g.notes]); r.rowCount > 0 ? imported.germination_tests++ : skipped.germination_tests++; }
    for (const a of (data.plant_amendments || [])) { const r = await client.query('INSERT INTO plant_amendments (plant_designation, amendment_date, type, product_name, amount, method, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [a.plant_designation, a.amendment_date, a.type, a.product_name, a.amount, a.method, a.notes]); r.rowCount > 0 ? imported.plant_amendments++ : skipped.plant_amendments++; }
    for (const c of (data.cross_pollinations || [])) { const r = await client.query('INSERT INTO cross_pollinations (mother_designation, father_designation, project_code, date_bagged, date_pollinated, date_unbagged, success, fruit_set, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [c.mother_designation, c.father_designation, c.project_code, c.date_bagged, c.date_pollinated, c.date_unbagged, c.success, c.fruit_set, c.notes]); r.rowCount > 0 ? imported.cross_pollinations++ : skipped.cross_pollinations++; }
    for (const o of (data.fruit_observations || [])) { const r = await client.query('INSERT INTO fruit_observations (plant_designation, observation_date, fruit_count, avg_length_inches, avg_diameter_inches, color, texture, flavor_notes, health_notes, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [o.plant_designation, o.observation_date, o.fruit_count, o.avg_length_inches, o.avg_diameter_inches, o.color, o.texture, o.flavor_notes, o.health_notes, o.notes]); r.rowCount > 0 ? imported.fruit_observations++ : skipped.fruit_observations++; }
    for (const ss of (data.seed_sources || [])) { const r = await client.query('INSERT INTO seed_sources (name, website, type, rating, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *', [ss.name, ss.website, ss.type, ss.rating, ss.notes]); r.rowCount > 0 ? imported.seed_sources++ : skipped.seed_sources++; }
    await client.query('COMMIT');
    res.json({ success: true, imported, skipped });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Server error' }); }
  finally { client.release(); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

initDB().then(() => {
  const certPath = '/app/certs/cert.pem';
  const keyPath = '/app/certs/key.pem';
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    https.createServer(httpsOptions, app).listen(PORT, () => console.log('SeedVault running on HTTPS port ' + PORT));
    http.createServer((req, res) => {
      res.writeHead(301, { Location: 'https://' + req.headers.host.split(':')[0] + ':' + PORT + req.url });
      res.end();
    }).listen(3001, () => console.log('HTTP redirect on port 3001'));
  } else {
    app.listen(PORT, () => console.log('SeedVault running on HTTP port ' + PORT));
  }
}).catch(err => { console.error('Failed to initialize database:', err); process.exit(1); });
