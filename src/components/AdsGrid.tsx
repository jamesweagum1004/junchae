import { ExternalLink, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { isVisibleAd, useData } from '../context/DataContext';

interface AdsGridProps {
  onAdClick: (url: string, name: string) => void;
}

const badgeColors: Record<string, string> = {
  red: 'bg-red-500 text-white',
  green: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
  orange: 'bg-orange-500 text-white',
};

export default function AdsGrid({ onAdClick }: AdsGridProps) {
  const { isSecure } = useTheme();
  const { ads, mobileColumns } = useData();
  const visibleAds = ads.filter(isVisibleAd);
  const mobileColClass = mobileColumns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-400'}`}>
          {isSecure ? 'PREMIUM_ADS.EXE' : '프리미엄 광고'}
        </span>
      </div>
      <div className={`grid ${mobileColClass} sm:grid-cols-2 gap-2 sm:gap-3`}>
        {visibleAds.map((ad) => (
          <button
            key={ad.id}
            onClick={() => onAdClick(ad.url, ad.title)}
            className={`group relative rounded-xl overflow-hidden text-left transition-all duration-200 ${
              isSecure
                ? 'glass-dark border-white/[0.06] hover:border-neon-orange/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                : 'bg-slate-900 border border-slate-700/50 hover:border-slate-600 hover:shadow-lg'
            }`}
          >
            <div className={`p-2 sm:p-4 flex items-center justify-between gap-3 ${mobileColumns === 2 ? 'p-2' : ''}`}>
              {ad.image && (
                <div className="w-12 h-12 rounded-lg bg-white/90 border border-white/10 flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
                  <img
                    src={ad.image}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                  <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded ${badgeColors[ad.badgeColor] || 'bg-blue-500 text-white'}`}>
                    {ad.badge}
                  </span>
                  <span className={`text-white font-bold ${mobileColumns === 2 ? 'text-[11px]' : 'text-xs'} sm:text-sm truncate`}>
                    {ad.title}
                  </span>
                </div>
                <p className={`text-white/60 ${mobileColumns === 2 ? 'text-[9px]' : 'text-[10px]'} sm:text-xs truncate`}>
                  {ad.subtitle}
                </p>
              </div>
              <ExternalLink
                size={14}
                className="ml-1 sm:ml-3 flex-shrink-0 text-white/40 group-hover:text-white/80 transition-colors"
              />
            </div>
            {isSecure && (
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-orange/5 to-transparent" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
