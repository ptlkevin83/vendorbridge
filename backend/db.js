const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'vendorbridge.db');
let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Run a write query and save
function run(db, sql, params = []) {
  db.run(sql, params);
  saveDb();
  // Get last insert rowid
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0] ? result[0].values[0][0] : null;
}

// Run a select query
function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(db, sql, params = []) {
  const rows = all(db, sql, params);
  return rows[0] || null;
}

module.exports = { getDb, saveDb, run, all, get };
