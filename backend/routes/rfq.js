const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

function genRFQNumber() {
  const d = new Date();
  return `RFQ-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.query;
    let sql = `SELECT r.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM rfq_vendors rv WHERE rv.rfq_id = r.id) as vendor_count,
      (SELECT COUNT(*) FROM quotations q WHERE q.rfq_id = r.id) as quotation_count
      FROM rfqs r LEFT JOIN users u ON r.created_by = u.id`;
    const params = [];
    if (req.user.role === 'vendor') {
      sql += ` WHERE r.id IN (SELECT rfq_id FROM rfq_vendors WHERE vendor_id = (SELECT id FROM vendors WHERE user_id = ${req.user.id}))`;
    } else if (status) {
      sql += ' WHERE r.status = ?'; params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC';
    res.json(all(db, sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, deadline, items = [], vendorIds = [] } = req.body;
    const rfqNum = genRFQNumber();
    const rfqId = run(db, 'INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [rfqNum, title, description, deadline, 'open', req.user.id]);
    for (const item of items) {
      run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)',
        [rfqId, item.product_name, item.quantity, item.unit || 'pcs', item.specifications]);
    }
    for (const vid of vendorIds) {
      run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfqId, vid, 'invited']);
    }
    run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'RFQ', rfqId, `Created RFQ: ${title}`]);
    // Notifications for vendors
    for (const vid of vendorIds) {
      const vendor = get(db, 'SELECT user_id FROM vendors WHERE id = ?', [vid]);
      if (vendor && vendor.user_id) {
        run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [vendor.user_id, 'New RFQ Invitation', `You have been invited to submit a quotation for ${title}`, 'info']);
      }
    }
    res.status(201).json({ id: rfqId, rfq_number: rfqNum });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const rfq = get(db, 'SELECT r.*, u.name as created_by_name FROM rfqs r LEFT JOIN users u ON r.created_by = u.id WHERE r.id = ?', [req.params.id]);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    rfq.items = all(db, 'SELECT * FROM rfq_items WHERE rfq_id = ?', [req.params.id]);
    rfq.vendors = all(db, `SELECT v.*, rv.status as invite_status FROM vendors v 
      JOIN rfq_vendors rv ON v.id = rv.vendor_id WHERE rv.rfq_id = ?`, [req.params.id]);
    res.json(rfq);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    run(db, 'UPDATE rfqs SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'RFQ status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    run(db, 'DELETE FROM rfqs WHERE id = ?', [req.params.id]);
    res.json({ message: 'RFQ deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
