import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import {
  Category, Site, Ad, InterAd,
  standardCategories, secureCategories,
  standardAds, secureAds,
  standardInterAds, secureInterAds,
} from '../data/categories';
import { useTheme } from './ThemeContext';

export type MobileColumns = 1 | 2;

interface DataContextType {
  categories: Category[];
  ads: Ad[];
  /** Update a site's logo across the active mode's dataset */
  updateSiteLogo: (siteId: number, logoPath: string) => void;
  /** Update site status across the active mode's dataset */
  updateSiteStatus: (siteId: number, status: Site['status']) => void;
  /** Update site URL across the active mode's dataset */
  updateSiteUrl: (siteId: number, url: string) => void;
  /** Update site name across the active mode's dataset */
  updateSiteName: (siteId: number, name: string) => void;
  /** Add a new site to a category in the active mode */
  addSite: (categoryId: string, site: Omit<Site, 'id'>) => void;
  /** Remove a site from the active mode */
  removeSite: (siteId: number) => void;
  /** Add a new category to the active mode */
  addCategory: (cat: Omit<Category, 'sites'>) => void;
  /** Remove a category from the active mode */
  removeCategory: (categoryId: string) => void;
  /** Update category name in the active mode */
  updateCategoryName: (categoryId: string, name: string) => void;
  /** Update an ad in the active mode */
  updateAd: (adId: number, updates: Partial<Ad>) => void;
  /** Add a new ad to the active mode */
  addAd: (ad: Omit<Ad, 'id'>) => void;
  /** Remove an ad from the active mode */
  removeAd: (adId: number) => void;
  /** All sites across all categories in the active mode (for search + admin table) */
  allSites: (Site & { categoryId: string; categoryName: string })[];
  /** Direct access to standard-mode datasets (for admin sub-tab editing) */
  standardCategories: Category[];
  secureCategories: Category[];
  standardAds: Ad[];
  secureAds: Ad[];
  /** Update functions that target a specific mode regardless of current toggle */
  updateSiteLogoInMode: (mode: 'standard' | 'secure', siteId: number, logoPath: string) => void;
  updateSiteStatusInMode: (mode: 'standard' | 'secure', siteId: number, status: Site['status']) => void;
  updateSiteUrlInMode: (mode: 'standard' | 'secure', siteId: number, url: string) => void;
  updateSiteNameInMode: (mode: 'standard' | 'secure', siteId: number, name: string) => void;
  addSiteInMode: (mode: 'standard' | 'secure', categoryId: string, site: Omit<Site, 'id'>) => void;
  removeSiteInMode: (mode: 'standard' | 'secure', siteId: number) => void;
  addCategoryInMode: (mode: 'standard' | 'secure', cat: Omit<Category, 'sites'>) => void;
  removeCategoryInMode: (mode: 'standard' | 'secure', categoryId: string) => void;
  updateCategoryNameInMode: (mode: 'standard' | 'secure', categoryId: string, name: string) => void;
  updateAdInMode: (mode: 'standard' | 'secure', adId: number, updates: Partial<Ad>) => void;
  addAdInMode: (mode: 'standard' | 'secure', ad: Omit<Ad, 'id'>) => void;
  removeAdInMode: (mode: 'standard' | 'secure', adId: number) => void;
  getModeData: (mode: 'standard' | 'secure') => { categories: Category[]; ads: Ad[]; interAds: InterAd[] };
  /** Inter-category ads (in-feed native ads) */
  interAds: InterAd[];
  addInterAdInMode: (mode: 'standard' | 'secure', ad: Omit<InterAd, 'id'>) => void;
  updateInterAdInMode: (mode: 'standard' | 'secure', adId: string, updates: Partial<InterAd>) => void;
  removeInterAdInMode: (mode: 'standard' | 'secure', adId: string) => void;
  /** Mobile banner column setting */
  mobileColumns: MobileColumns;
  setMobileColumns: (c: MobileColumns) => void;
  /** Telegram inquiry button settings */
  telegramLink: string;
  telegramVisible: boolean;
  setTelegramLink: (link: string) => void;
  setTelegramVisible: (visible: boolean) => void;
}

const DataContext = createContext<DataContextType | null>(null);

type ApiSiteRow = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSiteStatus = (value: unknown): value is Site['status'] =>
  value === 'normal' || value === 'busy' || value === 'slow';

const toStringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const sanitizeCategories = (items: unknown): Category[] | null => {
  if (!Array.isArray(items)) return null;

  return items
    .filter(isRecord)
    .map((cat, index) => ({
      id: toStringValue(cat.id, `category-${index + 1}`),
      name: toStringValue(cat.name, 'Untitled Category'),
      icon: toStringValue(cat.icon, 'FolderOpen'),
      color: toStringValue(cat.color, 'blue'),
      sites: Array.isArray(cat.sites)
        ? cat.sites.filter(isRecord).map((site, siteIndex) => ({
            id: Number(site.id) || Date.now() + index * 1000 + siteIndex,
            name: toStringValue(site.name, 'Untitled Site'),
            url: toStringValue(site.url, '#'),
            logo: toStringValue(site.logo, '/uploads/logos/default.png'),
            status: isSiteStatus(site.status) ? site.status : 'normal',
            description: toStringValue(site.description),
          }))
        : [],
    }));
};

const mapFlatSiteRowsToCategories = (rows: ApiSiteRow[]): Category[] => {
  const grouped = new Map<string, Category>();

  rows.forEach((row, index) => {
    const categoryId = toStringValue(
      row.category_id ?? row.categoryId ?? row.category,
      'uncategorized'
    );
    const categoryName = toStringValue(
      row.category_name ?? row.categoryName,
      categoryId === 'uncategorized' ? 'Uncategorized' : categoryId
    );

    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, {
        id: categoryId,
        name: categoryName,
        icon: toStringValue(row.category_icon ?? row.categoryIcon, 'FolderOpen'),
        color: toStringValue(row.category_color ?? row.categoryColor, 'blue'),
        sites: [],
      });
    }

    grouped.get(categoryId)?.sites.push({
      id: Number(row.id ?? row.site_id ?? row.siteId) || Date.now() + index,
      name: toStringValue(row.name ?? row.site_name ?? row.siteName, 'Untitled Site'),
      url: toStringValue(row.url, '#'),
      logo: toStringValue(row.logo ?? row.logo_path ?? row.logoPath, '/uploads/logos/default.png'),
      status: isSiteStatus(row.status) ? row.status : 'normal',
      description: toStringValue(row.description),
    });
  });

  return Array.from(grouped.values());
};

const mapApiSitesToCategories = (payload: unknown): Category[] | null => {
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : payload;
  const categories = sanitizeCategories(data);
  if (categories) return categories;

  if (Array.isArray(data) && data.every(isRecord)) {
    return mapFlatSiteRowsToCategories(data);
  }

  return null;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();

  const [stdCats, setStdCats] = useState<Category[]>(() => sanitizeCategories(standardCategories) ?? standardCategories);
  const [secCats, setSecCats] = useState<Category[]>(() => sanitizeCategories(secureCategories) ?? secureCategories);
  const [stdAds, setStdAds] = useState<Ad[]>(standardAds);
  const [secAds, setSecAds] = useState<Ad[]>(secureAds);
  const [stdInterAds, setStdInterAds] = useState<InterAd[]>(standardInterAds);
  const [secInterAds, setSecInterAds] = useState<InterAd[]>(secureInterAds);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);
  const [telegramLink, setTelegramLinkState] = useState('https://t.me/junchae_admin');
  const [telegramVisible, setTelegramVisibleState] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sites')
      .then((res) => {
        if (!res.ok) throw new Error(`API request failed with ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        const nextCategories = mapApiSitesToCategories(payload);
        if (!cancelled && nextCategories) {
          setStdCats(nextCategories);
        }
      })
      .catch((err) => {
        console.error('Failed to load API sites. Falling back to static data.', err);
        if (!cancelled) {
          setStdCats(sanitizeCategories(standardCategories) ?? standardCategories);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const isStandard = mode === 'standard';
  const categories = isStandard ? stdCats : secCats;
  const ads = isStandard ? stdAds : secAds;
  const interAds = isStandard ? stdInterAds : secInterAds;

  const catsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdCats : setSecCats);
  const adsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdAds : setSecAds);
  const interAdsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdInterAds : setSecInterAds);

  // Load Telegram settings from localStorage on mount
  useState(() => {
    try {
      const savedLink = localStorage.getItem('telegram_link');
      const savedVisible = localStorage.getItem('telegram_visible');
      if (savedLink) setTelegramLinkState(savedLink);
      if (savedVisible !== null) setTelegramVisibleState(savedVisible === 'true');
    } catch {
      // localStorage unavailable
    }
    return null;
  });

  const setTelegramLink = useCallback((link: string) => {
    setTelegramLinkState(link);
    try { localStorage.setItem('telegram_link', link); } catch {}
  }, []);
  const setTelegramVisible = useCallback((visible: boolean) => {
    setTelegramVisibleState(visible);
    try { localStorage.setItem('telegram_visible', String(visible)); } catch {}
  }, []);

  const updateSiteLogoInMode = useCallback((m: 'standard' | 'secure', siteId: number, logoPath: string) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) => ({
        ...cat,
        sites: cat.sites.map((s) => (s.id === siteId ? { ...s, logo: logoPath } : s)),
      }))
    );
  }, []);

  const updateSiteStatusInMode = useCallback((m: 'standard' | 'secure', siteId: number, status: Site['status']) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) => ({
        ...cat,
        sites: cat.sites.map((s) => (s.id === siteId ? { ...s, status } : s)),
      }))
    );
  }, []);

  const updateSiteUrlInMode = useCallback((m: 'standard' | 'secure', siteId: number, url: string) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) => ({
        ...cat,
        sites: cat.sites.map((s) => (s.id === siteId ? { ...s, url } : s)),
      }))
    );
  }, []);

  const updateSiteNameInMode = useCallback((m: 'standard' | 'secure', siteId: number, name: string) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) => ({
        ...cat,
        sites: cat.sites.map((s) => (s.id === siteId ? { ...s, name } : s)),
      }))
    );
  }, []);

  const addSiteInMode = useCallback((m: 'standard' | 'secure', categoryId: string, site: Omit<Site, 'id'>) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, sites: [...cat.sites, { ...site, id: Date.now() }] }
          : cat
      )
    );
  }, []);

  const removeSiteInMode = useCallback((m: 'standard' | 'secure', siteId: number) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((cat) => ({
        ...cat,
        sites: cat.sites.filter((s) => s.id !== siteId),
      }))
    );
  }, []);

  const addCategoryInMode = useCallback((m: 'standard' | 'secure', cat: Omit<Category, 'sites'>) => {
    catsSetter(m)((prev: Category[]) => [...prev, { ...cat, sites: [] }]);
  }, []);

  const removeCategoryInMode = useCallback((m: 'standard' | 'secure', categoryId: string) => {
    catsSetter(m)((prev: Category[]) => prev.filter((c) => c.id !== categoryId));
  }, []);

  const updateCategoryNameInMode = useCallback((m: 'standard' | 'secure', categoryId: string, name: string) => {
    catsSetter(m)((prev: Category[]) =>
      prev.map((c) => (c.id === categoryId ? { ...c, name } : c))
    );
  }, []);

  const updateAdInMode = useCallback((m: 'standard' | 'secure', adId: number, updates: Partial<Ad>) => {
    adsSetter(m)((prev: Ad[]) => prev.map((a) => (a.id === adId ? { ...a, ...updates } : a)));
  }, []);

  const addAdInMode = useCallback((m: 'standard' | 'secure', ad: Omit<Ad, 'id'>) => {
    adsSetter(m)((prev: Ad[]) => [...prev, { ...ad, id: Date.now() }]);
  }, []);

  const removeAdInMode = useCallback((m: 'standard' | 'secure', adId: number) => {
    adsSetter(m)((prev: Ad[]) => prev.filter((a) => a.id !== adId));
  }, []);

  // Inter-ad CRUD
  const addInterAdInMode = useCallback((m: 'standard' | 'secure', ad: Omit<InterAd, 'id'>) => {
    interAdsSetter(m)((prev: InterAd[]) => [...prev, { ...ad, id: `inter-ad-${Date.now()}` }]);
  }, []);
  const updateInterAdInMode = useCallback((m: 'standard' | 'secure', adId: string, updates: Partial<InterAd>) => {
    interAdsSetter(m)((prev: InterAd[]) => prev.map((a) => (a.id === adId ? { ...a, ...updates } : a)));
  }, []);
  const removeInterAdInMode = useCallback((m: 'standard' | 'secure', adId: string) => {
    interAdsSetter(m)((prev: InterAd[]) => prev.filter((a) => a.id !== adId));
  }, []);

  // Active-mode convenience wrappers
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

  const allSites = categories.flatMap((c) =>
    (Array.isArray(c.sites) ? c.sites : []).map((s) => ({ ...s, categoryId: c.id, categoryName: c.name }))
  );

  const getModeData = (m: 'standard' | 'secure') => ({
    categories: m === 'standard' ? stdCats : secCats,
    ads: m === 'standard' ? stdAds : secAds,
    interAds: m === 'standard' ? stdInterAds : secInterAds,
  });

  return (
    <DataContext.Provider
      value={{
        categories, ads,
        updateSiteLogo, updateSiteStatus, updateSiteUrl, updateSiteName,
        addSite, removeSite,
        addCategory, removeCategory, updateCategoryName,
        updateAd, addAd, removeAd,
        allSites,
        standardCategories: stdCats, secureCategories: secCats,
        standardAds: stdAds, secureAds: secAds,
        updateSiteLogoInMode, updateSiteStatusInMode, updateSiteUrlInMode, updateSiteNameInMode,
        addSiteInMode, removeSiteInMode,
        addCategoryInMode, removeCategoryInMode, updateCategoryNameInMode,
        updateAdInMode, addAdInMode, removeAdInMode,
        getModeData,
        interAds, addInterAdInMode, updateInterAdInMode, removeInterAdInMode,
        mobileColumns, setMobileColumns,
        telegramLink, telegramVisible, setTelegramLink, setTelegramVisible,
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
