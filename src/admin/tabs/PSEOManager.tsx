import { useState } from 'react';
import { Edit3, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import ModeSubTabs from '../ModeSubTabs';

interface SEOEntry {
  id: number;
  siteName: string;
  category: string;
  title: string;
  description: string;
}

export default function PSEOManager() {
  const { getModeData } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const { categories } = getModeData(activeMode);

  const [entries, setEntries] = useState<SEOEntry[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [initialized, setInitialized] = useState<string | null>(null);

  // Rebuild entries when mode changes
  if (initialized !== activeMode) {
    setEntries(
      categories.flatMap((c) =>
        c.sites.map((s) => ({
          id: s.id,
          siteName: s.name,
          category: c.name,
          title: `${s.name} 최신 주소 및 우회 접속 방법 | 전체닷컴`,
          description: `${s.name} 공식 최신 주소를 전체닷컴에서 확인하세요. ${s.description}. AI 우회 브릿지로 즉시 접속 가능.`,
        }))
      )
    );
    setInitialized(activeMode);
  }

  const update = (id: number, field: 'title' | 'description', value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const save = (id: number) => {
    setSaved(id);
    setEditing(null);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />
      <p className="text-xs text-slate-500">각 사이트별 SEO 타이틀 및 메타 설명을 개별 수정합니다.</p>
      {entries.map((entry) => (
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
                value={entry.title}
                onChange={(e) => update(entry.id, 'title', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-neon-orange/50 rounded-lg text-white focus:outline-none font-mono"
                placeholder="SEO 제목"
              />
              <textarea
                value={entry.description}
                onChange={(e) => update(entry.id, 'description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-neon-orange/50 rounded-lg text-white focus:outline-none font-mono resize-none"
                placeholder="메타 설명"
              />
              <button
                onClick={() => save(entry.id)}
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
      ))}
    </div>
  );
}
