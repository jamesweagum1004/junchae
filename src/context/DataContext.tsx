import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  Category,
  Site,
  Ad,
  InterAd,
  standardCategories,
  secureCategories,
  standardAds,
  secureAds,
  standardInterAds,
  secureInterAds,
} from '../data/categories';
import { useTheme } from './ThemeContext';

export type MobileColumns = 1 | 2;
type Mode = 'standard' | 'secure';
type SiteUpdatePayload = Partial<Omit<Site, 'id'>>;

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
  addSiteInMode: (mode: Mode, categoryId: string, site: Omit<Site, 'id'>) => Promise<void>;
  removeSiteInMode: (mode: Mode, siteId: number) => Promise<void>;
  addCategoryInMode: (mode: Mode, cat: Omit<Category, 'sites'>) => Promise<void>;
  removeCategoryInMode: (mode: Mode, categoryId: string) => Promise<void>;
  updateCategoryNameInMode: (mode: Mode, categoryId: string, name: string) => Promise<void>;
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

const isSiteStatus = (value: unknown): value is Site['status'] =>
  value === 'normal' || value === 'busy' || value === 'slow';

const apiMode = (mode: Mode) => (mode === 'standard' ? 'normal' : 'secure');
const uiMode = (mode: unknown): Mode => (mode === 'secure' ? 'secure' : 'standard');

const isExpired = (date?: string) => {
  if (!date) return false;
  const expiry = new Date(`${date}T23:59:59`);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() < Date.now();
};

const sanitizeCategories = (items: unknown): Category[] | null => {
  if (!Array.isArray(items) || !items.every(isRecord)) return null;
  if (!items.every((cat) => Array.isArray(cat.sites))) return null;

  return items.map((cat, index) => ({
    id: toStringValue(cat.id, `category-${index + 1}`),
    name: toStringValue(cat.name, `카테고리 ${index + 1}`),
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

const extractDataArray = (payload: unknown): ApiRow[] | null => {
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : payload;
  return Array.isArray(data) && data.every(isRecord) ? data : null;
};

const mapSiteRow = (row: ApiRow, index: number): Site => ({
  id: Number(row.id ?? row.site_id ?? row.siteId) || Date.now() + index,
  name: toStringValue(row.name ?? row.site_name ?? row.siteName, 'Untitled Site'),
  url: toStringValue(row.url, '#'),
  logo: toStringValue(row.logo ?? row.logo_path ?? row.logoPath, '/uploads/logos/default.png'),
  status: isSiteStatus(row.status) ? row.status : 'normal',
  description: toStringValue(row.description),
});

const mapCategoryRows = (rows: ApiRow[]) => {
  const result: Record<Mode, Category[]> = { standard: [], secure: [] };

  rows.forEach((row, index) => {
    const mode = uiMode(row.mode);
    result[mode].push({
      id: String(Number(row.id) || toStringValue(row.id, `category-${index + 1}`)),
      name: toStringValue(row.name, `카테고리 ${index + 1}`),
      icon: 'FolderOpen',
      color: mode === 'secure' ? 'orange' : 'blue',
      sites: [],
    });
  });

  return result;
};

const composeCategories = (categoryRows: ApiRow[] | null, siteRows: ApiRow[] | null) => {
  const categoryMap = mapCategoryRows(categoryRows ?? []);
  const standard = categoryMap.standard;
  const secure = categoryMap.secure;

  const standardByName = new Map(standard.map((category) => [category.name, category]));

  (siteRows ?? []).forEach((row, index) => {
    const categoryName = toStringValue(
      row.category_name ?? row.categoryName ?? row.category,
      '미분류'
    );
    let category = standardByName.get(categoryName);

    if (!category) {
      category = {
        id: categoryName,
        name: categoryName,
        icon: 'FolderOpen',
        color: 'blue',
        sites: [],
      };
      standardByName.set(categoryName, category);
      standard.push(category);
    }

    category.sites.push(mapSiteRow(row, index));
  });

  return {
    standard:
      standard.length > 0
        ? standard
        : sanitizeCategories(standardCategories) ?? standardCategories,
    secure:
      secure.length > 0
        ? secure
        : sanitizeCategories(secureCategories) ?? secureCategories,
  };
};

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

const mapAds = (rows: ApiRow[] | null) => {
  const result = {
    standardAds: [] as Ad[],
    secureAds: [] as Ad[],
    standardInterAds: [] as InterAd[],
    secureInterAds: [] as InterAd[],
  };

  (rows ?? []).forEach((row) => {
    const mode = uiMode(row.mode);
    const placement = toStringValue(row.placement, 'top');

    if (placement === 'infeed') {
      result[mode === 'secure' ? 'secureInterAds' : 'standardInterAds'].push(mapInterAd(row));
    } else {
      result[mode === 'secure' ? 'secureAds' : 'standardAds'].push(mapAd(row));
    }
  });

  return {
    standardAds: result.standardAds,
    secureAds: result.secureAds,
    standardInterAds: result.standardInterAds,
    secureInterAds: result.secureInterAds,
  };
};

const apiRequest = async (requestPath: string, init?: RequestInit) => {
  const res = await fetch(requestPath, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = await res.json().catch(() => null);

  if (!res.ok || !isRecord(payload) || payload.ok !== true) {
    console.error('API 요청 실패', {
      path: requestPath,
      status: res.status,
      body: payload,
    });
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

const topAdPayload = (mode: Mode, ad: Partial<Ad>) => ({
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

export const isVisibleAd = (ad: Ad | InterAd) => {
  const active = 'isActive' in ad ? ad.isActive !== false : true;
  return active && !isExpired('expiresAt' in ad ? ad.expiresAt : undefined);
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

  const reloadCatalog = useCallback(async () => {
    const [categoryPayload, sitePayload] = await Promise.all([
      apiRequest('/api/categories').catch((err) => {
        console.error('카테고리 API 로드 실패', err);
        return null;
      }),
      apiRequest('/api/sites').catch((err) => {
        console.error('사이트 API 로드 실패', err);
        return null;
      }),
    ]);

    const next = composeCategories(
      categoryPayload ? extractDataArray(categoryPayload) : null,
      sitePayload ? extractDataArray(sitePayload) : null
    );

    setStdCats(next.standard);
    setSecCats(next.secure);
  }, []);

  const reloadAds = useCallback(async () => {
    const payload = await apiRequest('/api/ads');
    const next = mapAds(extractDataArray(payload));
    setStdAds(next.standardAds);
    setSecAds(next.secureAds);
    setStdInterAds(next.standardInterAds);
    setSecInterAds(next.secureInterAds);
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      reloadCatalog(),
      reloadAds().catch((err) => {
        console.error('광고 API 로드 실패. 정적 광고 데이터를 사용합니다.', err);
        setStdAds(standardAds);
        setSecAds(secureAds);
        setStdInterAds(standardInterAds);
        setSecInterAds(secureInterAds);
      }),
    ]);
  }, [reloadAds, reloadCatalog]);

  useEffect(() => {
    reloadAll().catch((err) => {
      console.error('초기 데이터 로드 실패. 정적 데이터를 사용합니다.', err);
      setStdCats(sanitizeCategories(standardCategories) ?? standardCategories);
      setSecCats(sanitizeCategories(secureCategories) ?? secureCategories);
    });
  }, [reloadAll]);

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

  const isStandard = mode === 'standard';
  const categories = isStandard ? stdCats : secCats;
  const ads = isStandard ? stdAds : secAds;
  const interAds = isStandard ? stdInterAds : secInterAds;

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

  const categoryNameById = useCallback((m: Mode, categoryId: string) => {
    const source = m === 'standard' ? stdCats : secCats;
    return source.find((category) => category.id === categoryId)?.name || categoryId;
  }, [secCats, stdCats]);

  const updateSiteInMode = useCallback(async (m: Mode, siteId: number, updates: SiteUpdatePayload) => {
    if (m !== 'standard') return;
    await apiRequest(`/api/sites/${siteId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateSiteLogoInMode = useCallback(
    (m: Mode, siteId: number, logoPath: string) => updateSiteInMode(m, siteId, { logo: logoPath }),
    [updateSiteInMode]
  );

  const updateSiteStatusInMode = useCallback(async (m: Mode, siteId: number, status: Site['status']) => {
    if (m !== 'standard') return;
    await apiRequest(`/api/sites/${siteId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateSiteUrlInMode = useCallback(
    (m: Mode, siteId: number, url: string) => updateSiteInMode(m, siteId, { url }),
    [updateSiteInMode]
  );

  const updateSiteNameInMode = useCallback(
    (m: Mode, siteId: number, name: string) => updateSiteInMode(m, siteId, { name }),
    [updateSiteInMode]
  );

  const addSiteInMode = useCallback(async (m: Mode, categoryId: string, site: Omit<Site, 'id'>) => {
    if (m !== 'standard') return;
    await apiRequest('/api/sites', {
      method: 'POST',
      body: JSON.stringify({
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

  const removeSiteInMode = useCallback(async (m: Mode, siteId: number) => {
    if (m !== 'standard') return;
    await apiRequest(`/api/sites/${siteId}`, { method: 'DELETE' });
    await reloadCatalog();
  }, [reloadCatalog]);

  const addCategoryInMode = useCallback(async (m: Mode, cat: Omit<Category, 'sites'>) => {
    await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: cat.name,
        mode: apiMode(m),
        sort_order: 0,
      }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const removeCategoryInMode = useCallback(async (_mode: Mode, categoryId: string) => {
    const id = Number(categoryId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('DB에 저장된 카테고리만 삭제할 수 있습니다.');
    }
    await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
    await reloadCatalog();
  }, [reloadCatalog]);

  const updateCategoryNameInMode = useCallback(async (m: Mode, categoryId: string, name: string) => {
    const id = Number(categoryId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('DB에 저장된 카테고리만 수정할 수 있습니다.');
    }
    await apiRequest(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, mode: apiMode(m) }),
    });
    await reloadCatalog();
  }, [reloadCatalog]);

  const addAdInMode = useCallback(async (m: Mode, ad: Omit<Ad, 'id'>) => {
    await apiRequest('/api/ads', {
      method: 'POST',
      body: JSON.stringify(topAdPayload(m, ad)),
    });
    await reloadAds();
  }, [reloadAds]);

  const updateAdInMode = useCallback(async (m: Mode, adId: number, updates: Partial<Ad>) => {
    await apiRequest(`/api/ads/${adId}`, {
      method: 'PUT',
      body: JSON.stringify(topAdPayload(m, updates)),
    });
    await reloadAds();
  }, [reloadAds]);

  const removeAdInMode = useCallback(async (_mode: Mode, adId: number) => {
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
    const id = Number(adId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('DB에 저장된 광고만 수정할 수 있습니다.');
    }

    if (Object.keys(updates).length === 1 && Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
      await apiRequest(`/api/ads/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: updates.isActive }),
      });
    } else {
      await apiRequest(`/api/ads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(interAdPayload(m, updates)),
      });
    }
    await reloadAds();
  }, [reloadAds]);

  const removeInterAdInMode = useCallback(async (_mode: Mode, adId: string) => {
    const id = Number(adId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('DB에 저장된 광고만 삭제할 수 있습니다.');
    }
    await apiRequest(`/api/ads/${id}`, { method: 'DELETE' });
    await reloadAds();
  }, [reloadAds]);

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

  const allSites = useMemo(
    () => categories.flatMap((category) =>
      (Array.isArray(category.sites) ? category.sites : []).map((site) => ({
        ...site,
        categoryId: category.id,
        categoryName: category.name,
      }))
    ),
    [categories]
  );

  const getModeData = useCallback((m: Mode) => ({
    categories: m === 'standard' ? stdCats : secCats,
    ads: m === 'standard' ? stdAds : secAds,
    interAds: m === 'standard' ? stdInterAds : secInterAds,
  }), [secAds, secCats, secInterAds, stdAds, stdCats, stdInterAds]);

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
        addSiteInMode,
        removeSiteInMode,
        addCategoryInMode,
        removeCategoryInMode,
        updateCategoryNameInMode,
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
