require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT || 3000);
const logoUploadDir =
  process.env.LOGO_UPLOAD_DIR || '/home/user/web/junchae.com/public_html/uploads/logos';
const logoPublicPath = '/uploads/logos';
const maxLogoSize = 2 * 1024 * 1024;
const allowedLogoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico']);
const allowedLogoMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

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

function ensureLogoUploadDir() {
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

function safeLogoFileName(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const safeExt = allowedLogoExtensions.has(ext) ? ext : '.png';
  const random = crypto.randomBytes(8).toString('hex');
  return `logo-${Date.now()}-${random}${safeExt}`;
}

function logoUrlForFile(fileName) {
  return `${logoPublicPath}/${fileName}`;
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureLogoUploadDir();
      cb(null, logoUploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, safeLogoFileName(file.originalname));
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: maxLogoSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedLogoExtensions.has(ext) || !allowedLogoMimeTypes.has(file.mimetype)) {
      return cb(new Error('INVALID_LOGO_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

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

app.post('/api/uploads/logo', (req, res) => {
  uploadLogo.single('logo')(req, res, (err) => {
    if (err) {
      console.error('Logo upload error:', err);
      const error =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'LOGO_FILE_TOO_LARGE'
          : err.message === 'INVALID_LOGO_FILE_TYPE'
            ? 'INVALID_LOGO_FILE_TYPE'
            : 'LOGO_UPLOAD_FAILED';
      return jsonError(res, 400, error);
    }

    if (!req.file) {
      return jsonError(res, 400, 'LOGO_FILE_REQUIRED', 'form-data field "logo" is required.');
    }

    return res.status(201).json({
      ok: true,
      data: { url: logoUrlForFile(req.file.filename) },
    });
  });
});

app.post('/api/uploads/logo/from-url', asyncRoute(async (req, res) => {
  const sourceUrl = normalizeOptionalText(req.body?.url);
  if (!sourceUrl) {
    return jsonError(res, 400, 'URL_REQUIRED', 'url is required.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return jsonError(res, 400, 'INVALID_URL', 'A valid image URL is required.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return jsonError(res, 400, 'INVALID_URL_PROTOCOL', 'Only http and https URLs are supported.');
  }

  const response = await fetch(parsedUrl);
  if (!response.ok) {
    return jsonError(res, 400, 'REMOTE_IMAGE_FETCH_FAILED');
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxLogoSize) {
    return jsonError(res, 400, 'LOGO_FILE_TOO_LARGE');
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!allowedLogoMimeTypes.has(contentType)) {
    return jsonError(res, 400, 'INVALID_LOGO_FILE_TYPE');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxLogoSize) {
    return jsonError(res, 400, 'LOGO_FILE_TOO_LARGE');
  }

  const extFromPath = path.extname(parsedUrl.pathname).toLowerCase();
  const ext =
    allowedLogoExtensions.has(extFromPath)
      ? extFromPath
      : contentType === 'image/jpeg'
        ? '.jpg'
        : contentType === 'image/webp'
          ? '.webp'
          : contentType.includes('icon')
            ? '.ico'
            : '.png';
  const fileName = safeLogoFileName(`remote${ext}`);
  ensureLogoUploadDir();
  await fs.promises.writeFile(path.join(logoUploadDir, fileName), buffer);

  return res.status(201).json({
    ok: true,
    data: { url: logoUrlForFile(fileName) },
  });
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
