import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, FolderOpen, Edit3, Check, X, Wand2, Save } from 'lucide-react';
import { useData } from '../../context/DataContext';
import ModeSubTabs from '../ModeSubTabs';
import { apiJson, apiMode } from '../../lib/adminApi';
import type { Category } from '../../data/categories';

type CategorySeoDraft = {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_intro: string;
  seo_faq: string;
};

type GeneratedCategorySeo = {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  seo_intro?: string;
  seo_faq: { question: string; answer: string }[] | string;
  fallback?: boolean;
  message?: string;
};

const faqText = (value: Category['seo_faq']) => {
  if (!value) return '';
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  return value;
};

const draftFromCategory = (category: Category): CategorySeoDraft => ({
  seo_title: category.seo_title || '',
  seo_description: category.seo_description || '',
  seo_keywords: category.seo_keywords || '',
  seo_intro: category.seo_intro || '',
  seo_faq: faqText(category.seo_faq),
});

export default function CategoryManager() {
  const {
    getModeData,
    reloadCategories,
    addCategoryInMode,
    removeCategoryInMode,
    updateCategoryNameInMode,
    reorderCategoriesInMode,
  } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [seoDrafts, setSeoDrafts] = useState<Record<string, CategorySeoDraft>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationNotices, setGenerationNotices] = useState<Record<string, { type: 'info' | 'error'; message: string }>>({});

  const { categories } = getModeData(activeMode);
  const orderedCategories = useMemo(() => {
    if (!localOrder) return categories;
    const byId = new Map(categories.map((category) => [category.id, category]));
    return localOrder.map((id) => byId.get(id)).filter(Boolean).concat(
      categories.filter((category) => !localOrder.includes(category.id))
    ) as typeof categories;
  }, [categories, localOrder]);

  const showError = (message: string, err: unknown) => {
    console.error(message, err);
    alert(message);
  };

  const getDraft = (category: Category) => seoDrafts[category.id] || draftFromCategory(category);

  const updateDraft = (category: Category, field: keyof CategorySeoDraft, value: string) => {
    setSeoDrafts((current) => ({
      ...current,
      [category.id]: {
        ...(current[category.id] || draftFromCategory(category)),
        [field]: value,
      },
    }));
  };

  const add = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await addCategoryInMode(activeMode, {
        id: '',
        name: newName.trim(),
        icon: 'FolderOpen',
        color: activeMode === 'secure' ? 'orange' : 'blue',
        sortOrder: categories.length,
      });
      setNewName('');
      setLocalOrder(null);
    } catch (err) {
      showError('카테고리 추가에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await removeCategoryInMode(activeMode, id);
      setLocalOrder(null);
    } catch (err) {
      showError('카테고리 삭제에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCategoryNameInMode(activeMode, editingId, editName.trim());
      setEditingId(null);
      setEditName('');
    } catch (err) {
      showError('카테고리 수정에 실패했습니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const saveSeo = async (category: Category) => {
    if (saving) return;
    setSaving(true);
    try {
      const draft = getDraft(category);
      await apiJson(`/api/categories/${category.id}/seo`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await reloadCategories();
      setSeoDrafts((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
    } catch (err) {
      showError('카테고리 SEO 저장에 실패했습니다. FAQ는 JSON 배열 형식을 권장합니다.', err);
    } finally {
      setSaving(false);
    }
  };

  const generateSeo = async (category: Category) => {
    if (generatingId) return;
    setGeneratingId(category.id);
    setGenerationNotices((current) => {
      const next = { ...current };
      delete next[category.id];
      return next;
    });
    try {
      const generated = await apiJson<GeneratedCategorySeo>('/api/deepseek/generate-category-seo', {
        method: 'POST',
        body: JSON.stringify({
          mode: apiMode(activeMode),
          categoryId: category.id,
          categoryName: category.name,
          siteNames: category.sites.map((site) => site.name),
        }),
      });
      setSeoDrafts((current) => ({
        ...current,
        [category.id]: {
          seo_title: generated.seo_title || '',
          seo_description: generated.seo_description || '',
          seo_keywords: generated.seo_keywords || '',
          seo_intro: generated.seo_intro || '',
          seo_faq: Array.isArray(generated.seo_faq)
            ? JSON.stringify(generated.seo_faq, null, 2)
            : generated.seo_faq || '',
        },
      }));
      if (generated.fallback) {
        setGenerationNotices((current) => ({
          ...current,
          [category.id]: {
            type: 'info',
            message: generated.message || 'DeepSeek 응답이 불안정하여 기본 SEO 템플릿을 적용했습니다. 저장 전 내용을 확인해 주세요.',
          },
        }));
      }
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'DeepSeek 카테고리 SEO 생성에 실패했습니다.';
      setGenerationNotices((current) => ({
        ...current,
        [category.id]: {
          type: 'error',
          message: message.includes('API Key') ? message : `DeepSeek 생성 실패: ${message}`,
        },
      }));
      console.error('DeepSeek 카테고리 SEO 생성 실패', err);
    } finally {
      setGeneratingId(null);
    }
  };

  const moveCategory = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    const ids = (localOrder || categories.map((category) => category.id)).slice();
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setLocalOrder(ids);

    try {
      await reorderCategoriesInMode(activeMode, ids);
    } catch (err) {
      showError('카테고리 순서 저장에 실패했습니다.', err);
    }
  };

  return (
    <div className="space-y-6">
      <ModeSubTabs
        activeMode={activeMode}
        onModeChange={(mode) => {
          setActiveMode(mode);
          setLocalOrder(null);
          setSeoDrafts({});
          setGenerationNotices({});
        }}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
            placeholder={`새 카테고리 이름 (${activeMode === 'secure' ? '보안 모드' : '일반 모드'})`}
            className="flex-1 px-3 py-2 text-sm bg-obsidian-600 border border-obsidian-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-neon-orange"
          />
          <button
            onClick={() => void add()}
            disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> 추가
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {orderedCategories.map((cat) => {
          const draft = getDraft(cat);
          const generationNotice = generationNotices[cat.id];
          return (
            <div key={cat.id} className="bg-obsidian-600 border border-obsidian-500 rounded-xl overflow-hidden">
              <div
                draggable
                onDragStart={() => setDraggingId(cat.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void moveCategory(cat.id)}
                onDragEnd={() => setDraggingId(null)}
                className={`flex items-center gap-3 px-3 py-2.5 group ${
                  draggingId === cat.id ? 'opacity-70' : ''
                }`}
              >
                <GripVertical size={14} className="text-slate-600 cursor-grab" />
                <FolderOpen size={14} className="text-neon-orange flex-shrink-0" />
                {editingId === cat.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit();
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm bg-obsidian-700 border border-neon-orange/50 rounded text-white focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-slate-200 font-medium">{cat.name}</span>
                )}
                <span className="text-xs text-slate-600 font-mono hidden sm:block">ID {cat.id}</span>
                <span className="text-xs text-slate-600 font-mono">{cat.sites.length}개</span>
                {editingId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => void saveEdit()} disabled={saving} className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                      className="text-slate-500 hover:text-neon-orange transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => void remove(cat.id)}
                      disabled={saving}
                      className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-obsidian-500 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    value={draft.seo_title}
                    onChange={(e) => updateDraft(cat, 'seo_title', e.target.value)}
                    placeholder="SEO 제목"
                    className="px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
                  />
                  <input
                    value={draft.seo_keywords}
                    onChange={(e) => updateDraft(cat, 'seo_keywords', e.target.value)}
                    placeholder="SEO 키워드"
                    className="px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void generateSeo(cat)}
                      disabled={saving || generatingId === cat.id}
                      className="flex-1 px-3 py-2 text-xs font-bold rounded-lg border border-obsidian-500 text-slate-300 bg-obsidian-700 hover:border-neon-orange/50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Wand2 size={13} />
                      {generatingId === cat.id ? '생성 중' : 'DeepSeek로 생성'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSeo(cat)}
                      disabled={saving}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-neon-orange text-white hover:bg-neon-orangeDark disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save size={13} />
                      저장
                    </button>
                  </div>
                </div>

                {generationNotice && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      generationNotice.type === 'error'
                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {generationNotice.message}
                  </div>
                )}

                <textarea
                  value={draft.seo_description}
                  onChange={(e) => updateDraft(cat, 'seo_description', e.target.value)}
                  placeholder="SEO 설명"
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y"
                />
                <textarea
                  value={draft.seo_intro}
                  onChange={(e) => updateDraft(cat, 'seo_intro', e.target.value)}
                  placeholder="카테고리 소개문"
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y"
                />
                <textarea
                  value={draft.seo_faq}
                  onChange={(e) => updateDraft(cat, 'seo_faq', e.target.value)}
                  placeholder={'FAQ JSON 배열\n[\n  {"question":"...", "answer":"..."}\n]'}
                  rows={5}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange resize-y font-mono"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
