import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Ad,
  Category,
  DbMode,
  InterAd,
  Site,
  secureAds,
  secureCategories,
  secureInterAds,
  standardAds,
  standardCategories,
  standardInterAds,
} from '../data/categories';
import { useTheme } from './ThemeContext';
import { adminAuthHeaders, isWriteRequest } from '../lib/adminApi';

export type MobileColumns = 1 | 2;
type Mode = 'standard' | 'secure';
type SiteUpdatePayload = Partial<Omit<Site, 'id'>> & { category?: string; sort_order?: number };

interface DataContextType {
  categories: Category[];
  ads: Ad[];
  reloadSites: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  reloadAds: () => Promise<void>;
  updateSiteLogo: (siteId: number, logoPath: string) => Promise<void>;
  updateSiteStatus: (siteId: number, status: Site['status']) => Promise<void>;
  updateSiteUrl: (siteId: number, url: string) => Promise<void>;
  updateSiteName: (siteId: number, name: string) => Promise<void>;
  addSite: (categoryId: string, site: Omit<Site, 'id'>) => Promise<void>;
  removeSite: (siteId: number) => Promise<void>;
  addCategory: (cat: Omit<Category, 'sites'>) => Promise<void>;
  removeCategory: (categoryId: string) => Promise<void>;
  updateCategoryName: (categoryId: string, name: string) => Promise<void>;
  updateAd: (adId: number, updates: Partial<Ad>) => Promise<void>;
  addAd: (ad: Omit<Ad, 'id'>) => Promise<void>;
  removeAd: (adId: number) => Promise<void>;
  allSites: (Site & { categoryId: string; categoryName: string })[];
  standardCategories: Category[];
  secureCategories: Category[];
  standardAds: Ad[];
  secureAds: Ad[];
  updateSiteInMode: (mode: Mode, siteId: number, updates: SiteUpdatePayload) => Promise<void>;
  updateSiteLogoInMode: (mode: Mode, siteId: number, logoPath: string) => Promise<void>;
  updateSiteStatusInMode: (mode: Mode, siteId: number, status: Site['status']) => Promise<void>;
  updateSiteUrlInMode: (mode: Mode, siteId: number, url: string) => Promise<void>;
  updateSiteNameInMode: (mode: Mode, siteId: number, name: string) => Promise<void>;
  updateSiteCategoryInMode: (mode: Mode, siteId: number, categoryName: string) => Promise<void>;
  addSiteInMode: (mode: Mode, categoryId: string, site: Omit<Site, 'id'>) => Promise<void>;
  removeSiteInMode: (mode: Mode, siteId: number) => Promise<void>;
  addCategoryInMode: (mode: Mode, cat: Omit<Category, 'sites'>) => Promise<void>;
  removeCategoryInMode: (mode: Mode, categoryId: string) => Promise<void>;
  updateCategoryNameInMode: (mode: Mode, categoryId: string, name: string) => Promise<void>;
  reorderCategoriesInMode: (mode: Mode, categoryIds: string[]) => Promise<void>;
  updateAdInMode: (mode: Mode, adId: number, updates: Partial<Ad>) => Promise<void>;
  addAdInMode: (mode: Mode, ad: Omit<Ad, 'id'>) => Promise<void>;
  removeAdInMode: (mode: Mode, adId: number) => Promise<void>;
  getModeData: (mode: Mode) => { categories: Category[]; ads: Ad[]; interAds: InterAd[] };
  interAds: InterAd[];
  addInterAdInMode: (mode: Mode, ad: Omit<InterAd, 'id'>) => Promise<void>;
  updateInterAdInMode: (mode: Mode, adId: string, updates: Partial<InterAd>) => Promise<void>;
  removeInterAdInMode: (mode: Mode, adId: string) => Promise<void>;
  mobileColumns: MobileColumns;
  setMobileColumns: (c: MobileColumns) => void;
  telegramLink: string;
  telegramVisible: boolean;
  setTelegramLink: (link: string) => void;
  setTelegramVisible: (visible: boolean) => void;
}

const DataContext = createContext<DataContextType | null>(null);
type ApiRow = Record<string, unknown>;

const isRecord = (value: unknown): value is ApiRow =>
  typeof value === 'object' && value !== null;

const toStringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const apiMode = (mode: Mode): DbMode => (mode === 'secure' ? 'secure' : 'normal');
const modeKey = (dbMode: unknown): Mode => (dbMode === 'secure' ? 'secure' : 'standard');

const isSiteStatus = (value: unknown): value is Site['status'] =>
  value === 'normal' || value === 'busy' || value === 'slow';

const modeLabelColor = (mode: Mode) => (mode === 'secure' ? 'orange' : 'blue');

const extractRows = (payload: unknown): ApiRow[] =>
  isRecord(payload) && Array.isArray(payload.data) && payload.data.every(isRecord)
    ? payload.data
    : [];

const isExpired = (date?: string) => {
  if (!date) return false;
  const expiry = new Date(`${date}T23:59:59`);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() < Date.now();
};

export const isVisibleAd = (ad: Ad | InterAd) => {
  const active = 'isActive' in ad ? ad.isActive !== false : true;
  return active && !isExpired('expiresAt' in ad ? ad.expiresAt : undefined);
};

const apiRequest = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(isWriteRequest(init) ? adminAuthHeaders() : {}),
      ...init?.headers,
    },
  });
  const payload = await res.json().catch(() => null);

  if (!res.ok || !isRecord(payload) || payload.ok !== true) {
    console.error('API request failed', { path, status: res.status, body: payload });
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : isRecord(payload) && typeof payload.error === 'string'
          ? payload.error
          : `API request failed with ${res.status}`;
    throw new Error(message);
  }

  return payload;
};

const mapCategory = (row: ApiRow, fallbackIndex: number): Category => ({
  id: String(Number(row.id) || toStringValue(row.id, `category-${fallbackIndex + 1}`)),
  name: toStringValue(row.name, `카테고리 ${fallbackIndex + 1}`),
  icon: 'FolderOpen',
  color: modeLabelColor(modeKey(row.mode)),
  sortOrder: Number(row.sort_order ?? row.sortOrder) || 0,
  sites: [],
});

const mapSite = (row: ApiRow, fallbackIndex: number): Site => ({
  id: Number(row.id) || fallbackIndex + 1,
  mode: apiMode(modeKey(row.mode)),
  name: toStringValue(row.name, 'Untitled Site'),
  url: toStringValue(row.url, '#'),
  logo: toStringValue(row.logo, '/uploads/logos/default.png'),
  status: isSiteStatus(row.status) ? row.status : 'normal',
  description: toStringValue(row.description),
  seo_title: toStringValue(row.seo_title),
  seo_description: toStringValue(row.seo_description),
  seo_keywords: toStringValue(row.seo_keywords),
  seo_slug: toStringValue(row.seo_slug),
  seo_h1: toStringValue(row.seo_h1),
  seo_canonical: toStringValue(row.seo_canonical),
  seo_og_title: toStringValue(row.seo_og_title),
  seo_og_description: toStringValue(row.seo_og_description),
  seo_og_image: toStringValue(row.seo_og_image),
  seo_score: Number(row.seo_score) || 0,
  seo_updated_at: toStringValue(row.seo_updated_at) || null,
});

const mapAd = (row: ApiRow): Ad => ({
  id: Number(row.id),
  title: toStringValue(row.title, '광고'),
  subtitle: toStringValue(row.description ?? row.subtitle),
  url: toStringValue(row.url, '#'),
  badge: toStringValue(row.badge_label ?? row.badge, 'AD'),
  badgeColor: toStringValue(row.badge_type ?? row.badgeColor, 'blue'),
  bgGradient: 'from-slate-900 to-slate-800',
  expiresAt: toStringValue(row.expires_at ?? row.expiresAt),
  script: toStringValue(row.script_code ?? row.script),
  image: toStringValue(row.image),
  placement: toStringValue(row.placement, 'top'),
  isActive:
    row.is_active === undefined && row.isActive === undefined
      ? true
      : row.is_active === 1 || row.is_active === true || row.isActive === true,
  sortOrder: Number(row.sort_order ?? row.sortOrder) || 0,
});

const mapInterAd = (row: ApiRow): InterAd => ({
  id: String(Number(row.id)),
  targetCategoryIndex: Number(row.position_after ?? row.targetCategoryIndex) || 0,
  title: toStringValue(row.title, '중간 광고'),
  description: toStringValue(row.description),
  imageUrl: toStringValue(row.image ?? row.imageUrl),
  redirectUrl: toStringValue(row.url ?? row.redirectUrl, '#'),
  badge: toStringValue(row.badge_label ?? row.badge, 'AD'),
  isActive:
    row.is_active === undefined && row.isActive === undefined
      ? true
      : row.is_active === 1 || row.is_active === true || row.isActive === true,
  expiresAt: toStringValue(row.expires_at ?? row.expiresAt),
  sortOrder: Number(row.sort_order ?? row.sortOrder) || 0,
});

const buildCategories = (categories: Category[], siteRows: ApiRow[]) => {
  const byName = new Map(categories.map((category) => [category.name, category]));
  const next = categories.map((category) => ({ ...category, sites: [] as Site[] }));
  next.forEach((category) => byName.set(category.name, category));

  siteRows.forEach((row, index) => {
    const categoryName = toStringValue(row.category, '미분류');
    let category = byName.get(categoryName);

    if (!category) {
      category = {
        id: categoryName,
        name: categoryName,
        icon: 'FolderOpen',
        color: 'blue',
        sortOrder: next.length,
        sites: [],
      };
      next.push(category);
      byName.set(categoryName, category);
    }

    category.sites.push(mapSite(row, index));
  });

  return next.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
};

const adPayload = (mode: Mode, ad: Partial<Ad>) => ({
  mode: apiMode(mode),
  placement: ad.placement || 'top',
  title: ad.title,
  description: ad.subtitle,
  url: ad.url,
  badge_label: ad.badge,
  badge_type: ad.badgeColor,
  image: ad.image,
  script_code: ad.script,
  expires_at: ad.expiresAt || null,
  is_active: ad.isActive ?? true,
  sort_order: ad.sortOrder ?? 0,
});

const interAdPayload = (mode: Mode, ad: Partial<InterAd>) => ({
  mode: apiMode(mode),
  placement: 'infeed',
  title: ad.title,
  description: ad.description,
  url: ad.redirectUrl,
  badge_label: ad.badge,
  badge_type: 'orange',
  image: ad.imageUrl,
  expires_at: ad.expiresAt || null,
  is_active: ad.isActive ?? true,
  sort_order: ad.sortOrder ?? 0,
  position_after: ad.targetCategoryIndex ?? 0,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  const [stdCats, setStdCats] = useState<Category[]>(standardCategories);
  const [secCats, setSecCats] = useState<Category[]>(secureCategories);
  const [stdAds, setStdAds] = useState<Ad[]>(standardAds);
  const [secAds, setSecAds] = useState<Ad[]>(secureAds);
  const [stdInterAds, setStdInterAds] = useState<InterAd[]>(standardInterAds);
  const [secInterAds, setSecInterAds] = useState<InterAd[]>(secureInterAds);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);
  const [telegramLink, setTelegramLinkState] = useState('https://t.me/junchae_admin');
  const [telegramVisible, setTelegramVisibleState] = useState(true);

  const seedModeIfEmpty = useCallback(async (m: Mode, categoryRows: ApiRow[], siteRows: ApiRow[]) => {
    if (categoryRows.length > 0) return false;
    const fallback = m === 'secure' ? secureCategories : standardCategories;
    const seedCategories =
      siteRows.length > 0
        ? Array.from(new Set(siteRows.map((row) => toStringValue(row.category, '미분류')))).map((name, index) => ({
            id: name,
            name,
            icon: 'FolderOpen',
            color: modeLabelColor(m),
            sortOrder: index,
            sites: [] as Site[],
          }))
        : fallback;

    for (const [index, category] of seedCategories.entries()) {
      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: category.name,
          mode: apiMode(m),
          sort_order: index,
        }),
      }).catch((err) => {
        console.error('Failed to seed category', err);
      });

      if (siteRows.length === 0 && 'sites' in category) {
        for (const [siteIndex, site] of category.sites.entries()) {
          await apiRequest('/api/sites', {
            method: 'POST',
            body: JSON.stringify({
              mode: apiMode(m),
              name: site.name,
              url: site.url,
              category: category.name,
              description: site.description,
              logo: site.logo,
              status: site.status,
              sort_order: siteIndex,
            }),
          }).catch((err) => {
            console.error('Failed to seed site', err);
          });
        }
      }
    }

    return true;
  }, []);

  const loadModeCatalog = useCallback(async (m: Mode) => {
    const dbMode = apiMode(m);
    let categoryRows = extractRows(await apiRequest(`/api/categories?mode=${dbMode}`));
    let siteRows = extractRows(await apiRequest(`/api/sites?mode=${dbMode}`));

    if (await seedModeIfEmpty(m, categoryRows, siteRows)) {
      categoryRows = extractRows(await apiRequest(`/api/categories?mode=${dbMode}`));
      siteRows = extractRows(await apiRequest(`/api/sites?mode=${dbMode}`));
    }

    const categories = categoryRows
      .map(mapCategory)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || Number(a.id) - Number(b.id));

    return buildCategories(categories, siteRows);
  }, [seedModeIfEmpty]);

  const reloadCatalog = useCallback(async () => {
    const [standard, secure] = await Promise.all([
      loadModeCatalog('standard'),
      loadModeCatalog('secure'),
    ]);
    setStdCats(standard);
    setSecCats(secure);
  }, [loadModeCatalog]);

  const reloadAds = useCallback(async () => {
    const [normalRows, secureRows] = await Promise.all([
      apiRequest('/api/ads?mode=normal').then(extractRows),
      apiRequest('/api/ads?mode=secure').then(extractRows),
    ]);

    setStdAds(normalRows.filter((row) => toStringValue(row.placement, 'top') !== 'infeed').map(mapAd));
    setSecAds(secureRows.filter((row) => toStringValue(row.placement, 'top') !== 'infeed').map(mapAd));
    setStdInterAds(normalRows.filter((row) => toStringValue(row.placement, 'top') === 'infeed').map(mapInterAd));
    setSecInterAds(secureRows.filter((row) => toStringValue(row.placement, 'top') === 'infeed').map(mapInterAd));
  }, []);

  useEffect(() => {
    Promise.all([
      reloadCatalog().catch((err) => console.error('Failed to load catalog data', err)),
      reloadAds().catch((err) => console.error('Failed to load ad data', err)),
    ]).catch((err) => console.error('Failed to load data', err));
  }, [reloadAds, reloadCatalog]);

  useEffect(() => {
    try {
      const savedLink = localStorage.getItem('telegram_link');
      const savedVisible = localStorage.getItem('telegram_visible');
      if (savedLink) setTelegramLinkState(savedLink);
      if (savedVisible !== null) setTelegramVisibleState(savedVisible === 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  const categories = mode === 'secure' ? secCats : stdCats;
  const ads = mode === 'secure' ? secAds : stdAds;
  const interAds = mode === 'secure' ? secInterAds : stdInterAds;

  const categoryNameById = useCallback((m: Mode, categoryId: string) => {
    const source = m === 'secure' ? secCats : stdCats;
    return source.find((category) => category.id === categoryId)?.name || categoryId;
  }, [secCats, stdCats]);

  const updateSiteInMode = useCallback(async (m: Mode, siteId: number, updates: SiteUpdatePayload) => {
    await apiRequest(`/api/sites/${siteId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, mode: apiMode(m) }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateSiteLogoInMode = useCallback((m: Mode, siteId: number, logoPath: string) =>
    updateSiteInMode(m, siteId, { logo: logoPath }), [updateSiteInMode]);

  const updateSiteStatusInMode = useCallback(async (_m: Mode, siteId: number, status: Site['status']) => {
    await apiRequest(`/api/sites/${siteId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateSiteUrlInMode = useCallback((m: Mode, siteId: number, url: string) =>
    updateSiteInMode(m, siteId, { url }), [updateSiteInMode]);

  const updateSiteNameInMode = useCallback((m: Mode, siteId: number, name: string) =>
    updateSiteInMode(m, siteId, { name }), [updateSiteInMode]);

  const updateSiteCategoryInMode = useCallback((m: Mode, siteId: number, categoryName: string) =>
    updateSiteInMode(m, siteId, { category: categoryName }), [updateSiteInMode]);

  const addSiteInMode = useCallback(async (m: Mode, categoryId: string, site: Omit<Site, 'id'>) => {
    await apiRequest('/api/sites', {
      method: 'POST',
      body: JSON.stringify({
        mode: apiMode(m),
        name: site.name,
        url: site.url,
        category: categoryNameById(m, categoryId),
        description: site.description,
        logo: site.logo,
        status: site.status,
        sort_order: 0,
      }),
    });
    await reloadCatalog();
  }, [categoryNameById, reloadCatalog]);

  const removeSiteInMode = useCallback(async (_m: Mode, siteId: number) => {
    await apiRequest(`/api/sites/${siteId}`, { method: 'DELETE' });
    await reloadCatalog();
  }, [reloadCatalog]);

  const addCategoryInMode = useCallback(async (m: Mode, cat: Omit<Category, 'sites'>) => {
    await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        mode: apiMode(m),
        name: cat.name,
        sort_order: cat.sortOrder ?? 0,
      }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const removeCategoryInMode = useCallback(async (_m: Mode, categoryId: string) => {
    await apiRequest(`/api/categories/${categoryId}`, { method: 'DELETE' });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateCategoryNameInMode = useCallback(async (m: Mode, categoryId: string, name: string) => {
    await apiRequest(`/api/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ mode: apiMode(m), name }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const reorderCategoriesInMode = useCallback(async (m: Mode, categoryIds: string[]) => {
    await apiRequest('/api/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify({
        mode: apiMode(m),
        items: categoryIds.map((id, index) => ({ id, sort_order: index })),
      }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const addAdInMode = useCallback(async (m: Mode, ad: Omit<Ad, 'id'>) => {
    await apiRequest('/api/ads', {
      method: 'POST',
      body: JSON.stringify(adPayload(m, ad)),
    });
    await reloadAds();
  }, [reloadAds]);

  const updateAdInMode = useCallback(async (m: Mode, adId: number, updates: Partial<Ad>) => {
    await apiRequest(`/api/ads/${adId}`, {
      method: 'PUT',
      body: JSON.stringify(adPayload(m, updates)),
    });
    await reloadAds();
  }, [reloadAds]);

  const removeAdInMode = useCallback(async (_m: Mode, adId: number) => {
    await apiRequest(`/api/ads/${adId}`, { method: 'DELETE' });
    await reloadAds();
  }, [reloadAds]);

  const addInterAdInMode = useCallback(async (m: Mode, ad: Omit<InterAd, 'id'>) => {
    await apiRequest('/api/ads', {
      method: 'POST',
      body: JSON.stringify(interAdPayload(m, ad)),
    });
    await reloadAds();
  }, [reloadAds]);

  const updateInterAdInMode = useCallback(async (m: Mode, adId: string, updates: Partial<InterAd>) => {
    if (Object.keys(updates).length === 1 && Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
      await apiRequest(`/api/ads/${adId}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: updates.isActive }),
      });
    } else {
      await apiRequest(`/api/ads/${adId}`, {
        method: 'PUT',
        body: JSON.stringify(interAdPayload(m, updates)),
      });
    }
    await reloadAds();
  }, [reloadAds]);

  const removeInterAdInMode = useCallback(async (_m: Mode, adId: string) => {
    await apiRequest(`/api/ads/${adId}`, { method: 'DELETE' });
    await reloadAds();
  }, [reloadAds]);

  const setTelegramLink = useCallback((link: string) => {
    setTelegramLinkState(link);
    try {
      localStorage.setItem('telegram_link', link);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setTelegramVisible = useCallback((visible: boolean) => {
    setTelegramVisibleState(visible);
    try {
      localStorage.setItem('telegram_visible', String(visible));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const allSites = useMemo(() =>
    categories.flatMap((category) =>
      (Array.isArray(category.sites) ? category.sites : []).map((site) => ({
        ...site,
        categoryId: category.id,
        categoryName: category.name,
      }))
    ), [categories]);

  const getModeData = useCallback((m: Mode) => ({
    categories: m === 'secure' ? secCats : stdCats,
    ads: m === 'secure' ? secAds : stdAds,
    interAds: m === 'secure' ? secInterAds : stdInterAds,
  }), [secAds, secCats, secInterAds, stdAds, stdCats, stdInterAds]);

  const updateSiteLogo = useCallback((siteId: number, logoPath: string) => updateSiteLogoInMode(mode, siteId, logoPath), [mode, updateSiteLogoInMode]);
  const updateSiteStatus = useCallback((siteId: number, status: Site['status']) => updateSiteStatusInMode(mode, siteId, status), [mode, updateSiteStatusInMode]);
  const updateSiteUrl = useCallback((siteId: number, url: string) => updateSiteUrlInMode(mode, siteId, url), [mode, updateSiteUrlInMode]);
  const updateSiteName = useCallback((siteId: number, name: string) => updateSiteNameInMode(mode, siteId, name), [mode, updateSiteNameInMode]);
  const addSite = useCallback((categoryId: string, site: Omit<Site, 'id'>) => addSiteInMode(mode, categoryId, site), [mode, addSiteInMode]);
  const removeSite = useCallback((siteId: number) => removeSiteInMode(mode, siteId), [mode, removeSiteInMode]);
  const addCategory = useCallback((cat: Omit<Category, 'sites'>) => addCategoryInMode(mode, cat), [mode, addCategoryInMode]);
  const removeCategory = useCallback((categoryId: string) => removeCategoryInMode(mode, categoryId), [mode, removeCategoryInMode]);
  const updateCategoryName = useCallback((categoryId: string, name: string) => updateCategoryNameInMode(mode, categoryId, name), [mode, updateCategoryNameInMode]);
  const updateAd = useCallback((adId: number, updates: Partial<Ad>) => updateAdInMode(mode, adId, updates), [mode, updateAdInMode]);
  const addAd = useCallback((ad: Omit<Ad, 'id'>) => addAdInMode(mode, ad), [mode, addAdInMode]);
  const removeAd = useCallback((adId: number) => removeAdInMode(mode, adId), [mode, removeAdInMode]);

  return (
    <DataContext.Provider
      value={{
        categories,
        ads,
        reloadSites: reloadCatalog,
        reloadCategories: reloadCatalog,
        reloadAds,
        updateSiteLogo,
        updateSiteStatus,
        updateSiteUrl,
        updateSiteName,
        addSite,
        removeSite,
        addCategory,
        removeCategory,
        updateCategoryName,
        updateAd,
        addAd,
        removeAd,
        allSites,
        standardCategories: stdCats,
        secureCategories: secCats,
        standardAds: stdAds,
        secureAds: secAds,
        updateSiteInMode,
        updateSiteLogoInMode,
        updateSiteStatusInMode,
        updateSiteUrlInMode,
        updateSiteNameInMode,
        updateSiteCategoryInMode,
        addSiteInMode,
        removeSiteInMode,
        addCategoryInMode,
        removeCategoryInMode,
        updateCategoryNameInMode,
        reorderCategoriesInMode,
        updateAdInMode,
        addAdInMode,
        removeAdInMode,
        getModeData,
        interAds,
        addInterAdInMode,
        updateInterAdInMode,
        removeInterAdInMode,
        mobileColumns,
        setMobileColumns,
        telegramLink,
        telegramVisible,
        setTelegramLink,
        setTelegramVisible,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
