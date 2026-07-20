import { useEffect, useState } from 'react';
import { BarChart2, CheckCircle, Info } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { loadSettings, saveSettings } from '../../lib/adminApi';

export default function AnalyticsSettings() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [ga4Script, setGa4Script] = useState('');
  const [gsc, setGsc] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings(activeMode, 'sitekit')
      .then((settings) => {
        setGa4Script(settings.ga4_script || '');
        setGsc(settings.search_console_meta || '');
      })
      .catch((err) => console.error('SiteKit 설정 로드 실패', err));
  }, [activeMode]);

  const save = async () => {
    try {
      await saveSettings(activeMode, 'sitekit', {
        ga4_script: ga4Script,
        search_console_meta: gsc,
      });
      setMessage({ type: 'success', text: 'Google Site Kit 설정을 저장했습니다.' });
      setTimeout(() => setMessage(null), 2500);
    } catch (err) {
      console.error('SiteKit 설정 저장 실패', err);
      setMessage({ type: 'error', text: 'Google Site Kit 설정 저장에 실패했습니다.' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="p-5 bg-obsidian-600 border border-obsidian-500 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-neon-orange/10 border border-neon-orange/30 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={16} className="text-neon-orange" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Google Site Kit</h2>
            <p className="mt-1 text-sm text-slate-400">아직 Google API 직접 연동 전입니다.</p>
            <p className="mt-1 text-xs text-slate-500">
              현재 이 화면에서는 GA4 추적 스크립트와 Search Console 인증 코드만 관리합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 bg-obsidian-600 rounded-xl border border-obsidian-500">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            GA4 추적 스크립트
          </label>
          <textarea
            value={ga4Script}
            onChange={(e) => setGa4Script(e.target.value)}
            rows={5}
            placeholder={'<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>'}
            className="w-full px-3 py-2.5 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-slate-300 placeholder-slate-700 focus:outline-none focus:border-neon-orange font-mono resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Google Search Console 소유권 인증 코드
          </label>
          <input
            value={gsc}
            onChange={(e) => setGsc(e.target.value)}
            placeholder='<meta name="google-site-verification" content="..." />'
            className="w-full px-3 py-2.5 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-700 focus:outline-none focus:border-neon-orange font-mono"
          />
        </div>
        <button
          onClick={() => void save()}
          className="w-full py-2.5 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-2 transition-colors"
        >
          {message?.type === 'success' ? <CheckCircle size={14} /> : null}
          스크립트 저장 및 적용
        </button>
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border-red-500/30'
            }`}
          >
            <Info size={13} />
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
