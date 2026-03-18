const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database setup
const db = new Database('monster_hunter.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS hunters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL,
    weapon TEXT NOT NULL,
    playstyle TEXT,
    element TEXT,
    priority TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    weapon TEXT,
    stats TEXT,
    armor TEXT,
    preferences TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes

// Get all hunters (legacy)
app.get('/api/hunters', (req, res) => {
  try {
    const hunters = db.prepare('SELECT * FROM hunters ORDER BY created_at DESC').all();
    res.json(hunters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new hunter (legacy)
app.post('/api/hunters', (req, res) => {
  const { level, weapon, playstyle, element, priority } = req.body;
  
  if (!level || !weapon) {
    return res.status(400).json({ error: 'Level and weapon are required' });
  }
  
  try {
    const stmt = db.prepare('INSERT INTO hunters (level, weapon, playstyle, element, priority) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(level, weapon, playstyle || null, element || null, priority || null);
    res.json({ id: result.lastInsertRowid, level, weapon, playstyle, element, priority });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete hunter (legacy)
app.delete('/api/hunters/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM hunters WHERE id = ?').run(id);
    res.json({ message: 'Hunter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Favorites API

// Get all favorites
app.get('/api/favorites', (req, res) => {
  try {
    const favorites = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
    const parsed = favorites.map(fav => ({
      ...fav,
      stats: JSON.parse(fav.stats || '{}'),
      armor: JSON.parse(fav.armor || '{}'),
      preferences: JSON.parse(fav.preferences || '{}')
    }));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add favorite
app.post('/api/favorites', (req, res) => {
  const { id, name, type, weapon, stats, armor, preferences } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({ error: 'Build ID and name are required' });
  }
  
  try {
    // Check if already favorited
    const existing = db.prepare('SELECT id FROM favorites WHERE id = ?').get(id);
    if (existing) {
      return res.status(400).json({ error: 'Build already favorited' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO favorites (id, name, type, weapon, stats, armor, preferences) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, type || null, weapon || null, 
      JSON.stringify(stats || {}), 
      JSON.stringify(armor || {}), 
      JSON.stringify(preferences || {}));
    
    res.json({ id, name, message: 'Build added to favorites' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove favorite
app.delete('/api/favorites/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(decodeURIComponent(id));
    res.json({ message: 'Build removed from favorites' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
