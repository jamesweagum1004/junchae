import { useState } from 'react';
import { Key, Cpu, Play, CheckCircle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';

export default function DeepSeekSettings() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [prompt, setPrompt] = useState('다음 사이트의 SEO 최적화된 제목과 메타 설명을 생성해주세요: ');
  const [result, setResult] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const testApi = () => {
    setTesting(true);
    setResult('');
    setTimeout(() => {
      setTesting(false);
      const modeLabel = activeMode === 'secure' ? '안전 접속 모드' : '일반 모드';
      setResult(
        `[DeepSeek ${model}] 응답 테스트 완료 (${modeLabel})\n\n` +
        `SEO 제목: "2025년 최신 링크 모음 | 전체닷컴 — ${modeLabel} 최적화"\n` +
        `메타 설명: "전체닷컴에서 ${activeMode === 'secure' ? '웹툰 대피소, 토렌트, 카지노 등' : '공식 웹툰, IT 커뮤니티, 스포츠 뉴스 등'} 엄선된 정예 사이트를 한눈에 확인하세요. AI 우회 브릿지 기술로 차단된 사이트도 즉시 접속 가능."\n\n` +
        `[토큰 사용] input: 120 / output: 85 / total: 205`
      );
    }, 2000);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <ModeSubTabs activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="space-y-4 p-5 bg-obsidian-600 rounded-xl border border-obsidian-500">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <Key size={12} className="inline mr-1.5 text-neon-orange" />DeepSeek API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-••••••••••••••••••••••••••••"
            className="w-full px-3 py-2.5 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            <Cpu size={12} className="inline mr-1.5 text-neon-orange" />모델 선택
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white focus:outline-none focus:border-neon-orange"
          >
            <option value="deepseek-chat">deepseek-chat (일반)</option>
            <option value="deepseek-coder">deepseek-coder (코드 특화)</option>
            <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            pSEO 생성 프롬프트 템플릿
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 py-2.5 bg-obsidian-700 border border-obsidian-500 hover:border-neon-orange/50 text-slate-300 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            {saved ? <CheckCircle size={14} className="text-emerald-400" /> : null}
            {saved ? '저장됨' : '설정 저장'}
          </button>
          <button
            onClick={testApi}
            disabled={testing}
            className="flex-1 py-2.5 bg-neon-orange text-white text-sm font-semibold rounded-lg hover:bg-neon-orangeDark flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {testing ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Play size={14} />}
            {testing ? '생성 중...' : 'AI 생성 테스트'}
          </button>
        </div>
      </div>

      {result && (
        <div className="p-4 bg-black/40 border border-neon-orange/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">API 응답 수신 완료</span>
          </div>
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{result}</pre>
        </div>
      )}
    </div>
  );
}
