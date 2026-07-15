import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Route, Check, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AccountSettings() {
  const { cred, updateCred, adminPath, updateAdminPath } = useAdminAuth();

  const [newId, setNewId] = useState(cred.id);
  const [newPw, setNewPw] = useState(cred.pw);
  const [showPw, setShowPw] = useState(false);
  const [savedCred, setSavedCred] = useState(false);
  const [credError, setCredError] = useState('');

  const [pathInput, setPathInput] = useState(adminPath);
  const [savedPath, setSavedPath] = useState(false);

  const handleSaveCred = () => {
    if (!newId.trim() || !newPw.trim()) {
      setCredError('아이디와 비밀번호를 모두 입력하세요.');
      setSavedCred(false);
      return;
    }
    if (newPw.length < 6) {
      setCredError('비밀번호는 6자 이상이어야 합니다.');
      setSavedCred(false);
      return;
    }
    updateCred({ id: newId.trim(), pw: newPw });
    setCredError('');
    setSavedCred(true);
    setTimeout(() => setSavedCred(false), 3000);
  };

  const handleSavePath = () => {
    updateAdminPath(pathInput);
    setSavedPath(true);
    setTimeout(() => setSavedPath(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Credential Change */}
      <div className="glass-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <KeyRound size={14} className="text-neon-orange" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">관리자 계정 정보 변경</h3>
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">
            관리자 ID
          </label>
          <input
            type="text"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all"
            placeholder="admin1004"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">
            비밀번호
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all"
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

        {credError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-red-300">{credError}</span>
          </div>
        )}

        {savedCred && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <Check size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300">계정 정보가 안전하게 저장되었습니다.</span>
          </div>
        )}

        <button
          onClick={handleSaveCred}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neon-orange text-white text-sm font-bold hover:bg-neon-orangeDark transition-colors shadow-[0_0_10px_rgba(249,115,22,0.3)]"
        >
          <KeyRound size={14} />
          계정 정보 저장
        </button>
      </div>

      {/* Admin Path Change */}
      <div className="glass-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Route size={14} className="text-neon-orange" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">어드민 접속 주소 변경</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          현재 접속 주소를 커스텀 경로로 변경할 수 있습니다. 변경 후에는 새 주소로만 관리자 페이지에 접속할 수 있습니다.
        </p>

        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">
            커스텀 어드민 경로
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-600">/</span>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              className="flex-1 bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all"
              placeholder="secret-admin"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
          <span className="text-[11px] font-mono text-blue-300">
            현재 주소: /{adminPath}
          </span>
        </div>

        {savedPath && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <Check size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300">
              주소가 변경되었습니다. 다음 접속 시 /{adminPath} 로 이동하세요.
            </span>
          </div>
        )}

        <button
          onClick={handleSavePath}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-obsidian-600 border border-white/[0.08] text-slate-200 text-sm font-bold hover:bg-obsidian-500 transition-colors"
        >
          <Route size={14} />
          접속 주소 저장
        </button>
      </div>
    </div>
  );
}
