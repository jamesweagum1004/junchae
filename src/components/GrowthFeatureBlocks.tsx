import { Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryPath } from '../lib/categorySlug';
import { getCheckStatusBadgeClass, getCheckStatusLabel, getSiteStatusMeta } from '../lib/siteStatus';
import { sitePath } from '../lib/siteSlug';
import type { RecentlyViewedSite } from '../lib/recentlyViewedSites';

export type StatusSite = {
  id: number;
  name: string;
  logo?: string;
  category?: string;
  categoryName?: string;
  category_slug?: string | null;
  seo_slug?: string | null;
  site_slug?: string | null;
  status?: string;
  check_status?: string | null;
  http_status?: number | null;
  last_checked_at?: string | null;
  candidate_new_url?: string | null;
  created_at?: string | null;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '기록 없음';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
};

export function StatusSiteCard({ site, isSecure }: { site: StatusSite; isSecure: boolean }) {
  const navigate = useNavigate();
  const status = site.check_status ? {
    label: getCheckStatusLabel(site.check_status),
    className: getCheckStatusBadgeClass(site.check_status, isSecure),
  } : getSiteStatusMeta(site.status, isSecure);

  const detailPath = site.site_slug
    ? `/site/${encodeURIComponent(site.site_slug)}`
    : sitePath(site);

  return (
    <button
      type="button"
      onClick={() => navigate(detailPath)}
      className={`min-h-[92px] rounded-xl border p-3 text-left transition-all hover:scale-[1.01] ${
        isSecure ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30' : 'glass-light border-slate-200/70 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-1">
          {site.logo ? <img src={site.logo} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{site.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>{status.label}</span>
            <span className={`truncate text-[11px] ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>{site.category || site.categoryName || '-'}</span>
          </div>
          <div className={`mt-2 flex items-center gap-1 text-[10px] ${isSecure ? 'text-slate-600' : 'text-slate-400'}`}>
            <Clock size={11} />
            {formatDateTime(site.last_checked_at || site.created_at)}
          </div>
        </div>
      </div>
    </button>
  );
}

export function RecentlyViewedSitesBlock({
  items,
  isSecure,
  limit = 8,
}: {
  items: RecentlyViewedSite[];
  isSecure: boolean;
  limit?: number;
}) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <section className="clear-both">
      <div className="mb-3 flex items-center gap-2">
        <ExternalLink size={14} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-500'}`}>
          최근 본 사이트
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {items.slice(0, limit).map((item) => (
          <button
            key={`${item.site_id}-${item.viewed_at}`}
            onClick={() => navigate(item.slug)}
            className={`min-w-0 rounded-xl border p-3 text-left transition-all hover:scale-[1.01] ${
              isSecure ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30' : 'glass-light border-slate-200/70 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-1">
                {item.logo ? <img src={item.logo} alt="" className="h-full w-full object-contain" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                    isSecure ? 'border-neon-orange/25 bg-neon-orange/10 text-neon-orange' : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}>
                    최근 열람
                  </span>
                  <span className={`truncate text-[11px] ${isSecure ? 'text-slate-500' : 'text-slate-500'}`}>{item.category}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function categoryHrefFromStatusSite(site: StatusSite) {
  if (site.category_slug) return `/category/${encodeURIComponent(site.category_slug)}`;
  return categoryPath({ id: site.category || '', name: site.category || '', slug: site.category_slug || '' });
}
