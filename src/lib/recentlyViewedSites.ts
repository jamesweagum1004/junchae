import type { Site } from '../data/categories';
import type { AppMode } from '../context/ThemeContext';
import { sitePath } from './siteSlug';

export type RecentlyViewedSite = {
  site_id: number;
  name: string;
  slug: string;
  logo: string;
  category: string;
  category_slug: string;
  mode: 'normal' | 'secure';
  viewed_at: string;
};

const legacyStorageKey = 'junchae_recently_viewed_sites';
const storageKeyForMode = (mode: AppMode | 'normal' | 'secure') =>
  mode === 'secure' ? 'junchae_recently_viewed_secure' : 'junchae_recently_viewed_normal';

const toInternalSitePath = (value: unknown, siteId: number) => {
  const raw = String(value || siteId).trim();
  if (raw.startsWith('/site/')) return raw;
  return `/site/${encodeURIComponent(raw.replace(/^\/+/, '') || String(siteId))}`;
};

const normalizeStoredItem = (item: unknown, fallbackMode?: 'normal' | 'secure'): RecentlyViewedSite | null => {
  if (typeof item !== 'object' || item === null) return null;
  const source = item as Partial<RecentlyViewedSite>;
  const mode = source.mode || fallbackMode;
  if (mode !== 'normal' && mode !== 'secure') return null;
  const siteId = Number(source.site_id);
  if (!Number.isFinite(siteId) || siteId <= 0 || !source.name) return null;
  return {
    site_id: siteId,
    name: String(source.name),
    slug: toInternalSitePath(source.slug, siteId),
    logo: String(source.logo || ''),
    category: String(source.category || ''),
    category_slug: String(source.category_slug || ''),
    mode,
    viewed_at: String(source.viewed_at || new Date().toISOString()),
  };
};

const readRawList = (key: string, fallbackMode?: 'normal' | 'secure') => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeStoredItem(item, fallbackMode)).filter(Boolean) as RecentlyViewedSite[]
      : [];
  } catch {
    return [];
  }
};

export const readRecentlyViewedSites = (mode: AppMode | 'normal' | 'secure'): RecentlyViewedSite[] => {
  const normalizedMode = mode === 'secure' ? 'secure' : 'normal';
  const modeItems = readRawList(storageKeyForMode(normalizedMode), normalizedMode);
  const legacyItems = readRawList(legacyStorageKey).filter((item) => item.mode === normalizedMode);
  const byId = new Map<number, RecentlyViewedSite>();
  [...modeItems, ...legacyItems].forEach((item) => {
    if (!byId.has(item.site_id)) byId.set(item.site_id, item);
  });
  return [...byId.values()]
    .sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
    .slice(0, 20);
};

export const saveRecentlyViewedSite = (
  site: Site & { categoryName?: string; categoryId?: string; category_slug?: string | null },
  mode: AppMode | 'normal' | 'secure'
) => {
  try {
    if (site.is_hidden || site.isHidden) return;
    const normalizedMode: 'normal' | 'secure' = site.mode === 'secure' || mode === 'secure' ? 'secure' : 'normal';
    const current = readRecentlyViewedSites(normalizedMode).filter((item) => item.site_id !== site.id);
    const next: RecentlyViewedSite[] = [
      {
        site_id: site.id,
        name: site.name,
        slug: sitePath(site),
        logo: site.logo || '',
        category: site.categoryName || '',
        category_slug: site.category_slug || site.categoryId || '',
        mode: normalizedMode,
        viewed_at: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 20);
    localStorage.setItem(storageKeyForMode(normalizedMode), JSON.stringify(next));
  } catch {
    // localStorage unavailable
  }
};
