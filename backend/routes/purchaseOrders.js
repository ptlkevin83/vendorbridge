const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

function genPONumber() {
  const d = new Date();
  return `PO-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const pos = all(db, `SELECT po.*, v.company_name as vendor_name, r.title as rfq_title, r.rfq_number,
      u.name as created_by_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN rfqs r ON po.rfq_id = r.id
      LEFT JOIN users u ON po.created_by = u.id
      ORDER BY po.created_at DESC`);
    res.json(pos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { quotation_id, delivery_address, notes } = req.body;
    const q = get(db, 'SELECT * FROM quotations WHERE id = ?', [quotation_id]);
    if (!q) return res.status(404).json({ error: 'Quotation not found' });
    const poNum = genPONumber();
    const id = run(db, 'INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, rfq_id, total_amount, status, delivery_address, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [poNum, quotation_id, q.vendor_id, q.rfq_id, q.total_amount, 'issued', delivery_address, notes, req.user.id]);
    run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'PurchaseOrder', id, `Generated Purchase Order ${poNum}`]);
    // Notify vendor
    const vendor = get(db, 'SELECT user_id, company_name FROM vendors WHERE id = ?', [q.vendor_id]);
    if (vendor && vendor.user_id) {
      run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [vendor.user_id, 'Purchase Order Issued', `A new Purchase Order ${poNum} has been issued to ${vendor.company_name}`, 'success']);
    }
    res.status(201).json({ id, po_number: poNum });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const po = get(db, `SELECT po.*, v.company_name, v.email as vendor_email, v.gst_number, v.address as vendor_address,
      r.title as rfq_title, r.rfq_number, u.name as created_by_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN rfqs r ON po.rfq_id = r.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = ?`, [req.params.id]);
    if (!po) return res.status(404).json({ error: 'PO not found' });
    po.items = all(db, `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
      FROM quotation_items qi
      JOIN rfq_items ri ON qi.rfq_item_id = ri.id
      WHERE qi.quotation_id = (SELECT quotation_id FROM purchase_orders WHERE id = ?)`, [req.params.id]);
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    run(db, 'UPDATE purchase_orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'PO status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
