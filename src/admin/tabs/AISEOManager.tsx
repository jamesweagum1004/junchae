import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle, Search, Upload, Wand2, X } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { useData } from '../../context/DataContext';
import { apiJson, apiMode, loadSettings, saveSettings, type AdminMode } from '../../lib/adminApi';
import { uploadSitePreviewImage } from '../../lib/adminUploads';
import { getSiteSlug } from '../../lib/siteSlug';
import type { Category, Site } from '../../data/categories';

type SeoDraft = {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_slug: string;
  seo_h1: string;
  seo_canonical: string;
  seo_og_title: string;
  seo_og_description: string;
  seo_og_image: string;
  seo_intro: string;
  seo_features: string;
  seo_faq: string;
  preview_image: string;
  seo_score: number;
};

type SeoSite = Site & {
  categoryName: string;
};

type GlobalSeoSettings = {
  site_name: string;
  homepage_title: string;
  homepage_description: string;
  homepage_keywords: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_type: string;
  robots: string;
};

const emptyDraft: SeoDraft = {
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  seo_slug: '',
  seo_h1: '',
  seo_canonical: '',
  seo_og_title: '',
  seo_og_description: '',
  seo_og_image: '',
  seo_intro: '',
  seo_features: '',
  seo_faq: '',
  preview_image: '',
  seo_score: 0,
};

const defaultGlobalSeo: GlobalSeoSettings = {
  site_name: '전체닷컴',
  homepage_title: '전체닷컴 - 인기 사이트 주소 모음 | 빠른 링크 허브',
  homepage_description:
    '전체닷컴은 포털, 커뮤니티, OTT, 영화, 웹툰, 쇼핑 등 주요 사이트 주소를 카테고리별로 빠르게 확인할 수 있는 링크 허브입니다.',
  homepage_keywords: '사이트 주소, 링크 모음, 인기 사이트, 커뮤니티 주소, 웹툰 주소, OTT 사이트, 영화 사이트, 전체닷컴',
  canonical_url: 'https://junchae.com',
  og_title: '전체닷컴 - 인기 사이트 주소 모음',
  og_description: '포털, 커뮤니티, 웹툰, 영화, OTT, 쇼핑 사이트를 한 곳에서 빠르게 확인하세요.',
  og_image: '/uploads/og/default-og.png',
  og_type: 'website',
  robots: 'index,follow',
};

const textKeys: Array<keyof Omit<SeoDraft, 'seo_score'>> = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_slug',
  'seo_h1',
  'seo_canonical',
  'seo_og_title',
  'seo_og_description',
  'seo_og_image',
  'seo_intro',
  'seo_features',
  'seo_faq',
  'preview_image',
];

const globalSeoFields: Array<{ key: keyof GlobalSeoSettings; label: string; multiline?: boolean }> = [
  { key: 'site_name', label: '사이트 이름' },
  { key: 'homepage_title', label: '홈페이지 제목' },
  { key: 'homepage_description', label: '홈페이지 메타 설명', multiline: true },
  { key: 'homepage_keywords', label: '홈페이지 키워드', multiline: true },
  { key: 'canonical_url', label: 'Canonical URL' },
  { key: 'og_title', label: 'OG 제목' },
  { key: 'og_description', label: 'OG 설명', multiline: true },
  { key: 'og_image', label: 'OG 이미지' },
  { key: 'og_type', label: 'OG 타입' },
  { key: 'robots', label: 'Robots' },
];

const siteTextFields: Array<{ key: keyof Omit<SeoDraft, 'seo_score'>; label: string; multiline?: boolean }> = [
  { key: 'seo_title', label: 'SEO 제목' },
  { key: 'seo_h1', label: 'H1 제목' },
  { key: 'seo_slug', label: 'SEO slug' },
  { key: 'seo_canonical', label: 'Canonical URL' },
  { key: 'seo_og_title', label: 'OG 제목' },
  { key: 'seo_og_image', label: 'OG 이미지' },
  { key: 'seo_description', label: '메타 설명', multiline: true },
  { key: 'seo_keywords', label: '키워드', multiline: true },
  { key: 'seo_og_description', label: 'OG 설명', multiline: true },
  { key: 'seo_intro', label: '상세 소개 본문', multiline: true },
  { key: 'seo_features', label: '주요 기능/특징', multiline: true },
  { key: 'seo_faq', label: 'FAQ JSON', multiline: true },
  { key: 'preview_image', label: '미리보기 이미지' },
];

const stringifyPreviewValue = (value: unknown, fallback: string) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const stringifyFeaturePreview = (value: unknown, fallback: string) => {
  if (!Array.isArray(value)) return stringifyPreviewValue(value, fallback);
  return value
    .map((item) => (typeof item === 'string' ? item : String(item?.title || item?.text || item?.feature || '')))
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');
};

const stringifyFaqPreview = (value: unknown, fallback: string) => {
  if (!Array.isArray(value)) return stringifyPreviewValue(value, fallback);
  return JSON.stringify(value, null, 2);
};

const siteToDraft = (site: SeoSite): SeoDraft => {
  const slug = getSiteSlug(site);
  return {
    seo_title: site.seo_title || `${site.name} 최신 정보`,
    seo_description: site.seo_description || site.description || '',
    seo_keywords: site.seo_keywords || site.name,
    seo_slug: slug,
    seo_h1: site.seo_h1 || site.name,
    seo_canonical: `https://junchae.com/site/${slug}`,
    seo_og_title: site.seo_og_title || site.seo_title || site.name,
    seo_og_description: site.seo_og_description || site.seo_description || site.description || '',
    seo_og_image: site.seo_og_image || site.logo || '',
    seo_intro: site.seo_intro || '',
    seo_features: site.seo_features || '',
    seo_faq: typeof site.seo_faq === 'string' ? site.seo_faq : JSON.stringify(site.seo_faq || [], null, 2),
    preview_image: site.preview_image || '',
    seo_score: site.seo_score || 0,
  };
};

function GlobalSeoPanel({
  activeMode,
  categories,
  sites,
}: {
  activeMode: AdminMode;
  categories: Category[];
  sites: SeoSite[];
}) {
  const [settings, setSettings] = useState<GlobalSeoSettings>(defaultGlobalSeo);
  const [aiPreview, setAiPreview] = useState<Record<string, unknown> | null>(null);
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings(activeMode, 'global_seo')
      .then((data) => {
        if (cancelled) return;
        setSettings({ ...defaultGlobalSeo, ...data });
        setAiPreview(null);
        setAiText('');
      })
      .catch((err) => {
        console.error('Global SEO 설정 불러오기 실패', err);
        if (!cancelled) setSettings(defaultGlobalSeo);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMode]);

  const updateField = (key: keyof GlobalSeoSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveGlobalSeo = async (nextSettings = settings) => {
    try {
      await saveSettings(activeMode, 'global_seo', nextSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Global SEO 저장 실패', err);
      alert('메인 SEO 설정 저장에 실패했습니다.');
    }
  };

  const generateGlobalSeo = async () => {
    setLoading(true);
    setAiPreview(null);
    setAiText('');
    try {
      const data = await apiJson<{ text: string; json: Record<string, unknown> | null }>(
        '/api/deepseek/generate-global-seo',
        {
          method: 'POST',
          body: JSON.stringify({
            mode: apiMode(activeMode),
            categories: categories.map((category) => ({ name: category.name })),
            sites: sites.map((site) => ({
              name: site.name,
              url: site.url,
              category: site.categoryName,
              description: site.description,
            })),
          }),
        }
      );
      setAiText(data.text);
      setAiPreview(data.json);
    } catch (err) {
      console.error('AI 메인 SEO 생성 실패', err);
      setAiText(err instanceof Error ? err.message : 'AI 메인 SEO 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreview = () => {
    if (!aiPreview) return;
    const next = { ...settings };
    (Object.keys(defaultGlobalSeo) as Array<keyof GlobalSeoSettings>).forEach((key) => {
      next[key] = stringifyPreviewValue(aiPreview[key], next[key]);
    });
    setSettings(next);
  };

  return (
    <div className="p-5 bg-obsidian-600 border border-obsidian-500 rounded-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">메인 SEO 설정</h3>
          <p className="text-xs text-slate-500 mt-1">현재 모드의 junchae.com 메인 title, meta, OG 태그를 관리합니다.</p>
        </div>
        {saved && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {globalSeoFields.map((field) => (
          <label key={field.key} className={field.multiline ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
            <span className="text-[11px] text-slate-500">{field.label}</span>
            {field.multiline ? (
              <textarea
                value={settings[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange resize-none"
              />
            ) : (
              <input
                value={settings[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
              />
            )}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void saveGlobalSeo()} className="px-4 py-2 bg-neon-orange text-white text-xs font-semibold rounded-lg">
          메인 SEO 저장
        </button>
        <button
          onClick={() => void generateGlobalSeo()}
          disabled={loading}
          className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
        >
          {loading ? <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> : <Wand2 size={13} />}
          AI로 메인 SEO 생성
        </button>
      </div>

      {(aiPreview || aiText) && (
        <div className="p-4 bg-black/30 border border-neon-orange/20 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neon-orange">
            <Bot size={14} /> AI 메인 SEO 미리보기
          </div>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {aiPreview ? JSON.stringify(aiPreview, null, 2) : aiText}
          </pre>
          {aiPreview && (
            <button onClick={applyPreview} className="px-3 py-1.5 bg-neon-orange text-white text-xs rounded">
              미리보기 적용
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AISEOManager() {
  const { getModeData, reloadSites } = useData();
  const [activeMode, setActiveMode] = useState<AdminMode>('standard');
  const { categories } = getModeData(activeMode);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowScoreOnly, setLowScoreOnly] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [draft, setDraft] = useState<SeoDraft>(emptyDraft);
  const [aiPreview, setAiPreview] = useState<Record<string, unknown> | null>(null);
  const [aiText, setAiText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewUploadError, setPreviewUploadError] = useState('');

  const sites = useMemo<SeoSite[]>(
    () =>
      categories.flatMap((category) =>
        category.sites.map((site) => ({
          ...site,
          categoryName: category.name,
        }))
      ),
    [categories]
  );

  const filteredSites = useMemo(
    () =>
      sites.filter((site) => {
        const lowerQuery = query.trim().toLowerCase();
        const matchesQuery = !lowerQuery || site.name.toLowerCase().includes(lowerQuery);
        const matchesCategory = categoryFilter === 'all' || site.categoryName === categoryFilter;
        const missingSeo = !site.seo_title || !site.seo_description;
        const lowScore = (site.seo_score || 0) < 60;
        return matchesQuery && matchesCategory && (!missingOnly || missingSeo) && (!lowScoreOnly || lowScore);
      }),
    [categoryFilter, lowScoreOnly, missingOnly, query, sites]
  );

  const selected = useMemo(
    () => sites.find((site) => site.id === selectedId) || filteredSites[0] || null,
    [filteredSites, selectedId, sites]
  );

  const openSite = (siteId: number) => {
    const site = sites.find((item) => item.id === siteId);
    if (!site) return;
    setSelectedId(siteId);
    setAiPreview(null);
    setAiText('');
    setPreviewUploadError('');
    setDraft(siteToDraft(site));
  };

  useEffect(() => {
    if (selectedId && filteredSites.some((site) => site.id === selectedId)) return;
    if (filteredSites.length > 0) {
      openSite(filteredSites[0].id);
      return;
    }
    setSelectedId(null);
    setDraft(emptyDraft);
    setPreviewUploadError('');
  }, [filteredSites, selectedId, sites]);

  const uploadPreview = async (file: File | undefined) => {
    if (!file) return;
    setPreviewUploading(true);
    setPreviewUploadError('');
    try {
      const imageUrl = await uploadSitePreviewImage(file);
      setDraft((current) => ({ ...current, preview_image: imageUrl }));
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : '미리보기 이미지 업로드에 실패했습니다.';
      setPreviewUploadError(message);
      console.error('미리보기 이미지 업로드 실패', err);
    } finally {
      setPreviewUploading(false);
    }
  };

  const saveSeo = async (payload: SeoDraft = draft) => {
    if (!selected) return;
    try {
      await apiJson(`/api/sites/${selected.id}/seo`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await reloadSites();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('SEO 저장 실패', err);
      alert('SEO 저장에 실패했습니다.');
    }
  };

  const generateSeo = async () => {
    if (!selected) return;
    setLoadingAi(true);
    setAiPreview(null);
    setAiText('');
    try {
      const data = await apiJson<{ text: string; json: Record<string, unknown> | null }>('/api/deepseek/generate-seo', {
        method: 'POST',
        body: JSON.stringify({
          mode: apiMode(activeMode),
          site_id: selected.id,
          options: {
            tone: '검색친화적이고 클릭을 유도하는 한국어',
            target_country: 'KR',
            target_language: 'ko',
            include_keywords: true,
          },
        }),
      });
      setAiText(data.text);
      setAiPreview(data.json);
    } catch (err) {
      console.error('AI SEO 생성 실패', err);
      setAiText(err instanceof Error ? err.message : 'AI SEO 생성에 실패했습니다.');
    } finally {
      setLoadingAi(false);
    }
  };

  const applyAi = () => {
    if (!aiPreview) return;
    const next = { ...draft };
    textKeys.forEach((key) => {
      if (key === 'seo_features') {
        next[key] = stringifyFeaturePreview(aiPreview[key], next[key]);
      } else if (key === 'seo_faq') {
        next[key] = stringifyFaqPreview(aiPreview[key], next[key]);
      } else {
        next[key] = stringifyPreviewValue(aiPreview[key], next[key]);
      }
    });
    next.seo_og_title = stringifyPreviewValue(aiPreview.seo_og_title || aiPreview.seo_title, next.seo_og_title);
    next.seo_og_description = stringifyPreviewValue(
      aiPreview.seo_og_description || aiPreview.seo_description,
      next.seo_og_description
    );
    next.seo_score = Number(aiPreview.seo_score || next.seo_score) || 0;
    setDraft(next);
  };

  return (
    <div className="space-y-5">
      <ModeSubTabs
        activeMode={activeMode}
        onModeChange={(mode) => {
          setActiveMode(mode);
          setSelectedId(null);
          setAiPreview(null);
          setAiText('');
          setCategoryFilter('all');
        }}
      />

      <GlobalSeoPanel activeMode={activeMode} categories={categories} sites={sites} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="사이트 검색"
                className="w-full pl-8 pr-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white"
            >
              <option value="all">전체</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMissingOnly(!missingOnly)}
              className={`px-3 py-1.5 rounded text-xs ${missingOnly ? 'bg-neon-orange text-white' : 'bg-obsidian-700 text-slate-400'}`}
            >
              SEO 누락
            </button>
            <button
              onClick={() => setLowScoreOnly(!lowScoreOnly)}
              className={`px-3 py-1.5 rounded text-xs ${lowScoreOnly ? 'bg-neon-orange text-white' : 'bg-obsidian-700 text-slate-400'}`}
            >
              낮은 점수
            </button>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto">
            {filteredSites.map((site) => (
              <button
                key={site.id}
                onClick={() => openSite(site.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === site.id
                    ? 'bg-neon-orange/10 border-neon-orange/30'
                    : 'bg-obsidian-600 border-obsidian-500 hover:border-neon-orange/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-200 truncate">{site.name}</span>
                  <span className="text-[10px] text-slate-500">{site.seo_score || 0}</span>
                </div>
                <p className="text-[10px] text-slate-600 truncate">{site.categoryName}</p>
                <p className="text-xs text-slate-500 truncate mt-1">{site.seo_title || 'SEO 제목 없음'}</p>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="p-5 bg-obsidian-600 border border-obsidian-500 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{selected.name}</h3>
                <p className="text-xs text-slate-500">{selected.categoryName}</p>
              </div>
              {saved && <CheckCircle size={16} className="text-emerald-400" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {siteTextFields.map((field) => {
                if (field.key === 'preview_image') {
                  return (
                    <div key={field.key} className="sm:col-span-2 space-y-2 rounded-xl border border-obsidian-500 bg-obsidian-700/40 p-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400">사이트 메인 이미지 / 스크린샷</span>
                        <p className="mt-1 text-[11px] text-slate-500">
                          선택 사항입니다. 사이트 상세 pSEO 페이지에 표시됩니다. 없으면 이미지 섹션은 숨겨집니다.
                        </p>
                      </div>
                      <input
                        value={draft.preview_image}
                        onChange={(e) => {
                          setPreviewUploadError('');
                          setDraft((current) => ({ ...current, preview_image: e.target.value }));
                        }}
                        placeholder="/uploads/previews/site.png"
                        className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
                      />
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-obsidian-500 text-slate-300 bg-obsidian-700 hover:border-neon-orange/50 cursor-pointer">
                          <Upload size={13} />
                          {previewUploading ? '업로드 중...' : '이미지 업로드'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={previewUploading}
                            onChange={(e) => {
                              void uploadPreview(e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUploadError('');
                            setDraft((current) => ({ ...current, preview_image: '' }));
                          }}
                          disabled={!draft.preview_image}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-obsidian-500 text-slate-300 bg-obsidian-700 hover:border-red-400/50 disabled:opacity-50"
                        >
                          <X size={13} />
                          이미지 제거
                        </button>
                      </div>
                      {previewUploadError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                          {previewUploadError}
                        </div>
                      )}
                      {draft.preview_image && (
                        <div className="overflow-hidden rounded-xl border border-obsidian-500 bg-white">
                          <img
                            src={draft.preview_image}
                            alt={`${selected.name} 미리보기`}
                            className="w-full max-h-56 object-cover object-top"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <label key={field.key} className={field.multiline ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                    <span className="text-[11px] text-slate-500">{field.label}</span>
                    {field.multiline ? (
                      <textarea
                        value={draft[field.key]}
                        onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))}
                        rows={field.key === 'seo_description' ? 3 : 2}
                        className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange resize-none"
                      />
                    ) : (
                      <input
                        value={draft[field.key]}
                        onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <label className="space-y-1 block">
              <span className="text-[11px] text-slate-500">SEO 점수</span>
              <input
                type="number"
                value={draft.seo_score}
                onChange={(e) => setDraft((current) => ({ ...current, seo_score: Number(e.target.value) }))}
                min={0}
                max={100}
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => void saveSeo()} className="px-4 py-2 bg-neon-orange text-white text-xs font-semibold rounded-lg">
                저장
              </button>
              <button
                onClick={() => void generateSeo()}
                disabled={loadingAi}
                className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
              >
                {loadingAi ? <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> : <Wand2 size={13} />}
                AI SEO 생성
              </button>
              <button onClick={() => void generateSeo()} disabled={loadingAi} className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg">
                AI SEO 개선
              </button>
              <button onClick={() => void generateSeo()} disabled={loadingAi} className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg">
                키워드 추천
              </button>
              <button onClick={() => void generateSeo()} disabled={loadingAi} className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg">
                메타 설명 재작성
              </button>
            </div>

            {(aiPreview || aiText) && (
              <div className="p-4 bg-black/30 border border-neon-orange/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-neon-orange">
                  <Bot size={14} /> AI 미리보기
                </div>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {aiPreview ? JSON.stringify(aiPreview, null, 2) : aiText}
                </pre>
                {aiPreview && (
                  <button onClick={applyAi} className="px-3 py-1.5 bg-neon-orange text-white text-xs rounded">
                    적용
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
