const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, run, all, get } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge-secret-2024';

router.post('/login', async (req, res) => {
  try {
    const db = await getDb();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = get(db, 'SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, password, role = 'procurement_officer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = get(db, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const id = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
    const token = jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email, role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const db = await getDb();
    const user = get(db, 'SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
