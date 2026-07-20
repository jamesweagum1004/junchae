const categorySlugMap = new Map<string, string>([
  ['포털', 'portal'],
  ['커뮤니티', 'community'],
  ['웹툰', 'webtoon'],
  ['뉴스', 'news'],
  ['쇼핑', 'shopping'],
  ['OTT', 'ott'],
  ['스포츠', 'sports'],
  ['스포츠/카지노', 'sports-casino'],
  ['스포츠 / 카지노', 'sports-casino'],
  ['카지노', 'casino'],
  ['토렌트', 'torrent'],
  ['성인', 'adult'],
  ['게임', 'game'],
  ['금융', 'finance'],
  ['생활', 'lifestyle'],
  ['기타', 'etc'],
]);

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[/&]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);

export const slugifyCategoryName = (name?: string | null, fallbackId?: string | number | null) => {
  const rawName = String(name || '').trim();
  if (!rawName) return fallbackId ? `category-${fallbackId}` : '';

  const normalizedName = rawName.replace(/\s+/g, ' ').trim();
  const compactName = rawName.replace(/\s+/g, '');
  const mapped =
    categorySlugMap.get(normalizedName) ||
    categorySlugMap.get(compactName) ||
    categorySlugMap.get(normalizedName.toUpperCase()) ||
    categorySlugMap.get(normalizedName.toLowerCase());

  return normalizeSlug(mapped || normalizedName) || (fallbackId ? `category-${fallbackId}` : '');
};

export const getCategorySlug = (category: { id?: string | number; name?: string | null; slug?: string | null }) =>
  normalizeSlug(String(category.slug || '')) ||
  slugifyCategoryName(category.name, category.id) ||
  String(category.id || '');

export const categoryPath = (category: { id?: string | number; name?: string | null; slug?: string | null }) =>
  `/category/${encodeURIComponent(getCategorySlug(category))}`;
