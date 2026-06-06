const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { getDb, run, all, get } = require('../db');

function genInvoiceNumber() {
  const d = new Date();
  return `INV-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const invs = all(db, `SELECT i.*, v.company_name as vendor_name, po.po_number
      FROM invoices i
      JOIN purchase_orders po ON i.po_id = po.id
      JOIN vendors v ON i.vendor_id = v.id
      ORDER BY i.created_at DESC`);
    res.json(invs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { po_id, tax_rate = 18, due_date, notes } = req.body;
    const po = get(db, 'SELECT * FROM purchase_orders WHERE id = ?', [po_id]);
    if (!po) return res.status(404).json({ error: 'PO not found' });
    const existing = get(db, 'SELECT id FROM invoices WHERE po_id = ?', [po_id]);
    if (existing) return res.status(409).json({ error: 'Invoice already exists for this PO', id: existing.id });
    const subtotal = po.total_amount;
    const taxAmount = (subtotal * tax_rate) / 100;
    const total = subtotal + taxAmount;
    const invNum = genInvoiceNumber();
    const id = run(db, 'INSERT INTO invoices (invoice_number, po_id, vendor_id, subtotal, tax_rate, tax_amount, total, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [invNum, po_id, po.vendor_id, subtotal, tax_rate, taxAmount, total, 'draft', due_date, notes]);
    run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'Invoice', id, `Generated Invoice ${invNum}`]);
    res.status(201).json({ id, invoice_number: invNum });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const inv = get(db, `SELECT i.*, v.company_name, v.email as vendor_email, v.gst_number,
      v.address as vendor_address, v.city, v.state,
      po.po_number, r.title as rfq_title, r.rfq_number
      FROM invoices i
      JOIN purchase_orders po ON i.po_id = po.id
      JOIN rfqs r ON po.rfq_id = r.id
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.id = ?`, [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    inv.items = all(db, `SELECT qi.*, ri.product_name, ri.quantity, ri.unit
      FROM quotation_items qi
      JOIN rfq_items ri ON qi.rfq_item_id = ri.id
      WHERE qi.quotation_id = (SELECT quotation_id FROM purchase_orders WHERE id = ?)`, [inv.po_id]);
    res.json(inv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    const update = status === 'paid' ? 'UPDATE invoices SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?' : 'UPDATE invoices SET status = ? WHERE id = ?';
    run(db, update, [status, req.params.id]);
    res.json({ message: 'Invoice status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { recipient_email, recipient_name } = req.body;
    const inv = get(db, `SELECT i.*, v.company_name, po.po_number FROM invoices i
      JOIN purchase_orders po ON i.po_id = po.id
      JOIN vendors v ON i.vendor_id = v.id WHERE i.id = ?`, [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">VendorBridge</h1>
          <p style="color: rgba(255,255,255,0.8);">Procurement & Vendor Management ERP</p>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">Invoice ${inv.invoice_number}</h2>
          <p>Dear ${recipient_name || inv.company_name},</p>
          <p>Please find the invoice details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #6366f1; color: white;">
              <th style="padding: 10px; text-align: left;">Invoice Number</th>
              <th style="padding: 10px; text-align: left;">PO Number</th>
              <th style="padding: 10px; text-align: right;">Total Amount</th>
            </tr>
            <tr style="background: white;">
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${inv.invoice_number}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${inv.po_number}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${inv.total?.toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #6b7280;">Due Date: ${inv.due_date || 'N/A'}</p>
          <p>Please process payment at your earliest convenience.</p>
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from VendorBridge ERP.</p>
        </div>
      </div>`;

    await transporter.sendMail({
      from: `"VendorBridge ERP" <${process.env.EMAIL_USER}>`,
      to: recipient_email,
      subject: `Invoice ${inv.invoice_number} - VendorBridge`,
      html: emailHtml
    });
    run(db, 'UPDATE invoices SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?', ['sent', req.params.id]);
    res.json({ message: 'Invoice sent via email' });
  } catch (err) {
    res.status(500).json({ error: 'Email failed: ' + err.message + '. Check your EMAIL_USER and EMAIL_PASS in .env' });
  }
});

module.exports = router;
