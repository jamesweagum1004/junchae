import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const apiBase = (process.env.PRERENDER_API_BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const canonicalFallback = 'https://junchae.com';

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
  const raw = String(value || fallback || '').trim().toLowerCase();
  return raw
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || String(fallback || 'page');
}

function categorySlug(category) {
  return normalizeSlug(category.slug, category.id || category.name);
}

function siteSlug(site) {
  return normalizeSlug(site.seo_slug, `${site.name}-${site.id}`);
}

function siteHidden(site) {
  return site?.is_hidden === 1 || site?.is_hidden === true || site?.isHidden === true;
}

function statusLabel(site) {
  const status = String(site?.check_status || site?.status || 'unchecked').trim().toLowerCase();
  if (site?.candidate_new_url) return statusLabels.candidate_detected;
  return statusLabels[status] || statusLabels.unknown;
}

function parseTextList(value, limit) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item?.title || item?.text || item?.feature || item)).filter(Boolean).slice(0, limit);
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

function injectSeo(html, { title, description, canonical, type = 'website', body }) {
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
  return next.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">\n${body}\n    </div>`);
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

function layout(content) {
  return `<main class="seo-prerender">
  ${content}
</main>`;
}

function homeHtml({ categories, sites, recentNormal, recentChanged, recentProblem }) {
  const categoryItems = categories.slice(0, 40).map((category) =>
    `<li><a href="/category/${encodeURIComponent(categorySlug(category))}">${escapeHtml(category.name)}</a></li>`
  ).join('\n');
  const siteItems = sites.slice(0, 60).map((site) =>
    `<li><a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}</li>`
  ).join('\n');
  return layout(`
    <h1>전체닷컴 - 사이트 주소 모음 및 접속 상태 확인</h1>
    <p>전체닷컴에서 주요 사이트 주소, 카테고리별 사이트 목록, 접속 상태와 주소 변경 정보를 확인하세요.</p>
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
      ${category.seo_intro ? `<p>${escapeHtml(plain(category.seo_intro, 600))}</p>` : ''}
      <section>
        <h2>${escapeHtml(category.name)} 사이트 목록</h2>
        <ul>
          ${categorySites.map((site) => `<li><a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}${site.description ? ` - ${escapeHtml(plain(site.description, 180))}` : ''}</li>`).join('\n')}
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
      <p>${escapeHtml(site.seo_description || site.description || `${site.name}는 ${site.category || '사이트'} 카테고리에 등록된 사이트입니다. 현재 상태는 ${statusLabel(site)}입니다.`)}</p>
      <ul>
        <li>카테고리: ${escapeHtml(site.category || '-')}</li>
        <li>상태: ${escapeHtml(statusLabel(site))}</li>
        <li>등록 주소: ${escapeHtml(site.url || '-')}</li>
        ${site.http_status ? `<li>HTTP 상태: ${escapeHtml(site.http_status)}</li>` : ''}
        ${site.final_url ? `<li>최종 URL: ${escapeHtml(site.final_url)}</li>` : ''}
        ${site.candidate_new_url ? `<li>새 주소 후보 감지: ${escapeHtml(site.candidate_new_url)}</li>` : ''}
      </ul>
      ${site.seo_intro ? `<section><h2>${escapeHtml(site.name)} 안내</h2><p>${escapeHtml(plain(site.seo_intro, 1000))}</p></section>` : ''}
      ${features.length ? section('주요 특징', features, (item) => escapeHtml(plain(item, 180))) : ''}
      ${faqs.length ? `<section><h2>자주 묻는 질문</h2>${faqs.map((faq) => `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join('\n')}</section>` : ''}
      ${relatedSites.length ? section('관련 사이트', relatedSites.slice(0, 6), (item) => `<a href="/site/${encodeURIComponent(siteSlug(item))}">${escapeHtml(item.name)}</a> - ${escapeHtml(statusLabel(item))}`) : ''}
      <section><h2>최근 점검 상태 요약</h2><p>${escapeHtml(statusLabel(site))}${site.status_memo ? ` - ${escapeHtml(plain(site.status_memo, 240))}` : ''}</p></section>
    `),
  };
}

function updatesHtml({ changed, problem, normal, added }) {
  return layout(`
    <h1>전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트</h1>
    <p>최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인 사이트 정보를 전체닷컴에서 확인하세요.</p>
    ${section('최근 주소 변경 감지', changed.slice(0, 20), (site) => `<a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}`)}
    ${section('최근 접속 불안정', problem.slice(0, 20), (site) => `<a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}`)}
    ${section('최근 정상 확인', normal.slice(0, 20), (site) => `<a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}`)}
    ${section('최근 추가된 사이트', added.slice(0, 20), (site) => `<a href="/site/${encodeURIComponent(siteSlug(site))}">${escapeHtml(site.name)}</a> - ${escapeHtml(statusLabel(site))}`)}
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

async function writeRoute(template, routePath, seo) {
  const outputPath = routePath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, routePath.replace(/^\/+/, ''), 'index.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, injectSeo(template, seo), 'utf8');
}

async function main() {
  const templatePath = path.join(distDir, 'index.html');
  const template = await fs.readFile(templatePath, 'utf8').catch(() => {
    throw new Error('dist/index.html not found. Run npm run build before npm run prerender:seo.');
  });

  const [rawPrerenderSettings, seoSettings, features] = await Promise.all([
    getJson('/api/settings?mode=global&section=seo_prerender', { optional: true }),
    getJson('/api/settings?mode=global&section=seo_files', { optional: true }),
    getJson('/api/features/growth', { optional: true }),
  ]);
  const settings = normalizePrerenderSettings(rawPrerenderSettings || {});
  if (!settings.prerender_enabled) {
    console.log('SEO prerender skipped: prerender_enabled=false');
    return;
  }
  const canonicalBase = seoSettings?.sitemap_base_url || seoSettings?.canonical_url || canonicalFallback;
  const modes = settings.prerender_include_secure ? ['normal', 'secure'] : ['normal'];

  const categoriesByMode = {};
  const sitesByMode = {};
  const recentByMode = {};
  for (const mode of modes) {
    const [categories, sites, recent] = await Promise.all([
      getJson(`/api/categories?mode=${encodeURIComponent(mode)}`),
      getJson(`/api/sites?mode=${encodeURIComponent(mode)}`),
      getJson(`/api/sites/recent-status?mode=${encodeURIComponent(mode)}`, { optional: true }),
    ]);
    categoriesByMode[mode] = Array.isArray(categories) ? categories : [];
    sitesByMode[mode] = (Array.isArray(sites) ? sites : []).filter((site) => !siteHidden(site));
    recentByMode[mode] = recent || {};
  }

  const allCategories = modes.flatMap((mode) => categoriesByMode[mode]);
  const allSites = modes.flatMap((mode) => sitesByMode[mode]);
  const counts = { home: 0, categories: 0, sites: 0, updates: 0, tools: 0 };

  if (settings.prerender_home) {
    const recentNormal = modes.flatMap((mode) => recentByMode[mode]?.recent_normal || []);
    const recentChanged = modes.flatMap((mode) => recentByMode[mode]?.recent_changed || []);
    const recentProblem = modes.flatMap((mode) => recentByMode[mode]?.recent_problem || []);
    await writeRoute(template, '/', {
      title: '전체닷컴 - 사이트 주소 모음 및 접속 상태 확인',
      description: '전체닷컴에서 주요 사이트 주소, 카테고리별 사이트 목록, 접속 상태와 주소 변경 정보를 확인하세요.',
      canonical: absoluteUrl(canonicalBase, '/'),
      body: homeHtml({ categories: allCategories, sites: allSites, recentNormal, recentChanged, recentProblem }),
    });
    counts.home = 1;
  }

  if (settings.prerender_categories) {
    for (const mode of modes) {
      for (const category of categoriesByMode[mode]) {
        const slug = categorySlug(category);
        const categorySites = sitesByMode[mode].filter((site) => (site.category || site.categoryName) === category.name);
        const related = categoriesByMode[mode].filter((item) => item.id !== category.id);
        const page = categoryHtml(category, categorySites, related);
        await writeRoute(template, `/category/${encodeURIComponent(slug)}`, {
          title: page.title,
          description: page.description,
          canonical: absoluteUrl(canonicalBase, `/category/${encodeURIComponent(slug)}`),
          body: page.body,
        });
        counts.categories += 1;
      }
    }
  }

  if (settings.prerender_sites) {
    const sitePages = allSites.slice(0, settings.prerender_max_site_pages);
    for (const site of sitePages) {
      const slug = siteSlug(site);
      const modeSites = sitesByMode[site.mode || 'normal'] || allSites;
      const related = modeSites.filter((item) => item.id !== site.id && (item.category || item.categoryName) === (site.category || site.categoryName)).slice(0, 6);
      const page = siteHtml(site, related);
      await writeRoute(template, `/site/${encodeURIComponent(slug)}`, {
        title: page.title,
        description: page.description,
        canonical: absoluteUrl(canonicalBase, `/site/${encodeURIComponent(slug)}`),
        body: page.body,
      });
      counts.sites += 1;
    }
  }

  if (settings.prerender_updates && features?.show_updates_page !== false) {
    const normalUpdates = await getJson('/api/sites/updates?mode=normal', { optional: true });
    const secureUpdates = settings.prerender_include_secure ? await getJson('/api/sites/updates?mode=secure', { optional: true }) : null;
    const changed = [...(normalUpdates?.recent_changed || []), ...(secureUpdates?.recent_changed || [])];
    const problem = [...(normalUpdates?.recent_problem || []), ...(secureUpdates?.recent_problem || [])];
    const normal = [...(normalUpdates?.recent_normal || []), ...(secureUpdates?.recent_normal || [])];
    const added = [...(normalUpdates?.recent_added || []), ...(secureUpdates?.recent_added || [])];
    await writeRoute(template, '/updates', {
      title: '전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트',
      description: '최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인 사이트 정보를 전체닷컴에서 확인하세요.',
      canonical: absoluteUrl(canonicalBase, '/updates'),
      body: updatesHtml({ changed, problem, normal, added }),
    });
    counts.updates = 1;
  }

  if (settings.prerender_tools && features?.show_url_status_tool !== false) {
    await writeRoute(template, '/tools/url-status-checker', {
      title: 'URL 상태 확인 도구 - 전체닷컴',
      description: 'URL의 접속 상태, 리다이렉트, 접근 제한 여부를 확인할 수 있는 전체닷컴 도구입니다.',
      canonical: absoluteUrl(canonicalBase, '/tools/url-status-checker'),
      body: toolHtml(),
    });
    counts.tools = 1;
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  console.log('SEO prerender complete');
  console.log(`home: ${counts.home}`);
  console.log(`categories: ${counts.categories}`);
  console.log(`sites: ${counts.sites}`);
  console.log(`updates: ${counts.updates}`);
  console.log(`tools: ${counts.tools}`);
  console.log(`total: ${total} pages`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
