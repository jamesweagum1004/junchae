import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useTheme } from '../context/ThemeContext';
import { getCheckStatusBadgeClass, getCheckStatusLabel } from '../lib/siteStatus';

type UrlCheckResult = {
  input_url: string;
  http_status: number | null;
  check_status: string;
  final_url: string | null;
  is_redirected: boolean;
  is_challenge: boolean;
  is_restricted: boolean;
  is_down: boolean;
  memo: string;
};

export default function UrlStatusCheckerPage() {
  const navigate = useNavigate();
  const { isSecure } = useTheme();
  const { flags } = useFeatureFlags();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<UrlCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!flags.show_url_status_tool) navigate('/', { replace: true });
  }, [flags.show_url_status_tool, navigate]);

  useEffect(() => {
    if (!flags.show_url_status_tool) return;
    document.title = 'URL 상태 확인 도구 | 전체닷컴';
  }, [flags.show_url_status_tool]);

  const runCheck = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/tools/url-status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.ok !== true) throw new Error(body?.message || body?.error || 'URL 상태 확인에 실패했습니다.');
      setResult(body.data || body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL 상태 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!flags.show_url_status_tool) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSecure ? 'bg-obsidian-deep' : 'bg-metallic'}`}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-6">
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
            <ShieldAlert size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isSecure ? 'text-neon-orange/70' : 'text-slate-500'}`}>URL STATUS CHECKER</span>
          </div>
          <h1 className={`mt-2 text-2xl sm:text-3xl font-black ${isSecure ? 'text-white' : 'text-slate-950'}`}>
            URL 상태 확인 도구
          </h1>
          <p className={`mt-2 text-sm ${isSecure ? 'text-slate-500' : 'text-slate-600'}`}>
            서버에서 URL 응답 상태, 리다이렉트, 제한/오류 여부를 확인합니다. 외부 HTML 본문은 저장하거나 표시하지 않습니다.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className={`min-h-12 flex-1 rounded-xl border px-4 text-sm outline-none ${
                isSecure ? 'border-white/[0.08] bg-white/[0.04] text-white placeholder-slate-600 focus:border-neon-orange/50' : 'border-slate-200 bg-white/90 text-slate-900 placeholder-slate-400 focus:border-blue-300'
              }`}
            />
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={loading || !url.trim()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-neon-orange px-4 text-sm font-black text-white hover:bg-neon-orangeDark disabled:opacity-50"
            >
              <Search size={15} /> {loading ? '확인 중...' : '상태 확인'}
            </button>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        {result && (
          <section className={`rounded-2xl border p-5 ${isSecure ? 'glass-dark border-white/[0.08]' : 'glass-light border-slate-200/70'}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={isSecure ? 'text-neon-orange' : 'text-blue-600'} />
              <h2 className={`text-lg font-black ${isSecure ? 'text-white' : 'text-slate-900'}`}>확인 결과</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['입력 URL', result.input_url],
                ['HTTP status', result.http_status || '-'],
                ['check_status', getCheckStatusLabel(result.check_status)],
                ['final_url', result.final_url || '-'],
                ['redirect 여부', result.is_redirected ? '예' : '아니오'],
                ['Cloudflare challenge', result.is_challenge ? '감지' : '미감지'],
                ['restricted/down/timeout', result.is_restricted || result.is_down ? '확인 필요' : '미감지'],
              ].map(([label, value]) => (
                <div key={label as string} className={`rounded-xl border p-3 ${isSecure ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white/70'}`}>
                  <div className="text-[10px] font-bold text-slate-500">{label as string}</div>
                  <div className={`mt-1 break-words text-sm font-bold ${isSecure ? 'text-slate-100' : 'text-slate-800'}`}>{String(value)}</div>
                </div>
              ))}
            </div>
            <div className={`mt-4 rounded-xl border p-4 text-sm ${getCheckStatusBadgeClass(result.check_status, isSecure)}`}>
              {result.memo}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
