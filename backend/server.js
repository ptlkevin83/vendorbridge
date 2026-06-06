require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS - open for worldwide access
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/rfq', require('./routes/rfq'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => res.json({
  status: '✅ VendorBridge API running',
  version: '1.0.0',
  env: process.env.NODE_ENV || 'development',
  time: new Date().toISOString(),
  features: {
    ai: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
    email: !!(process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_gmail@gmail.com'),
  }
}));

// Serve built frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // All non-API routes serve the SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
  console.log(`📁 Serving frontend from: ${frontendDist}`);
}

async function main() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VendorBridge ${isProduction ? '(PRODUCTION)' : '(DEV)'} running on port ${PORT}`);
    console.log(`🤖 AI Chatbot: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? '✅ Enabled' : '❌ Disabled - add OPENAI_API_KEY'}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_gmail@gmail.com' ? '✅ Configured' : '❌ Not set'}`);
    if (isProduction) console.log(`🌍 Worldwide accessible at: https://your-app.onrender.com`);
    console.log(`\n📋 Demo accounts: admin/admin123 | officer/officer123 | manager/manager123 | vendor/vendor123\n`);
  });
}

main().catch(err => { console.error('Startup failed:', err); process.exit(1); });
