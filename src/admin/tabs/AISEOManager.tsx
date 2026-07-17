import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle, Search, Wand2 } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { useData } from '../../context/DataContext';
import { apiJson, apiMode } from '../../lib/adminApi';

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
  seo_score: number;
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
  seo_score: 0,
};

export default function AISEOManager() {
  const { getModeData, reloadSites } = useData();
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
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

  const sites = useMemo(() =>
    categories.flatMap((category) =>
      category.sites.map((site) => ({
        ...site,
        categoryName: category.name,
      }))
    ), [categories]);

  const filteredSites = sites.filter((site) => {
    const matchesQuery = !query.trim() || site.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || site.categoryName === categoryFilter;
    const missingSeo = !site.seo_title || !site.seo_description;
    const lowScore = (site.seo_score || 0) < 60;
    return matchesQuery && matchesCategory && (!missingOnly || missingSeo) && (!lowScoreOnly || lowScore);
  });

  const selected = sites.find((site) => site.id === selectedId) || filteredSites[0];

  const openSite = (siteId: number) => {
    const site = sites.find((item) => item.id === siteId);
    if (!site) return;
    setSelectedId(siteId);
    setAiPreview(null);
    setAiText('');
    setDraft({
      seo_title: site.seo_title || `${site.name} 최신 정보`,
      seo_description: site.seo_description || site.description || '',
      seo_keywords: site.seo_keywords || site.name,
      seo_slug: site.seo_slug || site.name.toLowerCase().replace(/\s+/g, '-'),
      seo_h1: site.seo_h1 || site.name,
      seo_canonical: site.seo_canonical || site.url,
      seo_og_title: site.seo_og_title || site.seo_title || site.name,
      seo_og_description: site.seo_og_description || site.seo_description || site.description || '',
      seo_og_image: site.seo_og_image || site.logo || '',
      seo_score: site.seo_score || 0,
    });
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
    const next = {
      ...draft,
      seo_title: String(aiPreview.seo_title || draft.seo_title),
      seo_description: String(aiPreview.seo_description || draft.seo_description),
      seo_keywords: Array.isArray(aiPreview.seo_keywords)
        ? aiPreview.seo_keywords.join(', ')
        : String(aiPreview.seo_keywords || draft.seo_keywords),
      seo_slug: String(aiPreview.seo_slug || draft.seo_slug),
      seo_h1: String(aiPreview.seo_h1 || draft.seo_h1),
      seo_og_title: String(aiPreview.seo_og_title || aiPreview.seo_title || draft.seo_og_title),
      seo_og_description: String(aiPreview.seo_og_description || aiPreview.seo_description || draft.seo_og_description),
      seo_score: Number(aiPreview.seo_score || draft.seo_score) || 0,
    };
    setDraft(next);
  };

  useEffect(() => {
    if (!selected && filteredSites.length > 0) {
      openSite(filteredSites[0].id);
    }
  }, [filteredSites, selected]);

  return (
    <div className="space-y-5">
      <ModeSubTabs activeMode={activeMode} onModeChange={(mode) => {
        setActiveMode(mode);
        setSelectedId(null);
        setAiPreview(null);
      }} />

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
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setMissingOnly(!missingOnly)} className={`px-3 py-1.5 rounded text-xs ${missingOnly ? 'bg-neon-orange text-white' : 'bg-obsidian-700 text-slate-400'}`}>
              SEO 누락
            </button>
            <button onClick={() => setLowScoreOnly(!lowScoreOnly)} className={`px-3 py-1.5 rounded text-xs ${lowScoreOnly ? 'bg-neon-orange text-white' : 'bg-obsidian-700 text-slate-400'}`}>
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
              {[
                ['seo_title', 'SEO 제목'],
                ['seo_h1', 'H1 제목'],
                ['seo_slug', 'SEO slug'],
                ['seo_canonical', 'Canonical URL'],
                ['seo_og_title', 'OG 제목'],
                ['seo_og_image', 'OG 이미지'],
              ].map(([key, label]) => (
                <input
                  key={key}
                  value={String(draft[key as keyof SeoDraft] || '')}
                  onChange={(e) => setDraft((current) => ({ ...current, [key]: e.target.value }))}
                  placeholder={label}
                  className="px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
                />
              ))}
            </div>

            <textarea
              value={draft.seo_description}
              onChange={(e) => setDraft((current) => ({ ...current, seo_description: e.target.value }))}
              rows={3}
              placeholder="메타 설명"
              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange resize-none"
            />
            <textarea
              value={draft.seo_keywords}
              onChange={(e) => setDraft((current) => ({ ...current, seo_keywords: e.target.value }))}
              rows={2}
              placeholder="키워드"
              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange resize-none"
            />
            <textarea
              value={draft.seo_og_description}
              onChange={(e) => setDraft((current) => ({ ...current, seo_og_description: e.target.value }))}
              rows={2}
              placeholder="OG 설명"
              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange resize-none"
            />
            <input
              type="number"
              value={draft.seo_score}
              onChange={(e) => setDraft((current) => ({ ...current, seo_score: Number(e.target.value) }))}
              placeholder="SEO 점수"
              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
            />

            <div className="flex flex-wrap gap-2">
              <button onClick={() => void saveSeo()} className="px-4 py-2 bg-neon-orange text-white text-xs font-semibold rounded-lg">
                저장
              </button>
              <button onClick={() => void generateSeo()} disabled={loadingAi} className="px-4 py-2 bg-obsidian-700 border border-obsidian-500 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-60">
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
                {aiPreview ? (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(aiPreview, null, 2)}</pre>
                ) : (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap">{aiText}</pre>
                )}
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
