const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

const db = require('./db');

const PORT = Number(process.env.PORT) || 3004;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const { randomUUID } = require('crypto');
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function parseTagsBody(body) {
  if (Array.isArray(body.tags)) return body.tags;
  if (typeof body.tags === 'string' && body.tags.trim()) {
    return body.tags.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function ticketPayload(body) {
  return {
    title: body.title || '',
    description: body.description,
    reporterType: body.reporterType,
    reporterName: body.reporterName,
    category: body.category,
    priority: body.priority,
    status: body.status,
    deviceId: body.deviceId,
    resolution: body.resolution,
    tags: parseTagsBody(body),
  };
}

/** ---------- API: tickets ---------- */
app.get('/api/tickets', (req, res) => {
  try {
    const tickets = db.listTickets({
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      reporter: req.query.reporter,
      q: req.query.q,
      tag: req.query.tag,
      from: req.query.from,
      to: req.query.to,
      sort: req.query.sort,
      limit: req.query.limit,
    });
    res.json(tickets);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/tickets/:id(\\d+)', (req, res) => {
  const t = db.getTicketById(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.post('/api/tickets', (req, res) => {
  try {
    const p = ticketPayload(req.body);
    if (!p.title) return res.status(400).json({ error: 'Title required' });
    if (!p.category || !p.priority) {
      return res.status(400).json({ error: 'Category and priority required' });
    }
    const t = db.createTicket(p);
    res.status(201).json(t);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/tickets/:id(\\d+)', (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = ticketPayload(req.body);
    if (!p.title) return res.status(400).json({ error: 'Title required' });
    if (!p.category || !p.priority || !p.status) {
      return res.status(400).json({ error: 'Category, priority, and status required' });
    }
    const t = db.updateTicket(id, p);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/tickets/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);
  const atts = db.listAttachments(id);
  const ok = db.deleteTicket(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  for (const a of atts) {
    const fp = path.join(uploadsDir, a.stored_name);
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (_e) {
      /* ignore */
    }
  }
  res.status(204).end();
});

/** Public read by UUID (for QR links) */
app.get('/api/public/tickets/:publicId', (req, res) => {
  const t = db.getTicketByPublicId(req.params.publicId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

/** QR PNG */
app.get('/api/tickets/:id(\\d+)/qrcode.png', async (req, res) => {
  try {
    const t = db.getTicketById(Number(req.params.id));
    if (!t) return res.status(404).end();
    const url = `${BASE_URL}/view/${t.publicId}`;
    const buf = await QRCode.toBuffer(url, { type: 'png', width: 320, margin: 2 });
    res.type('image/png').send(buf);
  } catch (e) {
    res.status(500).end();
  }
});

/** ---------- Tags ---------- */
app.get('/api/tags', (_req, res) => {
  res.json(db.listAllTags());
});

/** ---------- Brands ---------- */
app.get('/api/brands', (_req, res) => {
  try {
    res.json(db.listBrands());
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/brands', (req, res) => {
  try {
    const name = (req.body && req.body.name) || '';
    const b = db.createBrand(name);
    if (!b) return res.status(400).json({ error: 'Name required' });
    res.status(201).json(b);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Brand name already exists' });
    }
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/brands/:id(\\d+)', (req, res) => {
  try {
    const b = db.updateBrand(Number(req.params.id), req.body && req.body.name);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Brand name already exists' });
    }
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/brands/:id(\\d+)', (req, res) => {
  const r = db.deleteBrand(Number(req.params.id));
  if (!r.ok) {
    if (r.error) return res.status(409).json({ error: r.error });
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).end();
});

/** ---------- Devices (inventory) ---------- */
app.get('/api/devices', (req, res) => {
  try {
    const brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const devices = db.listDevices({ brandId: brandId && brandId > 0 ? brandId : null });
    res.json(devices);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/devices', (req, res) => {
  try {
    const { deviceType, brandId, label } = req.body || {};
    const allowed = ['printer', 'computer', 'peripheral', 'other'];
    if (!allowed.includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    if (!brandId) return res.status(400).json({ error: 'brandId required' });
    const d = db.createDevice({ deviceType, brandId, label });
    res.status(201).json(d);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/devices/:id(\\d+)', (req, res) => {
  try {
    const { deviceType, brandId, label } = req.body || {};
    const allowed = ['printer', 'computer', 'peripheral', 'other'];
    if (!allowed.includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    if (!brandId) return res.status(400).json({ error: 'brandId required' });
    const d = db.updateDevice(Number(req.params.id), { deviceType, brandId, label });
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/devices/:id(\\d+)', (req, res) => {
  const ok = db.deleteDevice(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

/** ---------- Loan computers ---------- */
app.get('/api/loan/assets', (req, res) => {
  try {
    const kind = req.query.kind;
    const rows = db.listLoanAssets(
      kind === 'computer' || kind === 'charger' || kind === 'other' ? kind : undefined
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/loan/assets', (req, res) => {
  try {
    const row = db.createLoanAsset(req.body || {});
    if (!row) return res.status(400).json({ error: 'Invalid kind, name, brand, or Abitti2 version' });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.patch('/api/loan/assets/:id(\\d+)', (req, res) => {
  try {
    const row = db.updateLoanAsset(Number(req.params.id), req.body || {});
    if (!row) return res.status(400).json({ error: 'Invalid update' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/loan/abitti2-versions', (_req, res) => {
  try {
    res.json(db.listAbitti2Versions());
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/loan/abitti2-versions', (req, res) => {
  try {
    const row = db.createAbitti2Version(req.body && req.body.label);
    if (!row) return res.status(400).json({ error: 'Label required' });
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'That version already exists' });
    }
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/loan/abitti2-versions/:id(\\d+)', (req, res) => {
  try {
    const r = db.deleteAbitti2Version(Number(req.params.id));
    if (!r.ok) return res.status(400).json({ error: r.error || 'Cannot delete' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/loan/assets/:id(\\d+)', (req, res) => {
  try {
    const r = db.deleteLoanAsset(Number(req.params.id));
    if (!r.ok) return res.status(400).json({ error: r.error || 'Cannot delete' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/loan/status', (_req, res) => {
  try {
    res.json(db.getLoanStatus());
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/loan/history', (req, res) => {
  try {
    const rows = db.listLoanHistory(req.query.limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/loan/checkout', (req, res) => {
  try {
    const r = db.createLoanCheckout(req.body);
    if (!r.ok) return res.status(400).json({ error: r.error || 'Checkout failed' });
    res.status(201).json({ id: r.id });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/loan/return/:id(\\d+)', (req, res) => {
  try {
    const r = db.returnLoanCheckout(Number(req.params.id));
    if (!r.ok) return res.status(400).json({ error: r.error || 'Return failed' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

/** ---------- Attachments ---------- */
app.get('/api/tickets/:id(\\d+)/attachments', (req, res) => {
  const t = db.getTicketById(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Not found' });
  const rows = db.listAttachments(t.id);
  res.json(
    rows.map(({ stored_name: _s, id, original_name, mime_type, size_bytes, created_at }) => ({
      id,
      originalName: original_name,
      mimeType: mime_type,
      sizeBytes: size_bytes,
      createdAt: created_at,
      viewUrl: `/api/attachments/${id}/view`,
    }))
  );
});

app.post('/api/tickets/:id(\\d+)/attachments', upload.single('file'), (req, res) => {
  const ticketId = Number(req.params.id);
  const t = db.getTicketById(ticketId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const attId = db.addAttachment(ticketId, {
    storedName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
  res.status(201).json({ id: attId, message: 'Uploaded' });
});

function setInlineAttachmentHeaders(res, att) {
  const mime = att.mime_type || 'application/octet-stream';
  res.type(mime);
  const safe = String(att.original_name).replace(/[^\x20-\x7E]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(att.original_name)}`
  );
}

app.get('/api/attachments/:id(\\d+)/view', (req, res) => {
  const att = db.getAttachment(Number(req.params.id));
  if (!att) return res.status(404).end();
  const filePath = path.join(uploadsDir, att.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  setInlineAttachmentHeaders(res, att);
  fs.createReadStream(filePath).pipe(res);
});

/** Legacy alias — also inline for viewing in browser */
app.get('/api/attachments/:id(\\d+)/file', (req, res) => {
  const att = db.getAttachment(Number(req.params.id));
  if (!att) return res.status(404).end();
  const filePath = path.join(uploadsDir, att.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  setInlineAttachmentHeaders(res, att);
  fs.createReadStream(filePath).pipe(res);
});

app.delete('/api/attachments/:id(\\d+)', (req, res) => {
  const removed = db.deleteAttachment(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, removed.stored_name);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_e) {
    /* ignore */
  }
  res.status(204).end();
});

/** ---------- Stats & reports ---------- */
app.get('/api/stats/summary', (_req, res) => {
  try {
    res.json(db.dashboardSummary());
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

function rangeForPeriod(period, anchorDate) {
  const d = anchorDate ? new Date(anchorDate) : new Date();
  let start;
  let end;
  if (period === 'daily') {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else if (period === 'weekly') {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (period === 'monthly') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: period,
  };
}

app.get('/api/stats/report', (req, res) => {
  const period = req.query.period || 'daily';
  const p = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'daily';
  const { startIso, endIso } = rangeForPeriod(p, req.query.date);
  const tickets = db.reportInRange(startIso, endIso);
  const summary = {
    period: p,
    start: startIso,
    end: endIso,
    count: tickets.length,
    byStatus: {},
    byCategory: {},
    byPriority: {},
  };
  for (const t of tickets) {
    summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
    summary.byCategory[t.category] = (summary.byCategory[t.category] || 0) + 1;
    summary.byPriority[t.priority] = (summary.byPriority[t.priority] || 0) + 1;
  }
  res.json({ summary, tickets });
});

function csvEscape(s) {
  if (s == null) return '';
  const q = String(s);
  if (/[",\n]/.test(q)) return `"${q.replace(/"/g, '""')}"`;
  return q;
}

app.get('/api/stats/export.csv', (req, res) => {
  const period = req.query.period || 'monthly';
  const p = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'monthly';
  const { startIso, endIso } = rangeForPeriod(p, req.query.date);
  const tickets = db.reportInRange(startIso, endIso);
  const cols = [
    'id',
    'publicId',
    'title',
    'description',
    'reporterType',
    'reporterName',
    'category',
    'priority',
    'status',
    'resolution',
    'device',
    'tags',
    'createdAt',
    'updatedAt',
  ];
  const lines = [cols.join(',')];
  for (const t of tickets) {
    lines.push(
      cols
        .map((c) => {
          if (c === 'tags') return csvEscape((t.tags || []).join(';'));
          if (c === 'device') {
            const d = t.device;
            return csvEscape(
              d
                ? [d.type, d.brandName, d.label].filter(Boolean).join(' · ')
                : ''
            );
          }
          return csvEscape(t[c]);
        })
        .join(',')
    );
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tickets-${p}-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send('\uFEFF' + lines.join('\n'));
});

app.get('/api/stats/export.pdf', (req, res) => {
  const period = req.query.period || 'monthly';
  const p = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'monthly';
  const { startIso, endIso } = rangeForPeriod(p, req.query.date);
  const tickets = db.reportInRange(startIso, endIso);
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tickets-report-${p}.pdf"`
  );
  doc.pipe(res);
  doc.fontSize(18).text('School IT — Ticket report', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(`Period: ${p} (${startIso.slice(0, 10)} → ${endIso.slice(0, 10)})`);
  doc.text(`Total tickets: ${tickets.length}`);
  doc.moveDown();
  const counts = { byStatus: {}, byCategory: {}, byPriority: {} };
  for (const t of tickets) {
    counts.byStatus[t.status] = (counts.byStatus[t.status] || 0) + 1;
    counts.byCategory[t.category] = (counts.byCategory[t.category] || 0) + 1;
    counts.byPriority[t.priority] = (counts.byPriority[t.priority] || 0) + 1;
  }
  doc.fontSize(12).text('By status', { underline: true });
  doc.fontSize(10);
  Object.entries(counts.byStatus).forEach(([k, v]) => doc.text(`  ${k}: ${v}`));
  doc.moveDown(0.5);
  doc.fontSize(12).text('By category', { underline: true });
  doc.fontSize(10);
  Object.entries(counts.byCategory).forEach(([k, v]) => doc.text(`  ${k}: ${v}`));
  doc.moveDown(0.5);
  doc.fontSize(12).text('By priority', { underline: true });
  doc.fontSize(10);
  Object.entries(counts.byPriority).forEach(([k, v]) => doc.text(`  ${k}: ${v}`));
  doc.moveDown();
  doc.fontSize(12).text('Tickets', { underline: true });
  doc.fontSize(9);
  tickets.slice(0, 80).forEach((t, i) => {
    if (doc.y > 720) {
      doc.addPage();
    }
    const dev = t.device
      ? ` / ${[t.device.type, t.device.brandName].filter(Boolean).join(' ')}`
      : '';
    const res = (t.resolution || '').trim();
    const resBit =
      t.status === 'closed' && res
        ? ` — fix: ${res.length > 70 ? `${res.slice(0, 70)}…` : res}`
        : '';
    doc.text(
      `${i + 1}. #${t.id} ${t.title} — ${t.status} / ${t.category} / ${t.priority}${dev} — ${t.createdAt}${resBit}`
    );
  });
  if (tickets.length > 80) {
    doc.fontSize(10).text(`… and ${tickets.length - 80} more (use CSV export for full list).`);
  }
  doc.end();
});

/** Static frontend */
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/view/:publicId', (_req, res) => {
  res.sendFile(path.join(publicDir, 'view.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path === '/reports' || req.path === '/reports/') {
    return res.sendFile(path.join(publicDir, 'reports.html'));
  }
  if (req.path === '/devices' || req.path === '/devices/') {
    return res.sendFile(path.join(publicDir, 'devices.html'));
  }
  if (req.path === '/loan-computers' || req.path === '/loan-computers/') {
    return res.sendFile(path.join(publicDir, 'loan-status.html'));
  }
  if (req.path === '/loan-computers/manage' || req.path === '/loan-computers/manage/') {
    return res.sendFile(path.join(publicDir, 'loan-manage.html'));
  }
  if (req.path === '/loan-computers/kiosk' || req.path === '/loan-computers/kiosk/') {
    return res.sendFile(path.join(publicDir, 'loan-kiosk.html'));
  }
  if (req.path === '/loan-computers/status' || req.path === '/loan-computers/status/') {
    return res.sendFile(path.join(publicDir, 'loan-status.html'));
  }
  if (req.path === '/loan-computers/history' || req.path === '/loan-computers/history/') {
    return res.sendFile(path.join(publicDir, 'loan-history.html'));
  }
  if (req.path === '/loan-computers/abitti2' || req.path === '/loan-computers/abitti2/') {
    return res.sendFile(path.join(publicDir, 'loan-abitti2.html'));
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`School IT Tickets running at ${BASE_URL}`);
  console.log(`Set BASE_URL for correct QR links (e.g. http://192.168.1.10:${PORT})`);
});
