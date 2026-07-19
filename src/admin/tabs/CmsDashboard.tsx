import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, CheckCircle2, FileText, Globe2, Monitor, Search, Smartphone, Star, Users } from 'lucide-react';
import { apiJson, getAdminApiToken } from '../../lib/adminApi';

type CountRow = Record<string, string | number | null> & { count: number };

type DashboardData = {
  summary: {
    today_views: number;
    yesterday_views: number;
    last_7_days_views: number;
    last_30_days_views: number;
    today_unique_visitors: number;
    ai_bot_views: number;
    search_bot_views: number;
    human_views: number;
  };
  device_breakdown: CountRow[];
  visitor_type_breakdown: CountRow[];
  top_referrers: CountRow[];
  top_pages: CountRow[];
  mode_breakdown: CountRow[];
  bot_breakdown: CountRow[];
  daily_views: { date: string; count: number }[];
  recent_events: CountRow[];
  checklist: {
    total_sites: number;
    hidden_sites: number;
    featured_sites: number;
    down_sites: number;
    checking_sites: number;
    categories_count: number;
    robots_exists: boolean;
    sitemap_exists: boolean;
    sitemap_last_generated_at: string;
  };
};

const emptyDashboard: DashboardData = {
  summary: {
    today_views: 0,
    yesterday_views: 0,
    last_7_days_views: 0,
    last_30_days_views: 0,
    today_unique_visitors: 0,
    ai_bot_views: 0,
    search_bot_views: 0,
    human_views: 0,
  },
  device_breakdown: [],
  visitor_type_breakdown: [],
  top_referrers: [],
  top_pages: [],
  mode_breakdown: [],
  bot_breakdown: [],
  daily_views: [],
  recent_events: [],
  checklist: {
    total_sites: 0,
    hidden_sites: 0,
    featured_sites: 0,
    down_sites: 0,
    checking_sites: 0,
    categories_count: 0,
    robots_exists: false,
    sitemap_exists: false,
    sitemap_last_generated_at: '',
  },
};

const labelMap: Record<string, string> = {
  mobile: '모바일',
  desktop: 'PC',
  tablet: '태블릿',
  unknown: '알 수 없음',
  human: '일반 사용자',
  search_bot: '검색봇',
  ai_bot: 'AI봇',
  other_bot: '기타봇',
  normal: '일반 모드',
  secure: '안전 접속 모드',
  Direct: 'Direct',
};

function formatCount(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon size={14} className="text-neon-orange" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">{formatCount(value)}</div>
    </div>
  );
}

function ListPanel({ title, rows, labelKey }: { title: string; rows: CountRow[]; labelKey: string }) {
  return (
    <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">아직 수집된 데이터가 없습니다</p>
        ) : rows.map((row, index) => {
          const raw = String(row[labelKey] || 'unknown');
          return (
            <div key={`${title}-${raw}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-300">{labelMap[raw] || raw}</span>
              <span className="font-mono text-slate-500">{formatCount(row.count)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CmsDashboard() {
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!getAdminApiToken()) {
      setError('대시보드를 보려면 보안 / 계정 설정에서 API Token을 저장해 주세요.');
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    apiJson<DashboardData>('/api/admin/dashboard?days=7')
      .then((payload) => {
        if (!cancelled) setData({ ...emptyDashboard, ...payload });
      })
      .catch((err) => {
        if (!cancelled) {
          const status = typeof err === 'object' && err !== null && 'status' in err ? Number(err.status) : 0;
          if (status === 401) {
            setError('API Token이 유효하지 않습니다. 보안 / 계정 설정에서 다시 저장해 주세요.');
          } else {
            setError(err instanceof Error ? err.message : '대시보드 데이터를 불러오지 못했습니다.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasTraffic = useMemo(() => data.summary.last_30_days_views > 0, [data.summary.last_30_days_views]);
  const checklist = data.checklist || emptyDashboard.checklist;

  if (loading) {
    return <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-6 text-sm text-slate-400">대시보드 로딩 중...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-5">
      {!hasTraffic && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-300">
          아직 수집된 데이터가 없습니다. 방문자 분석은 페이지뷰 수집 이후 표시됩니다.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="오늘 방문" value={data.summary.today_views} />
        <StatCard icon={Activity} label="어제 방문" value={data.summary.yesterday_views} />
        <StatCard icon={Users} label="최근 7일 방문" value={data.summary.last_7_days_views} />
        <StatCard icon={Users} label="최근 30일 방문" value={data.summary.last_30_days_views} />
        <StatCard icon={Users} label="오늘 고유 방문자" value={data.summary.today_unique_visitors} />
        <StatCard icon={Search} label="검색봇 방문" value={data.summary.search_bot_views} />
        <StatCard icon={Bot} label="AI봇 방문" value={data.summary.ai_bot_views} />
        <StatCard icon={Globe2} label="일반 사용자" value={data.summary.human_views} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ListPanel title="유입 경로" rows={data.top_referrers} labelKey="referrer_host" />
        <ListPanel title="디바이스" rows={data.device_breakdown} labelKey="device_type" />
        <ListPanel title="방문자 타입" rows={data.visitor_type_breakdown} labelKey="visitor_type" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ListPanel title="인기 페이지" rows={data.top_pages} labelKey="path" />
        <ListPanel title="모드별 방문" rows={data.mode_breakdown} labelKey="mode" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ListPanel title="봇 상세" rows={data.bot_breakdown} labelKey="bot_name" />
        <div className="rounded-xl border border-obsidian-500 bg-obsidian-600 p-4">
          <h3 className="text-sm font-bold text-white">사이트 관리 체크리스트</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300"><FileText size={13} className={checklist.robots_exists ? 'text-emerald-400' : 'text-slate-500'} /> robots.txt {checklist.robots_exists ? '있음' : '없음'}</div>
            <div className="flex items-center gap-2 text-slate-300"><FileText size={13} className={checklist.sitemap_exists ? 'text-emerald-400' : 'text-slate-500'} /> sitemap.xml {checklist.sitemap_exists ? '있음' : '없음'}</div>
            <div className="flex items-center gap-2 text-slate-300"><CheckCircle2 size={13} className="text-neon-orange" /> 카테고리 {formatCount(checklist.categories_count)}</div>
            <div className="flex items-center gap-2 text-slate-300"><Globe2 size={13} className="text-neon-orange" /> 전체 사이트 {formatCount(checklist.total_sites)}</div>
            <div className="flex items-center gap-2 text-slate-300"><Star size={13} className="text-amber-300" /> TOP10 {formatCount(checklist.featured_sites)}</div>
            <div className="flex items-center gap-2 text-slate-300"><Monitor size={13} className="text-slate-400" /> 숨김 {formatCount(checklist.hidden_sites)}</div>
            <div className="flex items-center gap-2 text-slate-300"><Smartphone size={13} className="text-red-300" /> 접속불가 {formatCount(checklist.down_sites)}</div>
            <div className="flex items-center gap-2 text-slate-300"><Activity size={13} className="text-slate-400" /> 확인중 {formatCount(checklist.checking_sites)}</div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Sitemap 최근 생성: {checklist.sitemap_last_generated_at || '기록 없음'}
          </p>
        </div>
      </div>
    </div>
  );
}
