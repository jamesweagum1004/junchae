const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[/&]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);

export const slugifySiteName = (name?: string | null, fallbackId?: string | number | null) => {
  const rawName = String(name || '').trim();
  if (!rawName) return fallbackId ? `site-${fallbackId}` : '';
  return normalizeSlug(rawName) || (fallbackId ? `site-${fallbackId}` : '');
};

export const getSiteSlug = (site: { id?: string | number; name?: string | null; seo_slug?: string | null }) =>
  normalizeSlug(String(site.seo_slug || '')) ||
  slugifySiteName(site.name, site.id) ||
  String(site.id || '');

export const sitePath = (site: { id?: string | number; name?: string | null; seo_slug?: string | null }) =>
  `/site/${encodeURIComponent(getSiteSlug(site))}`;
