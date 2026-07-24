import type { Site } from '../data/categories';
import { sitePath } from './siteSlug';

export type RecentlyViewedSite = {
  site_id: number;
  name: string;
  slug: string;
  logo: string;
  category: string;
  viewed_at: string;
};

const storageKey = 'junchae_recently_viewed_sites';

export const readRecentlyViewedSites = (): RecentlyViewedSite[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
};

export const saveRecentlyViewedSite = (site: Site & { categoryName?: string }) => {
  try {
    const current = readRecentlyViewedSites().filter((item) => item.site_id !== site.id);
    const next: RecentlyViewedSite[] = [
      {
        site_id: site.id,
        name: site.name,
        slug: sitePath(site),
        logo: site.logo || '',
        category: site.categoryName || '',
        viewed_at: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 20);
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // localStorage unavailable
  }
};
