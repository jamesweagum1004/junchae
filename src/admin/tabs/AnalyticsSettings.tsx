import { useEffect, useState } from 'react';
import { BarChart2, CheckCircle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { loadSettings, saveSettings } from '../../lib/adminApi';

export default function AnalyticsSettings() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [ga4Script, setGa4Script] = useState('');
  const [gsc, setGsc] = useState('');
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('SiteKit 설정 저장 실패', err);
      alert('SiteKit 설정 저장에 실패했습니다.');
    }
  };

  const stats = activeMode === 'secure'
    ? [
        { label: '안전 모드 방문자', value: '18,742', change: '+24.3%', positive: true },
        { label: '브릿지 클릭', value: '12,481', change: '+31.7%', positive: true },
        { label: '평균 우회 시간', value: '4.5s', change: '0%', positive: true },
      ]
    : [
        { label: '일반 모드 방문자', value: '12,480', change: '+8.3%', positive: true },
        { label: '페이지뷰', value: '89,231', change: '+14.1%', positive: true },
        { label: '평균 세션 시간', value: '3m 22s', change: '-1.2%', positive: false },
      ];

  return (
    <div className="space-y-6 max-w-2xl">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 bg-obsidian-600 border border-obsidian-500 rounded-xl">
            <BarChart2 size={14} className="text-neon-orange mb-2" />
            <p className="text-xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            <span className={`text-[10px] font-semibold ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.change} vs 어제
            </span>
          </div>
        ))}
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
          {saved ? <CheckCircle size={14} /> : null}
          {saved ? '저장됨' : '스크립트 저장 및 적용'}
        </button>
      </div>
    </div>
  );
}
