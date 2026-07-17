import { useEffect, useState } from 'react';
import { Key, Cpu, Play, CheckCircle } from 'lucide-react';
import ModeSubTabs from '../ModeSubTabs';
import { apiJson, apiMode, loadSettings, saveSettings } from '../../lib/adminApi';

const defaultPrompt = '다음 사이트의 검색 친화적인 한국어 SEO 제목, 메타 설명, 키워드를 생성하세요.';

export default function DeepSeekSettings() {
  const [activeMode, setActiveMode] = useState<'standard' | 'secure'>('standard');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings(activeMode, 'deepseek')
      .then((settings) => {
        setApiKey(settings.api_key || '');
        setModel(settings.model || 'deepseek-chat');
        setPrompt(settings.prompt_template || defaultPrompt);
      })
      .catch((err) => console.error('DeepSeek 설정 로드 실패', err));
  }, [activeMode]);

  const testApi = async () => {
    setTesting(true);
    setResult('');
    try {
      const data = await apiJson<{ text: string }>('/api/deepseek/test', {
        method: 'POST',
        body: JSON.stringify({
          mode: apiMode(activeMode),
          site: {
            name: '네이버',
            url: 'https://naver.com',
            category: '포털',
            description: '검색 포털 테스트 사이트',
          },
        }),
      });
      setResult(data.text);
    } catch (err) {
      console.error('DeepSeek 테스트 실패', err);
      setResult(err instanceof Error ? err.message : 'DeepSeek 테스트에 실패했습니다.');
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    try {
      const settings: Record<string, string> = {
        model,
        prompt_template: prompt,
      };
      if (apiKey.trim() && !apiKey.includes('••••')) {
        settings.api_key = apiKey.trim();
      }
      const savedSettings = await saveSettings(activeMode, 'deepseek', settings);
      setApiKey(savedSettings.api_key || apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('DeepSeek 설정 저장 실패', err);
      alert('DeepSeek 설정 저장에 실패했습니다.');
    }
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
            placeholder="sk-..."
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
            <option value="deepseek-chat">deepseek-chat</option>
            <option value="deepseek-reasoner">deepseek-reasoner</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            pSEO/SEO 생성 프롬프트 템플릿
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-sm bg-obsidian-700 border border-obsidian-500 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange font-mono resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void save()}
            className="flex-1 py-2.5 bg-obsidian-700 border border-obsidian-500 hover:border-neon-orange/50 text-slate-300 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            {saved ? <CheckCircle size={14} className="text-emerald-400" /> : null}
            {saved ? '저장됨' : '설정 저장'}
          </button>
          <button
            onClick={() => void testApi()}
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
            <span className="text-xs font-semibold text-emerald-400">API 응답</span>
          </div>
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{result}</pre>
        </div>
      )}
    </div>
  );
}
