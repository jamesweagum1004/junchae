import { useEffect, useState } from 'react';
import { Code2, CheckCircle, AlertTriangle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { loadSettings, saveSettings } from '../../lib/adminApi';

const SLOT_TYPES = [
  { id: 'popunder', label: 'ExoClick 팝언더', description: '브릿지 오버레이 종료 후 제한적으로 사용' },
  { id: 'banner_728', label: '상단 배너 728x90', description: '브릿지 오버레이 상단 배너 슬롯' },
  { id: 'interstitial', label: '전면 광고', description: '목적 URL 이동 직전 전면 광고 슬롯' },
  { id: 'native', label: '네이티브 광고', description: '브릿지 안내 영역 내부 광고 슬롯' },
];

export default function BridgeAdManager() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('secure');
  const [scripts, setScripts] = useState<Record<string, string>>(
    Object.fromEntries(SLOT_TYPES.map((slot) => [slot.id, '']))
  );
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(SLOT_TYPES.map((slot) => [slot.id, false]))
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings(activeMode, 'bridge_ads')
      .then((settings) => {
        setScripts(Object.fromEntries(SLOT_TYPES.map((slot) => [slot.id, settings[`${slot.id}_script`] || ''])));
        setEnabled(Object.fromEntries(SLOT_TYPES.map((slot) => [slot.id, settings[`${slot.id}_enabled`] === 'true'])));
      })
      .catch((err) => console.error('브릿지 광고 설정 로드 실패', err));
  }, [activeMode]);

  const save = async () => {
    try {
      const settings: Record<string, string> = {};
      SLOT_TYPES.forEach((slot) => {
        settings[`${slot.id}_enabled`] = String(Boolean(enabled[slot.id]));
        settings[`${slot.id}_script`] = scripts[slot.id] || '';
      });
      await saveSettings(activeMode, 'bridge_ads', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('브릿지 광고 설정 저장 실패', err);
      alert('브릿지 광고 설정 저장에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/80 leading-relaxed">
          브릿지 광고 스크립트는 저장만 하며, 메인 페이지에 무분별하게 실행하지 않습니다.
        </p>
      </div>

      {SLOT_TYPES.map((slot) => (
        <div key={slot.id} className="p-4 bg-obsidian-600 border border-obsidian-500 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-200">{slot.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{slot.description}</p>
            </div>
            <button
              onClick={() => setEnabled((prev) => ({ ...prev, [slot.id]: !prev[slot.id] }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                enabled[slot.id] ? 'bg-neon-orange' : 'bg-obsidian-500'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  enabled[slot.id] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
              <Code2 size={11} className="text-neon-orange" /> 광고 스크립트
            </label>
            <textarea
              rows={4}
              value={scripts[slot.id]}
              onChange={(e) => setScripts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
              placeholder={`<!-- ${slot.label} 광고 스크립트 -->`}
              className="w-full px-3 py-2 text-xs bg-obsidian-700 border border-obsidian-500 rounded-lg text-slate-300 placeholder-slate-700 focus:outline-none focus:border-neon-orange font-mono resize-none"
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => void save()}
        className="w-full py-2.5 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-2 transition-colors"
      >
        {saved ? <CheckCircle size={14} /> : null}
        {saved ? '저장됨' : '모든 광고 설정 저장'}
      </button>
    </div>
  );
}
