const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

// GET all vendors with search/filter
router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { search, category, status } = req.query;
    let sql = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? OR city LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const vendors = all(db, sql, params);
    res.json(vendors);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single vendor
router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const vendor = get(db, 'SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create vendor
router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const {
      company_name, category = 'Other', gst_number, contact_name,
      email, phone, address, city, state, status = 'active',
      rating = 0, notes
    } = req.body;
    if (!company_name) return res.status(400).json({ error: 'Company name is required' });

    const id = run(db,
      `INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, category, gst_number || null, contact_name || null, email || null,
       phone || null, address || null, city || null, state || null, status, rating, notes || null]
    );
    run(db,
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'Vendor', id, `Registered vendor: ${company_name}`]
    );
    // Create notification
    run(db,
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [req.user.id, 'Vendor Added', `New vendor "${company_name}" has been registered`, 'success']
    );
    const vendor = get(db, 'SELECT * FROM vendors WHERE id = ?', [id]);
    res.status(201).json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update vendor
router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const existing = get(db, 'SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });

    const {
      company_name = existing.company_name,
      category = existing.category,
      gst_number = existing.gst_number,
      contact_name = existing.contact_name,
      email = existing.email,
      phone = existing.phone,
      address = existing.address,
      city = existing.city,
      state = existing.state,
      status = existing.status,
      rating = existing.rating,
      notes = existing.notes
    } = req.body;

    run(db,
      `UPDATE vendors SET company_name=?, category=?, gst_number=?, contact_name=?, email=?,
       phone=?, address=?, city=?, state=?, status=?, rating=?, notes=? WHERE id=?`,
      [company_name, category, gst_number, contact_name, email, phone,
       address, city, state, status, rating, notes, req.params.id]
    );
    run(db,
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'Vendor', req.params.id, `Updated vendor: ${company_name}`]
    );
    const vendor = get(db, 'SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE vendor
router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const vendor = get(db, 'SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    run(db, 'DELETE FROM vendors WHERE id = ?', [req.params.id]);
    run(db,
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'Vendor', req.params.id, `Deleted vendor: ${vendor.company_name}`]
    );
    res.json({ message: 'Vendor deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
