import { useState } from 'react';
import { Code2, CheckCircle, AlertTriangle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';

const SLOT_TYPES = [
  { id: 'popunder', label: 'ExoClick 팝언더', description: '브릿지 오버레이 종료 시 발화' },
  { id: 'banner_top', label: '상단 배너 (728×90)', description: '브릿지 오버레이 상단 고정' },
  { id: 'interstitial', label: '전면 광고 (전환 전)', description: '타겟 URL 열리기 직전' },
  { id: 'native', label: '네이티브 광고', description: '로그 섹션 내 삽입' },
];

export default function BridgeAdManager() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('secure');
  const [scripts, setScripts] = useState<Record<string, string>>(
    Object.fromEntries(SLOT_TYPES.map((s) => [s.id, '']))
  );
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(SLOT_TYPES.map((s) => [s.id, false]))
  );
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/80 leading-relaxed">
          브릿지 페이지(AI 로딩 오버레이) 전용 광고 슬롯입니다. 코드 삽입 후 테스트 환경에서 반드시 확인하세요.
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
              placeholder={`<!-- ${slot.label} 광고 스크립트 코드 -->\n<script type="text/javascript">\n  ...\n</script>`}
              disabled={!enabled[slot.id]}
              className={`w-full px-3 py-2 text-xs border rounded-lg font-mono resize-none focus:outline-none transition-colors ${
                enabled[slot.id]
                  ? 'bg-obsidian-700 border-obsidian-500 text-slate-300 placeholder-slate-700 focus:border-neon-orange'
                  : 'bg-obsidian-700/50 border-obsidian-600 text-slate-600 placeholder-slate-700 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
      ))}

      <button
        onClick={save}
        className="w-full py-2.5 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-2 transition-colors"
      >
        {saved ? <CheckCircle size={14} /> : null}
        {saved ? '저장됨' : '모든 광고 설정 저장'}
      </button>
    </div>
  );
}
