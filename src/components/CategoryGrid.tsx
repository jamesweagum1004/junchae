import { Fragment } from 'react';
import {
  BookOpen,
  Tv,
  Film,
  Flame,
  Download,
  Dices,
  MessageSquare,
  Shield,
  ShoppingCart,
  ChevronRight,
  LucideIcon,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { isVisibleAd, useData } from '../context/DataContext';
import { Category, Site, InterAd } from '../data/categories';
import { categoryPath } from '../lib/categorySlug';
import { getSiteStatusMeta } from '../lib/siteStatus';

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Tv,
  Film,
  Flame,
  Download,
  Dices,
  MessageSquare,
  Shield,
  ShoppingCart,
};

const colorMap: Record<string, { dark: string; light: string; icon: string }> = {
  blue: { dark: 'border-white/8 hover:border-blue-400/30', light: 'border-slate-200/60 hover:border-blue-300', icon: 'text-blue-400' },
  green: { dark: 'border-white/8 hover:border-emerald-400/30', light: 'border-slate-200/60 hover:border-emerald-300', icon: 'text-emerald-400' },
  red: { dark: 'border-white/8 hover:border-red-400/30', light: 'border-slate-200/60 hover:border-red-300', icon: 'text-red-400' },
  orange: { dark: 'border-white/8 hover:border-orange-400/30', light: 'border-slate-200/60 hover:border-orange-300', icon: 'text-orange-400' },
  teal: { dark: 'border-white/8 hover:border-teal-400/30', light: 'border-slate-200/60 hover:border-teal-300', icon: 'text-teal-400' },
  yellow: { dark: 'border-white/8 hover:border-yellow-400/30', light: 'border-slate-200/60 hover:border-yellow-300', icon: 'text-yellow-500' },
  indigo: { dark: 'border-white/8 hover:border-indigo-400/30', light: 'border-slate-200/60 hover:border-indigo-300', icon: 'text-indigo-400' },
  cyan: { dark: 'border-white/8 hover:border-cyan-400/30', light: 'border-slate-200/60 hover:border-cyan-300', icon: 'text-cyan-400' },
};

const badgeColorMap: Record<string, string> = {
  HOT: 'bg-red-500 text-white',
  AD: 'bg-slate-600 text-white',
  NEW: 'bg-blue-500 text-white',
  VIP: 'bg-amber-500 text-white',
  추천: 'bg-emerald-500 text-white',
  이벤트: 'bg-purple-500 text-white',
};

interface SiteRowProps {
  site: Site;
  isSecure: boolean;
  onClick: (site: Site) => void;
}

function SiteRow({ site, isSecure, onClick }: SiteRowProps) {
  const status = getSiteStatusMeta(site.status, isSecure);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(site);
      }}
      className={`group w-full min-h-[58px] md:min-h-0 flex items-center gap-2 px-2 py-2 md:gap-2.5 md:px-3 md:py-2.5 rounded-lg md:rounded-xl text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
        isSecure
          ? 'hover:bg-white/[0.04] text-slate-400 hover:text-white'
          : 'hover:bg-slate-200/40 text-slate-600 hover:text-slate-900'
      }`}
    >
      <div
        className={`squircle w-8 h-8 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0 overflow-hidden relative transition-transform duration-200 group-hover:scale-105 bg-white/90 border p-1 md:p-1.5 ${
          isSecure
            ? 'border-white/[0.12] logo-placeholder-glow'
            : 'border-slate-300/70 logo-placeholder-glow'
        }`}
      >
        {site.logo ? (
          <img
            src={site.logo}
            alt={site.name}
            className="w-full h-full object-contain relative z-10"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const initial = site.name.charAt(0) || '?';
              if (img.parentElement) {
                img.parentElement.innerHTML = `<span class="relative z-10 flex items-center justify-center w-full h-full text-base font-bold" style="color:#fb923c;text-shadow:0 0 8px rgba(249,115,22,0.6),0 0 16px rgba(249,115,22,0.3)">${initial}</span>`;
              }
            }}
          />
        ) : (
          <span className="relative z-10 flex items-center justify-center w-full h-full text-base font-bold text-neon-orange">
            {site.name.charAt(0) || '?'}
          </span>
        )}
      </div>

      <span className={`flex-1 text-[13px] md:text-base font-bold tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
        isSecure ? 'text-slate-100' : 'text-slate-900'
      }`}>
        {site.name}
      </span>

      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none ${status.className}`}>
        {status.label}
      </span>
    </button>
  );
}

function InterAdCard({ ad, isSecure, onClick }: { ad: InterAd; isSecure: boolean; onClick: (url: string, name: string) => void }) {
  const badgeClass = badgeColorMap[ad.badge] || 'bg-neon-orange text-white';

  return (
    <div
      className={`col-span-1 rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 group cursor-pointer hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
        isSecure
          ? 'glass-dark border-neon-orange/30 hover:border-neon-orange/50'
          : 'bg-zinc-900/90 border-orange-500/30 hover:border-orange-500/50'
      }`}
      onClick={() => onClick(ad.redirectUrl, ad.title)}
    >
      <div className="flex items-start justify-between">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${badgeClass} border-white/10`}>
          {ad.badge}
        </span>
        <ExternalLink size={16} className={`flex-shrink-0 transition-colors ${isSecure ? 'text-slate-600 group-hover:text-neon-orange' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      </div>

      <div className="mt-3 flex-1">
        {ad.imageUrl && (
          <div className="mb-2 squircle w-12 h-12 flex items-center justify-center overflow-hidden bg-white/90 border border-white/[0.12] p-1.5">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <h4 className={`text-sm font-bold tracking-tight leading-tight ${isSecure ? 'text-white' : 'text-zinc-100'}`}>
          {ad.title}
        </h4>
        <p className={`text-xs mt-1 line-clamp-2 ${isSecure ? 'text-slate-400' : 'text-zinc-400'}`}>
          {ad.description}
        </p>
      </div>

      <a
        href={ad.redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 block w-full text-center py-2 bg-neon-orange/10 hover:bg-neon-orange/20 text-neon-orange text-xs font-semibold rounded-lg transition-colors"
      >
        바로가기
      </a>
    </div>
  );
}

interface CategoryGridProps {
  onSiteClick: (site: Site) => void;
  onAdClick: (url: string, name: string) => void;
}

export default function CategoryGrid({ onSiteClick, onAdClick }: CategoryGridProps) {
  const navigate = useNavigate();
  const { isSecure } = useTheme();
  const { categories, interAds } = useData();
  const openCategory = (category: Category) => navigate(categoryPath(category));

  const adsAfterIndex = new Map<number, InterAd[]>();
  interAds
    .filter(isVisibleAd)
    .forEach((ad) => {
      const arr = adsAfterIndex.get(ad.targetCategoryIndex) || [];
      arr.push(ad);
      adsAfterIndex.set(ad.targetCategoryIndex, arr);
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full mt-8">
      {categories.map((category, index) => {
        const IconComponent = iconMap[category.icon] || ChevronRight;
        const colors = colorMap[category.color] || colorMap.blue;
        const visibleSites = category.sites.slice(0, 6);
        const hiddenCount = Math.max(0, category.sites.length - visibleSites.length);

        return (
          <Fragment key={category.id}>
            <div
              role="button"
              tabIndex={0}
              aria-label={`${category.name} 전체 보기`}
              onClick={() => openCategory(category)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openCategory(category);
              }}
              className={`rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 flex flex-col ${
                isSecure
                  ? `glass-dark ${colors.dark}`
                  : `glass-light ${colors.light}`
              }`}
            >
              <div className={`flex items-center gap-2 mb-2 pb-2 border-b cursor-pointer rounded-lg transition-colors ${
                isSecure ? 'border-white/[0.06] hover:bg-white/[0.03]' : 'border-slate-200/60 hover:bg-slate-100/50'
              }`}>
                <IconComponent size={13} className={colors.icon} />
                <h3 className={`text-xs font-bold flex-1 tracking-tight ${isSecure ? 'text-slate-200' : 'text-slate-700'}`}>
                  {category.name}
                </h3>
                <span className={`text-[9px] font-mono ${isSecure ? 'text-slate-600' : 'text-slate-400'}`}>
                  {category.sites.length}
                </span>
                <ChevronRight size={13} className={isSecure ? 'text-slate-600' : 'text-slate-400'} />
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-0.5">
                {visibleSites.map((site) => (
                  <SiteRow key={site.id} site={site} isSecure={isSecure} onClick={onSiteClick} />
                ))}
              </div>

              {hiddenCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategory(category);
                  }}
                  className={`mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
                    isSecure
                      ? 'bg-white/[0.04] text-neon-orange hover:bg-neon-orange/10 hover:text-orange-300 border border-white/[0.06] hover:border-neon-orange/30'
                      : 'bg-slate-100/70 text-blue-700 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-200'
                  }`}
                >
                  {hiddenCount}개 더보기
                  <ChevronRight size={13} />
                </button>
              )}
            </div>

            {(adsAfterIndex.get(index) || []).map((ad) => (
              <InterAdCard key={ad.id} ad={ad} isSecure={isSecure} onClick={onAdClick} />
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
