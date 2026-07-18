require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const app = express();
const port = Number(process.env.PORT || 3000);

const logoUploadDir =
  process.env.LOGO_UPLOAD_DIR || '/home/user/web/junchae.com/public_html/uploads/logos';
const adUploadDir =
  process.env.AD_UPLOAD_DIR || '/home/user/web/junchae.com/public_html/uploads/ads';

const logoPublicPath = '/uploads/logos';
const adPublicPath = '/uploads/ads';
const adminApiToken = (process.env.ADMIN_API_TOKEN || '').trim();
const adminAuthMode = 'normal';
const adminAuthSection = 'admin_auth';
const defaultAdminPath = 'admin';
const defaultAdminUsername = 'admin1004';
const defaultAdminPassword = 'change-me-now';
const scryptAsync = promisify(crypto.scrypt);
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

if (!adminApiToken) {
  console.warn('ADMIN_API_TOKEN is not configured');
}

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
  'mode',
  'name',
  'url',
  'logo',
  'status',
  'category',
  'description',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_slug',
  'seo_h1',
  'seo_canonical',
  'seo_og_title',
  'seo_og_description',
  'seo_og_image',
  'seo_score',
  'seo_updated_at',
  'is_hidden',
  'is_featured',
  'featured_order',
  'sort_order',
  'created_at',
  'updated_at',
];

const categoryColumns = [
  'id',
  'name',
  'mode',
  'sort_order',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_intro',
  'seo_faq',
  'seo_updated_at',
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

const seoColumns = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_slug',
  'seo_h1',
  'seo_canonical',
  'seo_og_title',
  'seo_og_description',
  'seo_og_image',
  'seo_score',
];

const siteControlColumns = [
  'is_hidden',
  'is_featured',
  'featured_order',
  'sort_order',
];

const categorySeoColumns = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_intro',
  'seo_faq',
];

const editableSiteColumns = [
  'mode',
  'name',
  'url',
  'category',
  'description',
  'logo',
  'status',
  'is_hidden',
  'is_featured',
  'featured_order',
  'sort_order',
  ...seoColumns,
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

function tokenMatches(expectedToken, receivedToken) {
  if (!expectedToken || typeof receivedToken !== 'string') return false;

  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(receivedToken);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function requireAdminToken(req, res, next) {
  if (!adminApiToken) return next();

  if (!tokenMatches(adminApiToken, req.get('x-admin-token'))) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return next();
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

function normalizeSiteStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'normal' || status === 'active' || status === '정상') return 'normal';
  if (status === 'busy' || status === 'congested' || status === '혼잡') return 'busy';
  if (status === 'down' || status === 'offline' || status === 'slow' || status === '접속불가') return 'down';
  if (status === 'checking' || status === 'unknown' || status === '확인중') return 'checking';
  return 'checking';
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

function normalizeSafeKey(value, fallback = '') {
  const text = normalizeOptionalText(value);
  if (!text || !/^[a-zA-Z0-9_-]+$/.test(text)) return fallback;
  return text;
}

function normalizeAdminPath(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[\/\\]+/g, '').replace(/\s+/g, '').trim();
  if (!clean || !/^[a-zA-Z0-9_-]+$/.test(clean)) return fallback;
  return clean;
}

function normalizeAdminUsername(value, fallback = '') {
  const text = normalizeRequiredText(value);
  return text || fallback;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const [scheme, salt, hashHex] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== 64) return false;

  const actual = await scryptAsync(String(password), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function normalizeSeoScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(score)));
}

function slugify(value) {
  return normalizeOptionalText(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255) || 'site';
}

function maskSecret(value) {
  const text = normalizeOptionalText(value);
  if (!text) return '';
  if (text.length <= 8) return '••••••••';
  return `${text.slice(0, 3)}-••••••••••••${text.slice(-4)}`;
}

function normalizeSiteInput(body) {
  return {
    mode: normalizeMode(body.mode),
    name: normalizeRequiredText(body.name),
    url: normalizeRequiredText(body.url),
    category: normalizeOptionalText(body.category),
    description: normalizeOptionalText(body.description),
    logo: normalizeOptionalText(body.logo),
    status: normalizeSiteStatus(body.status || 'normal'),
    is_hidden: normalizeBooleanInt(body.is_hidden ?? body.isHidden, 0),
    is_featured: normalizeBooleanInt(body.is_featured ?? body.isFeatured, 0),
    featured_order: normalizeSortOrder(body.featured_order ?? body.featuredOrder),
    sort_order: normalizeSortOrder(body.sort_order ?? body.sortOrder),
  };
}

function normalizeCategorySeoValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  return normalizeOptionalText(value);
}

function pickEditableSiteUpdates(body) {
  const updates = {};

  editableSiteColumns.forEach((column) => {
    const aliases = {
      sort_order: ['sort_order', 'sortOrder'],
      is_hidden: ['is_hidden', 'isHidden'],
      is_featured: ['is_featured', 'isFeatured'],
      featured_order: ['featured_order', 'featuredOrder'],
    };
    const keys = aliases[column] || [column];
    if (!keys.some((key) => Object.prototype.hasOwnProperty.call(body, key))) return;

    if (column === 'sort_order') {
      updates[column] = normalizeSortOrder(body.sort_order ?? body.sortOrder);
    } else if (column === 'featured_order') {
      updates[column] = normalizeSortOrder(body.featured_order ?? body.featuredOrder);
    } else if (column === 'is_hidden') {
      updates[column] = normalizeBooleanInt(body.is_hidden ?? body.isHidden, 0);
    } else if (column === 'is_featured') {
      updates[column] = normalizeBooleanInt(body.is_featured ?? body.isFeatured, 0);
    } else if (column === 'seo_score') {
      updates[column] = normalizeSeoScore(body[column]);
    } else if (column === 'mode') {
      updates[column] = normalizeMode(body[column]);
    } else if (column === 'status') {
      updates[column] = normalizeSiteStatus(body[column]);
    } else if (column === 'name' || column === 'url') {
      updates[column] = normalizeRequiredText(body[column]);
    } else {
      updates[column] = normalizeOptionalText(body[column]);
    }
  });

  return updates;
}

function normalizeCategoryInput(body) {
  const category = {
    name: normalizeRequiredText(body.name),
    mode: normalizeMode(body.mode),
    sort_order: normalizeSortOrder(body.sort_order),
  };
  categorySeoColumns.forEach((column) => {
    category[column] = normalizeCategorySeoValue(body[column]);
  });
  return category;
}

function pickEditableCategoryUpdates(body) {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body || {}, 'name')) {
    updates.name = normalizeRequiredText(body.name);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'mode')) {
    updates.mode = normalizeMode(body.mode);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'sort_order')) {
    updates.sort_order = normalizeSortOrder(body.sort_order);
  }

  let hasSeoUpdate = false;
  categorySeoColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(body || {}, column)) return;
    updates[column] = normalizeCategorySeoValue(body[column]);
    hasSeoUpdate = true;
  });
  if (hasSeoUpdate) updates.seo_updated_at = new Date();

  return updates;
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

async function ensureColumn(tableName, columnName, definition, afterColumn) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (Number(rows[0]?.count) > 0) return;

  const afterClause = afterColumn ? ` AFTER ${afterColumn}` : '';
  await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}${afterClause}`);
}

async function initializeDatabase() {
  await ensureColumn('sites', 'mode', "VARCHAR(50) NOT NULL DEFAULT 'normal'", 'id');
  await ensureColumn('sites', 'seo_title', 'VARCHAR(255) NULL', 'description');
  await ensureColumn('sites', 'seo_description', 'TEXT NULL', 'seo_title');
  await ensureColumn('sites', 'seo_keywords', 'TEXT NULL', 'seo_description');
  await ensureColumn('sites', 'seo_slug', 'VARCHAR(255) NULL', 'seo_keywords');
  await ensureColumn('sites', 'seo_h1', 'VARCHAR(255) NULL', 'seo_slug');
  await ensureColumn('sites', 'seo_canonical', 'VARCHAR(500) NULL', 'seo_h1');
  await ensureColumn('sites', 'seo_og_title', 'VARCHAR(255) NULL', 'seo_canonical');
  await ensureColumn('sites', 'seo_og_description', 'TEXT NULL', 'seo_og_title');
  await ensureColumn('sites', 'seo_og_image', 'VARCHAR(500) NULL', 'seo_og_description');
  await ensureColumn('sites', 'seo_score', 'INT NOT NULL DEFAULT 0', 'seo_og_image');
  await ensureColumn('sites', 'seo_updated_at', 'TIMESTAMP NULL', 'seo_score');
  await ensureColumn('sites', 'sort_order', 'INT NOT NULL DEFAULT 0', 'status');
  await ensureColumn('sites', 'is_hidden', 'TINYINT(1) NOT NULL DEFAULT 0', 'sort_order');
  await ensureColumn('sites', 'is_featured', 'TINYINT(1) NOT NULL DEFAULT 0', 'is_hidden');
  await ensureColumn('sites', 'featured_order', 'INT NOT NULL DEFAULT 0', 'is_featured');
  await db.execute("UPDATE sites SET mode = 'normal' WHERE mode IS NULL OR mode = ''");

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

  await ensureColumn('categories', 'seo_title', 'VARCHAR(255) NULL', 'sort_order');
  await ensureColumn('categories', 'seo_description', 'TEXT NULL', 'seo_title');
  await ensureColumn('categories', 'seo_keywords', 'TEXT NULL', 'seo_description');
  await ensureColumn('categories', 'seo_intro', 'TEXT NULL', 'seo_keywords');
  await ensureColumn('categories', 'seo_faq', 'LONGTEXT NULL', 'seo_intro');
  await ensureColumn('categories', 'seo_updated_at', 'TIMESTAMP NULL', 'seo_faq');

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
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mode VARCHAR(50) NOT NULL DEFAULT 'normal',
      section VARCHAR(100) NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value LONGTEXT NULL,
      is_secret TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_setting (mode, section, setting_key)
    )
  `);

  await ensureAdminAuthDefaults();

  await db.execute(`
    INSERT IGNORE INTO categories (name, mode, sort_order)
    SELECT DISTINCT category, mode, 0
    FROM sites
    WHERE category IS NOT NULL AND category <> ''
  `);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, data: { status: 'healthy' } });
});

app.get('/api/admin/config', asyncRoute(async (req, res) => {
  const config = await getAdminAuthConfig();
  return res.json({
    ok: true,
    data: {
      adminPath: config.adminPath,
      adminUsername: config.adminUsername,
    },
  });
}));

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const username = normalizeRequiredText(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const config = await getAdminAuthConfig();

  const usernameMatches = tokenMatches(config.adminUsername, username);
  const passwordMatches = await verifyPassword(password, config.adminPasswordHash);

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  return res.json({ ok: true });
}));

app.post('/api/admin/auth-settings', requireAdminToken, asyncRoute(async (req, res) => {
  const adminPath = normalizeAdminPath(req.body?.adminPath);
  const adminUsername = normalizeAdminUsername(req.body?.adminUsername);
  const adminPassword = typeof req.body?.adminPassword === 'string' ? req.body.adminPassword : '';

  if (!adminPath) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'adminPath may contain only letters, numbers, hyphens, and underscores.');
  }
  if (!adminUsername) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'adminUsername is required.');
  }
  if (adminPassword.trim() && adminPassword.length < 6) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'adminPassword must be at least 6 characters.');
  }

  const settings = {
    admin_path: adminPath,
    admin_username: adminUsername,
  };
  const secretKeys = [];

  if (adminPassword.trim()) {
    settings.admin_password_hash = await hashPassword(adminPassword);
    secretKeys.push('admin_password_hash');
  }

  await saveSettings(adminAuthMode, adminAuthSection, settings, secretKeys);
  const config = await getAdminAuthConfig();

  return res.json({
    ok: true,
    data: {
      adminPath: config.adminPath,
      adminUsername: config.adminUsername,
    },
  });
}));

async function getSettings(mode, section, includeSecrets = false) {
  const [rows] = await db.execute(
    `SELECT setting_key, setting_value, is_secret
     FROM app_settings
     WHERE mode = ? AND section = ?
     ORDER BY setting_key ASC`,
    [mode, section]
  );

  return rows.reduce((acc, row) => {
    acc[row.setting_key] = row.is_secret && !includeSecrets
      ? maskSecret(row.setting_value)
      : row.setting_value || '';
    return acc;
  }, {});
}

async function getSettingValue(mode, section, key) {
  const [rows] = await db.execute(
    `SELECT setting_value
     FROM app_settings
     WHERE mode = ? AND section = ? AND setting_key = ?
     LIMIT 1`,
    [mode, section, key]
  );
  return rows[0]?.setting_value || '';
}

async function saveSettings(mode, section, settings, secretKeys = []) {
  const entries = Object.entries(settings || {});
  for (const [rawKey, rawValue] of entries) {
    const settingKey = normalizeSafeKey(rawKey);
    if (!settingKey) continue;

    const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
    const isSecret = secretKeys.includes(settingKey) ? 1 : 0;

    if (isSecret && !value.trim()) continue;
    if (isSecret && value.includes('••••')) continue;

    await db.execute(
      `INSERT INTO app_settings (mode, section, setting_key, setting_value, is_secret)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         is_secret = VALUES(is_secret)`,
      [mode, section, settingKey, value, isSecret]
    );
  }
}

async function ensureAdminAuthDefaults() {
  const currentPath = normalizeAdminPath(
    await getSettingValue(adminAuthMode, adminAuthSection, 'admin_path'),
    ''
  );
  const currentUsername = normalizeAdminUsername(
    await getSettingValue(adminAuthMode, adminAuthSection, 'admin_username'),
    ''
  );
  const currentPasswordHash = await getSettingValue(
    adminAuthMode,
    adminAuthSection,
    'admin_password_hash'
  );

  const defaults = {};
  const secretKeys = [];

  if (!currentPath) defaults.admin_path = defaultAdminPath;
  if (!currentUsername) defaults.admin_username = defaultAdminUsername;
  if (!currentPasswordHash || !currentPasswordHash.startsWith('scrypt$')) {
    defaults.admin_password_hash = await hashPassword(defaultAdminPassword);
    secretKeys.push('admin_password_hash');
  }

  if (Object.keys(defaults).length > 0) {
    await saveSettings(adminAuthMode, adminAuthSection, defaults, secretKeys);
  }
}

async function getAdminAuthConfig() {
  await ensureAdminAuthDefaults();

  const adminPath = normalizeAdminPath(
    await getSettingValue(adminAuthMode, adminAuthSection, 'admin_path'),
    defaultAdminPath
  );
  const adminUsername = normalizeAdminUsername(
    await getSettingValue(adminAuthMode, adminAuthSection, 'admin_username'),
    defaultAdminUsername
  );
  const adminPasswordHash =
    (await getSettingValue(adminAuthMode, adminAuthSection, 'admin_password_hash')) ||
    (await hashPassword(defaultAdminPassword));

  return { adminPath, adminUsername, adminPasswordHash };
}

function formatSeo(site) {
  return {
    id: site.id,
    seo_title: site.seo_title || `${site.name} 최신 정보`,
    seo_description: site.seo_description || site.description || `${site.name} 사이트 정보와 접속 링크를 확인하세요.`,
    seo_keywords: site.seo_keywords || site.name,
    seo_slug: site.seo_slug || slugify(site.name),
    seo_h1: site.seo_h1 || site.name,
    seo_canonical: site.seo_canonical || site.url,
    seo_og_title: site.seo_og_title || site.seo_title || `${site.name} 최신 정보`,
    seo_og_description: site.seo_og_description || site.seo_description || site.description || '',
    seo_og_image: site.seo_og_image || site.logo || '',
    seo_score: Number(site.seo_score) || 0,
    seo_updated_at: site.seo_updated_at || null,
  };
}

async function getDeepSeekConfig(mode) {
  const apiKey =
    (await getSettingValue(mode, 'deepseek', 'api_key')) ||
    process.env.DEEPSEEK_API_KEY ||
    '';
  const model =
    (await getSettingValue(mode, 'deepseek', 'model')) ||
    process.env.DEEPSEEK_MODEL ||
    'deepseek-chat';
  const promptTemplate =
    (await getSettingValue(mode, 'deepseek', 'prompt_template')) ||
    '다음 사이트의 검색 친화적인 한국어 SEO 데이터를 JSON으로 생성하세요.';
  return { apiKey, model, promptTemplate };
}

async function callDeepSeek({ mode, messages }) {
  const { apiKey, model } = await getDeepSeekConfig(mode);
  if (!apiKey) {
    const err = new Error('DeepSeek API key is not configured');
    err.status = 400;
    err.code = 'DEEPSEEK_API_KEY_MISSING';
    throw err;
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(body?.error?.message || body?.message || 'DeepSeek request failed.');
    err.status = response.status;
    err.code = 'DEEPSEEK_REQUEST_FAILED';
    err.body = body;
    throw err;
  }

  return body?.choices?.[0]?.message?.content || '';
}

function parseJsonFromText(text) {
  const cleanText = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleanText);
  } catch {
    const jsonObject = extractFirstJsonObject(cleanText);
    if (!jsonObject) return null;
    try {
      return JSON.parse(jsonObject);
    } catch {
      return null;
    }
  }
}

function extractFirstJsonObject(text) {
  const source = String(text || '');
  const start = source.indexOf('{');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  return '';
}

function isDeepSeekRefusalText(text) {
  const normalized = String(text || '').toLowerCase();
  return [
    'cannot assist',
    "can't assist",
    'unable to assist',
    'i cannot',
    'i can’t',
    'policy',
    'refuse',
    'sorry',
    '죄송',
    '도와드릴 수',
    '응답할 수',
  ].some((pattern) => normalized.includes(pattern));
}

function normalizeGeneratedCategorySeo(parsed, fallback) {
  if (!parsed || typeof parsed !== 'object') return null;

  let seoFaq = parsed.seo_faq;
  if (typeof seoFaq === 'string') {
    try {
      seoFaq = JSON.parse(seoFaq);
    } catch {
      seoFaq = [];
    }
  }

  const faq = Array.isArray(seoFaq)
    ? seoFaq
        .map((item) => ({
          question: normalizeOptionalText(item?.question),
          answer: normalizeOptionalText(item?.answer),
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, 6)
    : [];

  const result = {
    seo_title: normalizeOptionalText(parsed.seo_title),
    seo_description: normalizeOptionalText(parsed.seo_description),
    seo_keywords: Array.isArray(parsed.seo_keywords)
      ? parsed.seo_keywords.map(normalizeOptionalText).filter(Boolean).join(', ')
      : normalizeOptionalText(parsed.seo_keywords),
    seo_intro: normalizeOptionalText(parsed.seo_intro),
    seo_faq: faq,
  };

  if (!result.seo_title || !result.seo_description || !result.seo_intro || result.seo_faq.length === 0) {
    return null;
  }

  return {
    seo_title: result.seo_title || fallback.seo_title,
    seo_description: result.seo_description || fallback.seo_description,
    seo_keywords: result.seo_keywords || fallback.seo_keywords,
    seo_intro: result.seo_intro || fallback.seo_intro,
    seo_faq: result.seo_faq.length ? result.seo_faq : fallback.seo_faq,
  };
}

function safeSecureCategoryLabel(categoryName) {
  const name = normalizeOptionalText(categoryName) || '보안';
  const normalized = name.replace(/\s+/g, '').toLowerCase();
  if (normalized.includes('스포츠') || normalized.includes('카지노')) return '스포츠·게임 링크 상태 카테고리';
  if (normalized.includes('토렌트')) return '파일 공유 링크 상태 카테고리';
  if (normalized.includes('성인')) return '성인 인증 콘텐츠 링크 상태 카테고리';
  if (normalized.includes('웹툰')) return '웹툰 링크 상태 카테고리';
  return `${name} 링크 상태 카테고리`;
}

function fallbackCategorySeo(categoryName) {
  const name = normalizeOptionalText(categoryName) || '카테고리';
  return {
    seo_title: `${name} 링크 상태 확인 - 전체닷컴`,
    seo_description: `${name} 카테고리의 주소 변경 여부와 접속 상태를 확인할 수 있는 링크 안내 페이지입니다.`,
    seo_keywords: `${name}, 링크 상태, 주소 확인, 전체닷컴`,
    seo_intro: `이 페이지는 ${name} 관련 링크의 주소 상태와 분류 정보를 확인할 수 있도록 정리한 카테고리입니다. 각 항목은 관리자 검토와 접속 상태 기준에 따라 관리됩니다.`,
    seo_faq: [
      {
        question: '이 카테고리는 어떤 기준으로 정리되나요?',
        answer: '카테고리 적합성, 접속 상태, 관리자 검토 기준에 따라 정리됩니다.',
      },
      {
        question: '접속 상태는 어떻게 표시되나요?',
        answer: '정상, 혼잡, 접속불가, 확인중 상태로 구분해 표시합니다.',
      },
      {
        question: '목록 순서는 어떻게 정해지나요?',
        answer: '관리자가 중요도와 최신성 기준으로 순서를 조정할 수 있습니다.',
      },
    ],
  };
}

function sendCategorySeoFallback(res, categoryName, message = 'DeepSeek 생성 실패로 기본 SEO 템플릿을 적용했습니다.') {
  const fallback = fallbackCategorySeo(categoryName);
  return res.json({
    ok: true,
    fallback: true,
    message,
    data: {
      ...fallback,
      fallback: true,
      message,
    },
  });
}

app.get('/api/settings', asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.query.mode);
  const section = normalizeSafeKey(req.query.section);
  if (!section) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'section is required.');
  }
  if (section === adminAuthSection) {
    const config = await getAdminAuthConfig();
    return res.json({
      ok: true,
      data: {
        admin_path: config.adminPath,
        admin_username: config.adminUsername,
      },
    });
  }
  const settings = await getSettings(mode, section, false);
  return res.json({ ok: true, data: settings });
}));

app.post('/api/settings', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const section = normalizeSafeKey(req.body?.section);
  if (!section) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'section is required.');
  }
  if (section === adminAuthSection) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'Use /api/admin/auth-settings for admin auth settings.');
  }

  const secretKeys = section === 'deepseek' ? ['api_key'] : [];
  await saveSettings(mode, section, req.body?.settings || {}, secretKeys);
  const settings = await getSettings(mode, section, false);
  return res.json({ ok: true, data: settings });
}));

app.get('/api/sites', asyncRoute(async (req, res) => {
  const values = [];
  let where = '';
  if (req.query.mode) {
    where = 'WHERE mode = ?';
    values.push(normalizeMode(req.query.mode));
  }

  const [rows] = await db.execute(
    `SELECT ${siteColumns.join(', ')} FROM sites ${where} ORDER BY category ASC, sort_order ASC, name ASC, id ASC`,
    values
  );
  res.json({ ok: true, data: rows });
}));

app.get('/api/sites/:id/seo', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const site = await getSiteById(id);
  if (!site) return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');

  return res.json({ ok: true, data: formatSeo(site) });
}));

app.patch('/api/sites/:id/seo', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const updates = {};
  seoColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, column)) return;
    updates[column] = column === 'seo_score'
      ? normalizeSeoScore(req.body[column])
      : normalizeOptionalText(req.body[column]);
  });
  siteControlColumns.forEach((column) => {
    const aliases = {
      sort_order: ['sort_order', 'sortOrder'],
      is_hidden: ['is_hidden', 'isHidden'],
      is_featured: ['is_featured', 'isFeatured'],
      featured_order: ['featured_order', 'featuredOrder'],
    };
    const keys = aliases[column] || [column];
    if (!keys.some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key))) return;
    if (column === 'is_hidden' || column === 'is_featured') {
      updates[column] = normalizeBooleanInt(req.body[column] ?? req.body[aliases[column][1]], 0);
    } else {
      updates[column] = normalizeSortOrder(req.body[column] ?? req.body[aliases[column][1]]);
    }
  });
  updates.seo_updated_at = new Date();

  const entries = Object.entries(updates);
  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(id);

  const [result] = await db.execute(`UPDATE sites SET ${setClause} WHERE id = ?`, values);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: formatSeo(updated) });
}));

app.post('/api/deepseek/test', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const site = req.body?.site || {};
  const { promptTemplate } = await getDeepSeekConfig(mode);

  try {
    const content = await callDeepSeek({
      mode,
      messages: [
        { role: 'system', content: 'You are a Korean SEO assistant. Do not reveal secrets.' },
        {
          role: 'user',
          content: `${promptTemplate}\n\n사이트명: ${site.name || ''}\nURL: ${site.url || ''}\n카테고리: ${site.category || ''}\n설명: ${site.description || ''}`,
        },
      ],
    });
    return res.json({ ok: true, data: { text: content } });
  } catch (err) {
    console.error('DeepSeek test error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    return jsonError(res, err.status || 500, err.code || 'DEEPSEEK_ERROR', err.message);
  }
}));

app.post('/api/deepseek/generate-seo', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const siteId = parseId(req.body?.site_id);
  if (!siteId) return jsonError(res, 400, 'INVALID_ID', 'site_id is required.');

  const site = await getSiteById(siteId);
  if (!site) return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');

  const { promptTemplate } = await getDeepSeekConfig(mode);
  const options = req.body?.options || {};
  const prompt = `
${promptTemplate}

아래 사이트의 SEO 데이터를 한국어 JSON으로 생성하세요.
반드시 JSON만 출력하세요.

사이트명: ${site.name}
URL: ${site.url}
카테고리: ${site.category || ''}
설명: ${site.description || ''}
톤: ${options.tone || '검색친화적이고 클릭을 유도하는 한국어'}
대상 국가: ${options.target_country || 'KR'}
대상 언어: ${options.target_language || 'ko'}

JSON 필드:
seo_title, seo_description, seo_keywords 배열, seo_slug, seo_h1,
seo_og_title, seo_og_description, seo_score 숫자, recommendations 배열
`;

  try {
    const text = await callDeepSeek({
      mode,
      messages: [
        { role: 'system', content: 'You are a Korean SEO expert. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    });
    const parsed = parseJsonFromText(text);
    return res.json({ ok: true, data: { text, json: parsed } });
  } catch (err) {
    console.error('DeepSeek SEO generation error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    return jsonError(res, err.status || 500, err.code || 'DEEPSEEK_ERROR', err.message);
  }
}));

app.post('/api/deepseek/generate-global-seo', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const sites = Array.isArray(req.body?.sites) ? req.body.sites : [];
  const { promptTemplate } = await getDeepSeekConfig(mode);

  const categorySummary = categories
    .map((category) => {
      if (typeof category === 'string') return category;
      return category?.name || '';
    })
    .filter(Boolean)
    .slice(0, 50)
    .join(', ');

  const siteSummary = sites
    .map((site) => {
      const name = site?.name || '';
      const category = site?.category || site?.categoryName || '';
      const description = site?.description || '';
      return [name, category, description].filter(Boolean).join(' / ');
    })
    .filter(Boolean)
    .slice(0, 80)
    .join('\n');

  const prompt = `
${promptTemplate}

junchae.com 메인사이트의 검색 노출용 Global SEO 데이터를 한국어로 생성하세요.
아래 카테고리와 사이트 목록을 참고하되, 과장된 표현이나 허위 문구는 피하세요.
반드시 JSON만 출력하세요.

카테고리:
${categorySummary || '카테고리 없음'}

사이트 목록:
${siteSummary || '사이트 없음'}

JSON 필드:
site_name, homepage_title, homepage_description, homepage_keywords,
canonical_url, og_title, og_description, og_image, og_type, robots,
recommendations 배열

기본 도메인은 https://junchae.com 입니다.
og_image 기본값은 /uploads/og/default-og.png 입니다.
og_type 기본값은 website 입니다.
robots 기본값은 index,follow 입니다.
`;

  try {
    const text = await callDeepSeek({
      mode,
      messages: [
        { role: 'system', content: 'You are a Korean technical SEO expert. Return valid JSON only and never reveal secrets.' },
        { role: 'user', content: prompt },
      ],
    });
    const parsed = parseJsonFromText(text);
    return res.json({ ok: true, data: { text, json: parsed } });
  } catch (err) {
    console.error('DeepSeek global SEO generation error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    return jsonError(res, err.status || 500, err.code || 'DEEPSEEK_ERROR', err.message);
  }
}));

app.post('/api/deepseek/generate-category-seo', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const isSecureMode = mode === 'secure';
  const categoryId = normalizeOptionalText(req.body?.categoryId);
  const categoryName = normalizeOptionalText(req.body?.categoryName);
  const siteNames = Array.isArray(req.body?.siteNames)
    ? req.body.siteNames.map(normalizeOptionalText).filter(Boolean).slice(0, 80)
    : [];

  if (!categoryName) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'categoryName is required.');
  }

  const { promptTemplate } = await getDeepSeekConfig(mode);
  const fallback = fallbackCategorySeo(categoryName);
  const safeCategoryLabel = isSecureMode ? safeSecureCategoryLabel(categoryName) : categoryName;
  const prompt = isSecureMode
    ? `
secure mode 카테고리 SEO 생성 전용 프롬프트입니다.
아래 입력은 민감하거나 오해될 수 있는 이름을 중립 라벨로 바꾼 것입니다.
특정 사이트 이용, 가입, 참여, 다운로드를 권장하지 마세요.
우회, 차단 회피, 불법 시청, 무료 다운로드, 무단 공유 같은 표현을 쓰지 마세요.
"주소 확인", "링크 상태", "카테고리 분류", "접속 상태", "최신 정보 확인" 중심으로 작성하세요.
홍보 문구가 아니라 중립적인 디렉토리 설명으로 작성하세요.
반드시 JSON만 반환하세요.
JSON 이외의 설명문은 금지합니다.

safeCategoryLabel: ${safeCategoryLabel}
siteCount: ${siteNames.length}

JSON 형식:
{
  "seo_title": "...",
  "seo_description": "...",
  "seo_keywords": "...",
  "seo_intro": "...",
  "seo_faq": [
    {"question":"...", "answer":"..."},
    {"question":"...", "answer":"..."},
    {"question":"...", "answer":"..."}
  ]
}
`
    : `
${promptTemplate}

아래 카테고리 페이지용 SEO 데이터를 한국어 JSON으로 생성하세요.
과장, 불법 조장, 우회 조장 표현은 피하고 "주소 확인", "링크 모음", "접속 상태 확인"처럼 순화하세요.
결과는 바로 저장되지 않으며 관리자 검토용 미리보기로 사용됩니다.
반드시 JSON만 출력하세요.

카테고리 ID: ${categoryId || ''}
카테고리명: ${categoryName}
사이트명 목록:
${siteNames.length ? siteNames.join(', ') : '사이트 없음'}

JSON 필드:
seo_title, seo_description, seo_keywords, seo_intro,
seo_faq 배열 [{"question":"...", "answer":"..."}]
`;

  try {
    const text = await callDeepSeek({
      mode,
      messages: [
        { role: 'system', content: 'You are a Korean technical SEO expert. Return valid JSON only and never reveal secrets.' },
        { role: 'user', content: prompt },
      ],
    });

    if (!normalizeOptionalText(text) || isDeepSeekRefusalText(text)) {
      if (isSecureMode) return sendCategorySeoFallback(res, categoryName);
      return jsonError(res, 502, 'DEEPSEEK_INVALID_RESPONSE', 'DeepSeek returned an empty or refused response.');
    }

    const parsed = parseJsonFromText(text);
    const normalized = normalizeGeneratedCategorySeo(parsed, fallback);
    if (!normalized) {
      if (isSecureMode) return sendCategorySeoFallback(res, categoryName);
      return jsonError(res, 502, 'DEEPSEEK_INVALID_JSON', 'DeepSeek response could not be parsed as valid category SEO JSON.');
    }

    return res.json({
      ok: true,
      data: {
        ...normalized,
        fallback: false,
        text,
        json: parsed,
      },
    });
  } catch (err) {
    console.error('DeepSeek category SEO generation error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    if (err.status === 401) {
      return jsonError(res, 401, 'DEEPSEEK_API_KEY_INVALID', 'DeepSeek API Key가 유효하지 않습니다.');
    }
    if (err.code === 'DEEPSEEK_API_KEY_MISSING') {
      return jsonError(res, 400, 'DEEPSEEK_API_KEY_MISSING', 'DeepSeek API Key가 설정되어 있지 않습니다.');
    }
    if (isSecureMode) return sendCategorySeoFallback(res, categoryName);
    return jsonError(res, err.status || 500, err.code || 'DEEPSEEK_ERROR', err.message);
  }
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

app.post('/api/categories', requireAdminToken, asyncRoute(async (req, res) => {
  const category = normalizeCategoryInput(req.body || {});
  if (!category.name) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name is required.');
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO categories
       (name, mode, sort_order, seo_title, seo_description, seo_keywords, seo_intro, seo_faq, seo_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.name,
        category.mode,
        category.sort_order,
        category.seo_title,
        category.seo_description,
        category.seo_keywords,
        category.seo_intro,
        category.seo_faq,
        categorySeoColumns.some((column) => category[column]) ? new Date() : null,
      ]
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

app.patch('/api/categories/reorder', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (items.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'items are required.');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of items) {
      const id = parseId(item?.id);
      if (!id) {
        await connection.rollback();
        return jsonError(res, 400, 'INVALID_ID', 'Each item requires a valid numeric id.');
      }
      await connection.execute(
        'UPDATE categories SET sort_order = ? WHERE id = ? AND mode = ?',
        [normalizeSortOrder(item.sort_order), id, mode]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const [rows] = await db.execute(
    `SELECT ${categoryColumns.join(', ')} FROM categories WHERE mode = ? ORDER BY sort_order ASC, id ASC`,
    [mode]
  );
  return res.json({ ok: true, data: rows });
}));

async function saveCategoryUpdates(req, res) {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const existing = await getCategoryById(id);
  if (!existing) {
    return jsonError(res, 404, 'NOT_FOUND', 'Category not found.');
  }

  const updates = pickEditableCategoryUpdates(req.body || {});

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
    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      await db.execute('UPDATE sites SET category = ? WHERE category = ? AND mode = ?', [
        updates.name,
        existing.name,
        existing.mode,
      ]);
    }

    const updated = await getCategoryById(id);
    return res.json({ ok: true, data: updated });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return jsonError(res, 409, 'DUPLICATE_CATEGORY', 'Category already exists in this mode.');
    }
    throw err;
  }
}

app.put('/api/categories/:id', requireAdminToken, asyncRoute(saveCategoryUpdates));

app.patch('/api/categories/:id', requireAdminToken, asyncRoute(saveCategoryUpdates));

app.patch('/api/categories/:id/seo', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const updates = {};
  categorySeoColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, column)) return;
    updates[column] = normalizeCategorySeoValue(req.body[column]);
  });
  updates.seo_updated_at = new Date();

  const entries = Object.entries(updates);
  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(id);

  const [result] = await db.execute(`UPDATE categories SET ${setClause} WHERE id = ?`, values);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Category not found.');
  }

  const updated = await getCategoryById(id);
  return res.json({ ok: true, data: updated });
}));

app.delete('/api/categories/:id', requireAdminToken, asyncRoute(async (req, res) => {
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

  await db.execute('UPDATE sites SET category = NULL WHERE category = ? AND mode = ?', [
    existing.name,
    existing.mode,
  ]);

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

app.post('/api/ads', requireAdminToken, asyncRoute(async (req, res) => {
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

async function saveAdUpdates(req, res) {
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
}

app.put('/api/ads/:id', requireAdminToken, asyncRoute(saveAdUpdates));

app.patch('/api/ads/:id', requireAdminToken, asyncRoute(saveAdUpdates));

app.patch('/api/ads/:id/toggle', requireAdminToken, asyncRoute(async (req, res) => {
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

app.delete('/api/ads/:id', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const [result] = await db.execute('DELETE FROM ads WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Ad not found.');
  }

  return res.json({ ok: true, data: { id } });
}));

app.post('/api/uploads/logo', requireAdminToken, (req, res) => {
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

app.post('/api/uploads/ad-image', requireAdminToken, (req, res) => {
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

app.post('/api/uploads/logo/from-url', requireAdminToken, asyncRoute(async (req, res) => {
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

app.post('/api/sites', requireAdminToken, asyncRoute(async (req, res) => {
  const site = normalizeSiteInput(req.body || {});

  if (!site.name || !site.url) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'name and url are required.');
  }

  const [result] = await db.execute(
    `INSERT INTO sites
     (mode, name, url, category, description, logo, status, is_hidden, is_featured, featured_order, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      site.mode,
      site.name,
      site.url,
      site.category,
      site.description,
      site.logo,
      site.status,
      site.is_hidden,
      site.is_featured,
      site.featured_order,
      site.sort_order,
    ]
  );

  const created = await getSiteById(result.insertId);
  return res.status(201).json({ ok: true, data: created });
}));

async function saveSiteUpdates(req, res) {
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
}

app.put('/api/sites/:id', requireAdminToken, asyncRoute(saveSiteUpdates));

app.patch('/api/sites/reorder', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const category = normalizeOptionalText(req.body?.category);
  const siteIds = Array.isArray(req.body?.siteIds) ? req.body.siteIds.map(parseId) : [];

  if (!category) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'category is required.');
  }
  if (siteIds.length === 0 || siteIds.some((id) => !id)) {
    return jsonError(res, 400, 'INVALID_ID', 'siteIds must contain valid numeric ids.');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const [index, id] of siteIds.entries()) {
      await connection.execute(
        'UPDATE sites SET sort_order = ? WHERE id = ? AND mode = ? AND category = ?',
        [index, id, mode, category]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const [rows] = await db.execute(
    `SELECT ${siteColumns.join(', ')}
     FROM sites
     WHERE mode = ? AND category = ?
     ORDER BY sort_order ASC, name ASC, id ASC`,
    [mode, category]
  );
  return res.json({ ok: true, data: rows });
}));

app.patch('/api/sites/:id', requireAdminToken, asyncRoute(saveSiteUpdates));

app.patch('/api/sites/:id/visibility', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const isHidden = normalizeBooleanInt(req.body?.is_hidden ?? req.body?.isHidden, 0);
  const [result] = await db.execute('UPDATE sites SET is_hidden = ? WHERE id = ?', [isHidden, id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.patch('/api/sites/:id/featured', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const isFeatured = normalizeBooleanInt(req.body?.is_featured ?? req.body?.isFeatured, 0);
  const featuredOrder = isFeatured
    ? normalizeSortOrder(req.body?.featured_order ?? req.body?.featuredOrder)
    : 0;
  const [result] = await db.execute(
    'UPDATE sites SET is_featured = ?, featured_order = ? WHERE id = ?',
    [isFeatured, featuredOrder, id]
  );
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.patch('/api/sites/:id/status', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const rawStatus = normalizeOptionalText(req.body?.status);
  if (!rawStatus) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'status is required.');
  }
  const status = normalizeSiteStatus(rawStatus);

  const [result] = await db.execute('UPDATE sites SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows === 0) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.delete('/api/sites/:id', requireAdminToken, asyncRoute(async (req, res) => {
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
