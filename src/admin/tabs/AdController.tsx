import { useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  Code2,
  CheckCircle,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Columns,
  AlignVerticalJustifyStart,
  X,
  Link2,
  Layers,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Save,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import ModeSubTabs from '../ModeSubTabs';
import { InterAd } from '../../data/categories';

const BADGE_OPTIONS = ['HOT', 'NEW', 'SALE', 'AD', 'VIP', 'SAFE', 'BEST'];
const BADGE_COLORS: Record<string, string> = {
  red: 'bg-red-500 text-white',
  green: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
  orange: 'bg-orange-500 text-white',
};

const parseImageUploadResponse = async (res: Response) => {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok || typeof body.data?.url !== 'string') {
    console.error('광고 이미지 업로드 응답 오류', {
      status: res.status,
      body,
    });
    throw new Error(body?.message || body?.error || '광고 이미지 업로드에 실패했습니다.');
  }
  return body.data.url as string;
};

const uploadAdImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/uploads/ad-image', {
    method: 'POST',
    body: formData,
  });

  return parseImageUploadResponse(res);
};

export default function AdController() {
  const {
    getModeData,
    addAdInMode,
    removeAdInMode,
    updateAdInMode,
    reloadAds,
    mobileColumns,
    setMobileColumns,
  } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const { ads } = getModeData(activeMode);
  const [saved, setSaved] = useState(false);
  const [imageModal, setImageModal] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showError = (message: string, err: unknown) => {
    console.error(message, err);
    alert(message);
  };

  const updateAd = async (id: number, updates: Parameters<typeof updateAdInMode>[2]) => {
    try {
      await updateAdInMode(activeMode, id, updates);
    } catch (err) {
      showError('광고 저장에 실패했습니다.', err);
    }
  };

  const remove = async (id: number) => {
    try {
      await removeAdInMode(activeMode, id);
    } catch (err) {
      showError('광고 삭제에 실패했습니다.', err);
    }
  };

  const addBlank = async () => {
    try {
      await addAdInMode(activeMode, {
        title: '새 광고 배너',
        subtitle: '',
        url: '',
        badge: 'NEW',
        badgeColor: 'blue',
        bgGradient: 'from-slate-900 to-slate-800',
        expiresAt: '',
        script: '',
        image: '',
        placement: 'top',
        isActive: true,
      });
    } catch (err) {
      showError('광고 추가에 실패했습니다.', err);
    }
  };

  const save = async () => {
    try {
      await reloadAds();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showError('광고 설정 저장 확인에 실패했습니다.', err);
    }
  };

  const saveImage = async (adId: number, file: File) => {
    setUploadingImage(true);
    try {
      const image = await uploadAdImage(file);
      await updateAdInMode(activeMode, adId, { image });
      setImageModal(null);
      setImageUrl('');
    } catch (err) {
      showError('광고 이미지 업로드에 실패했습니다.', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const onImageDrop = async (e: React.DragEvent, adId: number) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await saveImage(adId, file);
  };

  const applyImageUrl = async () => {
    if (imageModal === null || !imageUrl.trim()) return;
    await updateAd(imageModal, { image: imageUrl.trim() });
    setImageModal(null);
    setImageUrl('');
  };

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-obsidian-700 rounded-xl border border-obsidian-500">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-neon-orange" />
          <span className="text-xs font-semibold text-slate-300">모바일 배너 정렬 방식</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileColumns(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mobileColumns === 1
                ? 'bg-neon-orange text-white shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                : 'bg-obsidian-600 text-slate-500 hover:text-slate-300'
            }`}
          >
            <AlignVerticalJustifyStart size={12} /> 1열
          </button>
          <button
            onClick={() => setMobileColumns(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mobileColumns === 2
                ? 'bg-neon-orange text-white shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                : 'bg-obsidian-600 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Columns size={12} /> 2열
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {activeMode === 'secure' ? '안전 접속 모드 배너 광고' : '일반 모드 배너 광고'}
        </p>
        <button
          onClick={() => void addBlank()}
          className="px-3 py-1.5 bg-neon-orange text-white text-xs font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center gap-1.5 transition-colors"
        >
          <Plus size={12} /> 배너 추가
        </button>
      </div>

      <div className="space-y-4">
        {ads.map((ad) => (
          <div key={ad.id} className="p-4 bg-obsidian-600 border border-obsidian-500 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  value={ad.title}
                  onChange={(e) => void updateAd(ad.id, { title: e.target.value })}
                  placeholder="배너 광고명"
                  className="w-full text-sm font-bold text-slate-200 bg-transparent border-none outline-none focus:bg-obsidian-700 rounded px-1 py-0.5 placeholder-slate-700"
                />
                <input
                  value={ad.subtitle}
                  onChange={(e) => void updateAd(ad.id, { subtitle: e.target.value })}
                  placeholder="광고 설명"
                  className="w-full text-xs text-slate-500 bg-transparent border-none outline-none focus:bg-obsidian-700 rounded px-1 py-0.5 placeholder-slate-700"
                />
              </div>
              <button onClick={() => void remove(ad.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Link2 size={11} className="text-neon-orange" /> 클릭 이동 URL
              </label>
              <input
                value={ad.url}
                onChange={(e) => void updateAd(ad.id, { url: e.target.value })}
                placeholder="https://redirect-target.com"
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-slate-300 placeholder-slate-700 focus:outline-none focus:border-neon-orange font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">광고 배지 라벨</label>
              <div className="flex flex-wrap gap-1.5">
                {BADGE_OPTIONS.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => void updateAd(ad.id, { badge })}
                    className={`text-[10px] font-black px-2 py-1 rounded transition-all ${
                      ad.badge === badge
                        ? `${BADGE_COLORS[ad.badgeColor] || 'bg-blue-500 text-white'} ring-1 ring-neon-orange`
                        : 'bg-obsidian-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <ImageIcon size={11} className="text-neon-orange" /> 광고 이미지
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-white/90 border border-obsidian-500 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
                  {ad.image ? (
                    <img
                      src={ad.image}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon size={16} className="text-slate-500" />
                  )}
                </div>
                <button
                  onClick={() => {
                    setImageModal(ad.id);
                    setImageUrl(ad.image || '');
                  }}
                  className="px-3 py-1.5 bg-obsidian-700 border border-obsidian-500 text-xs text-slate-300 font-semibold rounded-lg hover:border-neon-orange/50 transition-colors flex items-center gap-1.5"
                >
                  <Upload size={11} /> 이미지 설정
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <Code2 size={11} className="text-neon-orange" /> 광고 스크립트 코드
              </label>
              <textarea
                rows={3}
                value={ad.script}
                onChange={(e) => void updateAd(ad.id, { script: e.target.value })}
                placeholder="<!-- 광고 스크립트 코드를 저장만 합니다. 메인 화면에서 임의 실행하지 않습니다. -->"
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-slate-300 placeholder-slate-700 focus:outline-none focus:border-neon-orange font-mono resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-slate-500 flex-shrink-0" />
              <input
                type="date"
                value={ad.expiresAt}
                onChange={(e) => void updateAd(ad.id, { expiresAt: e.target.value })}
                className="flex-1 px-3 py-1.5 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-slate-300 focus:outline-none focus:border-neon-orange"
              />
              <span className="text-xs text-slate-600">만료일</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => void save()}
        className="w-full py-2.5 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-2 transition-colors"
      >
        {saved ? <CheckCircle size={14} /> : null}
        {saved ? '저장 확인 완료' : '모든 광고 설정 저장'}
      </button>

      {imageModal !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setImageModal(null)}>
          <div className="w-full max-w-md mx-4 bg-obsidian-700 border border-obsidian-500 rounded-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">광고 이미지 설정</h3>
              <button onClick={() => setImageModal(null)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                <Upload size={11} className="inline mr-1.5 text-neon-orange" />
                파일 업로드
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && imageModal !== null) void saveImage(imageModal, file);
                  e.target.value = '';
                }}
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void onImageDrop(e, imageModal)}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-obsidian-500 hover:border-neon-orange/50 rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <Upload size={20} className="mx-auto mb-2 text-slate-500" />
                <p className="text-xs text-slate-400">{uploadingImage ? '업로드 중...' : '파일을 드래그하거나 클릭하여 업로드'}</p>
                <p className="text-[10px] text-slate-600 mt-1">/uploads/ads/ 폴더에 저장됩니다</p>
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
                이미지 URL 저장
              </p>
              <div className="flex gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="flex-1 px-3 py-2 text-xs bg-obsidian-600 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
                />
                <button
                  onClick={() => void applyImageUrl()}
                  disabled={!imageUrl.trim()}
                  className="px-3 py-2 bg-neon-orange text-white text-xs font-semibold rounded-lg hover:bg-neon-orangeDark transition-colors disabled:opacity-50"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InterAdManager mode={activeMode} />
    </div>
  );
}

function InterAdManager({ mode }: { mode: 'standard' | 'secure' }) {
  const { getModeData, addInterAdInMode, updateInterAdInMode, removeInterAdInMode } = useData();
  const { interAds, categories } = getModeData(mode);
  const [editing, setEditing] = useState<InterAd | null>(null);
  const [isNew, setIsNew] = useState(false);

  const blankAd: InterAd = {
    id: '',
    targetCategoryIndex: 0,
    title: '',
    description: '',
    imageUrl: '',
    redirectUrl: '',
    badge: 'AD',
    isActive: true,
    expiresAt: '',
  };

  const showError = (message: string, err: unknown) => {
    console.error(message, err);
    alert(message);
  };

  const openNew = () => {
    setEditing({ ...blankAd });
    setIsNew(true);
  };

  const openEdit = (ad: InterAd) => {
    setEditing({ ...ad });
    setIsNew(false);
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const save = async () => {
    if (!editing) return;
    try {
      if (isNew) {
        const { id, ...rest } = editing;
        await addInterAdInMode(mode, rest);
      } else {
        await updateInterAdInMode(mode, editing.id, editing);
      }
      close();
    } catch (err) {
      showError('중간 광고 저장에 실패했습니다.', err);
    }
  };

  const toggle = async (ad: InterAd) => {
    try {
      await updateInterAdInMode(mode, ad.id, { isActive: !ad.isActive });
    } catch (err) {
      showError('중간 광고 상태 변경에 실패했습니다.', err);
    }
  };

  const remove = async (adId: string) => {
    try {
      await removeInterAdInMode(mode, adId);
    } catch (err) {
      showError('중간 광고 삭제에 실패했습니다.', err);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-obsidian-600">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-neon-orange" />
        <h3 className="text-sm font-bold text-slate-200 tracking-tight">카테고리 사이 중간 광고 관리</h3>
        <span className="text-[10px] font-mono text-slate-600 ml-1">INFEED_NATIVE</span>
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        placement='infeed' 광고로 저장되며, 선택한 카테고리 뒤에 표시됩니다.
      </p>

      <div className="space-y-2 mb-4">
        {interAds.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-600 font-mono">
            등록된 중간 광고가 없습니다.
          </div>
        )}
        {interAds.map((ad) => (
          <div key={ad.id} className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-700/60 border border-white/[0.04]">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ad.isActive ? 'bg-neon-orange/20' : 'bg-slate-700'}`}>
              <Layers size={14} className={ad.isActive ? 'text-neon-orange' : 'text-slate-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-600 text-white">{ad.badge}</span>
                <span className="text-sm font-semibold text-slate-200 truncate">{ad.title}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {ad.targetCategoryIndex + 1}번째 카테고리 뒤 · {ad.isActive ? '노출 중' : '숨김'}
              </span>
            </div>
            <button
              onClick={() => void toggle(ad)}
              className="text-slate-500 hover:text-neon-orange transition-colors"
              title={ad.isActive ? '노출 중' : '숨김'}
            >
              {ad.isActive ? <ToggleRight size={20} className="text-neon-orange" /> : <ToggleLeft size={20} />}
            </button>
            <button onClick={() => openEdit(ad)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => void remove(ad.id)} className="text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openNew}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neon-orange/10 border border-neon-orange/20 text-neon-orange text-sm font-bold hover:bg-neon-orange/20 transition-colors"
      >
        <Plus size={14} /> 중간 광고 추가
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={close}>
          <div className="glass-dark rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {isNew ? '중간 광고 추가' : '중간 광고 수정'}
              </h4>
              <button onClick={close} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">노출 위치</label>
              <select
                value={editing.targetCategoryIndex}
                onChange={(e) => setEditing({ ...editing, targetCategoryIndex: Number(e.target.value) })}
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-orange/40 transition-all"
              >
                {categories.map((cat, i) => (
                  <option key={cat.id} value={i}>{i + 1}번째 ({cat.name}) 뒤</option>
                ))}
                <option value={categories.length}>맨 마지막</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">광고 제목</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="중간 광고 제목"
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">설명</label>
              <input
                type="text"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="중간 광고 설명"
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">URL</label>
              <input
                type="text"
                value={editing.redirectUrl}
                onChange={(e) => setEditing({ ...editing, redirectUrl: e.target.value })}
                placeholder="https://example.com"
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">이미지 URL</label>
              <input
                type="text"
                value={editing.imageUrl}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                placeholder="/uploads/ads/mid-1.png 또는 외부 URL"
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">배지</label>
              <div className="flex gap-2 flex-wrap">
                {['AD', 'HOT', 'NEW', 'VIP', '추천', '이벤트'].map((badge) => (
                  <button
                    key={badge}
                    onClick={() => setEditing({ ...editing, badge })}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                      editing.badge === badge
                        ? 'bg-neon-orange text-white'
                        : 'bg-obsidian-700 text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">만료일</label>
              <input
                type="date"
                value={editing.expiresAt || ''}
                onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })}
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-orange/40 transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">노출 여부</span>
              <button
                onClick={() => setEditing({ ...editing, isActive: !editing.isActive })}
                className="flex items-center gap-2"
              >
                {editing.isActive ? (
                  <><ToggleRight size={24} className="text-neon-orange" /><span className="text-xs text-neon-orange font-semibold">ON</span></>
                ) : (
                  <><ToggleLeft size={24} className="text-slate-600" /><span className="text-xs text-slate-600 font-semibold">OFF</span></>
                )}
              </button>
            </div>

            <button
              onClick={() => void save()}
              disabled={!editing.title.trim() || !editing.redirectUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon-orange text-white text-sm font-bold hover:bg-neon-orangeDark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(249,115,22,0.3)]"
            >
              <Save size={14} /> 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
