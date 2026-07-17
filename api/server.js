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

const editableSiteColumns = [
  'mode',
  'name',
  'url',
  'category',
  'description',
  'logo',
  'status',
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

function normalizeSafeKey(value, fallback = '') {
  const text = normalizeOptionalText(value);
  if (!text || !/^[a-zA-Z0-9_-]+$/.test(text)) return fallback;
  return text;
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
    } else if (column === 'seo_score') {
      updates[column] = normalizeSeoScore(body[column]);
    } else if (column === 'mode') {
      updates[column] = normalizeMode(body[column]);
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
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

app.get('/api/settings', asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.query.mode);
  const section = normalizeSafeKey(req.query.section);
  if (!section) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'section is required.');
  }
  const settings = await getSettings(mode, section, false);
  return res.json({ ok: true, data: settings });
}));

app.post('/api/settings', asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const section = normalizeSafeKey(req.body?.section);
  if (!section) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'section is required.');
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
    `SELECT ${siteColumns.join(', ')} FROM sites ${where} ORDER BY sort_order ASC, id ASC`,
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

app.patch('/api/sites/:id/seo', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const updates = {};
  seoColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, column)) return;
    updates[column] = column === 'seo_score'
      ? normalizeSeoScore(req.body[column])
      : normalizeOptionalText(req.body[column]);
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

app.post('/api/deepseek/test', asyncRoute(async (req, res) => {
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

app.post('/api/deepseek/generate-seo', asyncRoute(async (req, res) => {
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

app.post('/api/deepseek/generate-global-seo', asyncRoute(async (req, res) => {
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

app.patch('/api/categories/reorder', asyncRoute(async (req, res) => {
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
    `INSERT INTO sites (mode, name, url, category, description, logo, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      site.mode,
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
