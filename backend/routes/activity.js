const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { limit = 50 } = req.query;
    const logs = all(db, `SELECT al.*, u.name as user_name, u.role as user_role
      FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT ?`, [parseInt(limit)]);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
