import { useMemo, useState } from 'react';
import { Edit3, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import ModeSubTabs from '../ModeSubTabs';
import { apiJson } from '../../lib/adminApi';

export default function PSEOManager() {
  const { getModeData, reloadSites } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const { categories } = getModeData(activeMode);
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { seo_title: string; seo_description: string; seo_keywords: string }>>({});

  const entries = useMemo(() =>
    categories.flatMap((category) =>
      category.sites.map((site) => ({
        id: site.id,
        siteName: site.name,
        category: category.name,
        title: site.seo_title || `${site.name} 최신 정보 | junchae`,
        description: site.seo_description || site.description || `${site.name} 사이트 정보와 접속 링크를 확인하세요.`,
        keywords: site.seo_keywords || site.name,
      }))
    ), [categories]);

  const update = (id: number, field: 'seo_title' | 'seo_description' | 'seo_keywords', value: string) => {
    const entry = entries.find((item) => item.id === id);
    const base = {
      seo_title: entry?.title || '',
      seo_description: entry?.description || '',
      seo_keywords: entry?.keywords || '',
    };
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...base,
        ...current[id],
        [field]: value,
      },
    }));
  };

  const save = async (id: number) => {
    const entry = entries.find((item) => item.id === id);
    const draft = drafts[id] || {
      seo_title: entry?.title || '',
      seo_description: entry?.description || '',
      seo_keywords: entry?.keywords || '',
    };

    try {
      await apiJson(`/api/sites/${id}/seo`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await reloadSites();
      setSaved(id);
      setEditing(null);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error('pSEO 저장 실패', err);
      alert('pSEO 저장에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />
      <p className="text-xs text-slate-500">현재 모드의 사이트별 SEO 제목, 메타 설명, 키워드를 DB에 저장합니다.</p>
      {entries.map((entry) => {
        const draft = drafts[entry.id] || {
          seo_title: entry.title,
          seo_description: entry.description,
          seo_keywords: entry.keywords,
        };

        return (
          <div key={entry.id} className="p-4 bg-obsidian-600 border border-obsidian-500 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">{entry.siteName}</span>
                <span className="text-xs text-slate-600 px-1.5 py-0.5 bg-obsidian-700 rounded font-mono">{entry.category}</span>
              </div>
              <div className="flex items-center gap-2">
                {saved === entry.id && <CheckCircle size={14} className="text-emerald-400" />}
                <button
                  onClick={() => setEditing(editing === entry.id ? null : entry.id)}
                  className="text-slate-500 hover:text-neon-orange transition-colors"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </div>

            {editing === entry.id ? (
              <div className="space-y-2">
                <input
                  value={draft.seo_title}
                  onChange={(e) => update(entry.id, 'seo_title', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-neon-orange/50 rounded-lg text-white focus:outline-none font-mono"
                  placeholder="SEO 제목"
                />
                <textarea
                  value={draft.seo_description}
                  onChange={(e) => update(entry.id, 'seo_description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-neon-orange/50 rounded-lg text-white focus:outline-none font-mono resize-none"
                  placeholder="메타 설명"
                />
                <input
                  value={draft.seo_keywords}
                  onChange={(e) => update(entry.id, 'seo_keywords', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-neon-orange/50 rounded-lg text-white focus:outline-none font-mono"
                  placeholder="키워드"
                />
                <button
                  onClick={() => void save(entry.id)}
                  className="px-4 py-1.5 bg-neon-orange text-white text-xs font-semibold rounded-lg hover:bg-neon-orangeDark transition-colors"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 truncate font-mono">{entry.title}</p>
                <p className="text-xs text-slate-600 line-clamp-1">{entry.description}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
