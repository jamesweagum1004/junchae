import { Zap, Shield, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { isSecure, setMode } = useTheme();

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        isSecure
          ? 'glass-dark border-white/[0.06]'
          : 'glass-light border-slate-200/40 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
              isSecure
                ? 'bg-neon-orange shadow-[0_0_12px_rgba(249,115,22,0.6)]'
                : 'bg-blue-700'
            }`}
          >
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <span
            className={`text-lg font-extrabold tracking-tight ${
              isSecure ? 'text-white neon-glow' : 'text-slate-900'
            }`}
          >
            전체
            <span className={isSecure ? 'text-neon-orange' : 'text-blue-700'}>닷컴</span>
          </span>
          {isSecure && (
            <span className="ml-1 text-[10px] font-mono text-neon-orange/70 uppercase tracking-widest hidden sm:block">
              [SECURE MODE]
            </span>
          )}
        </div>

        {/* Segmented VPN Control — Standard ⇄ Secure */}
        <div
          className={`relative flex items-center rounded-full p-1 transition-all duration-200 ${
            isSecure
              ? 'bg-obsidian-600 border border-neon-orange/30'
              : 'bg-slate-100 border border-slate-200'
          }`}
        >
          {/* Standard Button */}
          <button
            onClick={() => setMode('standard')}
            className={`relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              !isSecure
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>일반</span>
          </button>

          {/* Secure Button — neon pulse to attract attention */}
          <button
            onClick={() => setMode('secure')}
            className={`relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              isSecure
                ? 'bg-neon-orange text-white shadow-[0_0_12px_rgba(249,115,22,0.6)]'
                : 'text-neon-orange bg-neon-orange/10 border border-neon-orange/20 neon-pulse hover:bg-neon-orange/20'
            }`}
          >
            {/* Blinking dot — always visible to draw the eye */}
            {!isSecure && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 dot-blink" />
            )}
            {isSecure ? (
              <Shield size={12} fill="white" />
            ) : (
              <Lock size={12} />
            )}
            <span className="hidden sm:inline">안전 접속</span>
            <span className="sm:hidden">SEC</span>
            <Zap size={10} fill={isSecure ? 'white' : 'currentColor'} className={isSecure ? 'text-white' : 'text-neon-orange'} />
          </button>
        </div>
      </div>
    </header>
  );
}
