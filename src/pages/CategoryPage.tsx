import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AIBridgeOverlay from '../components/AIBridgeOverlay';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import type { Category, Site } from '../data/categories';
import { categoryPath, getCategorySlug, slugifyCategoryName } from '../lib/categorySlug';
import { sitePath } from '../lib/siteSlug';
import { getSiteStatusMeta } from '../lib/siteStatus';
import { useIsMobile } from '../hooks/useIsMobile';

const siteName = '전체닷컴';

type FaqItem = {
  question: string;
  answer: string;
};

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

const parseFaq = (value: Category['seo_faq']): FaqItem[] => {
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
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.question && item.answer);
};

function SiteCard({
  site,
  isSecure,
  onClick,
}: {
  site: Site;
  isSecure: boolean;
  onClick: (site: Site) => void;
}) {
  const status = getSiteStatusMeta(site.status, isSecure);
  const description = site.seo_description || site.description;

  return (
    <button
      onClick={() => onClick(site)}
      className={`group w-full min-h-[72px] md:min-h-0 rounded-xl md:rounded-2xl border p-2.5 md:p-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
        isSecure
          ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30'
          : 'glass-light border-slate-200/70 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center md:items-start gap-2 md:gap-3">
        <div
          className={`squircle w-9 h-9 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/90 border p-1 md:p-1.5 ${
            isSecure ? 'border-white/[0.12] logo-placeholder-glow' : 'border-slate-300/70 logo-placeholder-glow'
          }`}
        >
          {site.logo ? (
            <img
              src={site.logo}
              alt={site.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-base font-bold text-neon-orange">{site.name.charAt(0) || '?'}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className={`text-sm md:text-base font-black tracking-tight truncate ${isSecure ? 'text-white' : 'text-slate-900'}`}>
              {site.name}
            </h2>
            <ExternalLink
              size={15}
              className={`hidden md:block mt-0.5 flex-shrink-0 transition-colors ${
                isSecure ? 'text-slate-600 group-hover:text-neon-orange' : 'text-slate-400 group-hover:text-blue-600'
              }`}
            />
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${status.className}`}>
              {status.label}
            </span>
          </div>

          {description && (
            <p className={`hidden md:block mt-2 text-sm leading-relaxed line-clamp-2 ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function CategoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isSecure } = useTheme();
  const { categories } = useData();
  const [overlay, setOverlay] = useState<{ url: string; name: string } | null>(null);

  const categoryParam = useMemo(() => {
    const raw = location.pathname.replace(/^\/category\/?/, '');
    return safeDecode(raw);
  }, [location.pathname]);

  const categoryMatch = useMemo(() => {
    const normalizedParam = categoryParam.trim().toLowerCase();
    const bySlug = categories.find((item) => String(item.slug || '').toLowerCase() === normalizedParam);
    if (bySlug) return { category: bySlug, matchedBy: 'slug' as const };

    const byId = categories.find((item) => String(item.id) === categoryParam);
    if (byId) return { category: byId, matchedBy: 'id' as const };

    const byNameSlug = categories.find((item) => slugifyCategoryName(item.name, item.id) === normalizedParam);
    if (byNameSlug) return { category: byNameSlug, matchedBy: 'nameSlug' as const };

    const byName = categories.find((item) => item.name === categoryParam);
    if (byName) return { category: byName, matchedBy: 'name' as const };

    return { category: null, matchedBy: null };
  }, [categories, categoryParam]);

  const category = categoryMatch.category;

  const faqItems = useMemo(() => parseFaq(category?.seo_faq), [category?.seo_faq]);

  useEffect(() => {
    if (!category) return;

    const canonicalPath = categoryPath(category);
    if (categoryMatch.matchedBy === 'id' && getCategorySlug(category)) {
      navigate(canonicalPath, { replace: true });
    }

    const title = category.seo_title || `${category.name} 사이트 모음 - ${siteName}`;
    const description =
      category.seo_description ||
      `${category.name} 카테고리의 주요 사이트를 빠르게 확인할 수 있는 링크 모음입니다.`;
    const canonical = `https://junchae.com${canonicalPath}`;

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    getOrCreateMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', category.seo_keywords || `${category.name}, 사이트 모음, 링크 모음`);
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    getOrCreateMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
    getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', siteName);
    getOrCreateMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical);
    getOrCreateCanonical().href = canonical;
  }, [category, categoryMatch.matchedBy, navigate]);

  const handleSiteClick = (site: Site) => {
    if (isMobile) {
      setOverlay({ url: site.url, name: site.name });
      return;
    }
    navigate(sitePath(site));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-7">
        <button
          onClick={() => navigate('/')}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            isSecure
              ? 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.06]'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200'
          }`}
        >
          <ArrowLeft size={14} />
          홈으로 돌아가기
        </button>

        {category ? (
          <>
            <section className="mt-4 sm:mt-6 mb-4 sm:mb-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={15} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
                <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-400'}`}>
                  {isSecure ? 'SECURE_CATEGORY' : 'CATEGORY'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-950'}`}>
                    {category.name}
                  </h1>
                  <p className={`mt-1 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
                    전체 {category.sites.length}개 사이트
                  </p>
                </div>
              </div>
              <p className={`mt-3 max-w-3xl text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                {category.seo_intro || `${category.name} 카테고리의 주요 사이트를 한 곳에서 확인할 수 있습니다. 사이트명과 접속 상태를 빠르게 살펴보고 필요한 링크로 이동하세요.`}
              </p>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4">
              {category.sites.map((site) => (
                <SiteCard key={site.id} site={site} isSecure={isSecure} onClick={handleSiteClick} />
              ))}
            </section>

            {faqItems.length > 0 && (
              <section className="mt-8">
                <h2 className={`text-base font-black tracking-tight ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                  자주 묻는 질문
                </h2>
                <div className="mt-3 space-y-2">
                  {faqItems.map((item, index) => (
                    <div
                      key={`${item.question}-${index}`}
                      className={`rounded-xl border p-4 ${
                        isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'
                      }`}
                    >
                      <h3 className={`text-sm font-bold ${isSecure ? 'text-slate-100' : 'text-slate-900'}`}>
                        {item.question}
                      </h3>
                      <p className={`mt-2 text-sm leading-relaxed ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section
            className={`mt-8 rounded-2xl border p-8 text-center ${
              isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200'
            }`}
          >
            <h1 className={`text-xl font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>카테고리를 찾을 수 없습니다</h1>
            <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>
              현재 모드에 해당 카테고리가 없습니다.
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
