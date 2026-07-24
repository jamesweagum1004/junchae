import { useEffect, useState } from 'react';
import { CheckCircle2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiJson } from '../../lib/adminApi';
import { defaultGrowthFeatureFlags, GrowthFeatureFlags, useFeatureFlags } from '../../context/FeatureFlagsContext';

type BooleanFeatureKey = Exclude<keyof GrowthFeatureFlags, 'recently_viewed_limit'>;

const featureItems: { key: BooleanFeatureKey; title: string; description: string }[] = [
  {
    key: 'show_home_status_sections',
    title: '메인 상태 섹션',
    description: '메인 페이지에 최근 정상 확인, 주소 변경 감지, 확인 필요 사이트를 표시합니다.',
  },
  {
    key: 'show_site_status_score',
    title: '사이트 상태 점수',
    description: '사이트 상세 페이지에 0~100점 상태 점수를 표시합니다.',
  },
  {
    key: 'show_site_check_timeline',
    title: '점검/주소 변경 타임라인',
    description: '사이트 상세 페이지에 최근 점검 이력과 주소 변경 후보를 표시합니다.',
  },
  {
    key: 'show_updates_page',
    title: '최근 변경 페이지',
    description: '/updates 페이지에서 최근 주소 변경, 접속 불안정, 정상 확인, 신규 사이트를 보여줍니다.',
  },
  {
    key: 'show_url_status_tool',
    title: 'URL 상태 확인 도구',
    description: '/tools/url-status-checker 공개 도구를 활성화합니다.',
  },
  {
    key: 'show_category_status_stats',
    title: '카테고리 상태 통계',
    description: '카테고리 상세 상단에 정상, 리다이렉트, 확인 필요 통계를 표시합니다.',
  },
  {
    key: 'show_recently_viewed_sites',
    title: '최근 본 사이트',
    description: '방문자가 최근 열람한 사이트를 메인/상세 페이지에 표시합니다. 일반/안전 모드는 분리됩니다.',
  },
];

export default function GrowthFeatureSettings() {
  const { reloadGrowthFeatures } = useFeatureFlags();
  const [draft, setDraft] = useState<GrowthFeatureFlags>(defaultGrowthFeatureFlags);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<GrowthFeatureFlags>('/api/admin/features/growth');
      setDraft({ ...defaultGrowthFeatureFlags, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : '성장 기능 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (key: BooleanFeatureKey) => {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
    setNotice('');
  };

  const updateRecentlyViewedLimit = (value: string) => {
    const next = Math.max(3, Math.min(20, Number(value) || 8));
    setDraft((current) => ({ ...current, recently_viewed_limit: next }));
    setNotice('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const data = await apiJson<GrowthFeatureFlags>('/api/admin/features/growth', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      setDraft({ ...defaultGrowthFeatureFlags, ...data });
      await reloadGrowthFeatures();
      setNotice('성장 기능 설정을 저장했습니다. 프론트 설정도 즉시 갱신했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '성장 기능 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <h2 className="text-base font-black text-white">성장 기능 설정</h2>
        <p className="mt-1 text-xs text-slate-500">
          신규 포털 기능을 feature flag로 켜고 끌 수 있습니다. 모든 값은 app_settings global/growth_features에 저장됩니다.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 size={14} /> {notice}
        </div>
      )}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {featureItems.map((item) => {
          const enabled = draft[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              disabled={loading || saving}
              className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
                enabled
                  ? 'border-neon-orange/30 bg-neon-orange/10'
                  : 'border-obsidian-500 bg-obsidian-600 hover:bg-obsidian-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {enabled ? (
                  <ToggleRight size={24} className="mt-0.5 shrink-0 text-neon-orange" />
                ) : (
                  <ToggleLeft size={24} className="mt-0.5 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{item.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'
                    }`}>
                      {enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-slate-600">{item.key}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
        <label className="block">
          <span className="text-sm font-black text-white">최근 본 사이트 노출 수</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            메인/상세 페이지에 표시할 최근 본 사이트 개수를 설정합니다.
          </span>
          <input
            type="number"
            min={3}
            max={20}
            value={draft.recently_viewed_limit}
            onChange={(event) => updateRecentlyViewedLimit(event.target.value)}
            disabled={loading || saving}
            className="mt-3 w-32 rounded-lg border border-obsidian-500 bg-obsidian-700 px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon-orange disabled:opacity-60"
          />
        </label>
        <p className="mt-2 font-mono text-[10px] text-slate-600">recently_viewed_limit · 3~20</p>
      </div>

      <button
        onClick={() => void save()}
        disabled={loading || saving}
        className="inline-flex items-center gap-2 rounded-lg bg-neon-orange px-4 py-2 text-sm font-bold text-white hover:bg-neon-orangeDark disabled:opacity-50"
      >
        <Save size={15} />
        {saving ? '저장 중...' : '설정 저장'}
      </button>
    </div>
  );
}
