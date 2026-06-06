const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, run, all, get } = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.query;
    let sql = `SELECT a.*, u.name as approver_name, r.title as rfq_title, r.rfq_number,
      q.total_amount, v.company_name as vendor_name
      FROM approvals a
      LEFT JOIN users u ON a.approver_id = u.id
      LEFT JOIN rfqs r ON a.rfq_id = r.id
      LEFT JOIN quotations q ON a.quotation_id = q.id
      LEFT JOIN vendors v ON q.vendor_id = v.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (req.user.role === 'manager') {
      sql += (status ? ' AND' : ' AND') + ` (a.approver_id = ? OR a.approver_id IS NULL)`;
      params.push(req.user.id);
    }
    sql += ' ORDER BY a.created_at DESC';
    res.json(all(db, sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { rfq_id, quotation_id } = req.body;
    const existing = get(db, 'SELECT id FROM approvals WHERE rfq_id = ? AND quotation_id = ?', [rfq_id, quotation_id]);
    if (existing) return res.status(409).json({ error: 'Approval already exists' });
    const id = run(db, 'INSERT INTO approvals (rfq_id, quotation_id, approver_id, status) VALUES (?, ?, ?, ?)',
      [rfq_id, quotation_id, req.user.id, 'pending']);
    run(db, 'UPDATE quotations SET status = ? WHERE id = ?', ['under_review', quotation_id]);
    // Notify managers
    const managers = all(db, "SELECT id FROM users WHERE role = 'manager'");
    for (const m of managers) {
      const rfq = get(db, 'SELECT title FROM rfqs WHERE id = ?', [rfq_id]);
      run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [m.id, 'Approval Required', `Quotation for "${rfq?.title}" requires your approval`, 'warning']);
    }
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status, remarks } = req.body;
    const approval = get(db, 'SELECT * FROM approvals WHERE id = ?', [req.params.id]);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    run(db, 'UPDATE approvals SET status = ?, remarks = ?, approver_id = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, remarks, req.user.id, req.params.id]);
    if (status === 'approved') {
      run(db, 'UPDATE quotations SET status = ? WHERE id = ?', ['selected', approval.quotation_id]);
      run(db, 'UPDATE rfqs SET status = ? WHERE id = ?', ['awarded', approval.rfq_id]);
      const q = get(db, 'SELECT * FROM quotations WHERE id = ?', [approval.quotation_id]);
      const rfq = get(db, 'SELECT title FROM rfqs WHERE id = ?', [approval.rfq_id]);
      const officers = all(db, "SELECT id FROM users WHERE role IN ('procurement_officer', 'admin')");
      for (const o of officers) {
        run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [o.id, 'Quotation Approved!', `"${rfq?.title}" has been approved. Generate PO now.`, 'success']);
      }
    } else if (status === 'rejected') {
      run(db, 'UPDATE quotations SET status = ? WHERE id = ?', ['rejected', approval.quotation_id]);
    }
    run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, status.toUpperCase(), 'Approval', req.params.id, `${status === 'approved' ? 'Approved' : 'Rejected'} quotation with remarks: ${remarks || 'None'}`]);
    res.json({ message: `Approval ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
