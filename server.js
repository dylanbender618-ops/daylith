const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(session({ secret: 'daylith-secret-key-123', resave: false, saveUninitialized: false }));

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return { users: {}, events: {} };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const data = loadData();
  if (data.users[username]) return res.status(400).json({ error: 'Username already taken' });
  data.users[username] = { password };
  saveData(data);
  req.session.username = username;
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = loadData();
  if (data.users[username] && data.users[username].password === password) {
    req.session.username = username;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

function requireAuth(req, res, next) {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });
  next();
}

app.get('/api/me', (req, res) => {
  if (req.session.username) res.json({ username: req.session.username });
  else res.status(401).json({ error: 'Not logged in' });
});

app.get('/api/events', requireAuth, (req, res) => {
  const data = loadData();
  res.json(data.events[req.session.username] || {});
});

app.post('/api/events', requireAuth, (req, res) => {
  const { dateStr, text } = req.body;
  const data = loadData();
  const username = req.session.username;
  if (!data.events[username]) data.events[username] = {};
  if (!data.events[username][dateStr]) data.events[username][dateStr] = [];
  data.events[username][dateStr].push(text);
  saveData(data);
  res.json({ success: true });
});

app.delete('/api/events/:dateStr/:index', requireAuth, (req, res) => {
  const { dateStr, index } = req.params;
  const data = loadData();
  const username = req.session.username;
  if (data.events[username] && data.events[username][dateStr]) {
    data.events[username][dateStr].splice(index, 1);
    saveData(data);
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Daylith Server running on http://localhost:${PORT}`));
