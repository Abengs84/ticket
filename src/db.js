const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'tickets.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const TICKET_JOIN = `
  LEFT JOIN devices d ON d.id = t.device_id
  LEFT JOIN brands b ON b.id = d.brand_id
`;

const TICKET_SELECT = `
  SELECT t.id, t.public_id, t.title, t.description, t.reporter_type, t.reporter_name,
         t.category, t.priority, t.status, t.device_id, t.resolution, t.created_at, t.updated_at,
         d.device_type AS dev_type, d.label AS dev_label, b.id AS dev_brand_id, b.name AS dev_brand_name,
         (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) AS attachment_count
  FROM tickets t
  ${TICKET_JOIN}
`;

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_type TEXT NOT NULL CHECK(device_type IN ('printer', 'computer', 'peripheral', 'other')),
      brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_devices_brand ON devices(brand_id);
    CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      reporter_type TEXT NOT NULL CHECK(reporter_type IN ('pupil', 'staff', 'unknown', 'na')),
      reporter_name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL CHECK(category IN (
        'abitti', 'hardware', 'software', 'network', 'account', 'other'
      )),
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'na')),
      status TEXT NOT NULL CHECK(status IN ('open', 'closed', 'unresolved')),
      device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
      resolution TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_reporter_name ON tickets(reporter_name);

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS ticket_tags (
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (ticket_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON attachments(ticket_id);
  `);
}

function migrateTicketsIfNeeded() {
  const cols = db.prepare('PRAGMA table_info(tickets)').all();
  const colNames = cols.map((c) => c.name);
  if (colNames.includes('device_id')) {
    return;
  }

  db.pragma('foreign_keys = OFF');
  try {
    db.exec(`
      CREATE TABLE tickets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        reporter_type TEXT NOT NULL CHECK(reporter_type IN ('pupil', 'staff', 'unknown', 'na')),
        reporter_name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL CHECK(category IN (
          'abitti', 'hardware', 'software', 'network', 'account', 'other'
        )),
        priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'na')),
        status TEXT NOT NULL CHECK(status IN ('open', 'closed', 'unresolved')),
        device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
        resolution TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO tickets_new (
        id, public_id, title, description, reporter_type, reporter_name,
        category, priority, status, device_id, created_at, updated_at, resolution
      )
      SELECT
        id, public_id, title, description, reporter_type, reporter_name,
        category, priority, status, NULL, created_at, updated_at, ''
      FROM tickets;
      DROP TABLE tickets;
      ALTER TABLE tickets_new RENAME TO tickets;
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
      CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_reporter_name ON tickets(reporter_name);
      CREATE INDEX IF NOT EXISTS idx_tickets_device ON tickets(device_id);
    `);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

initSchema();
migrateTicketsIfNeeded();
db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_device ON tickets(device_id)');

function migrateResolutionColumnIfNeeded() {
  const cols = db.prepare('PRAGMA table_info(tickets)').all();
  if (cols.some((c) => c.name === 'resolution')) return;
  db.exec(`ALTER TABLE tickets ADD COLUMN resolution TEXT NOT NULL DEFAULT ''`);
}
migrateResolutionColumnIfNeeded();

function initAbitti2Schema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS abitti2_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE COLLATE NOCASE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function initLoanSchema() {
  initAbitti2Schema();
  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('computer', 'charger', 'other')),
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      abitti2_version_id INTEGER REFERENCES abitti2_versions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_loan_assets_kind ON loan_assets(kind);

    CREATE TABLE IF NOT EXISTS loan_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      computer_asset_id INTEGER REFERENCES loan_assets(id),
      charger_asset_id INTEGER REFERENCES loan_assets(id),
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL CHECK(borrower_role IN ('pupil', 'staff', 'other')),
      signature_png BLOB,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      returned_at TEXT,
      CHECK (computer_asset_id IS NOT NULL OR charger_asset_id IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_loan_checkouts_returned ON loan_checkouts(returned_at);
    CREATE INDEX IF NOT EXISTS idx_loan_checkouts_computer ON loan_checkouts(computer_asset_id);
  `);
}
initLoanSchema();

/** Allow NULL signatures (signatures optional / removed from UI). */
function migrateLoanSignatureOptionalIfNeeded() {
  const t = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='loan_checkouts'`).get();
  if (!t || !t.sql) return;
  if (!t.sql.includes('signature_png BLOB NOT NULL')) return;

  const rows = db.prepare('SELECT * FROM loan_checkouts').all();
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');
  db.exec('DROP TABLE loan_checkouts');
  db.exec(`
    CREATE TABLE loan_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      computer_asset_id INTEGER NOT NULL REFERENCES loan_assets(id),
      charger_asset_id INTEGER REFERENCES loan_assets(id),
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL CHECK(borrower_role IN ('pupil', 'staff', 'other')),
      signature_png BLOB,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      returned_at TEXT
    );
    CREATE INDEX idx_loan_checkouts_returned ON loan_checkouts(returned_at);
    CREATE INDEX idx_loan_checkouts_computer ON loan_checkouts(computer_asset_id);
  `);
  const ins = db.prepare(
    `INSERT INTO loan_checkouts (
      id, computer_asset_id, charger_asset_id, borrower_name, borrower_role, signature_png, created_at, returned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of rows) {
    ins.run(
      c.id,
      c.computer_asset_id,
      c.charger_asset_id,
      c.borrower_name,
      c.borrower_role,
      c.signature_png,
      c.created_at,
      c.returned_at
    );
  }
  db.exec('COMMIT');
  db.exec('PRAGMA foreign_keys = ON');
  const maxC = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM loan_checkouts').get().m;
  try {
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('loan_checkouts');
    if (maxC) db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run('loan_checkouts', maxC);
  } catch (_e) {
    /* ignore */
  }
}
migrateLoanSignatureOptionalIfNeeded();

/** Rebuild loan tables so CHECK allows kind "other" (existing DBs created before that). */
function migrateLoanAssetsOtherKindIfNeeded() {
  const t = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='loan_assets'`).get();
  if (!t || !t.sql) return;
  if (t.sql.includes("'other'")) return;

  const assets = db.prepare('SELECT * FROM loan_assets').all();
  const checkouts = db.prepare('SELECT * FROM loan_checkouts').all();

  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');
  db.exec('DROP TABLE IF EXISTS loan_checkouts');
  db.exec('DROP TABLE IF EXISTS loan_assets');
  db.exec(`
    CREATE TABLE loan_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('computer', 'charger', 'other')),
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      abitti2_version_id INTEGER REFERENCES abitti2_versions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_loan_assets_kind ON loan_assets(kind);
    CREATE TABLE loan_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      computer_asset_id INTEGER NOT NULL REFERENCES loan_assets(id),
      charger_asset_id INTEGER REFERENCES loan_assets(id),
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL CHECK(borrower_role IN ('pupil', 'staff', 'other')),
      signature_png BLOB,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      returned_at TEXT
    );
    CREATE INDEX idx_loan_checkouts_returned ON loan_checkouts(returned_at);
    CREATE INDEX idx_loan_checkouts_computer ON loan_checkouts(computer_asset_id);
  `);

  const insA = db.prepare(
    'INSERT INTO loan_assets (id, kind, name, sort_order, brand_id, abitti2_version_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const a of assets) {
    insA.run(
      a.id,
      a.kind,
      a.name,
      a.sort_order,
      a.brand_id != null ? a.brand_id : null,
      a.abitti2_version_id != null ? a.abitti2_version_id : null,
      a.created_at
    );
  }

  const insC = db.prepare(
    `INSERT INTO loan_checkouts (
      id, computer_asset_id, charger_asset_id, borrower_name, borrower_role, signature_png, created_at, returned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of checkouts) {
    insC.run(
      c.id,
      c.computer_asset_id,
      c.charger_asset_id,
      c.borrower_name,
      c.borrower_role,
      c.signature_png,
      c.created_at,
      c.returned_at
    );
  }

  db.exec('COMMIT');
  db.exec('PRAGMA foreign_keys = ON');

  const maxA = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM loan_assets').get().m;
  const maxC = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM loan_checkouts').get().m;
  try {
    db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?)').run('loan_assets', 'loan_checkouts');
    if (maxA)
      db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run('loan_assets', maxA);
    if (maxC)
      db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run('loan_checkouts', maxC);
  } catch (_e) {
    /* ignore if sqlite_sequence missing */
  }
}
migrateLoanAssetsOtherKindIfNeeded();

/** Add brand + Abitti2 version columns to loan_assets (existing DBs). */
function migrateLoanAssetBrandAbittiIfNeeded() {
  initAbitti2Schema();
  const cols = db.prepare('PRAGMA table_info(loan_assets)').all();
  const names = cols.map((c) => c.name);
  if (!names.includes('brand_id')) {
    db.exec(`ALTER TABLE loan_assets ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL`);
  }
  if (!names.includes('abitti2_version_id')) {
    db.exec(
      `ALTER TABLE loan_assets ADD COLUMN abitti2_version_id INTEGER REFERENCES abitti2_versions(id) ON DELETE SET NULL`
    );
  }
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_loan_assets_brand ON loan_assets(brand_id)');
  } catch (_e) {
    /* ignore */
  }
}
migrateLoanAssetBrandAbittiIfNeeded();

/** Charger-only loans: nullable computer_asset_id (FK still references loan_assets). */
function migrateLoanCheckoutNullablePrimaryIfNeeded() {
  const cols = db.prepare('PRAGMA table_info(loan_checkouts)').all();
  const comp = cols.find((c) => c.name === 'computer_asset_id');
  if (!comp || comp.notnull === 0) return;

  const rows = db.prepare('SELECT * FROM loan_checkouts').all();
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');
  db.exec('DROP TABLE loan_checkouts');
  db.exec(`
    CREATE TABLE loan_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      computer_asset_id INTEGER REFERENCES loan_assets(id),
      charger_asset_id INTEGER REFERENCES loan_assets(id),
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL CHECK(borrower_role IN ('pupil', 'staff', 'other')),
      signature_png BLOB,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      returned_at TEXT,
      CHECK (computer_asset_id IS NOT NULL OR charger_asset_id IS NOT NULL)
    );
    CREATE INDEX idx_loan_checkouts_returned ON loan_checkouts(returned_at);
    CREATE INDEX idx_loan_checkouts_computer ON loan_checkouts(computer_asset_id);
  `);
  const ins = db.prepare(
    `INSERT INTO loan_checkouts (
      id, computer_asset_id, charger_asset_id, borrower_name, borrower_role, signature_png, created_at, returned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of rows) {
    ins.run(
      c.id,
      c.computer_asset_id,
      c.charger_asset_id,
      c.borrower_name,
      c.borrower_role,
      c.signature_png,
      c.created_at,
      c.returned_at
    );
  }
  db.exec('COMMIT');
  db.exec('PRAGMA foreign_keys = ON');
  const maxC = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM loan_checkouts').get().m;
  try {
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('loan_checkouts');
    if (maxC) db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run('loan_checkouts', maxC);
  } catch (_e) {
    /* ignore */
  }
}
migrateLoanCheckoutNullablePrimaryIfNeeded();

const { randomUUID } = require('crypto');

function deviceFromRow(row) {
  if (!row || row.device_id == null) return null;
  if (row.dev_type == null) return null;
  return {
    id: row.device_id,
    type: row.dev_type,
    label: row.dev_label || '',
    brandId: row.dev_brand_id,
    brandName: row.dev_brand_name || '',
  };
}

function rowToTicket(row, tagRows) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    description: row.description,
    reporterType: row.reporter_type,
    reporterName: row.reporter_name,
    category: row.category,
    priority: row.priority,
    status: row.status,
    deviceId: row.device_id,
    device: deviceFromRow(row),
    resolution: row.resolution != null ? row.resolution : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachmentCount: Number(row.attachment_count) || 0,
    tags: (tagRows || []).map((t) => t.name),
  };
}

function getTagsForTicketIds(ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT tt.ticket_id, t.name
       FROM ticket_tags tt
       JOIN tags t ON t.id = tt.tag_id
       WHERE tt.ticket_id IN (${placeholders})`
    )
    .all(...ids);
  const map = new Map();
  for (const id of ids) map.set(id, []);
  for (const r of rows) {
    map.get(r.ticket_id).push(r.name);
  }
  return map;
}

function syncTicketTags(ticketId, tagNames) {
  const del = db.prepare('DELETE FROM ticket_tags WHERE ticket_id = ?');
  del.run(ticketId);
  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO tags (name) VALUES (lower(trim(?)))'
  );
  const getTagId = db.prepare('SELECT id FROM tags WHERE name = lower(trim(?))');
  const link = db.prepare(
    'INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)'
  );
  const unique = [
    ...new Set((tagNames || []).map((n) => String(n).trim().toLowerCase()).filter(Boolean)),
  ];
  const tx = db.transaction(() => {
    for (const name of unique) {
      insertTag.run(name);
      const t = getTagId.get(name);
      if (t) link.run(ticketId, t.id);
    }
  });
  tx();
}

function normalizeDeviceId(category, deviceId) {
  if (category !== 'hardware') return null;
  if (deviceId == null || deviceId === '') return null;
  const n = Number(deviceId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** For updates: clear when not closed; if closed and body omits resolution, keep stored value. */
function resolutionForUpdate(id, data) {
  if (data.status !== 'closed') return '';
  if (data.resolution !== undefined) return (data.resolution || '').trim();
  const row = db.prepare('SELECT resolution FROM tickets WHERE id = ?').get(id);
  return row && row.resolution != null ? String(row.resolution) : '';
}

function createTicket(data) {
  const publicId = randomUUID();
  const devId = normalizeDeviceId(data.category, data.deviceId);
  const stmt = db.prepare(`
    INSERT INTO tickets (
      public_id, title, description, reporter_type, reporter_name,
      category, priority, status, device_id, created_at, updated_at, resolution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), '')
  `);
  const info = stmt.run(
    publicId,
    data.title.trim(),
    (data.description || '').trim(),
    data.reporterType || 'unknown',
    (data.reporterName || '').trim(),
    data.category,
    data.priority,
    data.status || 'open',
    devId
  );
  const id = info.lastInsertRowid;
  syncTicketTags(id, data.tags);
  return getTicketById(id);
}

function getTicketById(id) {
  const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(id);
  if (!row) return null;
  const tags = db
    .prepare(
      `SELECT t.name FROM ticket_tags tt JOIN tags t ON t.id = tt.tag_id WHERE tt.ticket_id = ? ORDER BY t.name`
    )
    .all(id);
  return rowToTicket(row, tags);
}

function getTicketByPublicId(publicId) {
  const row = db.prepare(`${TICKET_SELECT} WHERE t.public_id = ?`).get(publicId);
  if (!row) return null;
  const tags = db
    .prepare(
      `SELECT t.name FROM ticket_tags tt JOIN tags t ON t.id = tt.tag_id WHERE tt.ticket_id = ? ORDER BY t.name`
    )
    .all(row.id);
  return rowToTicket(row, tags);
}

function updateTicket(id, data) {
  const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);
  if (!existing) return null;
  const devId = normalizeDeviceId(data.category, data.deviceId);
  const resolution = resolutionForUpdate(id, data);
  db.prepare(`
    UPDATE tickets SET
      title = ?,
      description = ?,
      reporter_type = ?,
      reporter_name = ?,
      category = ?,
      priority = ?,
      status = ?,
      device_id = ?,
      resolution = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.title.trim(),
    (data.description || '').trim(),
    data.reporterType || 'unknown',
    (data.reporterName || '').trim(),
    data.category,
    data.priority,
    data.status,
    devId,
    resolution,
    id
  );
  if (data.tags !== undefined) syncTicketTags(id, data.tags);
  return getTicketById(id);
}

function listTickets(filters) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('t.status = ?');
    params.push(filters.status);
  }
  if (filters.category) {
    conditions.push('t.category = ?');
    params.push(filters.category);
  }
  if (filters.priority) {
    conditions.push('t.priority = ?');
    params.push(filters.priority);
  }
  if (filters.reporter) {
    conditions.push('(t.reporter_name LIKE ? OR t.reporter_type LIKE ?)');
    const q = `%${filters.reporter}%`;
    params.push(q, q);
  }
  if (filters.from) {
    conditions.push("date(t.created_at) >= date(?)");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("date(t.created_at) <= date(?)");
    params.push(filters.to);
  }
  if (filters.q) {
    conditions.push(
      '(t.title LIKE ? OR t.description LIKE ? OR t.reporter_name LIKE ? OR t.resolution LIKE ?)'
    );
    const qq = `%${filters.q}%`;
    params.push(qq, qq, qq, qq);
  }
  if (filters.tag) {
    conditions.push(
      `t.id IN (SELECT tt.ticket_id FROM ticket_tags tt
       JOIN tags tg ON tg.id = tt.tag_id WHERE lower(tg.name) = lower(trim(?)))`
    );
    params.push(filters.tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = 't.created_at DESC';
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 200, 1), 500);
  const rows = db
    .prepare(`${TICKET_SELECT} ${where} ORDER BY ${orderBy} LIMIT ${limit}`)
    .all(...params);
  const ids = rows.map((r) => r.id);
  const tagMap = getTagsForTicketIds(ids);
  return rows.map((r) =>
    rowToTicket(r, (tagMap.get(r.id) || []).map((name) => ({ name })))
  );
}

function deleteTicket(id) {
  const info = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
  return info.changes > 0;
}

function listAllTags() {
  return db.prepare('SELECT name FROM tags ORDER BY name').all().map((r) => r.name);
}

function addAttachment(ticketId, file) {
  const t = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
  if (!t) return null;
  const info = db
    .prepare(
      `INSERT INTO attachments (ticket_id, stored_name, original_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      ticketId,
      file.storedName,
      file.originalName,
      file.mimeType || null,
      file.size || 0
    );
  return info.lastInsertRowid;
}

function listAttachments(ticketId) {
  return db
    .prepare(
      `SELECT id, stored_name, original_name, mime_type, size_bytes, created_at
       FROM attachments WHERE ticket_id = ? ORDER BY created_at DESC`
    )
    .all(ticketId);
}

function getAttachment(id) {
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
}

function deleteAttachment(id) {
  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
  const info = db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  return info.changes > 0 ? row : null;
}

function dashboardSummary() {
  const byStatus = db
    .prepare(`SELECT status, COUNT(*) AS c FROM tickets GROUP BY status`)
    .all();
  const byCategory = db
    .prepare(`SELECT category, COUNT(*) AS c FROM tickets GROUP BY category`)
    .all();
  const byPriority = db
    .prepare(`SELECT priority, COUNT(*) AS c FROM tickets GROUP BY priority`)
    .all();
  const total = db.prepare('SELECT COUNT(*) AS c FROM tickets').get().c;
  return { byStatus, byCategory, byPriority, total };
}

function reportInRange(startIso, endIso) {
  const rows = db
    .prepare(
      `${TICKET_SELECT}
       WHERE datetime(t.created_at) >= datetime(?) AND datetime(t.created_at) < datetime(?)`
    )
    .all(startIso, endIso);
  const ids = rows.map((r) => r.id);
  const tagMap = getTagsForTicketIds(ids);
  return rows.map((r) =>
    rowToTicket(r, (tagMap.get(r.id) || []).map((name) => ({ name })))
  );
}

/** ---------- Brands ---------- */
function listBrands() {
  return db.prepare('SELECT id, name FROM brands ORDER BY name COLLATE NOCASE').all();
}

function createBrand(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const info = db.prepare('INSERT INTO brands (name) VALUES (?)').run(n);
  return { id: info.lastInsertRowid, name: n };
}

function updateBrand(id, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const info = db.prepare('UPDATE brands SET name = ? WHERE id = ?').run(n, id);
  return info.changes > 0 ? { id, name: n } : null;
}

function deleteBrand(id) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM devices WHERE brand_id = ?').get(id)
    .c;
  if (count > 0) return { ok: false, error: 'Brand is used by devices' };
  const info = db.prepare('DELETE FROM brands WHERE id = ?').run(id);
  return { ok: info.changes > 0 };
}

/** ---------- Devices ---------- */
function listDevices(filters) {
  let sql = `
    SELECT d.id, d.device_type, d.label, d.brand_id, b.name AS brand_name
    FROM devices d
    JOIN brands b ON b.id = d.brand_id
  `;
  const params = [];
  if (filters.brandId) {
    sql += ' WHERE d.brand_id = ?';
    params.push(Number(filters.brandId));
  }
  sql += ' ORDER BY b.name COLLATE NOCASE, d.device_type, d.label COLLATE NOCASE';
  return db.prepare(sql).all(...params);
}

function getDevice(id) {
  return db
    .prepare(
      `
    SELECT d.id, d.device_type, d.label, d.brand_id, b.name AS brand_name
    FROM devices d
    JOIN brands b ON b.id = d.brand_id
    WHERE d.id = ?
  `
    )
    .get(id);
}

function createDevice(data) {
  const info = db
    .prepare(
      `INSERT INTO devices (device_type, brand_id, label) VALUES (?, ?, ?)`
    )
    .run(
      data.deviceType,
      Number(data.brandId),
      (data.label || '').trim()
    );
  return getDevice(info.lastInsertRowid);
}

function updateDevice(id, data) {
  const info = db
    .prepare(`UPDATE devices SET device_type = ?, brand_id = ?, label = ? WHERE id = ?`)
    .run(data.deviceType, Number(data.brandId), (data.label || '').trim(), id);
  return info.changes > 0 ? getDevice(id) : null;
}

function deleteDevice(id) {
  const info = db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  return info.changes > 0;
}

/** ---------- Loan computers ---------- */
function mapLoanAssetRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    sort_order: r.sort_order,
    created_at: r.created_at,
    brandId: r.brand_id,
    brandName: r.brand_name,
    abitti2VersionId: r.abitti2_version_id,
    abitti2VersionLabel: r.abitti2_version_label,
  };
}

const LOAN_ASSET_SELECT = `SELECT a.id, a.kind, a.name, a.sort_order, a.created_at,
       a.brand_id, b.name AS brand_name,
       a.abitti2_version_id, v.label AS abitti2_version_label
FROM loan_assets a
LEFT JOIN brands b ON b.id = a.brand_id
LEFT JOIN abitti2_versions v ON v.id = a.abitti2_version_id`;

function getLoanAssetById(id) {
  const r = db.prepare(`${LOAN_ASSET_SELECT} WHERE a.id = ?`).get(Number(id));
  return mapLoanAssetRow(r);
}

function listLoanAssets(kind) {
  let sql = LOAN_ASSET_SELECT;
  const params = [];
  if (kind === 'computer' || kind === 'charger' || kind === 'other') {
    sql += ' WHERE a.kind = ?';
    params.push(kind);
  }
  sql += ' ORDER BY a.kind, a.sort_order, a.name COLLATE NOCASE';
  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => mapLoanAssetRow(r));
}

function createLoanAsset(data) {
  const k = String(data.kind || '').toLowerCase();
  if (k !== 'computer' && k !== 'charger' && k !== 'other') return null;
  const n = String(data.name || '').trim();
  if (!n) return null;
  let brandId =
    data.brandId != null && data.brandId !== '' ? Number(data.brandId) : null;
  let abittiId =
    data.abitti2VersionId != null && data.abitti2VersionId !== ''
      ? Number(data.abitti2VersionId)
      : null;
  if (brandId) {
    const b = db.prepare('SELECT id FROM brands WHERE id = ?').get(brandId);
    if (!b) return null;
  } else {
    brandId = null;
  }
  if (k !== 'computer') {
    abittiId = null;
  }
  if (abittiId) {
    const v = db.prepare('SELECT id FROM abitti2_versions WHERE id = ?').get(abittiId);
    if (!v) return null;
  } else {
    abittiId = null;
  }
  const maxSort =
    db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM loan_assets WHERE kind = ?').get(k)
      .m || 0;
  const info = db
    .prepare(
      `INSERT INTO loan_assets (kind, name, sort_order, brand_id, abitti2_version_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(k, n, maxSort + 1, brandId, abittiId);
  return getLoanAssetById(info.lastInsertRowid);
}

function updateLoanAsset(id, data) {
  const aid = Number(id);
  const row = db.prepare('SELECT id, kind FROM loan_assets WHERE id = ?').get(aid);
  if (!row) return null;
  const name = data.name != null ? String(data.name).trim() : null;
  let brandId =
    data.brandId !== undefined
      ? data.brandId != null && data.brandId !== ''
        ? Number(data.brandId)
        : null
      : undefined;
  let abittiId =
    data.abitti2VersionId !== undefined
      ? data.abitti2VersionId != null && data.abitti2VersionId !== ''
        ? Number(data.abitti2VersionId)
        : null
      : undefined;
  if (brandId !== undefined && brandId) {
    const b = db.prepare('SELECT id FROM brands WHERE id = ?').get(brandId);
    if (!b) return null;
  }
  if (row.kind !== 'computer' && abittiId !== undefined) {
    abittiId = null;
  }
  if (abittiId !== undefined && abittiId) {
    const v = db.prepare('SELECT id FROM abitti2_versions WHERE id = ?').get(abittiId);
    if (!v) return null;
  }
  const sets = [];
  const vals = [];
  if (name !== null && name !== '') {
    sets.push('name = ?');
    vals.push(name);
  }
  if (brandId !== undefined) {
    sets.push('brand_id = ?');
    vals.push(brandId);
  }
  if (abittiId !== undefined) {
    sets.push('abitti2_version_id = ?');
    vals.push(abittiId);
  }
  if (!sets.length) return getLoanAssetById(aid);
  vals.push(aid);
  db.prepare(`UPDATE loan_assets SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getLoanAssetById(aid);
}

function listAbitti2Versions() {
  return db
    .prepare('SELECT id, label, sort_order, created_at FROM abitti2_versions ORDER BY sort_order DESC, label COLLATE NOCASE')
    .all();
}

function createAbitti2Version(label) {
  const n = String(label || '').trim();
  if (!n) return null;
  const maxSort =
    db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM abitti2_versions').get().m || 0;
  const info = db
    .prepare('INSERT INTO abitti2_versions (label, sort_order) VALUES (?, ?)')
    .run(n, maxSort + 1);
  return db.prepare('SELECT * FROM abitti2_versions WHERE id = ?').get(info.lastInsertRowid);
}

function updateAbitti2Version(id, label) {
  const aid = Number(id);
  const n = String(label || '').trim();
  if (!n) return null;
  const row = db.prepare('SELECT id FROM abitti2_versions WHERE id = ?').get(aid);
  if (!row) return null;
  try {
    db.prepare('UPDATE abitti2_versions SET label = ? WHERE id = ?').run(n, aid);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return null;
    throw e;
  }
  return db.prepare('SELECT * FROM abitti2_versions WHERE id = ?').get(aid);
}

function deleteAbitti2Version(id) {
  const inUse = db
    .prepare('SELECT COUNT(*) AS c FROM loan_assets WHERE abitti2_version_id = ?')
    .get(Number(id)).c;
  if (inUse > 0) return { ok: false, error: 'Version is assigned to loan equipment' };
  const info = db.prepare('DELETE FROM abitti2_versions WHERE id = ?').run(Number(id));
  return { ok: info.changes > 0 };
}

function deleteLoanAsset(id) {
  const aid = Number(id);
  const inUse = db
    .prepare(
      `SELECT COUNT(*) AS c FROM loan_checkouts
       WHERE returned_at IS NULL AND (computer_asset_id = ? OR charger_asset_id = ?)`
    )
    .get(aid, aid).c;
  if (inUse > 0) return { ok: false, error: 'Asset is currently loaned out' };
  const hasHistory = db
    .prepare(
      `SELECT COUNT(*) AS c FROM loan_checkouts WHERE computer_asset_id = ? OR charger_asset_id = ?`
    )
    .get(aid, aid).c;
  if (hasHistory > 0) return { ok: false, error: 'Remove or archive after history exists — return loans first' };
  const info = db.prepare('DELETE FROM loan_assets WHERE id = ?').run(aid);
  return { ok: info.changes > 0 };
}

/** Primary slot: laptop/computer or other equipment (not chargers). */
function isPrimaryAssetAvailable(assetId) {
  const row = db.prepare('SELECT id, kind FROM loan_assets WHERE id = ?').get(assetId);
  if (!row || (row.kind !== 'computer' && row.kind !== 'other')) return false;
  const n = db
    .prepare(
      `SELECT COUNT(*) AS c FROM loan_checkouts
       WHERE returned_at IS NULL AND (computer_asset_id = ? OR charger_asset_id = ?)`
    )
    .get(assetId, assetId).c;
  return n === 0;
}

function isChargerAssetAvailable(assetId) {
  const row = db.prepare('SELECT id, kind FROM loan_assets WHERE id = ?').get(assetId);
  if (!row || row.kind !== 'charger') return false;
  const n = db
    .prepare(
      `SELECT COUNT(*) AS c FROM loan_checkouts
       WHERE returned_at IS NULL AND (computer_asset_id = ? OR charger_asset_id = ?)`
    )
    .get(assetId, assetId).c;
  return n === 0;
}

function createLoanCheckout(data) {
  const name = String(data.borrowerName || '').trim();
  if (!name) return { ok: false, error: 'Name required' };
  const role = String(data.borrowerRole || 'other').toLowerCase();
  if (!['pupil', 'staff', 'other'].includes(role)) {
    return { ok: false, error: 'Invalid role' };
  }

  const rawP = data.primaryAssetId ?? data.computerAssetId;
  if (rawP == null || rawP === '') return { ok: false, error: 'No item selected' };
  const primaryId = Number(rawP);
  const chargerExtra =
    data.chargerAssetId != null && data.chargerAssetId !== ''
      ? Number(data.chargerAssetId)
      : null;

  const pRow = db.prepare('SELECT id, kind FROM loan_assets WHERE id = ?').get(primaryId);
  if (!pRow) return { ok: false, error: 'Invalid item' };

  if (pRow.kind === 'charger') {
    if (chargerExtra) return { ok: false, error: 'Invalid loan request' };
    if (!isChargerAssetAvailable(primaryId)) {
      return { ok: false, error: 'That charger is not available' };
    }
    const info = db
      .prepare(
        `INSERT INTO loan_checkouts (
          computer_asset_id, charger_asset_id, borrower_name, borrower_role, signature_png
        ) VALUES (NULL, ?, ?, ?, NULL)`
      )
      .run(primaryId, name, role);
    return { ok: true, id: info.lastInsertRowid };
  }

  if (pRow.kind !== 'computer' && pRow.kind !== 'other') {
    return { ok: false, error: 'Invalid main item (computer or other)' };
  }
  if (!isPrimaryAssetAvailable(primaryId)) {
    return { ok: false, error: 'That item is not available' };
  }
  let chargerId = chargerExtra;
  if (chargerId) {
    const chRow = db.prepare('SELECT id, kind FROM loan_assets WHERE id = ?').get(chargerId);
    if (!chRow || chRow.kind !== 'charger') return { ok: false, error: 'Invalid charger' };
    if (!isChargerAssetAvailable(chargerId)) {
      return { ok: false, error: 'That charger is not available' };
    }
  }
  const info = db
    .prepare(
      `INSERT INTO loan_checkouts (
        computer_asset_id, charger_asset_id, borrower_name, borrower_role, signature_png
      ) VALUES (?, ?, ?, ?, NULL)`
    )
    .run(primaryId, chargerId, name, role);
  return { ok: true, id: info.lastInsertRowid };
}

function returnLoanCheckout(checkoutId) {
  const row = db
    .prepare('SELECT id, returned_at FROM loan_checkouts WHERE id = ?')
    .get(Number(checkoutId));
  if (!row) return { ok: false, error: 'Not found' };
  if (row.returned_at) return { ok: false, error: 'Already returned' };
  db.prepare(`UPDATE loan_checkouts SET returned_at = datetime('now') WHERE id = ?`).run(
    Number(checkoutId)
  );
  return { ok: true };
}

function getLoanStatus() {
  const assets = listLoanAssets();
  const active = db
    .prepare(
      `SELECT c.id AS checkout_id, c.computer_asset_id, c.charger_asset_id,
              c.borrower_name, c.borrower_role, c.created_at,
              COALESCE(prim.name, chg.name) AS primary_name,
              COALESCE(prim.kind, chg.kind) AS primary_kind,
              COALESCE(pb.name, CASE WHEN prim.id IS NULL THEN chg_b.name ELSE NULL END) AS primary_brand_name,
              CASE WHEN prim.id IS NOT NULL THEN pv.label ELSE NULL END AS primary_abitti2_version_label,
              CASE
                WHEN c.computer_asset_id IS NOT NULL AND c.charger_asset_id IS NOT NULL THEN chg.name
                ELSE NULL
              END AS charger_name
       FROM loan_checkouts c
       LEFT JOIN loan_assets prim ON prim.id = c.computer_asset_id
       LEFT JOIN loan_assets chg ON chg.id = c.charger_asset_id
       LEFT JOIN brands pb ON pb.id = prim.brand_id
       LEFT JOIN brands chg_b ON chg_b.id = chg.brand_id
       LEFT JOIN abitti2_versions pv ON pv.id = prim.abitti2_version_id
       WHERE c.returned_at IS NULL
       ORDER BY c.created_at DESC`
    )
    .all();
  const byPrimary = new Map();
  const byCharger = new Map();
  for (const row of active) {
    if (row.computer_asset_id != null) byPrimary.set(row.computer_asset_id, row);
    if (row.charger_asset_id != null) byCharger.set(row.charger_asset_id, row);
  }
  const items = assets.map((a) => {
    let checkout = null;
    if (a.kind === 'computer' || a.kind === 'other') checkout = byPrimary.get(a.id) || null;
    else checkout = byCharger.get(a.id) || null;
    return {
      id: a.id,
      kind: a.kind,
      name: a.name,
      brandId: a.brandId,
      brandName: a.brandName,
      abitti2VersionId: a.abitti2VersionId,
      abitti2VersionLabel: a.abitti2VersionLabel,
      available: !checkout,
      checkout: checkout
        ? {
            id: checkout.checkout_id,
            borrowerName: checkout.borrower_name,
            borrowerRole: checkout.borrower_role,
            since: checkout.created_at,
          }
        : null,
    };
  });
  return { items, activeLoans: active };
}

function listLoanHistory(limit) {
  const lim = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  return db
    .prepare(
      `SELECT c.id, c.created_at, c.returned_at, c.borrower_name, c.borrower_role,
              COALESCE(prim.name, chg.name) AS primary_name,
              COALESCE(prim.kind, chg.kind) AS primary_kind,
              COALESCE(pb.name, CASE WHEN prim.id IS NULL THEN chg_b.name ELSE NULL END) AS primary_brand_name,
              CASE WHEN prim.id IS NOT NULL THEN pv.label ELSE NULL END AS primary_abitti2_version_label,
              CASE
                WHEN c.computer_asset_id IS NOT NULL AND c.charger_asset_id IS NOT NULL THEN chg.name
                ELSE NULL
              END AS charger_name
       FROM loan_checkouts c
       LEFT JOIN loan_assets prim ON prim.id = c.computer_asset_id
       LEFT JOIN loan_assets chg ON chg.id = c.charger_asset_id
       LEFT JOIN brands pb ON pb.id = prim.brand_id
       LEFT JOIN brands chg_b ON chg_b.id = chg.brand_id
       LEFT JOIN abitti2_versions pv ON pv.id = prim.abitti2_version_id
       ORDER BY c.created_at DESC
       LIMIT ?`
    )
    .all(lim);
}

module.exports = {
  db,
  createTicket,
  getTicketById,
  getTicketByPublicId,
  updateTicket,
  listTickets,
  deleteTicket,
  listAllTags,
  addAttachment,
  listAttachments,
  getAttachment,
  deleteAttachment,
  dashboardSummary,
  reportInRange,
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  listLoanAssets,
  createLoanAsset,
  deleteLoanAsset,
  createLoanCheckout,
  returnLoanCheckout,
  getLoanStatus,
  listLoanHistory,
  getLoanAssetById,
  updateLoanAsset,
  listAbitti2Versions,
  createAbitti2Version,
  updateAbitti2Version,
  deleteAbitti2Version,
};
