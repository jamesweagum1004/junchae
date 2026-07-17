import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertTriangle, Zap } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminLoginProps {
  onSuccess: () => void;
  onExit: () => void;
}

export default function AdminLogin({ onSuccess, onExit }: AdminLoginProps) {
  const { login, failCount, lockRemaining } = useAdminAuth();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (lockRemaining > 0) {
      setLocked(true);
      setRemaining(lockRemaining);
    }
  }, [lockRemaining]);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [locked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    const result = await login(id, pw);
    if (result.ok) {
      setError('');
      onSuccess();
    } else if (result.locked) {
      setLocked(true);
      setRemaining(result.remaining || 300);
      setError(`5회 이상 로그인 실패 — 5분간 로그인 잠금`);
    } else {
      const left = 5 - (failCount + 1);
      setError(`인증 실패 — 남은 시도 횟수: ${left}회`);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-deep flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-orange/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-neon-orange items-center justify-center shadow-[0_0_24px_rgba(249,115,22,0.4)] mb-3">
            <Shield size={26} className="text-white" fill="white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            전체닷컴 <span className="text-neon-orange">ADMIN</span>
          </h1>
          <p className="text-[11px] font-mono text-slate-600 mt-1 tracking-widest uppercase">
            Secure Control Panel — v2.1
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-dark rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
            <Lock size={13} className="text-neon-orange" />
            <span className="text-xs font-semibold text-slate-300 tracking-tight">관리자 인증</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ID */}
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="off"
                disabled={locked}
                className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all disabled:opacity-40"
                placeholder="관리자 아이디"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="off"
                  disabled={locked}
                  className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all disabled:opacity-40"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                <span className="text-[11px] font-mono text-red-300">{error}</span>
              </div>
            )}

            {/* Lock countdown */}
            {locked && (
              <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <Lock size={13} className="text-red-400 animate-pulse" />
                <span className="text-xs font-mono text-red-300">
                  잠금 해제까지 {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={locked}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon-orange text-white text-sm font-bold tracking-tight hover:bg-neon-orangeDark transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(249,115,22,0.3)]"
            >
              <Zap size={14} fill="white" />
              {locked ? '잠금 중' : '인증하기'}
            </button>
          </form>

          {/* Exit */}
          <button
            onClick={onExit}
            className="w-full text-center text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors pt-1"
          >
            ← 메인으로 돌아가기
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-mono text-slate-700 mt-4 tracking-widest uppercase">
          Brute-Force Protection — 5 Attempts / 5min Lock
        </p>
      </div>
    </div>
  );
}
