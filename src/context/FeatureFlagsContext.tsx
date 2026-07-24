import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type GrowthFeatureFlags = {
  show_home_status_sections: boolean;
  show_site_status_score: boolean;
  show_site_check_timeline: boolean;
  show_updates_page: boolean;
  show_url_status_tool: boolean;
  show_category_status_stats: boolean;
  show_recently_viewed_sites: boolean;
  recently_viewed_limit: number;
};

export const defaultGrowthFeatureFlags: GrowthFeatureFlags = {
  show_home_status_sections: true,
  show_site_status_score: true,
  show_site_check_timeline: true,
  show_updates_page: true,
  show_url_status_tool: true,
  show_category_status_stats: true,
  show_recently_viewed_sites: false,
  recently_viewed_limit: 8,
};

type FeatureFlagsContextType = {
  flags: GrowthFeatureFlags;
  reloadGrowthFeatures: () => Promise<void>;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

const normalizeFlags = (value: unknown): GrowthFeatureFlags => {
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(defaultGrowthFeatureFlags).map(([key, fallback]) => [
      key,
      key === 'recently_viewed_limit'
        ? Math.max(3, Math.min(20, Number(source[key]) || 8))
        : typeof source[key] === 'boolean' ? source[key] : fallback,
    ])
  ) as GrowthFeatureFlags;
};

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<GrowthFeatureFlags>(defaultGrowthFeatureFlags);

  const reloadGrowthFeatures = useCallback(async () => {
    const res = await fetch('/api/features/growth');
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.ok !== true) throw new Error(body?.message || body?.error || 'Feature flags load failed.');
    setFlags(normalizeFlags(body.data));
  }, []);

  useEffect(() => {
    reloadGrowthFeatures().catch((err) => console.error('Growth feature flags load failed', err));
  }, [reloadGrowthFeatures]);

  const value = useMemo(() => ({ flags, reloadGrowthFeatures }), [flags, reloadGrowthFeatures]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}
