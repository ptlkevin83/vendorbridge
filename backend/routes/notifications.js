const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const notifs = all(db, 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(notifs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const db = await getDb();
    const r = get(db, 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ count: r?.count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    const db = await getDb();
    run(db, 'UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const db = await getDb();
    run(db, 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
