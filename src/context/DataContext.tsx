import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { mode } = useTheme();

  const [stdCats, setStdCats] = useState<Category[]>(standardCategories);
  const [secCats, setSecCats] = useState<Category[]>(secureCategories);
  const [stdAds, setStdAds] = useState<Ad[]>(standardAds);
  const [secAds, setSecAds] = useState<Ad[]>(secureAds);
  const [stdInterAds, setStdInterAds] = useState<InterAd[]>(standardInterAds);
  const [secInterAds, setSecInterAds] = useState<InterAd[]>(secureInterAds);
  const [mobileColumns, setMobileColumns] = useState<MobileColumns>(1);

  const isStandard = mode === 'standard';
  const categories = isStandard ? stdCats : secCats;
  const ads = isStandard ? stdAds : secAds;
  const interAds = isStandard ? stdInterAds : secInterAds;

  const catsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdCats : setSecCats);
  const adsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdAds : setSecAds);
  const interAdsSetter = (m: 'standard' | 'secure') => (m === 'standard' ? setStdInterAds : setSecInterAds);

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
    c.sites.map((s) => ({ ...s, categoryId: c.id, categoryName: c.name }))
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
