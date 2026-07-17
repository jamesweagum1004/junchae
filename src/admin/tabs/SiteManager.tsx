import { useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle,
  Download,
  Edit3,
  ExternalLink,
  Link2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Site, SiteStatus } from '../../data/categories';
import ModeSubTabs from '../ModeSubTabs';

const statusOptions: { value: SiteStatus; label: string }[] = [
  { value: 'normal', label: '정상' },
  { value: 'busy', label: '혼잡' },
  { value: 'slow', label: '지연' },
];

const nextStatus = (status: SiteStatus): SiteStatus =>
  status === 'normal' ? 'busy' : status === 'busy' ? 'slow' : 'normal';

type LogoUploadResult = {
  ok: true;
  data: { url: string };
};

export default function SiteManager() {
  const {
    getModeData,
    addSiteInMode,
    removeSiteInMode,
    updateSiteStatusInMode,
    updateSiteLogoInMode,
    updateSiteUrlInMode,
    updateSiteNameInMode,
    updateSiteCategoryInMode,
  } = useData();

  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const { categories } = getModeData(activeMode);
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const filteredSites = categoryFilter === 'all'
    ? allSites
    : allSites.filter((site) => site.categoryName === categoryFilter || site.categoryId === categoryFilter);

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
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const newSiteFileInputRef = useRef<HTMLInputElement>(null);

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
    const res = await fetch('/api/uploads/logo', { method: 'POST', body });
    return parseUploadResponse(res);
  };

  const downloadLogoFromUrl = async (url: string) => {
    const res = await fetch('/api/uploads/logo/from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const toggleStatus = async (id: number) => {
    const site = allSites.find((item) => item.id === id);
    if (!site) return;
    try {
      await updateSiteStatusInMode(activeMode, id, nextStatus(site.status));
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

  const activeLogoSite = allSites.find((site) => site.id === logoModal);

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={(mode) => {
        setActiveMode(mode);
        setCategoryFilter('all');
      }} />

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
            accept="image/jpeg,image/png,image/webp,image/x-icon,.ico"
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

      <div className="flex items-center gap-2">
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-obsidian-500">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-obsidian-500 bg-obsidian-600">
              {['로고', '사이트명', '카테고리', '이동 URL', '상태', '로고', ''].map((header) => (
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

              return (
                <tr key={site.id} className="border-b border-obsidian-600 hover:bg-obsidian-600/50 transition-colors">
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
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => void toggleStatus(site.id)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                        site.status === 'normal'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : site.status === 'busy'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {statusOptions.find((option) => option.value === site.status)?.label}
                    </button>
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
                    <button onClick={() => void remove(site.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
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
                accept="image/jpeg,image/png,image/webp,image/x-icon,.ico"
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
