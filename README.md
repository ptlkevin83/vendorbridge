# VendorBridge ERP — Setup & Usage Guide

## 🚀 Quick Start

### Option 1: One-Click Start (Windows)
Double-click `START.bat` in the vendorbridge folder

### Option 2: Manual Start

**Terminal 1 — Backend:**
```
cd backend
node server.js
```

**Terminal 2 — Frontend:**
```
cd frontend
npm run dev
```

Then open: http://localhost:5173 (or whatever port Vite shows)

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendorbridge.com | admin123 |
| Procurement Officer | officer@vendorbridge.com | officer123 |
| Manager/Approver | manager@vendorbridge.com | manager123 |
| Vendor | vendor1@vendorbridge.com | vendor123 |

---

## 🤖 AI Chatbot Setup (Required for chatbot)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Open `backend/.env`
4. Replace `your_openai_api_key_here` with your key
5. Restart the backend

---

## 📧 Email Invoice Setup (Optional)

1. Enable 2FA on your Gmail account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Open `backend/.env`
5. Set `EMAIL_USER=your@gmail.com` and `EMAIL_PASS=yourapppassword`
6. Restart the backend

---

## 📁 Project Structure

```
vendorbridge/
├── START.bat              ← One-click start
├── backend/
│   ├── .env               ← Add your API keys here
│   ├── server.js          ← Express API server
│   ├── database.js        ← SQLite schema + seed data
│   ├── db.js              ← Database helper (sql.js)
│   ├── vendorbridge.db    ← Auto-created SQLite database
│   ├── middleware/auth.js ← JWT authentication
│   └── routes/           ← All API endpoints
└── frontend/
    └── src/
        ├── pages/         ← All 11 screen pages
        ├── components/    ← Sidebar, Header, ChatBot
        └── context/       ← Auth state management
```

---

## ✅ All Features

- ✅ Login/Signup with role-based access (4 roles)
- ✅ Dashboard with 6 KPI cards + 3 interactive charts
- ✅ Vendor Management (full CRUD, categories, GST, ratings)
- ✅ RFQ Creation (3-step wizard, multi-vendor assignment)
- ✅ Quotation Submission (per-item pricing)
- ✅ Quotation Comparison (side-by-side, best-value highlighting)
- ✅ Approval Workflow (approve/reject with remarks)
- ✅ Purchase Order Generation (auto PO numbers)
- ✅ Invoice Generation (PDF download, print, email)
- ✅ Activity Logs & Notifications (real-time bell)
- ✅ Reports & Analytics (charts + CSV export)
- ✅ AI Chatbot (OpenAI GPT-4o, procurement-aware)
- ✅ SQLite Database with full seed data
- ✅ JWT Authentication + Protected Routes
