const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, all, get } = require('../db');
const OpenAI = require('openai');

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (!process.env.OPENAI_API_KEY) {
      return res.json({ reply: "⚠️ AI Chatbot is not configured. Please add your OPENAI_API_KEY to the .env file and restart the server. Get your key at platform.openai.com" });
    }

    const db = await getDb();

    // Gather context from DB
    const vendors = all(db, 'SELECT company_name, category, status, rating FROM vendors LIMIT 20');
    const rfqs = all(db, "SELECT rfq_number, title, status, deadline FROM rfqs ORDER BY created_at DESC LIMIT 10");
    const pos = all(db, "SELECT po_number, total_amount, status FROM purchase_orders ORDER BY created_at DESC LIMIT 10");
    const invoices = all(db, "SELECT invoice_number, total, status FROM invoices ORDER BY created_at DESC LIMIT 10");
    const approvals = all(db, "SELECT status, COUNT(*) as count FROM approvals GROUP BY status");
    const totalSpend = get(db, "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders");
    const pendingApprovals = get(db, "SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'");

    const systemPrompt = `You are VendorBridge AI Assistant, an intelligent procurement ERP assistant. You help procurement teams manage vendors, RFQs, quotations, approvals, purchase orders, and invoices.

CURRENT SYSTEM DATA:
- Active Vendors: ${vendors.length} vendors (${vendors.map(v => v.company_name).join(', ')})
- Recent RFQs: ${rfqs.map(r => `${r.rfq_number} - ${r.title} (${r.status})`).join('; ')}
- Recent POs: ${pos.map(p => `${p.po_number}: ₹${p.total_amount} (${p.status})`).join('; ')}
- Recent Invoices: ${invoices.map(i => `${i.invoice_number}: ₹${i.total} (${i.status})`).join('; ')}
- Approval Status: ${approvals.map(a => `${a.status}: ${a.count}`).join(', ')}
- Total Procurement Spend: ₹${totalSpend?.total || 0}
- Pending Approvals: ${pendingApprovals?.count || 0}

You can:
1. Answer questions about procurement data
2. Explain how to use VendorBridge features
3. Generate text reports and summaries
4. Provide procurement best practices
5. Help analyze vendor performance
6. Guide through procurement workflows

Be concise, professional, and helpful. Use emojis sparingly for clarity. Format responses with markdown when appropriate.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    if (err.status === 401) return res.status(200).json({ reply: '❌ Invalid OpenAI API key. Please check your OPENAI_API_KEY in the .env file.' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
