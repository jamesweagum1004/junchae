import { Zap, Shield, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

export default function Header() {
  const navigate = useNavigate();
  const { isSecure, setMode } = useTheme();
  const { flags } = useFeatureFlags();

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
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={isSecure ? '전체닷컴 안전 접속 홈으로 이동' : '전체닷컴 일반 홈으로 이동'}
          className="flex cursor-pointer items-center gap-2 rounded-xl text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-neon-orange/70"
        >
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
        </button>

        {/* Segmented VPN Control — Standard ⇄ Secure */}
        <nav className="hidden md:flex items-center gap-2">
          {flags.show_updates_page && (
            <Link
              to="/updates"
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                isSecure ? 'text-slate-400 hover:text-neon-orange hover:bg-white/[0.04]' : 'text-slate-500 hover:text-blue-700 hover:bg-white/80'
              }`}
            >
              업데이트
            </Link>
          )}
          {flags.show_url_status_tool && (
            <Link
              to="/tools/url-status-checker"
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                isSecure ? 'text-slate-400 hover:text-neon-orange hover:bg-white/[0.04]' : 'text-slate-500 hover:text-blue-700 hover:bg-white/80'
              }`}
            >
              URL 체크
            </Link>
          )}
        </nav>

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
