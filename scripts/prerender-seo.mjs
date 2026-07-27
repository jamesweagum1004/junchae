import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const canonicalFallback = 'https://junchae.com';
const statusFreshnessNotice = '상태 정보는 마지막 점검 기준이며, 접속 시점에 따라 달라질 수 있습니다.';

const cliArgs = Object.fromEntries(
  process.argv.slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split('=');
      return [key.replace(/-/g, '_'), rest.length ? rest.join('=') : 'true'];
    })
);

function option(name, fallback = '') {
  const cliKey = name.toLowerCase().replace(/^prerender_/, '');
  return process.env[name] ?? cliArgs[cliKey] ?? fallback;
}

function boolOption(name, fallback) {
  const value = option(name, '');
  if (value === '') return fallback;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function intOption(name, fallback, min, max) {
  const parsed = Number(option(name, ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

const apiBase = String(option('PRERENDER_API_BASE', 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const outDirOption = option('PRERENDER_OUT_DIR', 'dist');
const distDir = path.isAbsolute(outDirOption) ? outDirOption : path.join(rootDir, outDirOption);

const runtimeOptions = {
  includeSecure: boolOption('PRERENDER_INCLUDE_SECURE', true),
  maxSitePages: intOption('PRERENDER_MAX_SITE_PAGES', 1000, 1, 10000),
  skipSites: boolOption('PRERENDER_SKIP_SITES', false),
  onlyFeatured: boolOption('PRERENDER_ONLY_FEATURED', false),
  route: normalizeRoute(option('PRERENDER_ROUTE', '')),
  siteId: option('PRERENDER_SITE_ID', ''),
  categorySlug: normalizeSlug(option('PRERENDER_CATEGORY_SLUG', ''), ''),
};

const defaultPrerenderSettings = {
  prerender_enabled: true,
  prerender_home: true,
  prerender_categories: true,
  prerender_sites: true,
  prerender_updates: true,
  prerender_tools: true,
  prerender_include_secure: true,
  prerender_max_site_pages: 1000,
};

const statusLabels = {
  normal: '정상 확인',
  redirected: '리다이렉트 감지',
  candidate_detected: '새 주소 후보 감지',
  restricted: '접근 제한',
  challenge: '자동 확인 제한',
  latest_unknown: '최신 주소 확인 필요',
  down: '접속 불가',
  timeout: '시간 초과',
  server_error: '서버 오류',
  unknown: '확인 필요',
  unchecked: '미점검',
  candidate_dismissed: '후보 확인 완료',
  candidate_rejected: '후보 확인 완료',
};

const prerenderCriticalCss = `<style id="seo-prerender-boot">
html,
body {
  min-height: 100%;
  margin: 0;
  background: #05060a;
}
#app-loading {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #05060a;
  color: #fff;
}
#app-loading .app-loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
#app-loading .app-loading-logo {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
}
#app-loading .app-loading-text {
  font-size: 13px;
  color: #9ca3af;
}
.seo-prerender {
  position: absolute !important;
  left: -99999px !important;
  top: 0 !important;
  width: 1px !important;
  height: 1px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
</style>`;

const prerenderNoscriptCss = `<noscript>
  <style>
    #app-loading {
      display: none !important;
    }
    .seo-prerender {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      padding: 24px !important;
      background: #fff !important;
      color: #111 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
  </style>
</noscript>`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function plain(value, max = 500) {
  return stripTags(value).slice(0, max);
}

function boolSetting(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true;
  if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') return false;
  return fallback;
}

function booleanLike(value, fallback) {
  return boolSetting(value, fallback);
}

function intSetting(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function normalizePrerenderSettings(raw = {}) {
  return {
    prerender_enabled: boolSetting(raw.prerender_enabled, defaultPrerenderSettings.prerender_enabled),
    prerender_home: boolSetting(raw.prerender_home, defaultPrerenderSettings.prerender_home),
    prerender_categories: boolSetting(raw.prerender_categories, defaultPrerenderSettings.prerender_categories),
    prerender_sites: boolSetting(raw.prerender_sites, defaultPrerenderSettings.prerender_sites),
    prerender_updates: boolSetting(raw.prerender_updates, defaultPrerenderSettings.prerender_updates),
    prerender_tools: boolSetting(raw.prerender_tools, defaultPrerenderSettings.prerender_tools),
    prerender_include_secure: boolSetting(raw.prerender_include_secure, defaultPrerenderSettings.prerender_include_secure),
    prerender_max_site_pages: intSetting(raw.prerender_max_site_pages, defaultPrerenderSettings.prerender_max_site_pages, 1, 10000),
  };
}

async function getJson(pathname, { optional = false } = {}) {
  const url = `${apiBase}${pathname}`;
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    if (optional) return null;
    throw new Error(`SEO prerender API request failed: ${url} (${err.message})`);
  }
  if (!response.ok) {
    if (optional) return null;
    throw new Error(`SEO prerender API returned ${response.status}: ${url}`);
  }
  const body = await response.json().catch((err) => {
    throw new Error(`SEO prerender API JSON parse failed: ${url} (${err.message})`);
  });
  return body?.data ?? body;
}

function normalizeSlug(value, fallback) {
  const source = value || fallback || '';
  if (!String(source).trim()) return '';
  const raw = String(source).trim().toLowerCase();
  return raw
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRoute(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const pathname = raw.startsWith('http') ? new URL(raw).pathname : raw;
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function categorySlug(category) {
  return normalizeSlug(category.slug, category.id || category.name);
}

function siteSlug(site) {
  return normalizeSlug(site.seo_slug, '');
}

function routeSiteSlug(site) {
  return encodeURIComponent(siteSlug(site));
}

function siteHidden(site) {
  return site?.is_hidden === 1 || site?.is_hidden === true || site?.isHidden === true;
}

function siteFeatured(site) {
  return site?.is_featured === 1 || site?.is_featured === true || site?.isFeatured === true;
}

function statusLabel(site) {
  const status = String(site?.check_status || site?.status || 'unchecked').trim().toLowerCase();
  if (site?.candidate_new_url) return statusLabels.candidate_detected;
  return statusLabels[status] || statusLabels.unknown;
}

function publicStatusSummary(site) {
  const date = formatPublicCheckDate(site?.last_checked_at || site?.updated_at || site?.created_at);
  return `${escapeHtml(site.name)} - ${escapeHtml(statusLabel(site))} - ${escapeHtml(date)}`;
}

function formatPublicCheckDate(value) {
  if (!value) return '확인일 정보 없음';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '확인일 정보 없음';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 0) return '오늘 확인';
  if (dayDiff === 1) return '어제 확인';
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. 확인`;
}

function timestamp(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

function compareSitePriority(a, b) {
  return Number(siteFeatured(b)) - Number(siteFeatured(a)) ||
    timestamp(b.seo_updated_at) - timestamp(a.seo_updated_at) ||
    timestamp(b.updated_at) - timestamp(a.updated_at) ||
    timestamp(b.created_at) - timestamp(a.created_at) ||
    Number(b.id || 0) - Number(a.id || 0);
}

function parseTextList(value, limit) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item?.title || item?.text || item?.feature || item))
      .filter(Boolean)
      .slice(0, limit);
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parseTextList(parsed, limit);
  } catch {
    // Plain text fallback below.
  }
  return String(value).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, limit);
}

function parseFaq(value, limit = 5) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : (() => {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })();
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      question: plain(item?.question, 160),
      answer: plain(item?.answer, 300),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, limit);
}

function absoluteUrl(baseUrl, pathname) {
  const base = String(baseUrl || canonicalFallback).replace(/\/+$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${cleanPath}`;
}

function replaceOrInsertHead(html, selectorRegex, tag) {
  if (selectorRegex.test(html)) return html.replace(selectorRegex, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function insertAfterHeadStart(html, tag) {
  return html.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${tag}`);
}

function jsonLdScript(jsonLd) {
  if (!jsonLd) return '';
  const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function removeExistingJsonLd(html) {
  return html.replace(/\s*<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, '');
}

function replaceRootContent(html, innerHtml) {
  const rootMatch = /<div id="root"[^>]*>/i.exec(html);
  if (!rootMatch) return html;
  const start = rootMatch.index + rootMatch[0].length;
  const scriptIndex = html.indexOf('<script type="module"', start);
  const searchEnd = scriptIndex === -1 ? html.length : scriptIndex;
  const end = html.lastIndexOf('</div>', searchEnd);
  if (end < start) return html;
  return `${html.slice(0, start)}\n${innerHtml}\n    ${html.slice(end)}`;
}

function ensurePrerenderBoot(html) {
  let next = html;
  if (!next.includes('id="seo-prerender-boot"')) {
    next = insertAfterHeadStart(next, prerenderCriticalCss);
  }
  if (!next.includes('<noscript>')) {
    if (next.includes(prerenderCriticalCss)) {
      next = next.replace(prerenderCriticalCss, `${prerenderCriticalCss}\n    ${prerenderNoscriptCss}`);
    } else {
      next = insertAfterHeadStart(next, prerenderNoscriptCss);
    }
  }
  return next;
}

function appLoadingHtml() {
  return `<div id="app-loading" class="app-loading" aria-label="전체닷컴 로딩 중">
  <div class="app-loading-card">
    <div class="app-loading-logo">전체닷컴</div>
    <div class="app-loading-text">사이트 접속 상태를 불러오는 중입니다</div>
  </div>
</div>`;
}

function injectSeo(html, { title, description, canonical, type = 'website', body, jsonLd }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  let next = html.replace(/<html([^>]*)>/i, '<html lang="ko">');
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  next = replaceOrInsertHead(next, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${safeDescription}" />`);
  next = replaceOrInsertHead(next, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${safeCanonical}" />`);
  next = replaceOrInsertHead(next, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${safeTitle}" />`);
  next = replaceOrInsertHead(next, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${safeDescription}" />`);
  next = replaceOrInsertHead(next, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${safeCanonical}" />`);
  next = replaceOrInsertHead(next, /<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="${escapeHtml(type)}" />`);
  next = ensurePrerenderBoot(next);
  next = removeExistingJsonLd(next);
  if (jsonLd) {
    next = next.replace('</head>', `    ${jsonLdScript(jsonLd)}\n  </head>`);
  }
  return replaceRootContent(next, `${appLoadingHtml()}\n${body}`);
}

function section(title, items, renderItem) {
  if (!items.length) return '';
  return [
    `<section>`,
    `<h2>${escapeHtml(title)}</h2>`,
    `<ul>`,
    ...items.map((item) => `<li>${renderItem(item)}</li>`),
    `</ul>`,
    `</section>`,
  ].join('\n');
}

function statusNotice() {
  return `<p class="seo-status-notice">${escapeHtml(statusFreshnessNotice)}</p>`;
}

function layout(content) {
  return `<main class="seo-prerender" data-seo-prerender="true">
  ${content}
</main>`;
}

function homeHtml({ categories, sites, recentNormal, recentChanged, recentProblem }) {
  const categoryItems = categories.slice(0, 40).map((category) =>
    `<li><a href="/category/${encodeURIComponent(categorySlug(category))}">${escapeHtml(category.name)}</a></li>`
  ).join('\n');
  const siteItems = sites.slice(0, 60).map((site) =>
    `<li><a href="/site/${routeSiteSlug(site)}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}</li>`
  ).join('\n');
  return layout(`
    <h1>전체닷컴 - 사이트 주소 모음 및 접속 상태 확인</h1>
    <p>전체닷컴에서 주요 사이트 주소, 카테고리별 사이트 목록, 접속 상태와 주소 변경 정보를 확인하세요.</p>
    ${statusNotice()}
    <section><h2>주요 카테고리</h2><ul>${categoryItems}</ul></section>
    <section><h2>주요 사이트</h2><ul>${siteItems}</ul></section>
    ${section('최근 정상 확인 사이트', recentNormal.slice(0, 8), (site) => `${escapeHtml(site.name)} - ${escapeHtml(statusLabel(site))}`)}
    ${section('주소 변경 감지 사이트', recentChanged.slice(0, 8), (site) => `${escapeHtml(site.name)} - ${escapeHtml(statusLabel(site))}`)}
    ${section('확인 필요 사이트', recentProblem.slice(0, 8), (site) => `${escapeHtml(site.name)} - ${escapeHtml(statusLabel(site))}`)}
  `);
}

function categoryHtml(category, categorySites, relatedCategories) {
  const representatives = categorySites.slice(0, 5).map((site) => site.name).join(', ');
  return {
    title: `${category.name} 사이트 접속 상태 - 전체닷컴`,
    description: `${category.name} 카테고리의 주요 사이트 주소와 접속 상태를 확인하세요. ${representatives} 등의 상태 정보를 제공합니다.`,
    body: layout(`
      <h1>${escapeHtml(category.seo_title || `${category.name} 사이트 접속 상태`)}</h1>
      <p>${escapeHtml(category.seo_description || `${category.name} 카테고리의 주요 사이트 주소와 접속 상태를 확인하세요.`)}</p>
      ${statusNotice()}
      ${category.seo_intro ? `<p>${escapeHtml(plain(category.seo_intro, 600))}</p>` : ''}
      <section>
        <h2>${escapeHtml(category.name)} 사이트 목록</h2>
        <ul>
          ${categorySites.map((site) => `<li><a href="/site/${routeSiteSlug(site)}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}${site.description ? ` - ${escapeHtml(plain(site.description, 180))}` : ''}</li>`).join('\n')}
        </ul>
      </section>
      <section>
        <h2>관련 카테고리</h2>
        <ul>${relatedCategories.slice(0, 10).map((item) => `<li><a href="/category/${encodeURIComponent(categorySlug(item))}">${escapeHtml(item.name)}</a></li>`).join('\n')}</ul>
      </section>
    `),
  };
}

function siteHtml(site, relatedSites) {
  const features = parseTextList(site.seo_features, 6);
  const faqs = parseFaq(site.seo_faq, 5);
  return {
    title: site.seo_title || `${site.name} 접속 상태 및 주소 확인 - 전체닷컴`,
    description: site.seo_description || `${site.name}의 현재 접속 상태, 등록 주소, 주소 변경 후보, 관련 사이트 정보를 전체닷컴에서 확인하세요.`,
    body: layout(`
      <h1>${escapeHtml(site.seo_h1 || `${site.name} 접속 상태 및 주소 확인`)}</h1>
      <p>${escapeHtml(site.seo_description || site.description || `${site.name}은 ${site.category || '사이트'} 카테고리에 등록된 사이트입니다. 현재 상태는 ${statusLabel(site)}입니다.`)}</p>
      ${statusNotice()}
      <ul>
        <li>카테고리: ${escapeHtml(site.category || '-')}</li>
        <li>상태: ${escapeHtml(statusLabel(site))}</li>
        <li>등록 주소: ${escapeHtml(site.url || '-')}</li>
        ${site.http_status ? `<li>HTTP 상태: ${escapeHtml(site.http_status)}</li>` : ''}
        ${site.last_checked_at ? `<li>마지막 확인: ${escapeHtml(formatPublicCheckDate(site.last_checked_at))}</li>` : ''}
        ${site.final_url ? `<li>최종 URL: ${escapeHtml(site.final_url)}</li>` : ''}
        ${site.candidate_new_url ? `<li>새 주소 후보 감지: ${escapeHtml(site.candidate_new_url)}</li>` : ''}
      </ul>
      ${site.seo_intro ? `<section><h2>${escapeHtml(site.name)} 안내</h2><p>${escapeHtml(plain(site.seo_intro, 1000))}</p></section>` : ''}
      ${features.length ? section('주요 특징', features, (item) => escapeHtml(plain(item, 180))) : ''}
      ${faqs.length ? `<section><h2>자주 묻는 질문</h2>${faqs.map((faq) => `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join('\n')}</section>` : ''}
      ${relatedSites.length ? section('관련 사이트', relatedSites.slice(0, 6), (item) => `<a href="/site/${routeSiteSlug(item)}">${escapeHtml(item.name)}</a> - ${escapeHtml(statusLabel(item))}`) : ''}
      <section><h2>최근 점검 상태 요약</h2><p>${escapeHtml(statusLabel(site))}${site.status_memo ? ` - ${escapeHtml(plain(site.status_memo, 240))}` : ''}</p></section>
    `),
  };
}

function updatesHtml({ changed, problem, normal, added }) {
  return layout(`
    <h1>전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트</h1>
    <p>최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인 사이트 정보를 전체닷컴에서 확인하세요.</p>
    ${statusNotice()}
    ${section('최근 주소 변경 감지', changed.slice(0, 20), (site) => `<a href="/site/${routeSiteSlug(site)}">${publicStatusSummary(site)}</a>`)}
    ${section('최근 접속 불안정', problem.slice(0, 20), (site) => `<a href="/site/${routeSiteSlug(site)}">${publicStatusSummary(site)}</a>`)}
    ${section('최근 정상 확인', normal.slice(0, 20), (site) => `<a href="/site/${routeSiteSlug(site)}">${publicStatusSummary(site)}</a>`)}
    ${section('최근 추가된 사이트', added.slice(0, 20), (site) => `<a href="/site/${routeSiteSlug(site)}">${publicStatusSummary(site)}</a>`)}
  `);
}

function toolHtml() {
  return layout(`
    <h1>URL 상태 확인 도구</h1>
    <p>URL의 접속 상태, 리다이렉트, 접근 제한 여부를 서버에서 확인할 수 있는 전체닷컴 도구입니다.</p>
    <section>
      <h2>사용 방법</h2>
      <ol>
        <li>확인할 http 또는 https URL을 입력합니다.</li>
        <li>서버가 접속 상태와 최종 URL, 리다이렉트 여부를 확인합니다.</li>
        <li>접근 제한, 자동 확인 제한, 시간 초과 여부를 결과로 확인합니다.</li>
      </ol>
      <p>외부 사이트 본문은 공개 결과로 제공하지 않습니다.</p>
    </section>
  `);
}

function routeOutputPath(routePath) {
  return routePath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, routePath.replace(/^\/+/, ''), 'index.html');
}

async function writeRoute(template, routePath, seo, generatedRoutes) {
  const outputPath = routeOutputPath(routePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, injectSeo(template, seo), 'utf8');
  generatedRoutes.push({ route: routePath, outputPath, kind: seo.kind || 'page', site: seo.site || null });
  return outputPath;
}

function homeJsonLd(canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '전체닷컴',
    url: canonical,
    description: '사이트 주소 모음 및 접속 상태 확인',
  };
}

function categoryJsonLd(category, categorySites, canonical, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} 사이트 접속 상태`,
    url: canonical,
    description,
    hasPart: categorySites.slice(0, 10).map((site) => ({
      '@type': 'WebPage',
      name: site.name,
      url: absoluteUrl(canonicalFallback, `/site/${siteSlug(site)}`),
    })),
  };
}

function siteJsonLd(site, canonical, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${site.name} 접속 상태 및 주소 확인`,
    url: canonical,
    description: `${description} ${statusFreshnessNotice}`,
    about: {
      '@type': 'Thing',
      name: site.name,
      category: site.category || site.categoryName || '',
    },
  };
}

function updatesJsonLd(canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트',
    url: canonical,
  };
}

function toolJsonLd(canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'URL 상태 확인 도구',
    url: canonical,
    applicationCategory: 'UtilityApplication',
  };
}

function shouldRenderRoute(route) {
  return !runtimeOptions.route || runtimeOptions.route === route;
}

function isSingleMode() {
  return Boolean(runtimeOptions.route || runtimeOptions.siteId || runtimeOptions.categorySlug);
}

function modeOfSite(site) {
  return site.mode === 'secure' ? 'secure' : 'normal';
}

async function loadData(settings) {
  const modes = settings.prerender_include_secure && runtimeOptions.includeSecure ? ['normal', 'secure'] : ['normal'];
  const categoriesByMode = {};
  const publicSitesByMode = {};
  const hiddenSites = [];
  const noSlugSites = [];
  const recentByMode = {};

  for (const mode of modes) {
    const [categories, sites, recent] = await Promise.all([
      getJson(`/api/categories?mode=${encodeURIComponent(mode)}`),
      getJson(`/api/sites?mode=${encodeURIComponent(mode)}`),
      getJson(`/api/sites/recent-status?mode=${encodeURIComponent(mode)}`, { optional: true }),
    ]);
    categoriesByMode[mode] = Array.isArray(categories) ? categories : [];
    const siteRows = Array.isArray(sites) ? sites : [];
    hiddenSites.push(...siteRows.filter(siteHidden));
    const visible = siteRows.filter((site) => !siteHidden(site));
    noSlugSites.push(...visible.filter((site) => !siteSlug(site)));
    publicSitesByMode[mode] = visible.filter((site) => siteSlug(site));
    recentByMode[mode] = recent || {};
  }

  let skippedSecure = 0;
  if (!modes.includes('secure')) {
    const secureSites = await getJson('/api/sites?mode=secure', { optional: true });
    skippedSecure = (Array.isArray(secureSites) ? secureSites : []).filter((site) => !siteHidden(site)).length;
  }

  return { modes, categoriesByMode, publicSitesByMode, hiddenSites, noSlugSites, recentByMode, skippedSecure };
}

function selectSitePages(allSites, settings) {
  if (runtimeOptions.categorySlug) return [];
  if (runtimeOptions.skipSites || !settings.prerender_sites) return [];
  let candidates = [...allSites];
  if (runtimeOptions.onlyFeatured) {
    candidates = candidates.filter(siteFeatured);
  }
  if (runtimeOptions.siteId) {
    candidates = candidates.filter((site) => String(site.id) === String(runtimeOptions.siteId));
  }
  if (runtimeOptions.route?.startsWith('/site/')) {
    const wanted = decodeURIComponent(runtimeOptions.route.replace(/^\/site\//, ''));
    candidates = candidates.filter((site) => siteSlug(site) === wanted);
  }
  return candidates.sort(compareSitePriority).slice(0, settings.prerender_max_site_pages);
}

function buildSettings(rawSettings) {
  const settings = normalizePrerenderSettings(rawSettings || {});
  settings.prerender_include_secure = boolOption(
    'PRERENDER_INCLUDE_SECURE',
    settings.prerender_include_secure
  );
  settings.prerender_max_site_pages = intOption(
    'PRERENDER_MAX_SITE_PAGES',
    settings.prerender_max_site_pages,
    1,
    10000
  );
  return settings;
}

async function collectGeneratedHtmlRoutes() {
  const routes = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name === 'index.html') {
        const content = await fs.readFile(fullPath, 'utf8').catch(() => '');
        if (!content.includes('data-seo-prerender="true"')) continue;
        const relative = path.relative(distDir, fullPath).replace(/\\/g, '/');
        const route = relative === 'index.html'
          ? '/'
          : `/${relative.replace(/\/index\.html$/, '')}`;
        routes.push(route);
      }
    }
  }
  await walk(distDir);
  return routes;
}

async function validateRoutes(generatedRoutes, hiddenSites) {
  const expected = new Set(generatedRoutes.map((item) => item.route));
  const scanned = new Set(await collectGeneratedHtmlRoutes());
  const hiddenSlugs = new Set(hiddenSites.map(siteSlug).filter(Boolean).map((slug) => `/site/${slug}`));
  const missing = [];
  for (const item of generatedRoutes) {
    const exists = await fs.stat(item.outputPath).then((stat) => stat.isFile()).catch(() => false);
    if (!exists) missing.push(item.route);
  }
  const extra = [...scanned].filter((route) => !expected.has(route));
  const adminLeak = [...scanned].filter((route) => route.startsWith('/junchae1004') || route.startsWith('/api'));
  const hiddenLeak = [...scanned].filter((route) => hiddenSlugs.has(route));

  console.log('Prerender route check');
  console.log(`matched: ${generatedRoutes.length - missing.length}`);
  console.log(`missing_files: ${missing.length}`);
  console.log(`extra_files: ${extra.length}`);
  console.log(`admin_leak: ${adminLeak.length}`);
  console.log(`hidden_leak: ${hiddenLeak.length}`);
  if (missing.length) console.warn(`warning missing_files_routes: ${missing.slice(0, 10).join(', ')}`);
  if (extra.length) console.warn(`warning extra_prerender_routes: ${extra.slice(0, 10).join(', ')}`);
  if (adminLeak.length) console.warn(`warning admin_or_api_leak: ${adminLeak.join(', ')}`);
  if (hiddenLeak.length) console.warn(`warning hidden_site_leak: ${hiddenLeak.join(', ')}`);
}

function printVerificationCommands(canonicalBase, generatedRoutes) {
  const category = generatedRoutes.find((item) => item.route.startsWith('/category/'))?.route || '/category/portal';
  const site = generatedRoutes.find((item) => item.route.startsWith('/site/'))?.route || '/site/naver';
  const base = String(canonicalBase || canonicalFallback).replace(/\/+$/, '');
  console.log('Verification commands');
  console.log(`curl -s ${base}/ | grep -E "전체닷컴|사이트 주소|접속 상태"`);
  console.log(`curl -s ${base}${category} | grep -E "사이트|정상|접속 상태"`);
  console.log(`curl -s ${base}${site} | grep -E "상태|카테고리|정상"`);
  console.log(`curl -s ${base}/updates | grep -E "주소 변경|정상 확인|접속 상태"`);
}

async function main() {
  const startedAt = Date.now();
  const templatePath = path.join(distDir, 'index.html');
  const template = await fs.readFile(templatePath, 'utf8').catch(() => {
    throw new Error(`${path.relative(rootDir, templatePath)} not found. Run npm run build before npm run prerender:seo.`);
  });

  const [rawPrerenderSettings, seoSettings, features] = await Promise.all([
    getJson('/api/settings?mode=global&section=seo_prerender', { optional: true }),
    getJson('/api/settings?mode=global&section=seo_files', { optional: true }),
    getJson('/api/features/growth', { optional: true }),
  ]);
  const settings = buildSettings(rawPrerenderSettings || {});
  if (!settings.prerender_enabled) {
    console.log('SEO prerender skipped: prerender_enabled=false');
    return;
  }

  const canonicalBase = seoSettings?.sitemap_base_url || seoSettings?.canonical_url || canonicalFallback;
  const sitemapIncludesSecure = booleanLike(seoSettings?.sitemap_include_secure, false);
  if (settings.prerender_include_secure && runtimeOptions.includeSecure && !sitemapIncludesSecure) {
    console.warn('warning sitemap/prerender secure mismatch: prerender includes secure routes but sitemap_include_secure is false.');
  }
  const { modes, categoriesByMode, publicSitesByMode, hiddenSites, noSlugSites, recentByMode, skippedSecure } = await loadData(settings);
  const allCategories = modes.flatMap((mode) => categoriesByMode[mode]);
  const allSites = modes.flatMap((mode) => publicSitesByMode[mode]);
  const generatedRoutes = [];
  const counts = { home: 0, categories: 0, sites: 0, updates: 0, tools: 0 };
  const modeCounts = { normal: 0, secure: 0 };

  if (settings.prerender_home && shouldRenderRoute('/') && !runtimeOptions.siteId && !runtimeOptions.categorySlug) {
    const recentNormal = modes.flatMap((mode) => recentByMode[mode]?.recent_normal || []).filter((site) => !siteHidden(site));
    const recentChanged = modes.flatMap((mode) => recentByMode[mode]?.recent_changed || []).filter((site) => !siteHidden(site));
    const recentProblem = modes.flatMap((mode) => recentByMode[mode]?.recent_problem || []).filter((site) => !siteHidden(site));
    const canonical = absoluteUrl(canonicalBase, '/');
    await writeRoute(template, '/', {
      kind: 'home',
      title: '전체닷컴 - 사이트 주소 모음 및 접속 상태 확인',
      description: '전체닷컴에서 주요 사이트 주소, 카테고리별 사이트 목록, 접속 상태와 주소 변경 정보를 확인하세요.',
      canonical,
      jsonLd: homeJsonLd(canonical),
      body: homeHtml({ categories: allCategories, sites: allSites, recentNormal, recentChanged, recentProblem }),
    }, generatedRoutes);
    counts.home = 1;
  }

  if (settings.prerender_categories && !runtimeOptions.siteId) {
    for (const mode of modes) {
      for (const category of categoriesByMode[mode]) {
        const slug = categorySlug(category);
        const route = `/category/${encodeURIComponent(slug)}`;
        if (runtimeOptions.categorySlug && runtimeOptions.categorySlug !== slug) continue;
        if (!shouldRenderRoute(route) && !runtimeOptions.categorySlug) continue;
        const categorySites = publicSitesByMode[mode].filter((site) => (site.category || site.categoryName) === category.name);
        const related = categoriesByMode[mode].filter((item) => item.id !== category.id);
        const page = categoryHtml(category, categorySites, related);
        const canonical = absoluteUrl(canonicalBase, route);
        await writeRoute(template, route, {
          kind: 'category',
          title: page.title,
          description: page.description,
          canonical,
          jsonLd: categoryJsonLd(category, categorySites, canonical, page.description),
          body: page.body,
        }, generatedRoutes);
        counts.categories += 1;
      }
    }
  }

  const sitePages = selectSitePages(allSites, settings);
  for (const site of sitePages) {
    const slug = siteSlug(site);
    const route = `/site/${encodeURIComponent(slug)}`;
    if (!shouldRenderRoute(route) && !runtimeOptions.siteId) continue;
    const modeSites = publicSitesByMode[modeOfSite(site)] || allSites;
    const related = modeSites
      .filter((item) => item.id !== site.id && (item.category || item.categoryName) === (site.category || site.categoryName))
      .slice(0, 6);
    const page = siteHtml(site, related);
    const canonical = absoluteUrl(canonicalBase, route);
    await writeRoute(template, route, {
      kind: 'site',
      site,
      title: page.title,
      description: page.description,
      canonical,
      jsonLd: siteJsonLd(site, canonical, page.description),
      body: page.body,
    }, generatedRoutes);
    counts.sites += 1;
    modeCounts[modeOfSite(site)] += 1;
  }

  if (settings.prerender_updates && features?.show_updates_page !== false && shouldRenderRoute('/updates') && !runtimeOptions.siteId && !runtimeOptions.categorySlug) {
    const normalUpdates = await getJson('/api/sites/updates?mode=normal', { optional: true });
    const secureUpdates = settings.prerender_include_secure && runtimeOptions.includeSecure
      ? await getJson('/api/sites/updates?mode=secure', { optional: true })
      : null;
    const publicUpdateSite = (site) => !siteHidden(site) && siteSlug(site);
    const changed = [...(normalUpdates?.recent_changed || []), ...(secureUpdates?.recent_changed || [])].filter(publicUpdateSite);
    const problem = [...(normalUpdates?.recent_problem || []), ...(secureUpdates?.recent_problem || [])].filter(publicUpdateSite);
    const normal = [...(normalUpdates?.recent_normal || []), ...(secureUpdates?.recent_normal || [])].filter(publicUpdateSite);
    const added = [...(normalUpdates?.recent_added || []), ...(secureUpdates?.recent_added || [])].filter(publicUpdateSite);
    const canonical = absoluteUrl(canonicalBase, '/updates');
    await writeRoute(template, '/updates', {
      kind: 'updates',
      title: '전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트',
      description: '최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인 사이트 정보를 전체닷컴에서 확인하세요.',
      canonical,
      jsonLd: updatesJsonLd(canonical),
      body: updatesHtml({ changed, problem, normal, added }),
    }, generatedRoutes);
    counts.updates = 1;
  }

  if (settings.prerender_tools && features?.show_url_status_tool !== false && shouldRenderRoute('/tools/url-status-checker') && !runtimeOptions.siteId && !runtimeOptions.categorySlug) {
    const canonical = absoluteUrl(canonicalBase, '/tools/url-status-checker');
    await writeRoute(template, '/tools/url-status-checker', {
      kind: 'tool',
      title: 'URL 상태 확인 도구 - 전체닷컴',
      description: 'URL의 접속 상태, 리다이렉트, 접근 제한 여부를 확인할 수 있는 전체닷컴 도구입니다.',
      canonical,
      jsonLd: toolJsonLd(canonical),
      body: toolHtml(),
    }, generatedRoutes);
    counts.tools = 1;
  }

  if (isSingleMode()) {
    if (!generatedRoutes.length) {
      throw new Error(`SEO prerender single route failed: no route matched (${runtimeOptions.route || runtimeOptions.siteId || runtimeOptions.categorySlug})`);
    }
    const single = generatedRoutes[0];
    console.log('SEO prerender single route complete');
    console.log(`route: ${single.route}`);
    console.log(`output: ${path.relative(rootDir, single.outputPath).replace(/\\/g, '/')}`);
    console.log('status: success');
  } else {
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    console.log('SEO prerender complete');
    console.log(`home: ${counts.home}`);
    console.log(`categories: ${counts.categories}`);
    console.log(`sites: ${counts.sites}`);
    console.log(`updates: ${counts.updates}`);
    console.log(`tools: ${counts.tools}`);
    console.log(`total: ${total}`);
    console.log(`skipped_hidden: ${hiddenSites.length}`);
    console.log(`skipped_no_slug: ${noSlugSites.length}`);
    console.log(`skipped_secure: ${skippedSecure}`);
    console.log(`mode_normal: ${modeCounts.normal}`);
    console.log(`mode_secure: ${modeCounts.secure}`);
    console.log(`duration_ms: ${Date.now() - startedAt}`);
  }

  await validateRoutes(generatedRoutes, hiddenSites);
  printVerificationCommands(canonicalBase, generatedRoutes);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
