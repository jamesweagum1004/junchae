import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Clock, FolderOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useTheme } from '../context/ThemeContext';
import { StatusSite, categoryHrefFromStatusSite } from '../components/GrowthFeatureBlocks';
import { formatPublicCheckDate, getCheckStatusBadgeClass, getCheckStatusLabel } from '../lib/siteStatus';
import { sitePath } from '../lib/siteSlug';

type UpdatesPayload = {
  recent_changed: StatusSite[];
  recent_problem: StatusSite[];
  recent_normal: StatusSite[];
  recent_added: StatusSite[];
};

type UpdateSectionKey = 'all' | 'changed' | 'problem' | 'normal' | 'added';

const emptyPayload: UpdatesPayload = {
  recent_changed: [],
  recent_problem: [],
  recent_normal: [],
  recent_added: [],
};

const sectionConfig: {
  key: Exclude<UpdateSectionKey, 'all'>;
  title: string;
  summaryLabel: string;
  empty: string;
  payloadKey: keyof UpdatesPayload;
}[] = [
  {
    key: 'changed',
    title: '주소 변경',
    summaryLabel: '주소 변경 감지',
    empty: '최근 감지된 주소 변경 후보가 없습니다.',
    payloadKey: 'recent_changed',
  },
  {
    key: 'problem',
    title: '접속 불안정',
    summaryLabel: '접속 불안정',
    empty: '현재 표시할 접속 불안정 사이트가 없습니다.',
    payloadKey: 'recent_problem',
  },
  {
    key: 'normal',
    title: '정상 확인',
    summaryLabel: '정상 확인',
    empty: '최근 정상 확인 데이터가 아직 없습니다.',
    payloadKey: 'recent_normal',
  },
  {
    key: 'added',
    title: '신규 추가',
    summaryLabel: '신규 추가',
    empty: '최근 추가된 사이트가 아직 없습니다.',
    payloadKey: 'recent_added',
  },
];

const getOrCreateMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const getOrCreateCanonical = () => {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  return canonical;
};

function UpdateItemCard({ site, isSecure }: { site: StatusSite; isSecure: boolean }) {
  const navigate = useNavigate();
  const detailPath = site.site_slug ? `/site/${encodeURIComponent(site.site_slug)}` : sitePath(site);
  const statusKey = site.check_status || site.status || 'unchecked';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(detailPath)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') navigate(detailPath);
      }}
      className={`min-h-[118px] cursor-pointer rounded-xl border p-3 transition-all hover:scale-[1.01] ${
        isSecure
          ? 'glass-dark border-white/[0.08] hover:border-neon-orange/30'
          : 'glass-light border-slate-200/70 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-1">
          {site.logo ? <img src={site.logo} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`truncate text-sm font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{site.name}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getCheckStatusBadgeClass(statusKey, isSecure)}`}>
              {getCheckStatusLabel(statusKey)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(categoryHrefFromStatusSite(site));
              }}
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                isSecure ? 'text-slate-500 hover:text-neon-orange' : 'text-slate-500 hover:text-blue-700'
              }`}
            >
              <FolderOpen size={11} />
              {site.category || site.categoryName || '-'}
            </button>
            <span className={`inline-flex items-center gap-1 text-[11px] ${isSecure ? 'text-slate-600' : 'text-slate-400'}`}>
              <Clock size={11} />
              {formatPublicCheckDate(site.last_checked_at || site.updated_at || site.created_at)}
            </span>
          </div>
          {site.candidate_new_url && (
            <div className={`mt-2 truncate rounded-lg border px-2 py-1 text-[11px] font-mono ${
              isSecure ? 'border-sky-500/25 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700'
            }`}>
              새 주소 후보: {site.candidate_new_url}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function UpdatesPage() {
  const navigate = useNavigate();
  const { isSecure } = useTheme();
  const { flags } = useFeatureFlags();
  const [payload, setPayload] = useState<UpdatesPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UpdateSectionKey>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!flags.show_updates_page) navigate('/', { replace: true });
  }, [flags.show_updates_page, navigate]);

  useEffect(() => {
    if (!flags.show_updates_page) return;
    document.title = '전체닷컴 최근 사이트 주소 변경 및 접속 상태 업데이트';
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).setAttribute(
      'content',
      '전체닷컴에서 최근 변경된 사이트 주소, 접속 불안정 사이트, 정상 확인된 사이트 정보를 확인하세요.'
    );
    getOrCreateCanonical().href = 'https://junchae.com/updates';
  }, [flags.show_updates_page]);

  useEffect(() => {
    if (!flags.show_updates_page) return;
    const mode = isSecure ? 'secure' : 'normal';
    setLoading(true);
    fetch(`/api/sites/updates?mode=${mode}`)
      .then((res) => res.json())
      .then((body) => {
        if (body?.ok) setPayload({ ...emptyPayload, ...body.data });
      })
      .catch((err) => console.error('Updates page load failed', err))
      .finally(() => setLoading(false));
  }, [flags.show_updates_page, isSecure]);

  const visibleSections = useMemo(
    () => activeTab === 'all' ? sectionConfig : sectionConfig.filter((section) => section.key === activeTab),
    [activeTab]
  );

  if (!flags.show_updates_page) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-5 sm:py-7 space-y-6">
        <button
          onClick={() => navigate('/')}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            isSecure ? 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06]' : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <ArrowLeft size={14} /> 메인으로
        </button>

        <section className={`rounded-2xl border p-5 ${isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'}`}>
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-500'}`}>UPDATES</span>
          </div>
          <h1 className={`mt-2 text-2xl sm:text-3xl font-black ${isSecure ? 'text-white' : 'text-slate-950'}`}>
            최근 사이트 주소 변경 및 접속 상태 업데이트
          </h1>
          <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-600'}`}>
            최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인, 신규 추가 사이트를 정리합니다.
          </p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {sectionConfig.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveTab(section.key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                activeTab === section.key
                  ? isSecure ? 'border-neon-orange/40 bg-neon-orange/10' : 'border-blue-300 bg-blue-50'
                  : isSecure ? 'glass-dark border-white/[0.08] hover:border-neon-orange/25' : 'glass-light border-slate-200/70 hover:border-blue-200'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-500">{section.summaryLabel}</div>
              <div className={`mt-1 text-2xl font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>
                {payload[section.payloadKey].length}
              </div>
            </button>
          ))}
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            ['all', '전체'],
            ['changed', '주소 변경'],
            ['problem', '접속 불안정'],
            ['normal', '정상 확인'],
            ['added', '신규 추가'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as UpdateSectionKey)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === key
                  ? 'border-neon-orange bg-neon-orange text-white'
                  : isSecure ? 'border-white/[0.08] text-slate-400 hover:text-neon-orange' : 'border-slate-200 bg-white/70 text-slate-600 hover:text-blue-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`rounded-2xl border p-6 text-sm ${isSecure ? 'glass-dark border-white/[0.08] text-slate-400' : 'glass-light border-slate-200 text-slate-500'}`}>
            업데이트를 불러오는 중입니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleSections.map((section) => {
              const rows = payload[section.payloadKey];
              const isExpanded = Boolean(expanded[section.key]);
              const visibleRows = rows.slice(0, isExpanded ? 20 : 8);
              return (
                <section key={section.key} className={`rounded-2xl border p-4 ${isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className={`text-base font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{section.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">{rows.length}개 항목</p>
                    </div>
                    {rows.length > 8 && (
                      <button
                        onClick={() => setExpanded((current) => ({ ...current, [section.key]: !current[section.key] }))}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                          isSecure ? 'border-white/[0.08] text-slate-400 hover:text-neon-orange' : 'border-slate-200 text-slate-500 hover:text-blue-700'
                        }`}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isExpanded ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {visibleRows.length > 0 ? (
                      visibleRows.map((site) => (
                        <UpdateItemCard key={`${section.key}-${site.id}`} site={site} isSecure={isSecure} />
                      ))
                    ) : (
                      <div className={`rounded-xl border px-3 py-4 text-sm ${isSecure ? 'border-white/[0.06] text-slate-500' : 'border-slate-200 text-slate-500'}`}>
                        {section.empty}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
