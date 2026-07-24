import { useEffect, useState } from 'react';
import { ArrowLeft, FolderOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useTheme } from '../context/ThemeContext';
import { StatusSite, StatusSiteCard, categoryHrefFromStatusSite } from '../components/GrowthFeatureBlocks';

type UpdatesPayload = {
  recent_changed: StatusSite[];
  recent_problem: StatusSite[];
  recent_normal: StatusSite[];
  recent_added: StatusSite[];
};

const emptyPayload: UpdatesPayload = {
  recent_changed: [],
  recent_problem: [],
  recent_normal: [],
  recent_added: [],
};

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

export default function UpdatesPage() {
  const navigate = useNavigate();
  const { isSecure } = useTheme();
  const { flags } = useFeatureFlags();
  const [payload, setPayload] = useState<UpdatesPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);

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

  if (!flags.show_updates_page) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-7 space-y-6">
        <button
          onClick={() => navigate('/')}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            isSecure ? 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06]' : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <ArrowLeft size={14} /> 메인으로
        </button>

        <section>
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-500'}`}>UPDATES</span>
          </div>
          <h1 className={`mt-2 text-2xl sm:text-3xl font-black ${isSecure ? 'text-white' : 'text-slate-950'}`}>
            최근 사이트 주소 변경 및 접속 상태 업데이트
          </h1>
          <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-600'}`}>
            최근 감지된 주소 변경 후보, 접속 불안정, 정상 확인, 신규 추가 사이트를 모아 보여줍니다.
          </p>
        </section>

        {loading ? (
          <div className={`rounded-2xl border p-6 text-sm ${isSecure ? 'glass-dark border-white/[0.08] text-slate-400' : 'glass-light border-slate-200 text-slate-500'}`}>
            업데이트를 불러오는 중입니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              ['최근 주소 변경 감지', payload.recent_changed],
              ['최근 접속 불안정', payload.recent_problem],
              ['최근 정상 확인', payload.recent_normal],
              ['최근 추가된 사이트', payload.recent_added],
            ].map(([title, rows]) => (
              <section key={title as string} className={`rounded-2xl border p-4 ${isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'}`}>
                <h2 className={`text-base font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>{title as string}</h2>
                <div className="mt-3 space-y-2">
                  {(rows as StatusSite[]).length > 0 ? (
                    (rows as StatusSite[]).slice(0, 20).map((site) => (
                      <div key={`${title}-${site.id}`} className="space-y-1">
                        <StatusSiteCard site={site} isSecure={isSecure} />
                        <button
                          type="button"
                          onClick={() => navigate(categoryHrefFromStatusSite(site))}
                          className={`inline-flex items-center gap-1 px-1 text-[11px] font-bold ${isSecure ? 'text-slate-500 hover:text-neon-orange' : 'text-slate-500 hover:text-blue-700'}`}
                        >
                          <FolderOpen size={11} /> {site.category || '-'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={`rounded-xl border p-4 text-sm ${isSecure ? 'border-white/[0.06] text-slate-500' : 'border-slate-200 text-slate-500'}`}>
                      표시할 사이트가 없습니다.
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
