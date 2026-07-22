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
const sitePreviewUploadDir =
  process.env.SITE_PREVIEW_UPLOAD_DIR || '/home/user/web/junchae.com/public_html/uploads/previews';
const publicWebRoot =
  process.env.PUBLIC_WEB_ROOT || '/home/user/web/junchae.com/public_html';

const logoPublicPath = '/uploads/logos';
const adPublicPath = '/uploads/ads';
const sitePreviewPublicPath = '/uploads/previews';
const seoFilesMode = 'normal';
const seoFilesSection = 'seo_files';
const adminApiToken = (process.env.ADMIN_API_TOKEN || '').trim();
const adminAuthMode = 'normal';
const adminAuthSection = 'admin_auth';
const defaultAdminPath = 'admin';
const defaultAdminUsername = 'admin1004';
const defaultAdminPassword = 'change-me-now';
const scryptAsync = promisify(crypto.scrypt);
const maxLogoSize = 2 * 1024 * 1024;
const maxAdImageSize = 5 * 1024 * 1024;
const maxSitePreviewSize = 5 * 1024 * 1024;
const allowedLogoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico']);
const allowedAdImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedSitePreviewExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedLogoMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const allowedAdImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const allowedSitePreviewMimeTypes = allowedAdImageMimeTypes;

const defaultRobotsTxt = `User-agent: *
Allow: /

Sitemap: https://junchae.com/sitemap.xml
`;

const defaultSeoFileSettings = {
  robots_txt: defaultRobotsTxt,
  sitemap_base_url: 'https://junchae.com',
  sitemap_include_normal: 'true',
  sitemap_include_secure: 'false',
  sitemap_include_categories: 'true',
  sitemap_include_sites: 'false',
  sitemap_custom_urls: '[]',
  sitemap_last_generated_at: '',
};

const analyticsRateWindowMs = 60 * 1000;
const analyticsRateMax = 120;
const analyticsRateBuckets = new Map();

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
  'seo_intro',
  'seo_features',
  'seo_faq',
  'preview_image',
  'seo_score',
  'seo_updated_at',
  'is_hidden',
  'is_featured',
  'featured_order',
  'sort_order',
  'last_checked_at',
  'http_status',
  'final_url',
  'candidate_new_url',
  'down_count',
  'status_memo',
  'check_status',
  'created_at',
  'updated_at',
];

const categoryColumns = [
  'id',
  'name',
  'slug',
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

const linkCandidateColumns = [
  'id',
  'source_name',
  'source_url',
  'mode',
  'category_slug',
  'category_name',
  'site_name',
  'site_url',
  'domain',
  'status_global',
  'status_kr',
  'kr_warning_detected',
  'logo_candidate_url',
  'logo_final_url',
  'preview_image_url',
  'approved',
  'rejected',
  'imported',
  'site_id',
  'memo',
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
  'seo_intro',
  'seo_features',
  'seo_faq',
  'preview_image',
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

function safeUploadPath(uploadDir, fileName) {
  const root = path.resolve(uploadDir);
  const target = path.resolve(root, fileName);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error('INVALID_UPLOAD_PATH');
  }
  return target;
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

const uploadSitePreview = multer({
  storage: makeStorage(sitePreviewUploadDir, 'preview', allowedSitePreviewExtensions, '.png'),
  limits: { fileSize: maxSitePreviewSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedSitePreviewExtensions.has(ext) || !allowedSitePreviewMimeTypes.has(file.mimetype)) {
      return cb(new Error('INVALID_SITE_PREVIEW_FILE_TYPE'));
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

function parseHttpUrl(value) {
  const text = normalizeRequiredText(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = '';
    return parsed;
  } catch {
    return null;
  }
}

function normalizeHttpUrl(value) {
  const parsed = parseHttpUrl(value);
  if (!parsed) return '';
  const normalized = parsed.toString();
  return normalized.endsWith('/') && !parsed.search ? normalized.slice(0, -1) : normalized;
}

function domainFromUrl(value) {
  const parsed = parseHttpUrl(value);
  if (!parsed) return '';
  return parsed.hostname.toLowerCase().replace(/^www\./, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function randomDelayMs(min = 300, max = 800) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function isCloudflareChallenge(status, text, headers) {
  const server = String(headers?.get?.('server') || '').toLowerCase();
  const body = String(text || '').toLowerCase();
  return (
    server.includes('cloudflare') &&
    (
      status === 403 ||
      status === 503 ||
      body.includes('cf-chl') ||
      body.includes('cloudflare ray id') ||
      body.includes('checking your browser') ||
      body.includes('verify you are human') ||
      body.includes('just a moment')
    )
  );
}

function isRestrictedContent(text, finalUrl) {
  const body = String(text || '').toLowerCase();
  const target = String(finalUrl || '').toLowerCase();
  return (
    target.includes('warning.or.kr') ||
    body.includes('warning.or.kr') ||
    body.includes('blocked') ||
    body.includes('access denied') ||
    body.includes('forbidden') ||
    body.includes('접속이 차단') ||
    body.includes('차단') ||
    body.includes('접속불가') ||
    body.includes('연결불가')
  );
}

function linkStatusMemo(result) {
  const status = result.check_status;
  const code = result.http_status ? `HTTP ${result.http_status}` : 'HTTP 상태 없음';
  const finalUrl = result.final_url && result.final_url !== result.checked_url ? ` 최종 URL: ${result.final_url}` : '';
  if (status === 'normal') return `${code}. 정상 응답입니다.${finalUrl}`;
  if (status === 'redirected') return `${code}. 다른 도메인으로 리다이렉트되어 새 URL 후보를 저장했습니다.${finalUrl}`;
  if (status === 'challenge') return `${code}. Cloudflare 또는 자동화 차단 challenge가 감지되었습니다.${finalUrl}`;
  if (status === 'restricted') return `${code}. 접근 제한 또는 차단 안내가 감지되었습니다.${finalUrl}`;
  if (status === 'down') return `${code}. 페이지를 찾을 수 없거나 종료된 응답입니다.${finalUrl}`;
  if (status === 'server_error') return `${code}. 서버 오류 응답입니다.${finalUrl}`;
  if (status === 'timeout') return '15초 안에 응답하지 않아 timeout으로 기록했습니다.';
  return `${code}. 상태를 명확히 판정하지 못했습니다.${finalUrl}`;
}

function appendDomainChangeMemo(memo, result) {
  if (!result.candidate_new_url || !result.original_domain || !result.final_domain) return memo;
  return `${memo} 최종 URL 도메인 변경 감지: ${result.original_domain} → ${result.final_domain}. 새 URL 후보 저장: ${result.candidate_new_url}`;
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSiteLink(site) {
  const checkedUrl = normalizeHttpUrl(site.url);
  if (!checkedUrl) {
    return {
      site_id: site.id,
      checked_url: site.url || '',
      http_status: null,
      check_status: 'unknown',
      final_url: null,
      candidate_new_url: null,
      status_memo: '유효한 http/https URL이 아닙니다.',
    };
  }

  try {
    const response = await fetchWithTimeout(checkedUrl);
    const finalUrl = normalizeHttpUrl(response.url || checkedUrl);
    const httpStatus = Number(response.status) || null;
    let sample = '';
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text') || contentType.includes('html') || contentType.includes('json') || contentType.includes('xml')) {
      sample = (await response.text()).slice(0, 250000);
    }

    const originalDomain = domainFromUrl(checkedUrl);
    const finalDomain = domainFromUrl(finalUrl);
    const candidateNewUrl = finalDomain && originalDomain && finalDomain !== originalDomain ? finalUrl : null;
    let checkStatus = 'unknown';

    if (isCloudflareChallenge(httpStatus, sample, response.headers)) {
      checkStatus = 'challenge';
    } else if (isRestrictedContent(sample, finalUrl)) {
      checkStatus = 'restricted';
    } else if (candidateNewUrl) {
      checkStatus = 'redirected';
    } else if (httpStatus >= 200 && httpStatus <= 299) {
      checkStatus = 'normal';
    } else if (httpStatus === 403) {
      checkStatus = 'restricted';
    } else if (httpStatus === 404 || httpStatus === 410) {
      checkStatus = 'down';
    } else if (httpStatus >= 500) {
      checkStatus = 'server_error';
    } else if (httpStatus >= 300 && httpStatus <= 399) {
      checkStatus = candidateNewUrl ? 'redirected' : 'unknown';
    }

    const result = {
      site_id: site.id,
      checked_url: checkedUrl,
      http_status: httpStatus,
      check_status: checkStatus,
      final_url: finalUrl,
      candidate_new_url: candidateNewUrl,
      original_domain: originalDomain,
      final_domain: finalDomain,
    };
    return {
      ...result,
      status_memo: appendDomainChangeMemo(linkStatusMemo(result), result),
    };
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    return {
      site_id: site.id,
      checked_url: checkedUrl,
      http_status: null,
      check_status: isTimeout ? 'timeout' : 'unknown',
      final_url: null,
      candidate_new_url: null,
      status_memo: isTimeout ? '15초 안에 응답하지 않아 timeout으로 기록했습니다.' : `요청 오류: ${err?.message || 'unknown error'}`,
    };
  }
}

function nextDownCount(currentDownCount, result) {
  const current = Number(currentDownCount || 0);
  if (result.check_status === 'normal' || result.check_status === 'redirected') return 0;
  if (result.check_status === 'challenge') return current;
  if (result.check_status === 'restricted') {
    return Number(result.http_status) === 403 ? current + 1 : current;
  }
  if (['down', 'timeout', 'server_error', 'unknown'].includes(result.check_status)) return current + 1;
  return current;
}

async function saveSiteCheckResult(site, result) {
  const updatedDownCount = nextDownCount(site.down_count, result);
  await db.execute(
    `UPDATE sites
     SET last_checked_at = NOW(),
         http_status = ?,
         final_url = ?,
         candidate_new_url = ?,
         down_count = ?,
         status_memo = ?,
         check_status = ?
     WHERE id = ?`,
    [
      result.http_status,
      result.final_url,
      result.candidate_new_url,
      updatedDownCount,
      result.status_memo,
      result.check_status,
      site.id,
    ]
  );
  await db.execute(
    `INSERT INTO site_check_logs
     (site_id, checked_url, http_status, check_status, final_url, candidate_new_url, memo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      site.id,
      result.checked_url,
      result.http_status,
      result.check_status,
      result.final_url,
      result.candidate_new_url,
      result.status_memo,
    ]
  );
  return {
    ...result,
    down_count: updatedDownCount,
  };
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

function normalizeSiteSlug(value) {
  const text = normalizeOptionalText(value);
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[/&]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

function baseSiteSlug(name, id) {
  return normalizeSiteSlug(name) || `site-${id || 'new'}`;
}

function uniqueSiteSlug(name, id, takenSlugs) {
  const base = baseSiteSlug(name, id);
  let candidate = base;
  let suffix = 2;
  while (takenSlugs.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  takenSlugs.add(candidate.toLowerCase());
  return candidate;
}

async function isSiteSlugTaken(slug, excludeId = null) {
  if (!slug) return false;
  const values = [slug];
  let where = 'LOWER(seo_slug) = LOWER(?)';
  if (excludeId) {
    where += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await db.execute(`SELECT COUNT(*) AS count FROM sites WHERE ${where}`, values);
  return Number(rows[0]?.count) > 0;
}

async function getTakenSiteSlugs(excludeId = null) {
  const values = [];
  let where = 'seo_slug IS NOT NULL AND seo_slug <> ""';
  if (excludeId) {
    where += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await db.execute(`SELECT seo_slug FROM sites WHERE ${where}`, values);
  return new Set(
    rows
      .map((row) => normalizeSiteSlug(row.seo_slug))
      .filter(Boolean)
      .map((slug) => slug.toLowerCase())
  );
}

async function ensureSiteSlugs() {
  const [rows] = await db.execute('SELECT id, name, seo_slug FROM sites ORDER BY id ASC');
  const taken = new Set();

  for (const row of rows) {
    const currentSlug = normalizeSiteSlug(row.seo_slug);
    const currentKey = currentSlug.toLowerCase();
    const slug = currentSlug && !taken.has(currentKey)
      ? currentSlug
      : uniqueSiteSlug(row.name, row.id, taken);

    if (currentSlug && !taken.has(currentKey)) {
      taken.add(currentKey);
    }

    if (slug !== row.seo_slug) {
      await db.execute('UPDATE sites SET seo_slug = ? WHERE id = ?', [slug, row.id]);
    }
  }
}

const categorySlugMap = new Map([
  ['포털', 'portal'],
  ['커뮤니티', 'community'],
  ['웹툰', 'webtoon'],
  ['뉴스', 'news'],
  ['쇼핑', 'shopping'],
  ['ott', 'ott'],
  ['스포츠', 'sports'],
  ['스포츠/카지노', 'sports-casino'],
  ['스포츠 / 카지노', 'sports-casino'],
  ['카지노', 'casino'],
  ['토렌트', 'torrent'],
  ['성인', 'adult'],
  ['게임', 'game'],
  ['금융', 'finance'],
  ['생활', 'lifestyle'],
  ['기타', 'etc'],
]);

function normalizeCategorySlug(value) {
  const text = normalizeOptionalText(value);
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[/&]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

function baseCategorySlug(name, id) {
  const categoryName = normalizeOptionalText(name) || '';
  const normalizedName = categoryName.replace(/\s+/g, ' ').trim();
  const compactName = categoryName.replace(/\s+/g, '');
  const mapped =
    categorySlugMap.get(normalizedName) ||
    categorySlugMap.get(compactName) ||
    categorySlugMap.get(normalizedName.toLowerCase());
  return normalizeCategorySlug(mapped || normalizedName) || `category-${id || 'new'}`;
}

function uniqueCategorySlug(name, id, takenSlugs) {
  const base = baseCategorySlug(name, id);
  let candidate = base;
  let suffix = 2;
  while (takenSlugs.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  takenSlugs.add(candidate.toLowerCase());
  return candidate;
}

async function isCategorySlugTaken(slug, excludeId = null) {
  if (!slug) return false;
  const values = [slug];
  let where = 'LOWER(slug) = LOWER(?)';
  if (excludeId) {
    where += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await db.execute(`SELECT COUNT(*) AS count FROM categories WHERE ${where}`, values);
  return Number(rows[0]?.count) > 0;
}

async function getTakenCategorySlugs(excludeId = null) {
  const values = [];
  let where = 'slug IS NOT NULL AND slug <> ""';
  if (excludeId) {
    where += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await db.execute(`SELECT slug FROM categories WHERE ${where}`, values);
  return new Set(
    rows
      .map((row) => normalizeCategorySlug(row.slug))
      .filter(Boolean)
      .map((slug) => slug.toLowerCase())
  );
}

async function ensureCategorySlugs() {
  const [rows] = await db.execute('SELECT id, name, slug FROM categories ORDER BY id ASC');
  const taken = new Set();

  for (const row of rows) {
    const currentSlug = normalizeCategorySlug(row.slug);
    const currentKey = currentSlug.toLowerCase();
    const slug = currentSlug && !taken.has(currentKey)
      ? currentSlug
      : uniqueCategorySlug(row.name, row.id, taken);

    if (currentSlug && !taken.has(currentKey)) {
      taken.add(currentKey);
    }

    if (slug !== row.slug) {
      await db.execute('UPDATE categories SET slug = ? WHERE id = ?', [slug, row.id]);
    }
  }
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
    seo_slug: normalizeSiteSlug(body.seo_slug),
    seo_intro: normalizeOptionalText(body.seo_intro),
    seo_features: normalizeSeoLongTextValue(body.seo_features),
    seo_faq: normalizeSeoLongTextValue(body.seo_faq),
    preview_image: normalizeOptionalText(body.preview_image),
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

function normalizeSeoLongTextValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  return normalizeOptionalText(value);
}

function normalizeGeneratedSeoText(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.title || item.text || item.keyword || item.name || '';
        return '';
      })
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
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
    } else if (column === 'seo_slug') {
      updates[column] = normalizeSiteSlug(body[column]);
    } else if (column === 'seo_features' || column === 'seo_faq') {
      updates[column] = normalizeSeoLongTextValue(body[column]);
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
    slug: normalizeCategorySlug(body.slug),
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
  if (Object.prototype.hasOwnProperty.call(body || {}, 'slug')) {
    updates.slug = normalizeCategorySlug(body.slug);
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

function normalizeCandidateInput(body, partial = false) {
  const siteUrl = Object.prototype.hasOwnProperty.call(body || {}, 'site_url')
    ? normalizeHttpUrl(body.site_url)
    : '';
  const sourceUrl = Object.prototype.hasOwnProperty.call(body || {}, 'source_url')
    ? normalizeHttpUrl(body.source_url)
    : undefined;
  const logoCandidateUrl = Object.prototype.hasOwnProperty.call(body || {}, 'logo_candidate_url')
    ? normalizeHttpUrl(body.logo_candidate_url)
    : undefined;
  const logoFinalUrl = Object.prototype.hasOwnProperty.call(body || {}, 'logo_final_url')
    ? normalizeHttpUrl(body.logo_final_url)
    : undefined;
  const previewImageUrl = Object.prototype.hasOwnProperty.call(body || {}, 'preview_image_url')
    ? normalizeHttpUrl(body.preview_image_url)
    : undefined;
  const siteName = normalizeRequiredText(body?.site_name ?? body?.name);

  if (!partial && !siteUrl) {
    const err = new Error('site_url must be a valid http or https URL.');
    err.code = 'INVALID_SITE_URL';
    throw err;
  }
  if (partial && Object.prototype.hasOwnProperty.call(body || {}, 'site_url') && !siteUrl) {
    const err = new Error('site_url must be a valid http or https URL.');
    err.code = 'INVALID_SITE_URL';
    throw err;
  }
  if (!partial && !siteName) {
    const err = new Error('site_name is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const normalized = {};
  const assignText = (column, value) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body || {}, column)) {
      normalized[column] = normalizeOptionalText(value);
    }
  };
  assignText('source_name', body?.source_name);
  if (sourceUrl !== undefined) normalized.source_url = sourceUrl;
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'mode')) normalized.mode = normalizeMode(body?.mode);
  assignText('category_slug', body?.category_slug);
  assignText('category_name', body?.category_name);
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'site_name') || Object.prototype.hasOwnProperty.call(body || {}, 'name')) {
    normalized.site_name = siteName;
  }
  if (siteUrl) {
    normalized.site_url = siteUrl;
    normalized.domain = domainFromUrl(siteUrl);
  }
  assignText('status_global', body?.status_global);
  assignText('status_kr', body?.status_kr);
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'kr_warning_detected')) {
    normalized.kr_warning_detected = normalizeBooleanInt(body?.kr_warning_detected, 0);
  }
  if (logoCandidateUrl !== undefined) normalized.logo_candidate_url = logoCandidateUrl;
  if (logoFinalUrl !== undefined) normalized.logo_final_url = logoFinalUrl;
  if (previewImageUrl !== undefined) normalized.preview_image_url = previewImageUrl;
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'approved')) {
    normalized.approved = normalizeBooleanInt(body?.approved, 0);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'rejected')) {
    normalized.rejected = normalizeBooleanInt(body?.rejected, 0);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'imported')) {
    normalized.imported = normalizeBooleanInt(body?.imported, 0);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body || {}, 'site_id')) {
    normalized.site_id = parseId(body?.site_id);
  }
  assignText('memo', body?.memo);

  return normalized;
}

async function getUrlDuplicateInfo(rawUrl, excludeCandidateId = null) {
  const normalizedUrl = normalizeHttpUrl(rawUrl);
  if (!normalizedUrl) {
    const err = new Error('url must be a valid http or https URL.');
    err.code = 'INVALID_URL';
    throw err;
  }
  const domain = domainFromUrl(normalizedUrl);
  const [sites] = await db.execute(
    `SELECT id, name, url, mode, is_hidden FROM sites ORDER BY id ASC`
  );
  const duplicateSites = sites.filter((site) => {
    const siteUrl = normalizeHttpUrl(site.url);
    return siteUrl === normalizedUrl || domainFromUrl(site.url) === domain;
  });

  const candidateValues = [normalizedUrl, domain];
  let candidateWhere = '(site_url = ? OR domain = ?)';
  if (excludeCandidateId) {
    candidateWhere += ' AND id <> ?';
    candidateValues.push(excludeCandidateId);
  }
  const [candidates] = await db.execute(
    `SELECT id, site_name, site_url, domain, imported, rejected FROM link_candidates WHERE ${candidateWhere} ORDER BY id ASC`,
    candidateValues
  );

  return {
    url: normalizedUrl,
    domain,
    duplicate: duplicateSites.length > 0 || candidates.length > 0,
    sites: duplicateSites,
    candidates,
  };
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
  await ensureColumn('sites', 'seo_intro', 'TEXT NULL', 'seo_og_image');
  await ensureColumn('sites', 'seo_features', 'LONGTEXT NULL', 'seo_intro');
  await ensureColumn('sites', 'seo_faq', 'LONGTEXT NULL', 'seo_features');
  await ensureColumn('sites', 'preview_image', 'VARCHAR(500) NULL', 'seo_faq');
  await ensureColumn('sites', 'seo_score', 'INT NOT NULL DEFAULT 0', 'preview_image');
  await ensureColumn('sites', 'seo_updated_at', 'TIMESTAMP NULL', 'seo_score');
  await ensureColumn('sites', 'sort_order', 'INT NOT NULL DEFAULT 0', 'status');
  await ensureColumn('sites', 'is_hidden', 'TINYINT(1) NOT NULL DEFAULT 0', 'sort_order');
  await ensureColumn('sites', 'is_featured', 'TINYINT(1) NOT NULL DEFAULT 0', 'is_hidden');
  await ensureColumn('sites', 'featured_order', 'INT NOT NULL DEFAULT 0', 'is_featured');
  await ensureColumn('sites', 'last_checked_at', 'DATETIME NULL', 'featured_order');
  await ensureColumn('sites', 'http_status', 'INT NULL', 'last_checked_at');
  await ensureColumn('sites', 'final_url', 'VARCHAR(500) NULL', 'http_status');
  await ensureColumn('sites', 'candidate_new_url', 'VARCHAR(500) NULL', 'final_url');
  await ensureColumn('sites', 'down_count', 'INT NOT NULL DEFAULT 0', 'candidate_new_url');
  await ensureColumn('sites', 'status_memo', 'TEXT NULL', 'down_count');
  await ensureColumn('sites', 'check_status', 'VARCHAR(50) NULL', 'status_memo');
  await db.execute("UPDATE sites SET mode = 'normal' WHERE mode IS NULL OR mode = ''");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(255) NULL,
      mode VARCHAR(50) NOT NULL DEFAULT 'normal',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_category_mode (name, mode)
    )
  `);

  await ensureColumn('categories', 'slug', 'VARCHAR(255) NULL', 'name');
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL DEFAULT 'pageview',
      path VARCHAR(500) NOT NULL,
      mode VARCHAR(50) NULL,
      category_id VARCHAR(100) NULL,
      site_id INT NULL,
      referrer TEXT NULL,
      referrer_host VARCHAR(255) NULL,
      device_type VARCHAR(50) NULL,
      visitor_type VARCHAR(50) NULL,
      bot_name VARCHAR(100) NULL,
      country VARCHAR(10) NULL,
      user_agent_hash VARCHAR(128) NULL,
      ip_hash VARCHAR(128) NULL,
      session_id VARCHAR(128) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at),
      INDEX idx_path (path),
      INDEX idx_mode (mode),
      INDEX idx_referrer_host (referrer_host),
      INDEX idx_device_type (device_type),
      INDEX idx_visitor_type (visitor_type),
      INDEX idx_bot_name (bot_name)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS link_candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_name VARCHAR(255) NULL,
      source_url VARCHAR(500) NULL,
      mode VARCHAR(50) NOT NULL DEFAULT 'normal',
      category_slug VARCHAR(255) NULL,
      category_name VARCHAR(255) NULL,
      site_name VARCHAR(255) NOT NULL,
      site_url VARCHAR(500) NOT NULL,
      domain VARCHAR(255) NOT NULL,
      status_global VARCHAR(100) NULL,
      status_kr VARCHAR(100) NULL,
      kr_warning_detected TINYINT(1) NOT NULL DEFAULT 0,
      logo_candidate_url VARCHAR(500) NULL,
      logo_final_url VARCHAR(500) NULL,
      preview_image_url VARCHAR(500) NULL,
      approved TINYINT(1) NOT NULL DEFAULT 0,
      rejected TINYINT(1) NOT NULL DEFAULT 0,
      imported TINYINT(1) NOT NULL DEFAULT 0,
      site_id INT NULL,
      memo TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_domain (domain),
      INDEX idx_site_url (site_url),
      INDEX idx_approved (approved),
      INDEX idx_imported (imported),
      INDEX idx_mode (mode),
      INDEX idx_category_slug (category_slug),
      INDEX idx_created_at (created_at)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_check_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_id INT NOT NULL,
      checked_url VARCHAR(500) NULL,
      http_status INT NULL,
      check_status VARCHAR(50) NULL,
      final_url VARCHAR(500) NULL,
      candidate_new_url VARCHAR(500) NULL,
      memo TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_site_id (site_id),
      INDEX idx_check_status (check_status),
      INDEX idx_created_at (created_at)
    )
  `);

  const existingSeoFiles = await getSettings(seoFilesMode, seoFilesSection, true);
  const missingSeoFileSettings = {};
  Object.entries(defaultSeoFileSettings).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(existingSeoFiles, key)) {
      missingSeoFileSettings[key] = value;
    }
  });
  if (Object.keys(missingSeoFileSettings).length > 0) {
    await saveSettings(seoFilesMode, seoFilesSection, missingSeoFileSettings);
  }

  await ensureAdminAuthDefaults();

  await db.execute(`
    INSERT IGNORE INTO categories (name, mode, sort_order)
    SELECT DISTINCT category, mode, 0
    FROM sites
    WHERE category IS NOT NULL AND category <> ''
  `);

  await ensureSiteSlugs();
  await ensureCategorySlugs();
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

app.get('/robots.txt', asyncRoute(async (req, res) => {
  const settings = await getSeoFileSettings();
  const content = await readPublicFile('robots.txt', settings.robots_txt);
  res.type('text/plain').send(content);
}));

app.get('/sitemap.xml', asyncRoute(async (req, res) => {
  const settings = await getSeoFileSettings();
  const fallback = (await generateSitemapXml(settings)).xml;
  const content = await readPublicFile('sitemap.xml', fallback);
  res.type('application/xml').send(content);
}));

app.get('/api/admin/seo-files', requireAdminToken, asyncRoute(async (req, res) => {
  const settings = await getSeoFileSettings();
  const sitemapPreview = await generateSitemapXml(settings);
  const [robotsExists, sitemapExists] = await Promise.all([
    publicFileExists('robots.txt'),
    publicFileExists('sitemap.xml'),
  ]);

  return res.json({
    ok: true,
    data: {
      settings,
      robots_preview: settings.robots_txt,
      sitemap_preview: sitemapPreview.xml,
      sitemap_url_count: sitemapPreview.urlCount,
      robots_exists: robotsExists,
      sitemap_exists: sitemapExists,
    },
  });
}));

app.post('/api/admin/seo-files/robots', requireAdminToken, asyncRoute(async (req, res) => {
  const config = await getAdminAuthConfig();
  const robotsTxt = typeof req.body?.robots_txt === 'string' ? req.body.robots_txt : '';
  const validationError = validateRobotsTxt(robotsTxt, config);
  if (validationError) return jsonError(res, 400, 'VALIDATION_ERROR', validationError);

  await saveSettings(seoFilesMode, seoFilesSection, { robots_txt: robotsTxt });
  const fileResult = await writePublicFile('robots.txt', robotsTxt);
  if (!fileResult.ok) {
    return jsonError(res, 500, 'SEO_FILE_WRITE_FAILED', `robots.txt setting saved, but file write failed: ${fileResult.message}`);
  }

  return res.json({
    ok: true,
    data: {
      robots_txt: robotsTxt,
      file: fileResult,
      public_url: 'https://junchae.com/robots.txt',
      preview_url: `/robots.txt?ts=${Date.now()}`,
      cache_notice: 'Cloudflare 캐시 사용 중이면 robots.txt URL purge가 필요할 수 있습니다.',
    },
  });
}));

app.post('/api/admin/seo-files/sitemap/generate', requireAdminToken, asyncRoute(async (req, res) => {
  const current = await getSeoFileSettings();
  const next = normalizeSeoFileSettings({
    ...current,
    ...req.body,
    sitemap_custom_urls: Object.prototype.hasOwnProperty.call(req.body || {}, 'sitemap_custom_urls')
      ? JSON.stringify(Array.isArray(req.body.sitemap_custom_urls)
          ? req.body.sitemap_custom_urls
          : parseJsonArraySetting(req.body.sitemap_custom_urls))
      : JSON.stringify(current.sitemap_custom_urls),
  });

  const generatedAt = new Date().toISOString();
  next.sitemap_last_generated_at = generatedAt;
  const sitemap = await generateSitemapXml(next);
  await saveSettings(seoFilesMode, seoFilesSection, settingsPayloadForSave(next));
  const fileResult = await writePublicFile('sitemap.xml', sitemap.xml);
  if (!fileResult.ok) {
    return jsonError(res, 500, 'SEO_FILE_WRITE_FAILED', `sitemap settings saved, but file write failed: ${fileResult.message}`);
  }

  return res.json({
    ok: true,
    data: {
      settings: next,
      sitemap_xml: sitemap.xml,
      sitemap_url_count: sitemap.urlCount,
      file: fileResult,
      public_url: 'https://junchae.com/sitemap.xml',
      preview_url: `/sitemap.xml?ts=${Date.now()}`,
      cache_notice: 'Cloudflare 캐시 사용 중이면 sitemap.xml URL purge가 필요할 수 있습니다.',
    },
  });
}));

app.post('/api/analytics/pageview', asyncRoute(async (req, res) => {
  const pathValue = normalizeAnalyticsPath(req.body?.path);
  if (!pathValue || await isProtectedAnalyticsPath(pathValue)) {
    return res.json({ ok: true, data: { stored: false } });
  }

  const clientIp = getClientIp(req);
  const rateKey = hashAnalyticsValue(clientIp) || 'unknown';
  if (isAnalyticsRateLimited(rateKey)) {
    return jsonError(res, 429, 'RATE_LIMITED', 'Too many analytics events.');
  }

  const referrer = normalizeOptionalText(req.body?.referrer);
  const userAgent = req.get('user-agent') || '';
  const botInfo = getBotInfo(userAgent);
  const siteId = parseId(req.body?.site_id);
  const mode = normalizeOptionalText(req.body?.mode);
  const categoryId = normalizeOptionalText(req.body?.category_id);

  await db.execute(
    `INSERT INTO analytics_events
     (event_type, path, mode, category_id, site_id, referrer, referrer_host, device_type,
      visitor_type, bot_name, country, user_agent_hash, ip_hash, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'pageview',
      pathValue.slice(0, 500),
      mode === 'secure' ? 'secure' : mode === 'normal' ? 'normal' : null,
      categoryId ? categoryId.slice(0, 100) : null,
      siteId,
      referrer && referrer.length <= 2000 ? referrer : null,
      getReferrerHost(referrer),
      getDeviceType(userAgent),
      botInfo.visitorType,
      botInfo.botName,
      normalizeOptionalText(req.get('cf-ipcountry'))?.slice(0, 10) || null,
      hashAnalyticsValue(userAgent),
      hashAnalyticsValue(clientIp),
      normalizeSessionId(req.body?.session_id),
    ]
  );

  return res.status(201).json({ ok: true, data: { stored: true } });
}));

app.get('/api/admin/dashboard', requireAdminToken, asyncRoute(async (req, res) => {
  const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
  const sinceDays = Math.max(days, 30);
  const settings = await getSeoFileSettings();
  const [robotsExists, sitemapExists] = await Promise.all([
    publicFileExists('robots.txt'),
    publicFileExists('sitemap.xml'),
  ]);

  const [
    todayViews,
    yesterdayViews,
    last7DaysViews,
    last30DaysViews,
    todayUniqueVisitors,
    aiBotViews,
    searchBotViews,
    humanViews,
    deviceBreakdown,
    visitorTypeBreakdown,
    topReferrers,
    topPages,
    modeBreakdown,
    botBreakdown,
    dailyViews,
    recentEvents,
    checklistRows,
  ] = await Promise.all([
    queryCount('SELECT COUNT(*) AS count FROM analytics_events WHERE created_at >= CURRENT_DATE()'),
    queryCount('SELECT COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AND created_at < CURRENT_DATE()'),
    queryCount('SELECT COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'),
    queryCount('SELECT COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
    queryCount('SELECT COUNT(DISTINCT COALESCE(session_id, ip_hash)) AS count FROM analytics_events WHERE created_at >= CURRENT_DATE()'),
    queryCount("SELECT COUNT(*) AS count FROM analytics_events WHERE visitor_type = 'ai_bot' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
    queryCount("SELECT COUNT(*) AS count FROM analytics_events WHERE visitor_type = 'search_bot' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
    queryCount("SELECT COUNT(*) AS count FROM analytics_events WHERE visitor_type = 'human' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
    queryRows(
      'SELECT COALESCE(device_type, "unknown") AS device_type, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY device_type ORDER BY count DESC',
      [days]
    ),
    queryRows(
      'SELECT COALESCE(visitor_type, "human") AS visitor_type, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY visitor_type ORDER BY count DESC',
      [days]
    ),
    queryRows(
      'SELECT COALESCE(referrer_host, "Direct") AS referrer_host, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY referrer_host ORDER BY count DESC LIMIT 10',
      [days]
    ),
    queryRows(
      'SELECT path, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY path ORDER BY count DESC LIMIT 10',
      [days]
    ),
    queryRows(
      'SELECT COALESCE(mode, "unknown") AS mode, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY mode ORDER BY count DESC',
      [days]
    ),
    queryRows(
      'SELECT COALESCE(bot_name, "Human") AS bot_name, COUNT(*) AS count FROM analytics_events WHERE visitor_type <> "human" AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY bot_name ORDER BY count DESC LIMIT 12',
      [days]
    ),
    queryRows(
      'SELECT DATE(created_at) AS date, COUNT(*) AS count FROM analytics_events WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date ASC',
      [sinceDays]
    ),
    queryRows(
      `SELECT id, event_type, path, mode, category_id, site_id, referrer_host, device_type,
              visitor_type, bot_name, country, created_at
       FROM analytics_events
       ORDER BY created_at DESC
       LIMIT 20`
    ),
    queryRows(
      `SELECT
        COUNT(*) AS total_sites,
        SUM(CASE WHEN is_hidden = 1 THEN 1 ELSE 0 END) AS hidden_sites,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) AS featured_sites,
        SUM(CASE WHEN status IN ('down', 'offline', 'slow', '접속불가') THEN 1 ELSE 0 END) AS down_sites,
        SUM(CASE WHEN status IN ('checking', 'unknown', '확인중') THEN 1 ELSE 0 END) AS checking_sites
       FROM sites`
    ),
  ]);

  const categoriesCount = await queryCount('SELECT COUNT(*) AS count FROM categories');
  const checklist = checklistRows[0] || {};

  return res.json({
    ok: true,
    data: {
      summary: {
        today_views: todayViews,
        yesterday_views: yesterdayViews,
        last_7_days_views: last7DaysViews,
        last_30_days_views: last30DaysViews,
        today_unique_visitors: todayUniqueVisitors,
        ai_bot_views: aiBotViews,
        search_bot_views: searchBotViews,
        human_views: humanViews,
      },
      device_breakdown: deviceBreakdown,
      visitor_type_breakdown: visitorTypeBreakdown,
      top_referrers: topReferrers,
      top_pages: topPages,
      mode_breakdown: modeBreakdown,
      bot_breakdown: botBreakdown,
      daily_views: dailyViews.map((row) => ({ date: formatDateOnly(row.date), count: Number(row.count) || 0 })),
      recent_events: recentEvents,
      checklist: {
        total_sites: Number(checklist.total_sites) || 0,
        hidden_sites: Number(checklist.hidden_sites) || 0,
        featured_sites: Number(checklist.featured_sites) || 0,
        down_sites: Number(checklist.down_sites) || 0,
        checking_sites: Number(checklist.checking_sites) || 0,
        categories_count: categoriesCount,
        robots_exists: robotsExists,
        sitemap_exists: sitemapExists,
        sitemap_last_generated_at: settings.sitemap_last_generated_at || '',
      },
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

function parseBooleanSetting(value, fallback = false) {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function parseJsonArraySetting(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeBaseUrl(value) {
  const fallback = defaultSeoFileSettings.sitemap_base_url;
  const text = normalizeOptionalText(value) || fallback;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

function normalizeSeoFileSettings(settings = {}) {
  const merged = { ...defaultSeoFileSettings, ...settings };
  return {
    robots_txt: normalizeOptionalText(merged.robots_txt) || defaultRobotsTxt,
    sitemap_base_url: normalizeBaseUrl(merged.sitemap_base_url),
    sitemap_include_normal: parseBooleanSetting(merged.sitemap_include_normal, true),
    sitemap_include_secure: parseBooleanSetting(merged.sitemap_include_secure, false),
    sitemap_include_categories: parseBooleanSetting(merged.sitemap_include_categories, true),
    sitemap_include_sites: parseBooleanSetting(merged.sitemap_include_sites, false),
    sitemap_custom_urls: parseJsonArraySetting(merged.sitemap_custom_urls)
      .map((url) => normalizeOptionalText(url))
      .filter(Boolean)
      .slice(0, 200),
    sitemap_last_generated_at: normalizeOptionalText(merged.sitemap_last_generated_at) || '',
  };
}

async function getSeoFileSettings() {
  const settings = await getSettings(seoFilesMode, seoFilesSection, true);
  return normalizeSeoFileSettings(settings);
}

function settingsPayloadForSave(settings) {
  return {
    robots_txt: settings.robots_txt,
    sitemap_base_url: settings.sitemap_base_url,
    sitemap_include_normal: String(Boolean(settings.sitemap_include_normal)),
    sitemap_include_secure: String(Boolean(settings.sitemap_include_secure)),
    sitemap_include_categories: String(Boolean(settings.sitemap_include_categories)),
    sitemap_include_sites: String(Boolean(settings.sitemap_include_sites)),
    sitemap_custom_urls: JSON.stringify(settings.sitemap_custom_urls || []),
    sitemap_last_generated_at: settings.sitemap_last_generated_at || '',
  };
}

function seoFilePath(fileName) {
  return path.join(publicWebRoot, fileName);
}

async function writePublicFile(fileName, content) {
  const target = seoFilePath(fileName);
  try {
    ensureDir(publicWebRoot);
    await fs.promises.writeFile(target, content, 'utf8');
    return { ok: true, path: target };
  } catch (err) {
    return {
      ok: false,
      path: target,
      message: err?.message || `Failed to write ${fileName}.`,
    };
  }
}

async function readPublicFile(fileName, fallback = '') {
  try {
    return await fs.promises.readFile(seoFilePath(fileName), 'utf8');
  } catch {
    return fallback;
  }
}

async function publicFileExists(fileName) {
  try {
    await fs.promises.access(seoFilePath(fileName), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateOnly(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function absoluteUrl(baseUrl, pathname) {
  const base = normalizeBaseUrl(baseUrl);
  const pathName = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${pathName}`;
}

function sitemapUrlEntry(loc, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    `    <changefreq>${xmlEscape(changefreq)}</changefreq>`,
    `    <priority>${xmlEscape(priority)}</priority>`,
    '  </url>',
  ].join('\n');
}

function normalizeCustomSitemapUrl(value, baseUrl) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const base = normalizeBaseUrl(baseUrl);
  try {
    const url = text.startsWith('/') ? new URL(text, base) : new URL(text);
    if (url.origin !== base) return null;
    if (url.pathname.toLowerCase().startsWith('/api')) return null;
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function generateSitemapXml(settings) {
  const normalized = normalizeSeoFileSettings(settings);
  const entries = new Map();
  const today = formatDateOnly();

  entries.set(absoluteUrl(normalized.sitemap_base_url, '/'), sitemapUrlEntry(
    absoluteUrl(normalized.sitemap_base_url, '/'),
    today,
    'daily',
    '1.0'
  ));

  if (normalized.sitemap_include_categories) {
    const modes = [];
    if (normalized.sitemap_include_normal) modes.push('normal');
    if (normalized.sitemap_include_secure) modes.push('secure');

    if (modes.length > 0) {
      const placeholders = modes.map(() => '?').join(', ');
      const [categories] = await db.execute(
        `SELECT id, name, slug, mode, updated_at FROM categories WHERE mode IN (${placeholders}) ORDER BY mode ASC, sort_order ASC, id ASC`,
        modes
      );

      categories.forEach((category) => {
        const slug = encodeURIComponent(normalizeCategorySlug(category.slug) || baseCategorySlug(category.name, category.id));
        const loc = absoluteUrl(normalized.sitemap_base_url, `/category/${slug}`);
        entries.set(loc, sitemapUrlEntry(loc, formatDateOnly(category.updated_at), 'daily', '0.8'));
      });
    }
  }

  if (normalized.sitemap_include_sites) {
    const modes = [];
    if (normalized.sitemap_include_normal) modes.push('normal');
    if (normalized.sitemap_include_secure) modes.push('secure');

    if (modes.length > 0) {
      const placeholders = modes.map(() => '?').join(', ');
      const [sites] = await db.execute(
        `SELECT id, name, seo_slug, mode, updated_at FROM sites
         WHERE mode IN (${placeholders}) AND COALESCE(is_hidden, 0) = 0
         ORDER BY mode ASC, sort_order ASC, name ASC, id ASC`,
        modes
      );

      sites.forEach((site) => {
        const slug = encodeURIComponent(normalizeSiteSlug(site.seo_slug) || baseSiteSlug(site.name, site.id));
        const loc = absoluteUrl(normalized.sitemap_base_url, `/site/${slug}`);
        entries.set(loc, sitemapUrlEntry(loc, formatDateOnly(site.updated_at), 'weekly', '0.6'));
      });
    }
  }

  normalized.sitemap_custom_urls.forEach((customUrl) => {
    const loc = normalizeCustomSitemapUrl(customUrl, normalized.sitemap_base_url);
    if (loc) entries.set(loc, sitemapUrlEntry(loc, today, 'weekly', '0.7'));
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.values(),
    '</urlset>',
    '',
  ].join('\n');

  return {
    xml,
    urlCount: entries.size,
    settings: normalized,
  };
}

function getForbiddenRobotsTokens(config) {
  return [
    config.adminPath,
    'junchae1004',
    defaultAdminUsername,
  ]
    .map((value) => normalizeOptionalText(value))
    .filter(Boolean);
}

function validateRobotsTxt(robotsTxt, config) {
  const text = String(robotsTxt || '');
  if (!text.trim()) return 'robots_txt is required.';
  if (text.length > 20000) return 'robots_txt is too large.';
  const lower = text.toLowerCase();
  const forbidden = getForbiddenRobotsTokens(config).find((token) =>
    token && lower.includes(token.toLowerCase())
  );
  if (forbidden) return 'robots.txt must not contain the admin path or admin identifiers.';
  return '';
}

function normalizeSessionId(value) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return text.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || null;
}

function hashAnalyticsValue(value) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getClientIp(req) {
  const cfIp = normalizeOptionalText(req.get('cf-connecting-ip'));
  if (cfIp) return cfIp;
  const forwarded = normalizeOptionalText(req.get('x-forwarded-for'));
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

function normalizeAnalyticsPath(value) {
  const pathValue = normalizeOptionalText(value);
  if (!pathValue || pathValue.length > 500) return '';
  try {
    const parsed = pathValue.startsWith('http') ? new URL(pathValue) : null;
    return parsed ? parsed.pathname : pathValue.split('?')[0];
  } catch {
    return pathValue.split('?')[0];
  }
}

function getReferrerHost(value) {
  const referrer = normalizeOptionalText(value);
  if (!referrer || referrer.length > 2000) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').slice(0, 255);
  } catch {
    return null;
  }
}

function getDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|android|phone/.test(ua)) return 'mobile';
  return 'desktop';
}

function getBotInfo(userAgent) {
  const ua = String(userAgent || '');
  const patterns = [
    { name: 'ChatGPT-User', type: 'ai_bot', regex: /chatgpt-user/i },
    { name: 'GPTBot', type: 'ai_bot', regex: /gptbot/i },
    { name: 'ClaudeBot', type: 'ai_bot', regex: /claudebot|claude-web/i },
    { name: 'PerplexityBot', type: 'ai_bot', regex: /perplexitybot/i },
    { name: 'DuckAssistBot', type: 'ai_bot', regex: /duckassistbot/i },
    { name: 'Googlebot', type: 'search_bot', regex: /googlebot/i },
    { name: 'BingBot', type: 'search_bot', regex: /bingbot/i },
    { name: 'Applebot', type: 'search_bot', regex: /applebot/i },
    { name: 'Bytespider', type: 'other_bot', regex: /bytespider/i },
    { name: 'CCBot', type: 'other_bot', regex: /ccbot/i },
  ];
  const match = patterns.find((item) => item.regex.test(ua));
  if (match) return { visitorType: match.type, botName: match.name };
  if (/bot|crawler|spider/i.test(ua)) return { visitorType: 'other_bot', botName: 'OtherBot' };
  return { visitorType: 'human', botName: null };
}

function isAnalyticsRateLimited(key) {
  const now = Date.now();
  const bucket = analyticsRateBuckets.get(key) || { count: 0, startedAt: now };
  if (now - bucket.startedAt > analyticsRateWindowMs) {
    analyticsRateBuckets.set(key, { count: 1, startedAt: now });
    return false;
  }
  bucket.count += 1;
  analyticsRateBuckets.set(key, bucket);
  return bucket.count > analyticsRateMax;
}

async function isProtectedAnalyticsPath(pathValue) {
  const cleanPath = normalizeAnalyticsPath(pathValue);
  if (!cleanPath || cleanPath.toLowerCase().startsWith('/api')) return true;
  const config = await getAdminAuthConfig();
  const adminPath = `/${config.adminPath}`;
  return cleanPath === adminPath || cleanPath.startsWith(`${adminPath}/`);
}

async function queryCount(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return Number(rows[0]?.count) || 0;
}

async function queryRows(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
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
  const siteSlug = normalizeSiteSlug(site.seo_slug) || baseSiteSlug(site.name, site.id);
  return {
    id: site.id,
    seo_title: site.seo_title || `${site.name} 최신 정보`,
    seo_description: site.seo_description || site.description || `${site.name} 사이트 정보와 접속 링크를 확인하세요.`,
    seo_keywords: site.seo_keywords || site.name,
    seo_slug: siteSlug,
    seo_h1: site.seo_h1 || site.name,
    seo_canonical: `https://junchae.com/site/${siteSlug}`,
    seo_og_title: site.seo_og_title || site.seo_title || `${site.name} 최신 정보`,
    seo_og_description: site.seo_og_description || site.seo_description || site.description || '',
    seo_og_image: site.seo_og_image || site.logo || '',
    seo_intro: site.seo_intro || '',
    seo_features: site.seo_features || '',
    seo_faq: site.seo_faq || '',
    preview_image: site.preview_image || '',
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

app.get('/api/admin/sites/check-duplicate', requireAdminToken, asyncRoute(async (req, res) => {
  try {
    const data = await getUrlDuplicateInfo(req.query.url);
    return res.json({ ok: true, data });
  } catch (err) {
    return jsonError(res, 400, err.code || 'INVALID_URL', err.message);
  }
}));

app.post('/api/admin/sites/:id/check-link', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const site = await getSiteById(id);
  if (!site) return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');

  const result = await checkSiteLink(site);
  const saved = await saveSiteCheckResult(site, result);
  const data = {
    site_id: id,
    ...saved,
  };
  return res.json({
    ok: true,
    ...data,
    data,
  });
}));

app.post('/api/admin/sites/check-links', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = normalizeMode(req.body?.mode);
  const categorySlug = normalizeSafeKey(req.body?.category_slug || req.body?.categorySlug);
  const onlyVisible = normalizeBooleanInt(req.body?.only_visible ?? req.body?.onlyVisible, 0) === 1;
  const limit = clampInt(req.body?.limit, 1, 300, 100);
  const clauses = ['s.mode = ?'];
  const values = [mode];
  if (onlyVisible) clauses.push('s.is_hidden = 0');
  if (categorySlug) {
    clauses.push('LOWER(c.slug) = LOWER(?)');
    values.push(categorySlug);
  }
  values.push(limit);

  const [sites] = await db.execute(
    `SELECT ${siteColumns.map((column) => `s.${column}`).join(', ')}
     FROM sites s
     LEFT JOIN categories c ON c.name = s.category AND c.mode = s.mode
     WHERE ${clauses.join(' AND ')}
     ORDER BY s.sort_order ASC, s.name ASC, s.id ASC
     LIMIT ?`,
    values
  );

  const results = [];
  const summary = {
    total: sites.length,
    checked: 0,
    normal: 0,
    redirected: 0,
    restricted: 0,
    challenge: 0,
    down: 0,
    timeout: 0,
    server_error: 0,
    unknown: 0,
  };

  for (const [index, site] of sites.entries()) {
    if (index > 0) await sleep(randomDelayMs());
    const result = await checkSiteLink(site);
    const saved = await saveSiteCheckResult(site, result);
    summary.checked += 1;
    if (Object.prototype.hasOwnProperty.call(summary, saved.check_status)) {
      summary[saved.check_status] += 1;
    } else {
      summary.unknown += 1;
    }
    results.push({
      id: site.id,
      name: site.name,
      mode: site.mode,
      category: site.category,
      url: site.url,
      ...saved,
    });
  }

  return res.json({
    ok: true,
    data: {
      mode,
      category_slug: categorySlug,
      only_visible: onlyVisible,
      limit,
      summary,
      results,
    },
  });
}));

app.get('/api/admin/sites/link-check-report', requireAdminToken, asyncRoute(async (req, res) => {
  const clauses = [];
  const values = [];
  const summaryClauses = [];
  const summaryValues = [];
  if (req.query.mode) {
    clauses.push('s.mode = ?');
    values.push(normalizeMode(req.query.mode));
    summaryClauses.push('s.mode = ?');
    summaryValues.push(normalizeMode(req.query.mode));
  }
  const categorySlug = normalizeSafeKey(req.query.category_slug || req.query.categorySlug);
  if (categorySlug) {
    clauses.push('LOWER(c.slug) = LOWER(?)');
    values.push(categorySlug);
    summaryClauses.push('LOWER(c.slug) = LOWER(?)');
    summaryValues.push(categorySlug);
  }
  const status = normalizeSafeKey(req.query.status);
  if (status === 'problem') {
    clauses.push(`s.check_status IN ('down','timeout','restricted','server_error','redirected','challenge','unknown')`);
  } else if (status) {
    clauses.push('s.check_status = ?');
    values.push(status);
  }
  const limit = clampInt(req.query.limit, 1, 500, 200);
  values.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await db.execute(
    `SELECT ${siteColumns.map((column) => `s.${column}`).join(', ')}, c.slug AS category_slug
     FROM sites s
     LEFT JOIN categories c ON c.name = s.category AND c.mode = s.mode
     ${where}
     ORDER BY s.last_checked_at DESC, s.id DESC
     LIMIT ?`,
    values
  );
  const [summaryRows] = await db.execute(
    `SELECT COALESCE(s.check_status, 'unchecked') AS check_status, COUNT(*) AS count
     FROM sites s
     LEFT JOIN categories c ON c.name = s.category AND c.mode = s.mode
     ${summaryClauses.length ? `WHERE ${summaryClauses.join(' AND ')}` : ''}
     GROUP BY COALESCE(s.check_status, 'unchecked')`,
    summaryValues
  );
  const [lastRows] = await db.execute(
    `SELECT MAX(s.last_checked_at) AS last_checked_at
     FROM sites s
     LEFT JOIN categories c ON c.name = s.category AND c.mode = s.mode
     ${summaryClauses.length ? `WHERE ${summaryClauses.join(' AND ')}` : ''}`,
    summaryValues
  );
  return res.json({
    ok: true,
    data: {
      rows,
      summary: summaryRows,
      category_slug: categorySlug,
      last_checked_at: lastRows[0]?.last_checked_at || rows[0]?.last_checked_at || null,
    },
  });
}));

app.patch('/api/admin/sites/:id/url', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const nextUrl = normalizeHttpUrl(req.body?.url);
  if (!nextUrl) return jsonError(res, 400, 'INVALID_URL', 'A valid http or https URL is required.');

  const site = await getSiteById(id);
  if (!site) return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');

  const reason = normalizeOptionalText(req.body?.reason) || 'URL candidate approved';
  const previousUrl = site.url;
  const memo = `${reason}. Previous URL: ${previousUrl}. New URL: ${nextUrl}. Domain: ${domainFromUrl(nextUrl)}.`;

  await db.execute(
    `UPDATE sites
     SET url = ?,
         final_url = ?,
         candidate_new_url = NULL,
         check_status = 'normal',
         http_status = NULL,
         down_count = 0,
         status_memo = ?,
         last_checked_at = NOW()
     WHERE id = ?`,
    [nextUrl, nextUrl, memo, id]
  );
  await db.execute(
    `INSERT INTO site_check_logs
     (site_id, checked_url, http_status, check_status, final_url, candidate_new_url, memo)
     VALUES (?, ?, NULL, 'normal', ?, NULL, ?)`,
    [id, previousUrl, nextUrl, memo]
  );

  const updated = await getSiteById(id);
  return res.json({ ok: true, data: updated });
}));

app.post('/api/admin/link-candidates/bulk', requireAdminToken, asyncRoute(async (req, res) => {
  const items = Array.isArray(req.body)
    ? req.body
    : Array.isArray(req.body?.candidates)
      ? req.body.candidates
      : Array.isArray(req.body?.rows)
        ? req.body.rows
        : Array.isArray(req.body?.items)
          ? req.body.items
          : [];

  if (items.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'candidates are required.');
  }

  const created = [];
  const skipped = [];
  const insertColumns = linkCandidateColumns.filter((column) => !['id', 'created_at', 'updated_at'].includes(column));

  for (const [index, item] of items.entries()) {
    try {
      const candidate = normalizeCandidateInput(item || {});
      const duplicate = await getUrlDuplicateInfo(candidate.site_url);
      if (duplicate.duplicate) {
        skipped.push({ index, site_url: candidate.site_url, domain: candidate.domain, reason: 'DUPLICATE_URL_OR_DOMAIN', duplicate });
        continue;
      }

      const values = insertColumns.map((column) => candidate[column] ?? null);
      const placeholders = insertColumns.map(() => '?').join(', ');
      const [result] = await db.execute(
        `INSERT INTO link_candidates (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await db.execute(
        `SELECT ${linkCandidateColumns.join(', ')} FROM link_candidates WHERE id = ? LIMIT 1`,
        [result.insertId]
      );
      created.push(rows[0]);
    } catch (err) {
      skipped.push({ index, reason: err.code || 'INVALID_CANDIDATE', message: err.message });
    }
  }

  return res.status(201).json({ ok: true, data: { created, skipped, created_count: created.length, skipped_count: skipped.length } });
}));

app.get('/api/admin/link-candidates', requireAdminToken, asyncRoute(async (req, res) => {
  const clauses = [];
  const values = [];
  if (req.query.mode) {
    clauses.push('mode = ?');
    values.push(normalizeMode(req.query.mode));
  }
  ['approved', 'rejected', 'imported'].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(req.query, column)) return;
    clauses.push(`${column} = ?`);
    values.push(normalizeBooleanInt(req.query[column], 0));
  });
  if (req.query.domain) {
    clauses.push('domain = ?');
    values.push(String(req.query.domain).toLowerCase().replace(/^www\./, ''));
  }
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await db.execute(
    `SELECT ${linkCandidateColumns.join(', ')} FROM link_candidates ${where} ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
    values
  );
  return res.json({ ok: true, data: rows });
}));

app.patch('/api/admin/link-candidates/:id', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  let updates;
  try {
    updates = normalizeCandidateInput(req.body || {}, true);
  } catch (err) {
    return jsonError(res, 400, err.code || 'INVALID_CANDIDATE', err.message);
  }

  if (updates.site_url) {
    const duplicate = await getUrlDuplicateInfo(updates.site_url, id);
    if (duplicate.duplicate) {
      return res.status(400).json({ ok: false, error: 'DUPLICATE_URL_OR_DOMAIN', message: 'site_url or domain already exists.', data: duplicate });
    }
  }

  const entries = Object.entries(updates).filter(([column]) => linkCandidateColumns.includes(column));
  if (entries.length === 0) {
    return jsonError(res, 400, 'VALIDATION_ERROR', 'No editable fields were provided.');
  }

  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(id);
  const [result] = await db.execute(`UPDATE link_candidates SET ${setClause} WHERE id = ?`, values);
  if (result.affectedRows === 0) return jsonError(res, 404, 'NOT_FOUND', 'Candidate not found.');

  const [rows] = await db.execute(`SELECT ${linkCandidateColumns.join(', ')} FROM link_candidates WHERE id = ? LIMIT 1`, [id]);
  return res.json({ ok: true, data: rows[0] });
}));

app.post('/api/admin/link-candidates/:id/import', requireAdminToken, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return jsonError(res, 400, 'INVALID_ID', 'A valid numeric id is required.');

  const [rows] = await db.execute(`SELECT ${linkCandidateColumns.join(', ')} FROM link_candidates WHERE id = ? LIMIT 1`, [id]);
  const candidate = rows[0];
  if (!candidate) return jsonError(res, 404, 'NOT_FOUND', 'Candidate not found.');
  if (candidate.imported) return jsonError(res, 400, 'ALREADY_IMPORTED', 'Candidate has already been imported.');
  if (candidate.rejected) return jsonError(res, 400, 'REJECTED_CANDIDATE', 'Rejected candidate cannot be imported.');
  if (!candidate.approved && req.body?.force !== true) {
    return jsonError(res, 400, 'NOT_APPROVED', 'Candidate must be approved before import.');
  }

  const siteUrl = normalizeHttpUrl(candidate.site_url);
  if (!siteUrl) return jsonError(res, 400, 'INVALID_SITE_URL', 'Candidate site_url is invalid.');
  const duplicate = await getUrlDuplicateInfo(siteUrl, id);
  if (duplicate.sites.length > 0) {
    return res.status(400).json({ ok: false, error: 'DUPLICATE_URL_OR_DOMAIN', message: 'Site already exists.', data: duplicate });
  }

  const mode = normalizeMode(candidate.mode);
  let categoryName = normalizeOptionalText(candidate.category_name);
  if (candidate.category_slug) {
    const [categoryRows] = await db.execute(
      'SELECT name FROM categories WHERE mode = ? AND slug = ? LIMIT 1',
      [mode, candidate.category_slug]
    );
    categoryName = categoryRows[0]?.name || categoryName;
  }
  if (!categoryName) return jsonError(res, 400, 'CATEGORY_REQUIRED', 'category_slug or category_name is required.');

  const [[orderRow]] = await db.execute(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM sites WHERE mode = ? AND category = ?',
    [mode, categoryName]
  );
  const logo = normalizeOptionalText(candidate.logo_final_url || candidate.logo_candidate_url) || '/uploads/logos/default.png';
  const [result] = await db.execute(
    `INSERT INTO sites
     (mode, name, url, category, description, logo, status, seo_slug, preview_image, is_hidden, is_featured, featured_order, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mode,
      candidate.site_name,
      siteUrl,
      categoryName,
      candidate.memo || '',
      logo,
      normalizeSiteStatus(candidate.status_kr || candidate.status_global || 'checking'),
      null,
      normalizeOptionalText(candidate.preview_image_url),
      1,
      0,
      0,
      Number(orderRow?.next_order) || 0,
    ]
  );
  const taken = await getTakenSiteSlugs(result.insertId);
  const generatedSlug = uniqueSiteSlug(candidate.site_name, result.insertId, taken);
  await db.execute('UPDATE sites SET seo_slug = ? WHERE id = ?', [generatedSlug, result.insertId]);
  await db.execute(
    'UPDATE link_candidates SET imported = 1, site_id = ? WHERE id = ?',
    [result.insertId, id]
  );

  const site = await getSiteById(result.insertId);
  return res.status(201).json({ ok: true, data: { candidate_id: id, site } });
}));

app.get('/api/sites', asyncRoute(async (req, res) => {
  await ensureSiteSlugs();
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

  const existing = await getSiteById(id);
  if (!existing) return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');

  const updates = {};
  seoColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, column)) return;
    if (column === 'seo_score') {
      updates[column] = normalizeSeoScore(req.body[column]);
    } else if (column === 'seo_slug') {
      updates[column] = normalizeSiteSlug(req.body[column]);
    } else if (column === 'seo_features' || column === 'seo_faq') {
      updates[column] = normalizeSeoLongTextValue(req.body[column]);
    } else {
      updates[column] = normalizeOptionalText(req.body[column]);
    }
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

  if (Object.prototype.hasOwnProperty.call(updates, 'seo_slug')) {
    if (!updates.seo_slug) {
      const taken = await getTakenSiteSlugs(id);
      updates.seo_slug = uniqueSiteSlug(existing.name, id, taken);
    }
    if (await isSiteSlugTaken(updates.seo_slug, id)) {
      return jsonError(res, 400, 'DUPLICATE_SITE_SLUG', 'Site SEO slug already exists.');
    }
  } else if (!normalizeSiteSlug(existing.seo_slug)) {
    const taken = await getTakenSiteSlugs(id);
    updates.seo_slug = uniqueSiteSlug(existing.name, id, taken);
  }

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

async function generateSiteSeoData({ siteId, mode, options = {} }) {
  if (!siteId) {
    const err = new Error('site_id is required.');
    err.status = 400;
    err.code = 'INVALID_ID';
    throw err;
  }

  const site = await getSiteById(siteId);
  if (!site) {
    const err = new Error('Site not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const effectiveMode = mode ? normalizeMode(mode) : normalizeMode(site.mode);
  const { promptTemplate } = await getDeepSeekConfig(effectiveMode);
  const prompt = `
${promptTemplate}

아래 사이트의 SEO 데이터를 한국어 JSON으로 생성하세요.
반드시 JSON만 출력하세요.
secure mode 또는 민감 카테고리에서는 중립적인 디렉토리 설명으로 작성하고, 우회/불법/무료 다운로드/무단 공유를 권장하지 마세요.

사이트명: ${site.name}
URL: ${site.url}
카테고리: ${site.category || ''}
설명: ${site.description || ''}
톤: ${options.tone || '검색친화적이고 클릭을 유도하는 한국어'}
대상 국가: ${options.target_country || 'KR'}
대상 언어: ${options.target_language || 'ko'}

JSON 필드:
seo_title, seo_description, seo_keywords 배열, seo_slug, seo_h1,
seo_og_title, seo_og_description, seo_intro, seo_features 배열,
seo_faq 배열 [{"question":"...", "answer":"..."}],
seo_score 숫자, recommendations 배열

seo_intro는 2~4문단 정도의 사이트 상세 페이지 본문으로 작성하세요.
seo_features는 3~6개의 주요 기능/특징으로 작성하세요.
seo_faq는 3~5개의 질문/답변으로 작성하세요.
`;

  const text = await callDeepSeek({
    mode: effectiveMode,
    messages: [
      { role: 'system', content: 'You are a Korean SEO expert. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  });
  const parsed = parseJsonFromText(text);
  return { text, json: parsed, mode: effectiveMode };
}

async function buildGeneratedSeoUpdates(site, generatedSeo) {
  const seo = generatedSeo && typeof generatedSeo === 'object' ? generatedSeo : {};
  const slugCandidate =
    normalizeSiteSlug(seo.seo_slug) ||
    normalizeSiteSlug(site.seo_slug) ||
    uniqueSiteSlug(site.name, site.id, await getTakenSiteSlugs(site.id));
  let seoSlug = slugCandidate;
  if (await isSiteSlugTaken(seoSlug, site.id)) {
    const taken = await getTakenSiteSlugs(site.id);
    seoSlug = uniqueSiteSlug(seoSlug, site.id, taken);
  }

  return {
    seo_title: normalizeGeneratedSeoText(seo.seo_title) || site.seo_title || `${site.name} 바로가기 | 전체닷컴`,
    seo_description: normalizeGeneratedSeoText(seo.seo_description) || site.seo_description || site.description || '',
    seo_keywords: normalizeGeneratedSeoText(seo.seo_keywords) || site.seo_keywords || site.name,
    seo_slug: seoSlug,
    seo_h1: normalizeGeneratedSeoText(seo.seo_h1) || site.seo_h1 || site.name,
    seo_canonical: `https://junchae.com/site/${seoSlug}`,
    seo_og_title: normalizeGeneratedSeoText(seo.seo_og_title || seo.seo_title) || site.seo_og_title || site.name,
    seo_og_description:
      normalizeGeneratedSeoText(seo.seo_og_description || seo.seo_description) ||
      site.seo_og_description ||
      site.seo_description ||
      site.description ||
      '',
    seo_og_image: normalizeGeneratedSeoText(seo.seo_og_image) || site.seo_og_image || site.preview_image || site.logo || '',
    seo_intro: normalizeGeneratedSeoText(seo.seo_intro) || site.seo_intro || '',
    seo_features: normalizeSeoLongTextValue(seo.seo_features) || site.seo_features || '',
    seo_faq: normalizeSeoLongTextValue(seo.seo_faq) || site.seo_faq || '',
    seo_score: normalizeSeoScore(seo.seo_score || site.seo_score || 0),
    seo_updated_at: new Date(),
  };
}

async function saveGeneratedSeo(siteId, generatedSeo) {
  const site = await getSiteById(siteId);
  if (!site) {
    const err = new Error('Site not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const updates = await buildGeneratedSeoUpdates(site, generatedSeo);
  const entries = Object.entries(updates);
  const setClause = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(siteId);
  await db.execute(`UPDATE sites SET ${setClause} WHERE id = ?`, values);
  return updates;
}

app.post('/api/deepseek/generate-seo', requireAdminToken, asyncRoute(async (req, res) => {
  const mode = req.body?.mode;
  const siteId = parseId(req.body?.site_id);

  try {
    const data = await generateSiteSeoData({ siteId, mode, options: req.body?.options || {} });
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('DeepSeek SEO generation error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    return jsonError(res, err.status || 500, err.code || 'DEEPSEEK_ERROR', err.message);
  }
}));

app.post('/api/admin/sites/:id/generate-seo', requireAdminToken, asyncRoute(async (req, res) => {
  const siteId = parseId(req.params.id);
  const mode = req.body?.mode;
  const shouldSave = req.body?.save === true || req.body?.save === 'true' || req.body?.save === 1 || req.body?.save === '1';

  try {
    const data = await generateSiteSeoData({ siteId, mode, options: req.body?.options || {} });
    let seo = data.json && typeof data.json === 'object' ? data.json : null;
    if (shouldSave) {
      const savedSeo = await saveGeneratedSeo(siteId, seo);
      seo = savedSeo;
    }
    return res.json({
      ok: true,
      saved: shouldSave,
      site_id: siteId,
      seo,
      data: {
        ...data,
        json: seo,
        saved: shouldSave,
        site_id: siteId,
      },
    });
  } catch (err) {
    console.error('Admin site SEO generation error:', { code: err.code, status: err.status, message: err.message, body: err.body });
    return res.status(err.status || 500).json({
      ok: false,
      saved: false,
      site_id: siteId,
      error: err.code || 'DEEPSEEK_ERROR',
      message: err.message,
    });
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
    if (category.slug && await isCategorySlugTaken(category.slug)) {
      return jsonError(res, 400, 'DUPLICATE_CATEGORY_SLUG', 'Category slug already exists.');
    }
    if (!category.slug) {
      const taken = await getTakenCategorySlugs();
      category.slug = uniqueCategorySlug(category.name, null, taken);
    }

    const [result] = await db.execute(
      `INSERT INTO categories
       (name, slug, mode, sort_order, seo_title, seo_description, seo_keywords, seo_intro, seo_faq, seo_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.name,
        category.slug,
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

  if (Object.prototype.hasOwnProperty.call(updates, 'slug')) {
    if (!updates.slug) {
      const taken = await getTakenCategorySlugs(id);
      updates.slug = uniqueCategorySlug(updates.name || existing.name, id, taken);
    }
    if (await isCategorySlugTaken(updates.slug, id)) {
      return jsonError(res, 400, 'DUPLICATE_CATEGORY_SLUG', 'Category slug already exists.');
    }
  } else if (!normalizeCategorySlug(existing.slug)) {
    const taken = await getTakenCategorySlugs(id);
    updates.slug = uniqueCategorySlug(updates.name || existing.name, id, taken);
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

app.post('/api/uploads/site-preview', requireAdminToken, (req, res) => {
  uploadSitePreview.single('image')(req, res, (err) => {
    if (err) {
      console.error('Site preview upload error:', err);
      const error =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'SITE_PREVIEW_FILE_TOO_LARGE'
          : err.message === 'INVALID_SITE_PREVIEW_FILE_TYPE'
            ? 'INVALID_SITE_PREVIEW_FILE_TYPE'
            : 'SITE_PREVIEW_UPLOAD_FAILED';
      return jsonError(res, 400, error);
    }

    if (!req.file) {
      return jsonError(res, 400, 'SITE_PREVIEW_FILE_REQUIRED', 'form-data field "image" is required.');
    }

    return res.status(201).json({
      ok: true,
      data: { url: publicUrlForFile(sitePreviewPublicPath, req.file.filename) },
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
          : contentType === 'image/gif'
            ? '.gif'
          : contentType.includes('icon')
            ? '.ico'
            : '.png';
  const fileName = safeFileName('logo', `remote${ext}`, allowedLogoExtensions, '.png');
  ensureDir(logoUploadDir);
  await fs.promises.writeFile(safeUploadPath(logoUploadDir, fileName), buffer);

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

  if (site.seo_slug && await isSiteSlugTaken(site.seo_slug)) {
    return jsonError(res, 400, 'DUPLICATE_SITE_SLUG', 'Site SEO slug already exists.');
  }
  const shouldGenerateSiteSlug = !site.seo_slug;

  const [result] = await db.execute(
    `INSERT INTO sites
     (mode, name, url, category, description, logo, status, seo_slug, seo_intro, seo_features, seo_faq, preview_image, is_hidden, is_featured, featured_order, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      site.mode,
      site.name,
      site.url,
      site.category,
      site.description,
      site.logo,
      site.status,
      site.seo_slug,
      site.seo_intro,
      site.seo_features,
      site.seo_faq,
      site.preview_image,
      site.is_hidden,
      site.is_featured,
      site.featured_order,
      site.sort_order,
    ]
  );

  if (shouldGenerateSiteSlug) {
    const taken = await getTakenSiteSlugs(result.insertId);
    const generatedSlug = uniqueSiteSlug(site.name, result.insertId, taken);
    await db.execute('UPDATE sites SET seo_slug = ? WHERE id = ?', [generatedSlug, result.insertId]);
  }

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

  const existing = await getSiteById(id);
  if (!existing) {
    return jsonError(res, 404, 'NOT_FOUND', 'Site not found.');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'seo_slug')) {
    if (!updates.seo_slug) {
      const taken = await getTakenSiteSlugs(id);
      updates.seo_slug = uniqueSiteSlug(updates.name || existing.name, id, taken);
    }
    if (await isSiteSlugTaken(updates.seo_slug, id)) {
      return jsonError(res, 400, 'DUPLICATE_SITE_SLUG', 'Site SEO slug already exists.');
    }
  } else if (!normalizeSiteSlug(existing.seo_slug)) {
    const taken = await getTakenSiteSlugs(id);
    updates.seo_slug = uniqueSiteSlug(updates.name || existing.name, id, taken);
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
