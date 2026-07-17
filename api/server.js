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
const adUploadDir =
  process.env.AD_UPLOAD_DIR || '/home/user/web/junchae.com/public_html/uploads/ads';

const logoPublicPath = '/uploads/logos';
const adPublicPath = '/uploads/ads';
const maxLogoSize = 2 * 1024 * 1024;
const maxAdImageSize = 5 * 1024 * 1024;
const allowedLogoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico']);
const allowedAdImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedLogoMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const allowedAdImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

const categoryColumns = [
  'id',
  'name',
  'mode',
  'sort_order',
  'created_at',
  'updated_at',
];

const adColumns = [
  'id',
  'mode',
  'placement',
  'title',
  'description',
  'url',
  'badge_label',
  'badge_type',
  'image',
  'script_code',
  'expires_at',
  'is_active',
  'sort_order',
  'position_after',
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

const editableAdColumns = [
  'mode',
  'placement',
  'title',
  'description',
  'url',
  'badge_label',
  'badge_type',
  'image',
  'script_code',
  'expires_at',
  'is_active',
  'sort_order',
  'position_after',
];

function ensureDir(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function safeFileName(prefix, originalName, allowedExtensions, fallbackExt) {
  const ext = path.extname(originalName || '').toLowerCase();
  const safeExt = allowedExtensions.has(ext) ? ext : fallbackExt;
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}-${Date.now()}-${random}${safeExt}`;
}

function publicUrlForFile(publicPath, fileName) {
  return `${publicPath}/${fileName}`;
}

function makeStorage(uploadDir, prefix, allowedExtensions, fallbackExt) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        ensureDir(uploadDir);
        cb(null, uploadDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      cb(null, safeFileName(prefix, file.originalname, allowedExtensions, fallbackExt));
    },
  });
}

const uploadLogo = multer({
  storage: makeStorage(logoUploadDir, 'logo', allowedLogoExtensions, '.png'),
  limits: { fileSize: maxLogoSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedLogoExtensions.has(ext) || !allowedLogoMimeTypes.has(file.mimetype)) {
      return cb(new Error('INVALID_LOGO_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

const uploadAdImage = multer({
  storage: makeStorage(adUploadDir, 'ad', allowedAdImageExtensions, '.png'),
  limits: { fileSize: maxAdImageSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedAdImageExtensions.has(ext) || !allowedAdImageMimeTypes.has(file.mimetype)) {
      return cb(new Error('INVALID_AD_IMAGE_FILE_TYPE'));
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

function normalizeRequiredText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSortOrder(value) {
  const sortOrder = Number(value);
  return Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0;
}

function normalizeMode(value) {
  const mode = normalizeOptionalText(value);
  if (mode === 'secure') return 'secure';
  if (mode === 'standard' || mode === 'normal') return 'normal';
  return 'normal';
}

function normalizeBooleanInt(value, fallback = 1) {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  return fallback;
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function normalizeSiteInput(body) {
  return {
    name: normalizeRequiredText(body.name),
    url: normalizeRequiredText(body.url),
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
      updates[column] = normalizeRequiredText(body[column]);
    } else {
      updates[column] = normalizeOptionalText(body[column]);
    }
  });

  return updates;
}

function normalizeCategoryInput(body) {
  return {
    name: normalizeRequiredText(body.name),
    mode: normalizeMode(body.mode),
    sort_order: normalizeSortOrder(body.sort_order),
  };
}

function normalizeAdInput(body) {
  return {
    mode: normalizeMode(body.mode),
    placement: normalizeOptionalText(body.placement) || 'top',
    title: normalizeRequiredText(body.title),
    description: normalizeOptionalText(body.description ?? body.subtitle),
    url: normalizeOptionalText(body.url),
    badge_label: normalizeOptionalText(body.badge_label ?? body.badge) || 'AD',
    badge_type: normalizeOptionalText(body.badge_type ?? body.badgeColor) || 'blue',
    image: normalizeOptionalText(body.image ?? body.imageUrl),
    script_code: normalizeOptionalText(body.script_code ?? body.script) || '',
    expires_at: normalizeDate(body.expires_at ?? body.expiresAt),
    is_active: normalizeBooleanInt(body.is_active ?? body.isActive, 1),
    sort_order: normalizeSortOrder(body.sort_order),
    position_after:
      body.position_after === null || body.position_after === undefined || body.position_after === ''
        ? null
        : normalizeSortOrder(body.position_after),
  };
}

function pickEditableAdUpdates(body) {
  const normalized = normalizeAdInput({ ...body, title: body.title ?? 'placeholder' });
  const updates = {};

  editableAdColumns.forEach((column) => {
    const aliases = {
      description: ['description', 'subtitle'],
      badge_label: ['badge_label', 'badge'],
      badge_type: ['badge_type', 'badgeColor'],
      script_code: ['script_code', 'script'],
      expires_at: ['expires_at', 'expiresAt'],
      is_active: ['is_active', 'isActive'],
      position_after: ['position_after', 'targetCategoryIndex'],
      image: ['image', 'imageUrl'],
    };
    const keys = aliases[column] || [column];
    if (!keys.some((key) => Object.prototype.hasOwnProperty.call(body, key))) return;
    updates[column] = normalized[column];
  });

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    updates.title = normalizeRequiredText(body.title);
  }

  return updates;
}

async function getSiteById(id) {
  const [rows] = await db.execute(
    `SELECT ${siteColumns.join(', ')} FROM sites WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getCategoryById(id) {
  const [rows] = await db.execute(
    `SELECT ${categoryColumns.join(', ')} FROM categories WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getAdById(id) {
  const [rows] = await db.execute(
    `SELECT ${adColumns.join(', ')} FROM ads WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      mode VARCHAR(50) NOT NULL DEFAULT 'normal',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_category_mode (name, mode)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mode VARCHAR(50) NOT NULL DEFAULT 'normal',
      placement VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      url VARCHAR(500) NULL,
      badge_label VARCHAR(50) NULL,
      badge_type VARCHAR(50) NULL,
      image VARCHAR(500) NULL,
      script_code TEXT NULL,
      expires_at DATE NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      position_after INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    INSERT IGNORE INTO categories (name, mode, sort_order)
    SELECT DISTINCT category, 'normal', 0
    FROM sites
    WHERE category IS NOT NULL AND category <> ''
  `);
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

app.get('/api/categories', asyncRoute(async (req, res) => {
  const values = [];
  let where = '';
  if (req.query.mode) {
    where = 'WHERE mode = ?';
    values.push(normalizeMode(req.query.mode));
  }

  const [rows] = await db.execute(
    `SELECT ${categoryColumns.join(', ')} FROM categories ${where} ORDER BY sort_order ASC, id ASC`,
    values
  );
  res.json({ ok: true, data: rows });
}));

app.post('/api/categories', asyncRoute(async (req, res) => {
  const category = normalizeCategoryInput(req.body || {});
  if (!category.name) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name is required.');
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO categories (name, mode, sort_order) VALUES (?, ?, ?)',
      [category.name, category.mode, category.sort_order]
    );
    const created = await getCategoryById(result.insertId);
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return jsonError(res, 409, 'DUPLICATE_CATEGORY', 'Category already exists in this mode.');
    }
    throw err;
  }
}));

app.put('/api/categories/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const existing = await getCategoryById(id);
  if (!existing) {
    return jsonError(res, 404, 'NOT_FOUND', 'Category not found.');
  }

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
    updates.name = normalizeRequiredText(req.body.name);
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'mode')) {
    updates.mode = normalizeMode(req.body.mode);
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'sort_order')) {
    updates.sort_order = normalizeSortOrder(req.body.sort_order);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'name') && !updates.name) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name cannot be empty.');
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'No editable fields were provided.');
  }

  try {
    const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(id);
    const [result] = await db.execute(`UPDATE categories SET ${setClause} WHERE id = ?`, values);
    if (Object.prototype.hasOwnProperty.call(updates, 'name') && existing.mode === 'normal') {
      await db.execute('UPDATE sites SET category = ? WHERE category = ?', [updates.name, existing.name]);
    }

    const updated = await getCategoryById(id);
    return res.json({ ok: true, data: updated });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return jsonError(res, 409, 'DUPLICATE_CATEGORY', 'Category already exists in this mode.');
    }
    throw err;
  }
}));

app.delete('/api/categories/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const existing = await getCategoryById(id);
  if (!existing) {
    return jsonError(res, 404, 'NOT_FOUND', 'Category not found.');
  }

  const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Category not found.');
  }

  if (existing.mode === 'normal') {
    await db.execute('UPDATE sites SET category = NULL WHERE category = ?', [existing.name]);
  }

  return res.json({ ok: true, data: { id } });
}));

app.get('/api/ads', asyncRoute(async (req, res) => {
  const clauses = [];
  const values = [];

  if (req.query.mode) {
    clauses.push('mode = ?');
    values.push(normalizeMode(req.query.mode));
  }
  if (req.query.placement) {
    clauses.push('placement = ?');
    values.push(normalizeOptionalText(req.query.placement));
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await db.execute(
    `SELECT ${adColumns.join(', ')} FROM ads ${where} ORDER BY sort_order ASC, id ASC`,
    values
  );
  res.json({ ok: true, data: rows });
}));

app.post('/api/ads', asyncRoute(async (req, res) => {
  const ad = normalizeAdInput(req.body || {});
  if (!ad.title) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'title is required.');
  }

  const [result] = await db.execute(
    `INSERT INTO ads
     (mode, placement, title, description, url, badge_label, badge_type, image, script_code, expires_at, is_active, sort_order, position_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ad.mode,
      ad.placement,
      ad.title,
      ad.description,
      ad.url,
      ad.badge_label,
      ad.badge_type,
      ad.image,
      ad.script_code,
      ad.expires_at,
      ad.is_active,
      ad.sort_order,
      ad.position_after,
    ]
  );

  const created = await getAdById(result.insertId);
  return res.status(201).json({ ok: true, data: created });
}));

app.put('/api/ads/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const updates = pickEditableAdUpdates(req.body || {});
  if (Object.prototype.hasOwnProperty.call(updates, 'title') && !updates.title) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'title cannot be empty.');
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'No editable fields were provided.');
  }

  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(id);

  const [result] = await db.execute(`UPDATE ads SET ${setClause} WHERE id = ?`, values);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Ad not found.');
  }

  const updated = await getAdById(id);
  return res.json({ ok: true, data: updated });
}));

app.patch('/api/ads/:id/toggle', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const isActive = normalizeBooleanInt(req.body?.is_active ?? req.body?.isActive, 1);
  const [result] = await db.execute('UPDATE ads SET is_active = ? WHERE id = ?', [isActive, id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Ad not found.');
  }

  const updated = await getAdById(id);
  return res.json({ ok: true, data: updated });
}));

app.delete('/api/ads/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const [result] = await db.execute('DELETE FROM ads WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Ad not found.');
  }

  return res.json({ ok: true, data: { id } });
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
      data: { url: publicUrlForFile(logoPublicPath, req.file.filename) },
    });
  });
});

app.post('/api/uploads/ad-image', (req, res) => {
  uploadAdImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('Ad image upload error:', err);
      const error =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'AD_IMAGE_FILE_TOO_LARGE'
          : err.message === 'INVALID_AD_IMAGE_FILE_TYPE'
            ? 'INVALID_AD_IMAGE_FILE_TYPE'
            : 'AD_IMAGE_UPLOAD_FAILED';
      return jsonError(res, 400, error);
    }

    if (!req.file) {
      return jsonError(res, 400, 'AD_IMAGE_FILE_REQUIRED', 'form-data field "image" is required.');
    }

    return res.status(201).json({
      ok: true,
      data: { url: publicUrlForFile(adPublicPath, req.file.filename) },
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
  const fileName = safeFileName('logo', `remote${ext}`, allowedLogoExtensions, '.png');
  ensureDir(logoUploadDir);
  await fs.promises.writeFile(path.join(logoUploadDir, fileName), buffer);

  return res.status(201).json({
    ok: true,
    data: { url: publicUrlForFile(logoPublicPath, fileName) },
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

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
