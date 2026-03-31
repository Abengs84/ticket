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
         d.device_type AS dev_type, d.label AS dev_label, b.id AS dev_brand_id, b.name AS dev_brand_name
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
  const orderBy =
    filters.sort === 'updated' ? 't.updated_at DESC' : 't.created_at DESC';
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
};
