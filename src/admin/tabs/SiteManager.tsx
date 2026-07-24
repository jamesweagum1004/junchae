import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle,
  Download,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  Link2,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Site, SiteStatus } from '../../data/categories';
import ModeSubTabs from '../ModeSubTabs';
import { adminAuthHeaders } from '../../lib/adminApi';
import { uploadSitePreviewImage } from '../../lib/adminUploads';
import { compareSitesByStatusAndOrder, getSiteStatusMeta, normalizeSiteStatus } from '../../lib/siteStatus';
import { sitePath, slugifySiteName } from '../../lib/siteSlug';

const statusOptions: { value: SiteStatus; label: string }[] = [
  { value: 'normal', label: '정상' },
  { value: 'busy', label: '혼잡' },
  { value: 'down', label: '접속불가' },
  { value: 'checking', label: '확인중' },
];

type LogoUploadResult = {
  ok: true;
  data: { url: string };
};

type SiteDetailDraft = {
  seo_intro: string;
  seo_features: string;
  seo_faq: string;
  preview_image: string;
};

const detailDraftFromSite = (site: Site): SiteDetailDraft => ({
  seo_intro: site.seo_intro || '',
  seo_features: site.seo_features || '',
  seo_faq: typeof site.seo_faq === 'string' ? site.seo_faq : JSON.stringify(site.seo_faq || [], null, 2),
  preview_image: site.preview_image || '',
});

type SiteManagerProps = {
  focusSiteId?: number | null;
};

export default function SiteManager({ focusSiteId }: SiteManagerProps) {
  const {
    getModeData,
    addSiteInMode,
    removeSiteInMode,
    updateSiteStatusInMode,
    updateSiteLogoInMode,
    updateSiteUrlInMode,
    updateSiteNameInMode,
    updateSiteCategoryInMode,
    updateSiteInMode,
    reorderSitesInMode,
  } = useData();

  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const { categories } = getModeData(activeMode);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'visible' | 'hidden' | 'featured'>('all');
  const allSites: (Site & { categoryId: string; categoryName: string })[] = useMemo(
    () => categories.flatMap((category) =>
      (Array.isArray(category.sites) ? category.sites : []).map((site) => ({
        ...site,
        categoryId: category.id,
        categoryName: category.name,
      }))
    ),
    [categories]
  );
  const filteredSites = useMemo(() =>
    allSites
      .filter((site) => {
        const categoryMatches =
          categoryFilter === 'all' ||
          site.categoryName === categoryFilter ||
          site.categoryId === categoryFilter;
        const stateMatches =
          stateFilter === 'all' ||
          (stateFilter === 'visible' && !site.isHidden && !site.is_hidden) ||
          (stateFilter === 'hidden' && (site.isHidden || site.is_hidden)) ||
          (stateFilter === 'featured' && (site.isFeatured || site.is_featured));
        return categoryMatches && stateMatches;
      })
      .sort(compareSitesByStatusAndOrder),
    [allSites, categoryFilter, stateFilter]
  );

  const [form, setForm] = useState({
    name: '',
    url: '',
    categoryId: '',
    description: '',
    logo: '/uploads/logos/default.png',
  });
  const [logoModal, setLogoModal] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDownloaded, setLogoDownloaded] = useState(false);
  const [editingUrlId, setEditingUrlId] = useState<number | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState('');
  const [editingNameId, setEditingNameId] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [slugDrafts, setSlugDrafts] = useState<Record<number, string>>({});
  const [slugNotices, setSlugNotices] = useState<Record<number, { type: 'info' | 'error'; message: string }>>({});
  const [expandedDetailId, setExpandedDetailId] = useState<number | null>(null);
  const [detailDrafts, setDetailDrafts] = useState<Record<number, SiteDetailDraft>>({});
  const [detailNotices, setDetailNotices] = useState<Record<number, { type: 'info' | 'error'; message: string }>>({});
  const [highlightedSiteId, setHighlightedSiteId] = useState<number | null>(null);
  const [statusNotice, setStatusNotice] = useState('');
  const [previewUploadingId, setPreviewUploadingId] = useState<number | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const newSiteFileInputRef = useRef<HTMLInputElement>(null);
  const handledFocusSiteIdRef = useRef(0);
  const normalizedFocusSiteId = Number(focusSiteId || 0);

  useEffect(() => {
    if (!normalizedFocusSiteId) return;
    if (handledFocusSiteIdRef.current === normalizedFocusSiteId) return;

    const modeWithSite = (['standard', 'secure'] as const).find((mode) =>
      getModeData(mode).categories.some((category) =>
        category.sites.some((site) => site.id === normalizedFocusSiteId)
      )
    );

    if (!modeWithSite) return;
    handledFocusSiteIdRef.current = normalizedFocusSiteId;
    if (modeWithSite && modeWithSite !== activeMode) {
      setActiveMode(modeWithSite);
    }
    setCategoryFilter('all');
    setStateFilter('all');
    setExpandedDetailId(normalizedFocusSiteId);
  }, [activeMode, getModeData, normalizedFocusSiteId]);

  useEffect(() => {
    if (!normalizedFocusSiteId || !filteredSites.some((site) => site.id === normalizedFocusSiteId)) return;

    const scrollTimer = window.setTimeout(() => {
      const row = document.getElementById(`site-row-${normalizedFocusSiteId}`);
      if (!row) return;

      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSiteId(normalizedFocusSiteId);
    }, 120);
    const highlightTimer = window.setTimeout(() => {
      setHighlightedSiteId((current) => current === normalizedFocusSiteId ? null : current);
    }, 3000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [filteredSites, normalizedFocusSiteId]);

  const showError = (message: string, err: unknown) => {
    console.error(message, err);
    alert(message);
  };

  const parseUploadResponse = async (res: Response) => {
    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.ok || typeof body.data?.url !== 'string') {
      console.error('로고 업로드 응답 오류', { status: res.status, body });
      throw new Error(body?.message || body?.error || '로고 업로드에 실패했습니다.');
    }

    return (body as LogoUploadResult).data.url;
  };

  const uploadLogoFile = async (file: File) => {
    const body = new FormData();
    body.append('logo', file);
    const res = await fetch('/api/uploads/logo', {
      method: 'POST',
      headers: adminAuthHeaders(),
      body,
    });
    return parseUploadResponse(res);
  };

  const downloadLogoFromUrl = async (url: string) => {
    const res = await fetch('/api/uploads/logo/from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ url }),
    });
    return parseUploadResponse(res);
  };

  const closeLogoModalSoon = () => {
    setLogoDownloaded(true);
    setTimeout(() => {
      setLogoDownloaded(false);
      setLogoModal(null);
      setLogoUrl('');
    }, 1200);
  };

  const saveUploadedLogo = async (siteId: number, file: File) => {
    setLogoUploading(true);
    try {
      const logoPath = await uploadLogoFile(file);
      await updateSiteLogoInMode(activeMode, siteId, logoPath);
      closeLogoModalSoon();
    } catch (err) {
      showError('로고 업로드에 실패했습니다.', err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleNewSiteLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const logoPath = await uploadLogoFile(file);
      setForm((current) => ({ ...current, logo: logoPath }));
    } catch (err) {
      showError('로고 업로드에 실패했습니다.', err);
    } finally {
      setLogoUploading(false);
      if (newSiteFileInputRef.current) newSiteFileInputRef.current.value = '';
    }
  };

  const updateStatus = async (id: number, status: SiteStatus) => {
    const nextStatus = normalizeSiteStatus(status);
    try {
      await updateSiteStatusInMode(activeMode, id, nextStatus);
      if (nextStatus === 'down') {
        setStatusNotice('해당 카테고리 맨 아래로 이동됨');
        window.setTimeout(() => {
          setStatusNotice((current) => current === '해당 카테고리 맨 아래로 이동됨' ? '' : current);
        }, 2600);
      }
    } catch (err) {
      showError('상태 변경에 실패했습니다.', err);
    }
  };

  const remove = async (id: number) => {
    try {
      await removeSiteInMode(activeMode, id);
    } catch (err) {
      showError('사이트 삭제에 실패했습니다.', err);
    }
  };

  const add = async () => {
    if (!form.name.trim() || !form.url.trim() || !form.categoryId) return;
    try {
      await addSiteInMode(activeMode, form.categoryId, {
        name: form.name.trim(),
        url: form.url.trim(),
        logo: form.logo,
        status: 'normal',
        description: form.description,
      });
      setForm({ name: '', url: '', categoryId: '', description: '', logo: '/uploads/logos/default.png' });
    } catch (err) {
      showError('사이트 추가에 실패했습니다.', err);
    }
  };

  const downloadLogo = async () => {
    if (!logoUrl.trim() || logoModal === null) return;
    setLogoUploading(true);
    try {
      const logoPath = await downloadLogoFromUrl(logoUrl.trim());
      await updateSiteLogoInMode(activeMode, logoModal, logoPath);
      closeLogoModalSoon();
    } catch (err) {
      showError('로고 업로드에 실패했습니다.', err);
    } finally {
      setLogoUploading(false);
    }
  };

  const onFileDrop = async (e: React.DragEvent, siteId: number) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await saveUploadedLogo(siteId, file);
  };

  const saveUrl = async () => {
    if (editingUrlId !== null) {
      try {
        await updateSiteUrlInMode(activeMode, editingUrlId, editingUrlValue);
      } catch (err) {
        showError('URL 수정에 실패했습니다.', err);
        return;
      }
    }
    setEditingUrlId(null);
    setEditingUrlValue('');
  };

  const saveName = async () => {
    if (editingNameId !== null) {
      try {
        await updateSiteNameInMode(activeMode, editingNameId, editingNameValue);
      } catch (err) {
        showError('사이트명 수정에 실패했습니다.', err);
        return;
      }
    }
    setEditingNameId(null);
    setEditingNameValue('');
  };

  const updateCategory = async (siteId: number, categoryName: string) => {
    try {
      await updateSiteCategoryInMode(activeMode, siteId, categoryName);
    } catch (err) {
      showError('사이트 카테고리 수정에 실패했습니다.', err);
    }
  };

  const getSlugDraft = (site: Site) => slugDrafts[site.id] ?? site.seo_slug ?? '';

  const updateSlugDraft = (site: Site, value: string) => {
    setSlugDrafts((current) => ({ ...current, [site.id]: value }));
    setSlugNotices((current) => {
      const next = { ...current };
      delete next[site.id];
      return next;
    });
  };

  const fillAutoSlug = (site: Site) => {
    updateSlugDraft(site, slugifySiteName(site.name, site.id));
  };

  const saveSlug = async (site: Site) => {
    try {
      await updateSiteInMode(activeMode, site.id, { seo_slug: getSlugDraft(site) });
      setSlugDrafts((current) => {
        const next = { ...current };
        delete next[site.id];
        return next;
      });
      setSlugNotices((current) => ({
        ...current,
        [site.id]: { type: 'info', message: '저장됨' },
      }));
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'URL 슬러그 저장에 실패했습니다.';
      setSlugNotices((current) => ({
        ...current,
        [site.id]: {
          type: 'error',
          message: message.includes('slug') || message.includes('Slug')
            ? '이미 사용 중인 URL 슬러그입니다.'
            : message,
        },
      }));
      console.error('사이트 URL 슬러그 저장 실패', err);
    }
  };

  const getDetailDraft = (site: Site) => detailDrafts[site.id] || detailDraftFromSite(site);

  const updateDetailDraft = (site: Site, field: keyof SiteDetailDraft, value: string) => {
    setDetailDrafts((current) => ({
      ...current,
      [site.id]: {
        ...(current[site.id] || detailDraftFromSite(site)),
        [field]: value,
      },
    }));
    setDetailNotices((current) => {
      const next = { ...current };
      delete next[site.id];
      return next;
    });
  };

  const saveDetails = async (site: Site) => {
    const draft = getDetailDraft(site);
    try {
      await updateSiteInMode(activeMode, site.id, draft);
      setDetailNotices((current) => ({
        ...current,
        [site.id]: { type: 'info', message: 'pSEO 상세 정보를 저장했습니다.' },
      }));
    } catch (err) {
      setDetailNotices((current) => ({
        ...current,
        [site.id]: { type: 'error', message: 'pSEO 상세 정보 저장에 실패했습니다.' },
      }));
      console.error('pSEO 상세 정보 저장 실패', err);
    }
  };

  const savePreviewImage = async (site: Site, file: File | undefined) => {
    if (!file) return;
    setPreviewUploadingId(site.id);
    try {
      const imagePath = await uploadSitePreviewImage(file);
      updateDetailDraft(site, 'preview_image', imagePath);
      await updateSiteInMode(activeMode, site.id, { preview_image: imagePath });
      setDetailNotices((current) => ({
        ...current,
        [site.id]: { type: 'info', message: '미리보기 이미지를 업로드했습니다.' },
      }));
    } catch (err) {
      setDetailNotices((current) => ({
        ...current,
        [site.id]: { type: 'error', message: '미리보기 이미지 업로드에 실패했습니다.' },
      }));
      console.error('미리보기 이미지 업로드 실패', err);
    } finally {
      setPreviewUploadingId(null);
    }
  };

  const toggleVisibility = async (site: Site) => {
    try {
      await updateSiteInMode(activeMode, site.id, {
        is_hidden: !(site.isHidden || site.is_hidden),
      });
    } catch (err) {
      showError('사이트 노출 상태 변경에 실패했습니다.', err);
    }
  };

  const toggleFeatured = async (site: Site) => {
    try {
      const nextFeatured = !(site.isFeatured || site.is_featured);
      const nextOrder = nextFeatured
        ? Math.max(
            0,
            ...allSites
              .filter((item) => item.isFeatured || item.is_featured)
              .map((item) => item.featuredOrder ?? item.featured_order ?? 0)
          ) + 1
        : 0;
      await updateSiteInMode(activeMode, site.id, {
        is_featured: nextFeatured,
        featured_order: nextOrder,
      });
    } catch (err) {
      showError('TOP10 상태 변경에 실패했습니다.', err);
    }
  };

  const updateFeaturedOrder = async (site: Site, value: string) => {
    const featuredOrder = Number(value);
    if (!Number.isFinite(featuredOrder)) return;
    try {
      await updateSiteInMode(activeMode, site.id, {
        is_featured: true,
        featured_order: Math.max(0, Math.trunc(featuredOrder)),
      });
    } catch (err) {
      showError('TOP10 순서 변경에 실패했습니다.', err);
    }
  };

  const moveFeatured = async (site: Site, direction: -1 | 1) => {
    const featured = allSites
      .filter((item) => item.isFeatured || item.is_featured)
      .sort((a, b) =>
        (a.featuredOrder ?? a.featured_order ?? 0) - (b.featuredOrder ?? b.featured_order ?? 0) ||
        a.name.localeCompare(b.name)
      );
    const index = featured.findIndex((item) => item.id === site.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= featured.length) return;

    try {
      const currentOrder = featured[index].featuredOrder ?? featured[index].featured_order ?? index + 1;
      const targetOrder = featured[target].featuredOrder ?? featured[target].featured_order ?? target + 1;
      await Promise.all([
        updateSiteInMode(activeMode, featured[index].id, { featured_order: targetOrder }),
        updateSiteInMode(activeMode, featured[target].id, { featured_order: currentOrder }),
      ]);
    } catch (err) {
      showError('TOP10 순서 변경에 실패했습니다.', err);
    }
  };

  const moveSiteInCategory = async (site: Site & { categoryName: string }, direction: -1 | 1) => {
    const categorySites = allSites
      .filter((item) => item.categoryName === site.categoryName)
      .sort(compareSitesByStatusAndOrder);
    const index = categorySites.findIndex((item) => item.id === site.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categorySites.length) return;

    const nextIds = categorySites.map((item) => item.id);
    [nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]];

    try {
      await reorderSitesInMode(activeMode, site.categoryName, nextIds);
    } catch (err) {
      showError('사이트 순서 변경에 실패했습니다.', err);
    }
  };

  const activeLogoSite = allSites.find((site) => site.id === logoModal);

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={(mode) => {
        setActiveMode(mode);
        setCategoryFilter('all');
      }} />

      {statusNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">
          {statusNotice}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-obsidian-600 rounded-xl border border-obsidian-500">
        <input
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          placeholder="사이트명"
          className="px-3 py-2 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
        />
        <input
          value={form.url}
          onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
          placeholder="이동 URL"
          className="px-3 py-2 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
        />
        <select
          value={form.categoryId}
          onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))}
          className="px-3 py-2 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
        >
          <option value="">카테고리 선택</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input
          value={form.description}
          onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
          placeholder="설명"
          className="px-3 py-2 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
        />
        <div className="col-span-2 sm:col-span-4 flex gap-2">
          <input
            value={form.logo}
            onChange={(e) => setForm((current) => ({ ...current, logo: e.target.value }))}
            placeholder="/uploads/logos/logo.png"
            className="flex-1 px-3 py-2 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
          />
          <input
            ref={newSiteFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleNewSiteLogoFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => newSiteFileInputRef.current?.click()}
            disabled={logoUploading}
            className="px-3 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-300 text-sm font-semibold rounded-lg hover:border-neon-orange/50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Upload size={14} /> Logo
          </button>
        </div>
        <button
          onClick={() => void add()}
          className="col-span-2 sm:col-span-4 py-2 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> 사이트 추가
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">카테고리 필터</span>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
        >
          <option value="all">전체 보기</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>{category.name}</option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}
          className="px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
        >
          <option value="all">전체</option>
          <option value="visible">노출 중</option>
          <option value="hidden">숨김</option>
          <option value="featured">TOP10</option>
        </select>
        <span className="text-xs text-slate-500">{filteredSites.length}/{allSites.length}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-obsidian-500">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-obsidian-500 bg-obsidian-600">
              {['로고', '사이트명', '카테고리', '이동 URL', 'pSEO URL', '상태', '노출', 'TOP10', '순서', '로고', '본문', ''].map((header) => (
                <th key={header} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSites.map((site) => {
              const categoryOptions = categories.some((category) => category.name === site.categoryName)
                ? categories
                : [...categories, { id: site.categoryName, name: site.categoryName, icon: 'FolderOpen', color: 'blue', sites: [] }];
              const isHidden = site.isHidden || site.is_hidden;
              const isFeatured = site.isFeatured || site.is_featured;
              const featuredOrder = site.featuredOrder ?? site.featured_order ?? 0;
              const status = getSiteStatusMeta(site.status, true);
              const slugDraft = getSlugDraft(site);
              const slugNotice = slugNotices[site.id];
              const previewPath = sitePath({ ...site, seo_slug: slugDraft });
              const previewUrl = `https://junchae.com${previewPath}`;
              const detailDraft = getDetailDraft(site);
              const detailNotice = detailNotices[site.id];
              const detailExpanded = expandedDetailId === site.id;
              const highlighted = highlightedSiteId === site.id;

              return (
                <Fragment key={site.id}>
                <tr
                  id={`site-row-${site.id}`}
                  className={`border-b border-obsidian-600 hover:bg-obsidian-600/50 transition-colors ${
                    highlighted ? 'bg-amber-500/15 ring-2 ring-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.24)]' : ''
                  } ${isHidden ? 'opacity-55' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="w-8 h-8 rounded bg-white/90 border border-obsidian-500 flex items-center justify-center overflow-hidden p-1">
                      {site.logo ? (
                        <img
                          src={site.logo}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            if (img.parentElement) {
                              img.parentElement.innerHTML = `<span class="text-[10px] font-bold text-neon-orange">${site.name[0] || '?'}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-neon-orange">{site.name[0] || '?'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {editingNameId === site.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveName();
                          }}
                          autoFocus
                          className="w-28 px-2 py-1 text-xs bg-obsidian-700 border border-neon-orange/50 rounded text-white focus:outline-none"
                        />
                        <button onClick={() => void saveName()} className="text-emerald-400 hover:text-emerald-300">
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-medium whitespace-nowrap">{site.name}</span>
                        {isHidden && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-600">
                            숨김
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingNameId(site.id);
                            setEditingNameValue(site.name);
                          }}
                          className="text-slate-600 hover:text-neon-orange transition-colors opacity-0 hover:opacity-100"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={site.categoryName}
                      onChange={(e) => void updateCategory(site.id, e.target.value)}
                      className="min-w-28 px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-500 rounded text-slate-200 focus:outline-none focus:border-neon-orange"
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    {editingUrlId === site.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editingUrlValue}
                          onChange={(e) => setEditingUrlValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveUrl();
                          }}
                          autoFocus
                          className="w-full min-w-[140px] px-2 py-1 text-xs bg-obsidian-700 border border-neon-orange/50 rounded text-white focus:outline-none font-mono"
                        />
                        <button onClick={() => void saveUrl()} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/url">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neon-orange/70 hover:text-neon-orange text-xs truncate flex items-center gap-1"
                        >
                          <ExternalLink size={10} className="flex-shrink-0" />
                          <span className="truncate">{site.url}</span>
                        </a>
                        <button
                          onClick={() => {
                            setEditingUrlId(site.id);
                            setEditingUrlValue(site.url);
                          }}
                          className="text-slate-600 hover:text-neon-orange transition-colors flex-shrink-0 opacity-0 group-hover/url:opacity-100"
                        >
                          <Edit3 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 min-w-[240px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          value={slugDraft}
                          onChange={(e) => updateSlugDraft(site, e.target.value)}
                          placeholder="site-slug"
                          className="w-32 px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-500 rounded text-white focus:outline-none focus:border-neon-orange font-mono"
                        />
                        <button
                          onClick={() => fillAutoSlug(site)}
                          className="px-2 py-1 text-[11px] font-bold rounded bg-obsidian-700 border border-obsidian-500 text-slate-300 hover:border-neon-orange/50"
                        >
                          자동
                        </button>
                        <button
                          onClick={() => void saveSlug(site)}
                          className="px-2 py-1 text-[11px] font-bold rounded bg-neon-orange text-white hover:bg-neon-orangeDark"
                        >
                          저장
                        </button>
                        <a
                          href={previewPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-neon-orange"
                          title="내부 페이지 열기"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{previewUrl}</div>
                      {slugNotice && (
                        <div className={`text-[10px] ${slugNotice.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                          {slugNotice.message}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${status.className}`}>
                        {status.label}
                      </span>
                      <select
                        value={normalizeSiteStatus(site.status)}
                        onChange={(e) => void updateStatus(site.id, e.target.value as SiteStatus)}
                        className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-500 rounded text-slate-200 focus:outline-none focus:border-neon-orange"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => void toggleVisibility(site)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                        isHidden
                          ? 'bg-slate-700/70 text-slate-300 border-slate-600 hover:border-slate-400'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-400'
                      }`}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      {isHidden ? '숨김' : '노출 중'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => void toggleFeatured(site)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                          isFeatured
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:border-amber-300'
                            : 'bg-obsidian-700 text-slate-400 border-obsidian-500 hover:border-neon-orange/50'
                        }`}
                      >
                        <Star size={12} fill={isFeatured ? 'currentColor' : 'none'} />
                        {isFeatured ? 'TOP10' : '일반'}
                      </button>
                      {isFeatured && (
                        <>
                          <input
                            type="number"
                            min={0}
                            defaultValue={featuredOrder}
                            onBlur={(e) => void updateFeaturedOrder(site, e.target.value)}
                            className="w-14 px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-500 rounded text-white focus:outline-none focus:border-neon-orange"
                          />
                          <button
                            onClick={() => void moveFeatured(site, -1)}
                            className="p-1 text-slate-500 hover:text-amber-300 transition-colors"
                            title="TOP10 위로"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => void moveFeatured(site, 1)}
                            className="p-1 text-slate-500 hover:text-amber-300 transition-colors"
                            title="TOP10 아래로"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void moveSiteInCategory(site, -1)}
                        className="p-1 text-slate-500 hover:text-neon-orange transition-colors"
                        title="카테고리 내 위로"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => void moveSiteInCategory(site, 1)}
                        className="p-1 text-slate-500 hover:text-neon-orange transition-colors"
                        title="카테고리 내 아래로"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => {
                        setLogoModal(site.id);
                        setLogoUrl('');
                        setLogoDownloaded(false);
                      }}
                      className="text-xs text-neon-orange/70 hover:text-neon-orange font-medium transition-colors whitespace-nowrap"
                    >
                      변경
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setExpandedDetailId(detailExpanded ? null : site.id)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold whitespace-nowrap ${
                        detailExpanded
                          ? 'bg-neon-orange/10 text-neon-orange border-neon-orange/30'
                          : 'bg-obsidian-700 text-slate-400 border-obsidian-500 hover:border-neon-orange/50'
                      }`}
                    >
                      pSEO
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => void remove(site.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                {detailExpanded && (
                  <tr className="border-b border-obsidian-600 bg-obsidian-800/60">
                    <td colSpan={12} className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                        <div className="space-y-3">
                          <label className="block space-y-1">
                            <span className="text-[11px] font-bold text-slate-400">상세 소개 본문</span>
                            <textarea
                              value={detailDraft.seo_intro}
                              onChange={(e) => updateDetailDraft(site, 'seo_intro', e.target.value)}
                              rows={4}
                              placeholder="이 사이트가 어떤 서비스인지, 어떤 정보를 제공하는지 설명"
                              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[11px] font-bold text-slate-400">주요 기능/특징</span>
                            <textarea
                              value={detailDraft.seo_features}
                              onChange={(e) => updateDetailDraft(site, 'seo_features', e.target.value)}
                              rows={4}
                              placeholder={'빠른 검색 결과 제공\n뉴스/이미지/동영상/지도 검색 지원\n한국 사용자에게 익숙한 포털 서비스'}
                              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[11px] font-bold text-slate-400">FAQ</span>
                            <textarea
                              value={detailDraft.seo_faq}
                              onChange={(e) => updateDetailDraft(site, 'seo_faq', e.target.value)}
                              rows={5}
                              placeholder={'[\n  {"question":"...", "answer":"..."},\n  {"question":"...", "answer":"..."},\n  {"question":"...", "answer":"..."}\n]'}
                              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y font-mono"
                            />
                          </label>
                        </div>

                        <div className="space-y-3">
                          <label className="block space-y-1">
                            <span className="text-[11px] font-bold text-slate-400">사이트 메인 이미지 / 스크린샷</span>
                            <input
                              value={detailDraft.preview_image}
                              onChange={(e) => updateDetailDraft(site, 'preview_image', e.target.value)}
                              placeholder="/uploads/previews/site.png"
                              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
                            />
                          </label>
                          <p className="text-[11px] text-slate-500">
                            선택 사항입니다. 사이트 상세 pSEO 페이지에 표시됩니다. 없으면 이미지 섹션은 숨겨집니다.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-obsidian-500 text-slate-300 bg-obsidian-700 hover:border-neon-orange/50 cursor-pointer">
                              <Upload size={13} />
                              {previewUploadingId === site.id ? '업로드 중...' : '이미지 업로드'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                  void savePreviewImage(site, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => updateDetailDraft(site, 'preview_image', '')}
                              disabled={!detailDraft.preview_image}
                              className="px-3 py-2 text-xs font-bold rounded-lg border border-obsidian-500 text-slate-300 bg-obsidian-700 hover:border-red-400/50 disabled:opacity-50"
                            >
                              이미지 제거
                            </button>
                          </div>
                          {detailDraft.preview_image && (
                            <div className="overflow-hidden rounded-xl border border-obsidian-500 bg-white">
                              <img src={detailDraft.preview_image} alt={`${site.name} 미리보기`} className="w-full h-36 object-cover object-top" />
                            </div>
                          )}
                          {detailNotice && (
                            <div className={`rounded-lg border px-3 py-2 text-xs ${
                              detailNotice.type === 'error'
                                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {detailNotice.message}
                            </div>
                          )}
                          <button
                            onClick={() => void saveDetails(site)}
                            className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-neon-orange text-white hover:bg-neon-orangeDark"
                          >
                            pSEO 상세 저장
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {logoModal !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLogoModal(null)}>
          <div className="w-full max-w-md mx-4 bg-obsidian-700 border border-obsidian-500 rounded-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white">로고 이미지 변경</h3>
                {activeLogoSite?.logo && (
                  <div className="w-9 h-9 rounded bg-white/90 border border-obsidian-500 flex items-center justify-center overflow-hidden p-1">
                    <img src={activeLogoSite.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              <button onClick={() => setLogoModal(null)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                <Upload size={11} className="inline mr-1.5 text-neon-orange" />
                옵션 1 — 파일 업로드
              </p>
              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (logoModal !== null && file) void saveUploadedLogo(logoModal, file);
                  e.target.value = '';
                }}
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void onFileDrop(e, logoModal)}
                onClick={() => modalFileInputRef.current?.click()}
                className="border-2 border-dashed border-obsidian-500 hover:border-neon-orange/50 rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <Upload size={20} className="mx-auto mb-2 text-slate-500" />
                <p className="text-xs text-slate-400">{logoUploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 업로드'}</p>
                <p className="text-[10px] text-slate-600 mt-1">/uploads/logos/ 폴더에 저장됩니다</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-obsidian-500" />
              <span className="text-[10px] text-slate-600 font-mono">OR</span>
              <div className="flex-1 h-px bg-obsidian-500" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                <Link2 size={11} className="inline mr-1.5 text-neon-orange" />
                옵션 2 — 외부 URL에서 다운로드
              </p>
              <div className="flex gap-2">
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://target.com/favicon.ico"
                  className="flex-1 px-3 py-2 text-xs bg-obsidian-600 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
                />
                <button
                  onClick={() => void downloadLogo()}
                  disabled={logoUploading || !logoUrl.trim()}
                  className="px-3 py-2 bg-neon-orange text-white text-xs font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {logoUploading ? (
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                  ) : logoDownloaded ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Download size={12} />
                  )}
                  {logoUploading ? '업로드 중...' : logoDownloaded ? '완료' : '서버로 다운로드'}
                </button>
              </div>
            </div>

            {logoDownloaded && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <CheckCircle size={12} />
                로고가 업로드되었습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
