const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { rfq_id, vendor_id } = req.query;
    let sql = `SELECT q.*, v.company_name as vendor_name, v.rating as vendor_rating,
      r.title as rfq_title, r.rfq_number
      FROM quotations q
      JOIN vendors v ON q.vendor_id = v.id
      JOIN rfqs r ON q.rfq_id = r.id WHERE 1=1`;
    const params = [];
    if (rfq_id) { sql += ' AND q.rfq_id = ?'; params.push(rfq_id); }
    if (vendor_id) { sql += ' AND q.vendor_id = ?'; params.push(vendor_id); }
    sql += ' ORDER BY q.submitted_at DESC';
    const quotations = all(db, sql, params);
    res.json(quotations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { rfq_id, vendor_id, total_amount, delivery_days, validity_days, notes, items = [] } = req.body;
    const existing = get(db, 'SELECT id FROM quotations WHERE rfq_id = ? AND vendor_id = ?', [rfq_id, vendor_id]);
    let qId;
    if (existing) {
      run(db, 'UPDATE quotations SET total_amount=?, delivery_days=?, validity_days=?, notes=?, status=? WHERE id=?',
        [total_amount, delivery_days, validity_days, notes, 'submitted', existing.id]);
      run(db, 'DELETE FROM quotation_items WHERE quotation_id = ?', [existing.id]);
      qId = existing.id;
    } else {
      qId = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, validity_days, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [rfq_id, vendor_id, total_amount, delivery_days, validity_days || 30, notes, 'submitted']);
    }
    for (const item of items) {
      run(db, 'INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES (?, ?, ?, ?)',
        [qId, item.rfq_item_id, item.unit_price, item.total_price]);
    }
    run(db, 'UPDATE rfq_vendors SET status = ? WHERE rfq_id = ? AND vendor_id = ?', ['quoted', rfq_id, vendor_id]);
    run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'SUBMIT', 'Quotation', qId, `Submitted quotation for RFQ ${rfq_id}`]);
    res.status(201).json({ id: qId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/compare/:rfq_id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const quotations = all(db, `SELECT q.*, v.company_name, v.rating, v.contact_name, v.email
      FROM quotations q JOIN vendors v ON q.vendor_id = v.id
      WHERE q.rfq_id = ? ORDER BY q.total_amount ASC`, [req.params.rfq_id]);
    for (const q of quotations) {
      q.items = all(db, `SELECT qi.*, ri.product_name, ri.quantity, ri.unit
        FROM quotation_items qi JOIN rfq_items ri ON qi.rfq_item_id = ri.id
        WHERE qi.quotation_id = ?`, [q.id]);
    }
    res.json(quotations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const q = get(db, `SELECT q.*, v.company_name, v.contact_name, v.email, v.rating
      FROM quotations q JOIN vendors v ON q.vendor_id = v.id WHERE q.id = ?`, [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    q.items = all(db, `SELECT qi.*, ri.product_name, ri.quantity, ri.unit
      FROM quotation_items qi JOIN rfq_items ri ON qi.rfq_item_id = ri.id WHERE qi.quotation_id = ?`, [q.id]);
    res.json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
