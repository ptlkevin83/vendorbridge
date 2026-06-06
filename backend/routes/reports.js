const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, all, get } = require('../db');

router.get('/dashboard', auth, async (req, res) => {
  try {
    const db = await getDb();
    const pendingApprovals = get(db, "SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'");
    const activeRFQs = get(db, "SELECT COUNT(*) as count FROM rfqs WHERE status IN ('open', 'draft')");
    const totalPOs = get(db, 'SELECT COUNT(*) as count FROM purchase_orders');
    const totalVendors = get(db, 'SELECT COUNT(*) as count FROM vendors');
    const totalSpend = get(db, "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE status != 'cancelled'");
    const unpaidInvoices = get(db, "SELECT COUNT(*) as count FROM invoices WHERE status NOT IN ('paid', 'cancelled')");

    // Monthly trend (last 6 months)
    const monthlyTrend = all(db, `SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as po_count,
      COALESCE(SUM(total_amount), 0) as spend
      FROM purchase_orders
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC`);

    // Top vendors by spend
    const topVendors = all(db, `SELECT v.company_name, COALESCE(SUM(po.total_amount), 0) as total_spend, COUNT(po.id) as po_count
      FROM vendors v LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      GROUP BY v.id ORDER BY total_spend DESC LIMIT 5`);

    // RFQ status breakdown
    const rfqStatus = all(db, `SELECT status, COUNT(*) as count FROM rfqs GROUP BY status`);

    // Category spend
    const categorySpend = all(db, `SELECT v.category, COALESCE(SUM(po.total_amount), 0) as spend
      FROM vendors v JOIN purchase_orders po ON v.id = po.vendor_id
      GROUP BY v.category ORDER BY spend DESC LIMIT 6`);

    res.json({
      kpis: {
        pendingApprovals: pendingApprovals?.count || 0,
        activeRFQs: activeRFQs?.count || 0,
        totalPOs: totalPOs?.count || 0,
        totalVendors: totalVendors?.count || 0,
        totalSpend: totalSpend?.total || 0,
        unpaidInvoices: unpaidInvoices?.count || 0
      },
      monthlyTrend,
      topVendors,
      rfqStatus,
      categorySpend
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/vendor-performance', auth, async (req, res) => {
  try {
    const db = await getDb();
    const data = all(db, `SELECT v.company_name, v.category, v.rating,
      COUNT(DISTINCT q.id) as quotations_submitted,
      COUNT(DISTINCT po.id) as pos_received,
      COALESCE(SUM(po.total_amount), 0) as total_spend
      FROM vendors v
      LEFT JOIN quotations q ON v.id = q.vendor_id
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      GROUP BY v.id ORDER BY total_spend DESC`);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/procurement-stats', auth, async (req, res) => {
  try {
    const db = await getDb();
    const rfqStats = all(db, 'SELECT status, COUNT(*) as count FROM rfqs GROUP BY status');
    const invoiceStats = all(db, 'SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as amount FROM invoices GROUP BY status');
    const quotationStats = all(db, 'SELECT status, COUNT(*) as count FROM quotations GROUP BY status');
    res.json({ rfqStats, invoiceStats, quotationStats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
