require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/vendors',        require('./routes/vendors'));
app.use('/api/rfq',            require('./routes/rfq'));
app.use('/api/quotations',     require('./routes/quotations'));
app.use('/api/approvals',      require('./routes/approvals'));
app.use('/api/purchase-orders',require('./routes/purchaseOrders'));
app.use('/api/invoices',       require('./routes/invoices'));
app.use('/api/activity',       require('./routes/activity'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/ai',             require('./routes/ai'));
app.use('/api/notifications',  require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({
  status: 'VendorBridge API running',
  version: '1.0.0',
  env: process.env.NODE_ENV || 'development',
  time: new Date().toISOString(),
  ai: !!(process.env.OPENAI_API_KEY),
}));

// ─── Serve React Frontend (Production) ───────────────────────────────────────
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
console.log('Looking for frontend at:', frontendDist);
console.log('Frontend exists:', fs.existsSync(frontendDist));

if (fs.existsSync(frontendDist)) {
  // Serve static assets (JS, CSS, images)
  app.use(express.static(frontendDist, { index: false }));

  // ALL other routes → serve React index.html (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Fallback if no build found
  app.get('/', (req, res) => res.send(`
    <h1>VendorBridge API is running ✅</h1>
    <p>Frontend not built yet. API available at <a href="/api/health">/api/health</a></p>
  `));
}

// ─── Start Server ─────────────────────────────────────────────────────────────
async function main() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VendorBridge running on port ${PORT}`);
    console.log(`🤖 AI: ${process.env.OPENAI_API_KEY ? '✅ Enabled' : '❌ No key'}`);
    console.log(`📁 Frontend dist: ${fs.existsSync(frontendDist) ? '✅ Found' : '❌ Not found'}`);
    console.log(`\n📋 admin@vendorbridge.com / admin123\n`);
  });
}

main().catch(err => { console.error('Startup failed:', err); process.exit(1); });
