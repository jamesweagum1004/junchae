import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AIBridgeOverlay from '../components/AIBridgeOverlay';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import type { Site } from '../data/categories';

const siteName = '전체닷컴';

const statusDot: Record<string, { dark: string; light: string }> = {
  normal: { dark: 'bg-emerald-400', light: 'bg-emerald-500' },
  busy: { dark: 'bg-amber-400', light: 'bg-amber-500' },
  slow: { dark: 'bg-red-400', light: 'bg-red-500' },
};

const statusLabel: Record<string, string> = {
  normal: '정상',
  busy: '혼잡',
  slow: '지연',
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

function SiteCard({
  site,
  isSecure,
  onClick,
}: {
  site: Site;
  isSecure: boolean;
  onClick: (url: string, name: string) => void;
}) {
  const dot = isSecure ? statusDot[site.status]?.dark : statusDot[site.status]?.light;
  const description = site.seo_description || site.description;

  return (
    <button
      onClick={() => onClick(site.url, site.name)}
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
            <span className={`w-1.5 h-1.5 rounded-full ${dot || 'bg-slate-400'} pulse-dot`} />
            <span className={`text-[10px] font-mono ${isSecure ? 'text-slate-500' : 'text-slate-400'}`}>
              {statusLabel[site.status] || '상태'}
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
  const { isSecure } = useTheme();
  const { categories } = useData();
  const [overlay, setOverlay] = useState<{ url: string; name: string } | null>(null);

  const categoryId = useMemo(() => {
    const raw = location.pathname.replace(/^\/category\/?/, '');
    return safeDecode(raw);
  }, [location.pathname]);

  const category = useMemo(() => {
    const byId = categories.find((item) => item.id === categoryId);
    if (byId) return byId;
    return categories.find((item) => item.name === categoryId);
  }, [categories, categoryId]);

  useEffect(() => {
    if (!category) return;

    const encodedCategoryId = encodeURIComponent(category.id);
    const topSites = category.sites.slice(0, 3).map((site) => site.name).filter(Boolean).join(', ');
    const title = `${category.name} 사이트 모음 | ${siteName}`;
    const description = topSites
      ? `${topSites} 등 ${category.name} 사이트 주소를 한 곳에서 확인하세요.`
      : `${category.name} 사이트 주소를 한 곳에서 확인하세요.`;
    const canonical = `https://junchae.com/category/${encodedCategoryId}`;

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    getOrCreateMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    getOrCreateMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
    getOrCreateMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', siteName);
    getOrCreateCanonical().href = canonical;
  }, [category]);

  const handleSiteClick = (url: string, name: string) => {
    setOverlay({ url, name });
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
            </section>

            <section className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4">
              {category.sites.map((site) => (
                <SiteCard key={site.id} site={site} isSecure={isSecure} onClick={handleSiteClick} />
              ))}
            </section>
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
