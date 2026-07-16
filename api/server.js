require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const siteColumns = [
  'id',
  'name',
  'url',
  'logo',
  'status',
  'category',
  'description',
  'sort_order',
  'created_at',
  'updated_at',
];

const editableSiteColumns = [
  'name',
  'url',
  'category',
  'description',
  'logo',
  'status',
  'sort_order',
];

function jsonError(res, status, error, message) {
  return res.status(status).json({
    ok: false,
    error,
    ...(message ? { message } : {}),
  });
}

function sendDbError(res, err) {
  console.error('Database error:', err);
  return jsonError(res, 500, 'DATABASE_ERROR', 'Database request failed.');
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeSortOrder(value) {
  const sortOrder = Number(value);
  return Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0;
}

function normalizeSiteInput(body) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    url: typeof body.url === 'string' ? body.url.trim() : '',
    category: normalizeOptionalText(body.category),
    description: normalizeOptionalText(body.description),
    logo: normalizeOptionalText(body.logo),
    status: normalizeOptionalText(body.status) || 'active',
    sort_order: normalizeSortOrder(body.sort_order),
  };
}

function pickEditableSiteUpdates(body) {
  const updates = {};

  editableSiteColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(body, column)) return;

    if (column === 'sort_order') {
      updates[column] = normalizeSortOrder(body[column]);
    } else if (column === 'name' || column === 'url') {
      updates[column] = typeof body[column] === 'string' ? body[column].trim() : '';
    } else {
      updates[column] = normalizeOptionalText(body[column]);
    }
  });

  return updates;
}

async function getSiteById(id) {
  const [rows] = await db.execute(
    `SELECT ${siteColumns.join(', ')} FROM sites WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, data: { status: 'healthy' } });
});

app.get('/api/sites', asyncRoute(async (req, res) => {
  const [rows] = await db.execute(
    `SELECT ${siteColumns.join(', ')} FROM sites ORDER BY sort_order ASC, id ASC`
  );
  res.json({ ok: true, data: rows });
}));

app.post('/api/sites', asyncRoute(async (req, res) => {
  const site = normalizeSiteInput(req.body || {});

  if (!site.name || !site.url) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name and url are required.');
  }

  const [result] = await db.execute(
    `INSERT INTO sites (name, url, category, description, logo, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      site.name,
      site.url,
      site.category,
      site.description,
      site.logo,
      site.status,
      site.sort_order,
    ]
  );

  const created = await getSiteById(result.insertId);
  return res.status(201).json({ ok: true, data: created });
}));

app.put('/api/sites/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const updates = pickEditableSiteUpdates(req.body || {});

  if (Object.prototype.hasOwnProperty.call(updates, 'name') && !updates.name) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name cannot be empty.');
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'url') && !updates.url) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'url cannot be empty.');
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'No editable fields were provided.');
  }

  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(id);

  const [result] = await db.execute(`UPDATE sites SET ${setClause} WHERE id = ?`, values);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.patch('/api/sites/:id/status', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const status = normalizeOptionalText(req.body?.status);
  if (!status) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'status is required.');
  }

  const [result] = await db.execute('UPDATE sites SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.delete('/api/sites/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const [result] = await db.execute('DELETE FROM sites WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  return res.json({ ok: true, data: { id } });
}));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return sendDbError(res, err);
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
