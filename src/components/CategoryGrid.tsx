import { Fragment, useState, useEffect } from 'react';
import {
  BookOpen, Tv, Film, Flame, Download, Dices, MessageSquare, Shield,
  ShoppingCart, ChevronRight, LucideIcon, ExternalLink, Zap, ArrowLeft,
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
  teal:   { dark: 'border-white/8 hover:border-teal-400/30',          light: 'border-slate-200/60 hover:border-teal-300',      icon: 'text-teal-400' },
  yellow: { dark: 'border-white/8 hover:border-yellow-400/30',       light: 'border-slate-200/60 hover:border-yellow-300',   icon: 'text-yellow-500' },
  indigo: { dark: 'border-white/8 hover:border-indigo-400/30',       light: 'border-slate-200/60 hover:border-indigo-300',   icon: 'text-indigo-400' },
  cyan:   { dark: 'border-white/8 hover:border-cyan-400/30',          light: 'border-slate-200/60 hover:border-cyan-300',      icon: 'text-cyan-400' },
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
      className={`col-span-1 rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 group cursor-pointer hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
        isSecure
          ? 'glass-dark border-neon-orange/30 hover:border-neon-orange/50'
          : 'bg-zinc-900/90 border-orange-500/30 hover:border-orange-500/50'
      }`}
      onClick={() => onClick(ad.redirectUrl, ad.title)}
    >
      {/* Top row: badge + external link icon */}
      <div className="flex items-start justify-between">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${badgeClass} border-white/10`}>
          {ad.badge}
        </span>
        <ExternalLink size={16} className={`flex-shrink-0 transition-colors ${isSecure ? 'text-slate-600 group-hover:text-neon-orange' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      </div>

      {/* Middle: image + title + description */}
      <div className="mt-3 flex-1">
        {ad.imageUrl && (
          <div className="mb-2 squircle w-10 h-10 flex items-center justify-center overflow-hidden bg-obsidian-700 border border-white/[0.06]">
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <h4 className={`text-sm font-bold tracking-tight leading-tight ${isSecure ? 'text-white' : 'text-zinc-100'}`}>
          {ad.title}
        </h4>
        <p className={`text-xs mt-1 line-clamp-2 ${isSecure ? 'text-slate-400' : 'text-zinc-400'}`}>
          {ad.description}
        </p>
      </div>

      {/* Bottom: CTA button */}
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

export default function CategoryGrid({ onSiteClick }: CategoryGridProps) {
  const { isSecure } = useTheme();
  const { categories: contextCategories, interAds } = useData();

  // 1. [실시간 하이재킹] useData()의 카테고리 대신 로컬스토리지 데이터를 실시간으로 우선 로드하는 상태 구현
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    // 관리자 페이지에서 저장하는 표준 브라우저 키 검증
    const key = isSecure ? 'secureCategories' : 'categories';
    const fallbackKey = isSecure ? 'secure_categories' : 'standardCategories';
    const saved = localStorage.getItem(key) || localStorage.getItem(fallbackKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
          return;
        }
      } catch (e) {
        console.error('Error parsing categories from localStorage:', e);
      }
    }
    
    // 데이터가 로컬스토리지에 존재하지 않을 때만 백업용 원본 컨텍스트 바인딩
    setCategories(contextCategories || []);
  }, [isSecure, contextCategories]);

  // Build a map: index -> ads that should render after that category index
  const adsAfterIndex = new Map<number, InterAd[]>();
  (interAds || [])
    .filter((a) => a.isActive)
    .forEach((ad) => {
      const arr = adsAfterIndex.get(ad.targetCategoryIndex) || [];
      arr.push(ad);
      adsAfterIndex.set(ad.targetCategoryIndex, arr);
    });

  // ----------------------------------------------------
  // [상세 보기 화면] 더보기를 눌렀을 때 나타나는 개별 카테고리 상세 페이지
  // ----------------------------------------------------
  if (selectedCategoryId) {
    const activeCategory = categories.find((c) => c.id === selectedCategoryId);

    if (activeCategory) {
      const IconComponent = iconMap[activeCategory.icon] || ChevronRight;
      const colors = colorMap[activeCategory.color] || colorMap.blue;
      const sitesList = activeCategory.sites || [];

      return (
        <div className="space-y-6 animate-fade-in w-full mt-8">
          {/* 뒤로가기 버튼 */}
          <button 
            onClick={() => setSelectedCategoryId(null)}
            className={`inline-flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${
              isSecure 
                ? 'bg-white/[0.02] border border-white/10 text-slate-400 hover:text-white' 
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
            }`}
          >
            <ArrowLeft size={14} /> 메인으로 돌아가기
          </button>

          {/* 카테고리 상세 카드 */}
          <div className={`p-6 rounded-2xl border ${
            isSecure 
              ? `glass-dark ${colors.dark}` 
              : `glass-light ${colors.light}`
          }`}>
            <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${
              isSecure ? 'border-white/[0.06]' : 'border-slate-200/60'
            }`}>
              <div className={`p-2 rounded-xl ${isSecure ? 'bg-white/[0.02]' : 'bg-slate-100'}`}>
                <IconComponent size={20} className={colors.icon} />
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-bold tracking-tight ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                  {activeCategory.name} 전체 목록
                </h2>
                <p className={`text-xs mt-0.5 ${isSecure ? 'text-slate-500' : 'text-slate-400'}`}>
                  실시간으로 안전하고 쾌적하게 연결되는 전체 주소 리스트입니다.
                </p>
              </div>
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                isSecure ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                총 {sitesList.length}개
              </span>
            </div>

            {/* 전체 주소 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sitesList.map((site: any) => (
                <div 
                  key={site.id} 
                  className={`rounded-xl border p-1 ${
                    isSecure ? 'border-white/[0.02] bg-white/[0.01]' : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <SiteRow site={site} isSecure={isSecure} onClick={onSiteClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // ----------------------------------------------------
  // [메인 대문 화면] 카테고리별 최대 5개씩 바둑판으로 렌더링
  // ----------------------------------------------------
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full mt-8">
      {categories.map((category, index) => {
        const IconComponent = iconMap[category.icon] || ChevronRight;
        const colors = colorMap[category.color] || colorMap.blue;
        const sitesList = category.sites || [];

        return (
          <Fragment key={category.id}>
            {/* 1. 카테고리 상자 */}
            <div
              className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 ${
                isSecure
                  ? `glass-dark ${colors.dark}`
                  : `glass-light ${colors.light}`
              }`}
            >
              <div>
                {/* Category Header */}
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isSecure ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                  <IconComponent size={13} className={colors.icon} />
                  <h3 className={`text-xs font-bold flex-1 tracking-tight ${isSecure ? 'text-slate-200' : 'text-slate-700'}`}>
                    {category.name}
                  </h3>
                  <span className={`text-[9px] font-mono ${isSecure ? 'text-slate-600' : 'text-slate-400'}`}>
                    {sitesList.length}
                  </span>
                </div>

                {/* Site List — Sliced to max 5 */}
                <div className="space-y-0.5">
                  {sitesList.slice(0, 5).map((site: any) => (
                    <SiteRow key={site.id} site={site} isSecure={isSecure} onClick={onSiteClick} />
                  ))}
                </div>
              </div>

              {/* 더보기 버튼 - 등록된 주소가 5개를 초과할 때만 노출 */}
              {sitesList.length > 5 && (
                <button
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`mt-3 w-full py-2 sm:py-2.5 text-center text-[11px] font-bold rounded-xl transition-all border border-dashed hover:scale-[1.01] active:scale-[0.99] ${
                    isSecure
                      ? 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-orange-400 hover:border-orange-400/30 hover:bg-orange-400/5'
                      : 'bg-slate-50/50 text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-500/30 hover:bg-blue-50/50'
                  }`}
                >
                  더보기 (+{sitesList.length - 5}개 더보기)
                </button>
              )}
            </div>

            {/* 2. 카테고리 하단 중간 광고 */}
            {(adsAfterIndex.get(index) || []).map((ad) => (
              <InterAdCard key={ad.id} ad={ad} isSecure={isSecure} onClick={onSiteClick} />
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}