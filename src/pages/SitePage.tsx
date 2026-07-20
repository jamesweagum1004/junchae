import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FolderOpen, Tag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AIBridgeOverlay from '../components/AIBridgeOverlay';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { categoryPath } from '../lib/categorySlug';
import { getSiteSlug, sitePath, slugifySiteName } from '../lib/siteSlug';
import { getSiteStatusMeta } from '../lib/siteStatus';

const siteName = '전체닷컴';

const getOrCreateMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const getOrCreateCanonical = () => {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  return canonical;
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function SitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSecure } = useTheme();
  const { allSites, categories } = useData();
  const [overlay, setOverlay] = useState<{ url: string; name: string } | null>(null);

  const siteParam = useMemo(() => safeDecode(location.pathname.replace(/^\/site\/?/, '')), [location.pathname]);
  const siteMatch = useMemo(() => {
    const normalizedParam = siteParam.trim().toLowerCase();
    const bySlug = allSites.find((item) => String(item.seo_slug || '').toLowerCase() === normalizedParam);
    if (bySlug) return { site: bySlug, matchedBy: 'slug' as const };

    const byId = allSites.find((item) => String(item.id) === siteParam);
    if (byId) return { site: byId, matchedBy: 'id' as const };

    const byNameSlug = allSites.find((item) => slugifySiteName(item.name, item.id) === normalizedParam);
    if (byNameSlug) return { site: byNameSlug, matchedBy: 'nameSlug' as const };

    return { site: null, matchedBy: null };
  }, [allSites, siteParam]);

  const site = siteMatch.site;
  const category = useMemo(
    () => categories.find((item) => item.name === site?.categoryName || item.id === site?.categoryId),
    [categories, site?.categoryId, site?.categoryName]
  );
  const status = site ? getSiteStatusMeta(site.status, isSecure) : null;
  const keywords = useMemo(
    () => (site?.seo_keywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10),
    [site?.seo_keywords]
  );
  const relatedSites = useMemo(
    () => allSites
      .filter((item) => item.id !== site?.id && item.categoryName === site?.categoryName)
      .slice(0, 6),
    [allSites, site?.categoryName, site?.id]
  );

  useEffect(() => {
    if (!site) return;

    const canonicalPath = sitePath(site);
    if (siteMatch.matchedBy === 'id' && getSiteSlug(site)) {
      navigate(canonicalPath, { replace: true });
    }

    const title = site.seo_title || `${site.name} 바로가기 | ${siteName}`;
    const description = site.seo_description || site.description || `${site.name} 사이트 정보와 접속 링크를 확인하세요.`;
    const canonical = `https://junchae.com${canonicalPath}`;

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    getOrCreateMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', site.seo_keywords || site.name);
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', site.seo_og_title || title);
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', site.seo_og_description || description);
    getOrCreateMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
    getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', siteName);
    getOrCreateMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical);
    if (site.seo_og_image || site.logo) {
      getOrCreateMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', site.seo_og_image || site.logo);
    }
    getOrCreateCanonical().href = canonical;
  }, [navigate, site, siteMatch.matchedBy]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            isSecure
              ? 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.06]'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200'
          }`}
        >
          <ArrowLeft size={14} />
          뒤로가기
        </button>

        {site ? (
          <>
            <section className="mt-5 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
              <div className={`rounded-2xl border p-5 flex items-center justify-center ${
                isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
              }`}>
                <div className="w-28 h-28 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-center overflow-hidden p-3">
                  {site.logo ? (
                    <img src={site.logo} alt={site.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl font-black text-neon-orange">{site.name.charAt(0) || '?'}</span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {category && (
                    <button
                      onClick={() => navigate(categoryPath(category))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                        isSecure ? 'border-white/[0.08] text-neon-orange bg-white/[0.04]' : 'border-slate-200 text-blue-700 bg-white/80'
                      }`}
                    >
                      <FolderOpen size={12} />
                      {category.name}
                    </button>
                  )}
                  {status && (
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  )}
                </div>

                <h1 className={`mt-3 text-2xl sm:text-4xl font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-950'}`}>
                  {site.seo_h1 || `${site.name} 바로가기`}
                </h1>
                <p className={`mt-3 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                  {site.seo_description || site.description || `${site.name} 사이트 정보와 접속 상태를 확인할 수 있는 안내 페이지입니다.`}
                </p>

                {keywords.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                          isSecure ? 'bg-white/[0.04] text-slate-300 border border-white/[0.06]' : 'bg-white/85 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Tag size={11} />
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setOverlay({ url: site.url, name: site.name })}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neon-orange px-4 py-3 text-sm font-black text-white hover:bg-neon-orangeDark transition-colors"
                  >
                    <ExternalLink size={16} />
                    {site.name} 바로가기
                  </button>
                  {category && (
                    <button
                      onClick={() => navigate(categoryPath(category))}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                        isSecure ? 'border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.05]' : 'border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      카테고리로 이동
                    </button>
                  )}
                </div>
              </div>
            </section>

            {relatedSites.length > 0 && (
              <section className="mt-8">
                <h2 className={`text-base font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                  관련 사이트
                </h2>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {relatedSites.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(sitePath(item))}
                      className={`min-h-[72px] rounded-xl border p-3 text-left transition-all hover:scale-[1.01] ${
                        isSecure ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30' : 'glass-light border-slate-200/70 hover:border-blue-300'
                      }`}
                    >
                      <div className={`font-black truncate ${isSecure ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                      <div className={`mt-1 text-xs line-clamp-2 ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
                        {item.description}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className={`mt-8 rounded-2xl border p-8 text-center ${
            isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200'
          }`}>
            <h1 className={`text-xl font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>사이트를 찾을 수 없습니다</h1>
            <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
              현재 모드에서 노출 가능한 사이트가 아니거나 삭제된 URL입니다.
            </p>
          </section>
        )}
      </main>

      {overlay && (
        <AIBridgeOverlay
          targetUrl={overlay.url}
          siteName={overlay.name}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
