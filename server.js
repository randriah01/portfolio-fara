const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// DB path: use Render's persistent disk if mounted (DB_PATH env var),
// otherwise fall back to the local file next to this script.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'portfolio.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDB();
  }
});

// Create projects table if it doesn't exist
function initializeDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      github TEXT,
      tech TEXT,
      category TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Projects table ready');
    }
  });
}

// GET all projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows || []);
    }
  });
});

// POST - Add new project
app.post('/api/projects', (req, res) => {
  const { title, desc, url, github, tech, cat } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    `INSERT INTO projects (title, description, url, github, tech, category) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, desc || '', url || '', github || '', tech || '', cat || 'fullstack'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, title, desc, url, github, tech, cat });
      }
    }
  );
});

// PUT - Update project
app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { title, desc, url, github, tech, cat } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    `UPDATE projects SET title=?, description=?, url=?, github=?, tech=?, category=?, updatedAt=CURRENT_TIMESTAMP 
     WHERE id=?`,
    [title, desc || '', url || '', github || '', tech || '', cat || 'fullstack', id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Project not found' });
      } else {
        res.json({ id, title, desc, url, github, tech, cat });
      }
    }
  );
});

// DELETE - Remove project
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM projects WHERE id=?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Project not found' });
    } else {
      res.json({ success: true });
    }
  });
});

// Serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'portfolio-fara.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Portfolio server running on port ${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err.message);
    console.log('Database closed');
    process.exit(0);
  });
});
