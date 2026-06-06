const { getDb, run, all, get } = require('./db');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const db = await getDb();

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'procurement_officer',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    category TEXT NOT NULL,
    gst_number TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    status TEXT DEFAULT 'active',
    rating REAL DEFAULT 0,
    notes TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_number TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    deadline DATETIME,
    status TEXT DEFAULT 'draft',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rfq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'pcs',
    specifications TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rfq_vendors (
    rfq_id INTEGER,
    vendor_id INTEGER,
    status TEXT DEFAULT 'invited',
    PRIMARY KEY (rfq_id, vendor_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    vendor_id INTEGER,
    total_amount REAL,
    delivery_days INTEGER,
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    status TEXT DEFAULT 'submitted',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    rfq_item_id INTEGER,
    unit_price REAL,
    total_price REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    quotation_id INTEGER,
    approver_id INTEGER,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE,
    quotation_id INTEGER,
    vendor_id INTEGER,
    rfq_id INTEGER,
    total_amount REAL,
    status TEXT DEFAULT 'issued',
    delivery_address TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    po_id INTEGER,
    vendor_id INTEGER,
    subtotal REAL,
    tax_rate REAL DEFAULT 18,
    tax_amount REAL,
    total REAL,
    status TEXT DEFAULT 'draft',
    due_date DATETIME,
    paid_at DATETIME,
    sent_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const { saveDb } = require('./db');
  saveDb();

  await seedDemoData(db);
  console.log('✅ Database initialized');
}

async function seedDemoData(db) {
  const { run, get, all, saveDb } = require('./db');
  const userCount = get(db, 'SELECT COUNT(*) as c FROM users');
  if (userCount && userCount.c > 0) return;

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  const adminId = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin User', 'admin@vendorbridge.com', hash('admin123'), 'admin']);
  const officerId = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Sarah Chen', 'officer@vendorbridge.com', hash('officer123'), 'procurement_officer']);
  const managerId = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['James Wilson', 'manager@vendorbridge.com', hash('manager123'), 'manager']);
  const v1UserId = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['TechSupply Co', 'vendor1@vendorbridge.com', hash('vendor123'), 'vendor']);
  const v2UserId = run(db, 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Global Parts Ltd', 'vendor2@vendorbridge.com', hash('vendor123'), 'vendor']);

  const v1Id = run(db, 'INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['TechSupply Co', 'Electronics', 'GST1234567890', 'John Smith', 'vendor1@vendorbridge.com', '+91-9876543210', '123 Tech Park', 'Mumbai', 'Maharashtra', 'active', 4.5, v1UserId]);
  const v2Id = run(db, 'INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['Global Parts Ltd', 'Manufacturing', 'GST0987654321', 'Emma Davis', 'vendor2@vendorbridge.com', '+91-9876543211', '456 Industrial Zone', 'Delhi', 'Delhi', 'active', 4.2, v2UserId]);
  const v3Id = run(db, 'INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['Office Pro Supplies', 'Office Supplies', 'GST1122334455', 'Mike Johnson', 'vendor3@example.com', '+91-9876543212', '789 Business Hub', 'Bangalore', 'Karnataka', 'active', 3.8]);
  const v4Id = run(db, 'INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['BuildRight Construction', 'Construction', 'GST5544332211', 'Lisa Brown', 'vendor4@example.com', '+91-9876543213', '321 Builder Ave', 'Chennai', 'Tamil Nadu', 'active', 4.7]);
  const v5Id = run(db, 'INSERT INTO vendors (company_name, category, gst_number, contact_name, email, phone, address, city, state, status, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SafeGuard Security', 'Security Services', 'GST9988776655', 'Tom Wilson', 'vendor5@example.com', '+91-9876543214', '654 Secure Lane', 'Pune', 'Maharashtra', 'inactive', 3.5]);

  const rfq1Id = run(db, 'INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', ['RFQ-2024-001', 'Laptop Procurement Q1 2024', 'Procurement of 50 laptops for IT department upgrade', '2024-02-28', 'open', officerId]);
  const rfq2Id = run(db, 'INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', ['RFQ-2024-002', 'Office Furniture Renewal', 'Office chairs and desks for new floor expansion', '2024-03-15', 'closed', officerId]);
  const rfq3Id = run(db, 'INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', ['RFQ-2024-003', 'Security System Upgrade', 'CCTV and access control system upgrade', '2024-04-01', 'awarded', officerId]);
  const rfq4Id = run(db, 'INSERT INTO rfqs (rfq_number, title, description, deadline, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', ['RFQ-2024-004', 'Printer Consumables', 'Monthly printer ink and toner cartridges', '2024-04-20', 'draft', officerId]);

  const item1Id = run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)', [rfq1Id, 'Dell Laptop 15"', 30, 'pcs', 'i7, 16GB RAM, 512GB SSD']);
  const item2Id = run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)', [rfq1Id, 'MacBook Pro 14"', 20, 'pcs', 'M3 chip, 16GB, 1TB SSD']);
  const item3Id = run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)', [rfq2Id, 'Ergonomic Office Chair', 50, 'pcs', 'Lumbar support, adjustable armrests']);
  const item4Id = run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)', [rfq2Id, 'Standing Desk', 25, 'pcs', 'Electric height adjustable, 1800x800mm']);
  const item5Id = run(db, 'INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications) VALUES (?, ?, ?, ?, ?)', [rfq3Id, 'IP Camera 4K', 20, 'pcs', '4K resolution, night vision, PoE']);

  run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfq1Id, v1Id, 'quoted']);
  run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfq1Id, v2Id, 'quoted']);
  run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfq2Id, v3Id, 'quoted']);
  run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfq3Id, v4Id, 'selected']);
  run(db, 'INSERT OR IGNORE INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (?, ?, ?)', [rfq3Id, v5Id, 'quoted']);

  const q1Id = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [rfq1Id, v1Id, 125000, 14, 'Includes 1 year warranty and tech support', 'submitted']);
  const q2Id = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [rfq1Id, v2Id, 118500, 21, 'Best price guarantee, 2 year warranty', 'submitted']);
  const q3Id = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [rfq2Id, v3Id, 45000, 7, 'Assembly included, same-week delivery', 'submitted']);
  const q4Id = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [rfq3Id, v4Id, 78000, 10, 'Installation and 2-year maintenance included', 'selected']);
  const q5Id = run(db, 'INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [rfq3Id, v5Id, 85000, 14, 'Standard installation package', 'submitted']);

  run(db, 'INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES (?, ?, ?, ?)', [q1Id, item1Id, 1500, 45000]);
  run(db, 'INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES (?, ?, ?, ?)', [q1Id, item2Id, 4000, 80000]);
  run(db, 'INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES (?, ?, ?, ?)', [q2Id, item1Id, 1350, 40500]);
  run(db, 'INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES (?, ?, ?, ?)', [q2Id, item2Id, 3900, 78000]);

  run(db, 'INSERT INTO approvals (rfq_id, quotation_id, approver_id, status, remarks) VALUES (?, ?, ?, ?, ?)', [rfq3Id, q4Id, managerId, 'approved', 'Best value for money, proceed with PO generation']);
  run(db, 'INSERT INTO approvals (rfq_id, quotation_id, approver_id, status, remarks) VALUES (?, ?, ?, ?, ?)', [rfq2Id, q3Id, managerId, 'approved', 'Approved for Q1 office expansion']);
  run(db, 'INSERT INTO approvals (rfq_id, quotation_id, approver_id, status) VALUES (?, ?, ?, ?)', [rfq1Id, q2Id, managerId, 'pending']);

  const po1Id = run(db, 'INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, rfq_id, total_amount, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', ['PO-2024-001', q4Id, v4Id, rfq3Id, 78000, 'issued', officerId]);
  const po2Id = run(db, 'INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, rfq_id, total_amount, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', ['PO-2024-002', q3Id, v3Id, rfq2Id, 45000, 'completed', officerId]);

  run(db, 'INSERT INTO invoices (invoice_number, po_id, vendor_id, subtotal, tax_rate, tax_amount, total, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['INV-2024-001', po1Id, v4Id, 78000, 18, 14040, 92040, 'sent', '2024-03-30']);
  run(db, 'INSERT INTO invoices (invoice_number, po_id, vendor_id, subtotal, tax_rate, tax_amount, total, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['INV-2024-002', po2Id, v3Id, 45000, 18, 8100, 53100, 'paid', '2024-02-28']);

  run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [officerId, 'CREATE', 'RFQ', rfq1Id, 'Created RFQ: Laptop Procurement Q1 2024']);
  run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [officerId, 'CREATE', 'RFQ', rfq2Id, 'Created RFQ: Office Furniture Renewal']);
  run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [managerId, 'APPROVE', 'Approval', 1, 'Approved quotation for Security System Upgrade']);
  run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [officerId, 'CREATE', 'PurchaseOrder', po1Id, 'Generated PO-2024-001 for BuildRight Construction']);
  run(db, 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [officerId, 'CREATE', 'Invoice', 1, 'Generated Invoice INV-2024-001']);

  run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [officerId, 'Approval Needed', 'RFQ-2024-001 quotation comparison complete, ready for approval', 'warning']);
  run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [managerId, 'Pending Approval', 'Laptop Procurement quotation awaiting your approval', 'warning']);
  run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [officerId, 'Invoice Paid', 'Invoice INV-2024-002 has been marked as paid', 'success']);
  run(db, 'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [adminId, 'New Vendor', 'New vendor SafeGuard Security has been registered', 'info']);

  saveDb();
  console.log('✅ Demo data seeded');
}

module.exports = { initDatabase };
