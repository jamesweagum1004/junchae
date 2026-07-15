import { Sun, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ModeSubTabsProps {
  activeMode: 'standard' | 'secure';
  onModeChange: (m: 'standard' | 'secure') => void;
}

export default function ModeSubTabs({ activeMode, onModeChange }: ModeSubTabsProps) {
  const { setMode } = useTheme();

  const handle = (m: 'standard' | 'secure') => {
    onModeChange(m);
    setMode(m);
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-obsidian-700 rounded-lg border border-obsidian-500 mb-5">
      <button
        onClick={() => handle('standard')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
          activeMode === 'standard'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Sun size={12} />
        일반 모드
      </button>
      <button
        onClick={() => handle('secure')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
          activeMode === 'secure'
            ? 'bg-neon-orange text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Shield size={12} />
        안전 접속 모드
      </button>
    </div>
  );
}
