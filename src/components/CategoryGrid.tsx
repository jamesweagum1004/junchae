import { Fragment } from 'react';
import {
  BookOpen, Tv, Film, Flame, Download, Dices, MessageSquare, Shield,
  ShoppingCart, ChevronRight, LucideIcon, ExternalLink, Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Site, InterAd } from '../data/categories';

const iconMap: Record<string, LucideIcon> = {
  BookOpen, Tv, Film, Flame, Download, Dices, MessageSquare, Shield, ShoppingCart,
};

const statusDot: Record<string, { dark: string; light: string }> = {
  normal: { dark: 'bg-emerald-400', light: 'bg-emerald-500' },
  busy:   { dark: 'bg-amber-400',   light: 'bg-amber-500' },
  slow:   { dark: 'bg-red-400',     light: 'bg-red-500' },
};

const statusLabel: Record<string, string> = {
  normal: '정상',
  busy: '혼잡',
  slow: '지연',
};

const colorMap: Record<string, { dark: string; light: string; icon: string }> = {
  blue:   { dark: 'border-white/8 hover:border-blue-400/30',          light: 'border-slate-200/60 hover:border-blue-300',      icon: 'text-blue-400' },
  green:  { dark: 'border-white/8 hover:border-emerald-400/30',      light: 'border-slate-200/60 hover:border-emerald-300',   icon: 'text-emerald-400' },
  red:    { dark: 'border-white/8 hover:border-red-400/30',          light: 'border-slate-200/60 hover:border-red-300',       icon: 'text-red-400' },
  orange: { dark: 'border-white/8 hover:border-orange-400/30',       light: 'border-slate-200/60 hover:border-orange-300',   icon: 'text-orange-400' },
  teal:   { dark: 'border-white/8 hover:border-teal-400/30',          light: 'border-slate-200/60 hover:border-teal-300',     icon: 'text-teal-400' },
  yellow: { dark: 'border-white/8 hover:border-yellow-400/30',       light: 'border-slate-200/60 hover:border-yellow-300',   icon: 'text-yellow-500' },
  indigo: { dark: 'border-white/8 hover:border-indigo-400/30',       light: 'border-slate-200/60 hover:border-indigo-300',   icon: 'text-indigo-400' },
  cyan:   { dark: 'border-white/8 hover:border-cyan-400/30',         light: 'border-slate-200/60 hover:border-cyan-300',     icon: 'text-cyan-400' },
};

interface SiteRowProps {
  site: Site;
  isSecure: boolean;
  onClick: (url: string, name: string) => void;
}

function SiteRow({ site, isSecure, onClick }: SiteRowProps) {
  const dot = isSecure ? statusDot[site.status].dark : statusDot[site.status].light;

  return (
    <button
      onClick={() => onClick(site.url, site.name)}
      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
        isSecure
          ? 'hover:bg-white/[0.04] text-slate-400 hover:text-white'
          : 'hover:bg-slate-200/40 text-slate-600 hover:text-slate-900'
      }`}
    >
      {/* Squircle logo — neon initial placeholder when no image */}
      <div
        className={`squircle w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden relative transition-transform duration-200 group-hover:scale-105 ${
          isSecure
            ? 'bg-[#18181b] border border-white/[0.06] logo-placeholder-glow'
            : 'bg-[#18181b] border border-slate-400/20 logo-placeholder-glow'
        }`}
      >
        <img
          src={site.logo}
          alt={site.name}
          className="w-6 h-6 object-contain relative z-10"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const initial = site.name.charAt(0);
            if (img.parentElement) {
              img.parentElement.innerHTML = `<span class="relative z-10 flex items-center justify-center w-full h-full text-base font-bold" style="color:#fb923c;text-shadow:0 0 8px rgba(249,115,22,0.6),0 0 16px rgba(249,115,22,0.3)">${initial}</span>`;
            }
          }}
        />
      </div>

      {/* Site name — high contrast, tight tracking */}
      <span className={`flex-1 text-[15px] sm:text-base font-bold tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
        isSecure ? 'text-slate-100' : 'text-slate-900'
      }`}>
        {site.name}
      </span>

      {/* Micro dot indicator + label — ultra-compact, right-aligned */}
      <div className="flex items-center gap-1 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${dot} pulse-dot`} />
        <span className={`text-[9px] font-medium ${isSecure ? 'text-slate-500' : 'text-slate-400'}`}>
          {statusLabel[site.status]}
        </span>
      </div>
    </button>
  );
}

interface CategoryGridProps {
  onSiteClick: (url: string, name: string) => void;
}

const badgeColorMap: Record<string, string> = {
  HOT: 'bg-red-500 text-white',
  AD: 'bg-slate-600 text-white',
  NEW: 'bg-blue-500 text-white',
  VIP: 'bg-amber-500 text-white',
  추천: 'bg-emerald-500 text-white',
  이벤트: 'bg-purple-500 text-white',
};

function InterAdCard({ ad, isSecure, onClick }: { ad: InterAd; isSecure: boolean; onClick: (url: string, name: string) => void }) {
  const badgeClass = badgeColorMap[ad.badge] || 'bg-neon-orange text-white';
  return (
    <div
      className={`sm:col-span-2 lg:col-span-3 xl:col-span-4 rounded-2xl border p-4 transition-all duration-200 group cursor-pointer ${
        isSecure
          ? 'glass-dark border-neon-orange/15 hover:border-neon-orange/30'
          : 'glass-light border-slate-300/40 hover:border-neon-orange/30'
      }`}
      onClick={() => onClick(ad.redirectUrl, ad.title)}
    >
      <div className="flex items-center gap-4">
        {/* Image / placeholder */}
        <div className={`squircle w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden ${
          isSecure ? 'bg-obsidian-700 border border-white/[0.06]' : 'bg-slate-200 border border-slate-300/50'
        }`}>
          {ad.imageUrl ? (
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Zap size={20} className={isSecure ? 'text-neon-orange/60' : 'text-slate-500'} />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${badgeClass}`}>
              {ad.badge}
            </span>
            <h4 className={`text-sm font-bold tracking-tight truncate ${isSecure ? 'text-white' : 'text-slate-900'}`}>
              {ad.title}
            </h4>
          </div>
          <p className={`text-xs truncate ${isSecure ? 'text-slate-400' : 'text-slate-600'}`}>
            {ad.description}
          </p>
        </div>

        {/* CTA arrow */}
        <ExternalLink size={16} className={`flex-shrink-0 transition-colors ${isSecure ? 'text-slate-600 group-hover:text-neon-orange' : 'text-slate-400 group-hover:text-neon-orange'}`} />
      </div>
    </div>
  );
}

export default function CategoryGrid({ onSiteClick }: CategoryGridProps) {
  const { isSecure } = useTheme();
  const { categories, interAds } = useData();

  // Build a map: index -> ads that should render after that category index
  const adsAfterIndex = new Map<number, InterAd[]>();
  interAds
    .filter((a) => a.isActive)
    .forEach((ad) => {
      const arr = adsAfterIndex.get(ad.targetCategoryIndex) || [];
      arr.push(ad);
      adsAfterIndex.set(ad.targetCategoryIndex, arr);
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {categories.map((category, index) => {
        const IconComponent = iconMap[category.icon] || ChevronRight;
        const colors = colorMap[category.color] || colorMap.blue;

        return (
          <Fragment key={category.id}>
            <div
              className={`rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 ${
                isSecure
                  ? `glass-dark ${colors.dark}`
                  : `glass-light ${colors.light}`
              }`}
            >
              {/* Category Header — compact */}
              <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isSecure ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                <IconComponent size={13} className={colors.icon} />
                <h3 className={`text-xs font-bold flex-1 tracking-tight ${isSecure ? 'text-slate-200' : 'text-slate-700'}`}>
                  {category.name}
                </h3>
                <span className={`text-[9px] font-mono ${isSecure ? 'text-slate-600' : 'text-slate-400'}`}>
                  {category.sites.length}
                </span>
              </div>

              {/* Site List — high density */}
              <div className="space-y-0.5">
                {category.sites.map((site) => (
                  <SiteRow key={site.id} site={site} isSecure={isSecure} onClick={onSiteClick} />
                ))}
              </div>
            </div>

            {/* Inter-category ads after this index */}
            {(adsAfterIndex.get(index) || []).map((ad) => (
              <InterAdCard key={ad.id} ad={ad} isSecure={isSecure} onClick={onSiteClick} />
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
