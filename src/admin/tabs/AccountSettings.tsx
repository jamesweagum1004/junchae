import { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, Route, Check, AlertTriangle, Send, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useData } from '../../context/DataContext';
import { ADMIN_API_TOKEN_STORAGE_KEY, adminAuthHeaders } from '../../lib/adminApi';

export default function AccountSettings() {
  const { adminUsername, adminPath, refreshAdminConfig, applyAdminConfig } = useAdminAuth();
  const { telegramLink, telegramVisible, setTelegramLink, setTelegramVisible } = useData();

  const [newId, setNewId] = useState(adminUsername);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savedCred, setSavedCred] = useState(false);
  const [credError, setCredError] = useState('');
  const [adminApiToken, setAdminApiToken] = useState('');
  const [savedToken, setSavedToken] = useState(false);

  const [pathInput, setPathInput] = useState(adminPath);
  const [savedPath, setSavedPath] = useState(false);

  const [tgLink, setTgLink] = useState(telegramLink);
  const [savedTg, setSavedTg] = useState(false);

  useEffect(() => {
    try {
      setAdminApiToken(localStorage.getItem(ADMIN_API_TOKEN_STORAGE_KEY) || '');
    } catch {
      setAdminApiToken('');
    }
  }, []);

  useEffect(() => {
    refreshAdminConfig()
      .then((config) => {
        setNewId(config.adminUsername);
        setPathInput(config.adminPath);
      })
      .catch((err) => {
        console.error('Failed to refresh admin config', err);
      });
  }, [refreshAdminConfig]);

  useEffect(() => {
    setNewId(adminUsername);
  }, [adminUsername]);

  useEffect(() => {
    setPathInput(adminPath);
  }, [adminPath]);

  const saveAuthSettings = async (adminPassword: string, successTarget: 'cred' | 'path') => {
    const username = newId.trim();
    if (!username) {
      setCredError('아이디를 입력하세요.');
      setSavedCred(false);
      setSavedPath(false);
      return;
    }
    if (adminPassword.trim() && adminPassword.length < 6) {
      setCredError('비밀번호는 6자 이상이어야 합니다.');
      setSavedCred(false);
      setSavedPath(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/auth-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(),
        },
        body: JSON.stringify({
          adminPath: pathInput,
          adminUsername: username,
          adminPassword,
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.ok) {
        throw new Error(body?.message || body?.error || `Request failed with ${res.status}`);
      }

      applyAdminConfig(body.data);
      setNewId(body.data.adminUsername);
      setPathInput(body.data.adminPath);
      setNewPw('');
      setCredError('');

      if (successTarget === 'cred') {
        setSavedCred(true);
        setTimeout(() => setSavedCred(false), 5000);
      } else {
        setSavedPath(true);
        setTimeout(() => setSavedPath(false), 5000);
      }
    } catch (err) {
      setCredError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setSavedCred(false);
      setSavedPath(false);
    }
  };

  const handleSaveCred = () => {
    void saveAuthSettings(newPw, 'cred');
  };

  const handleSavePath = () => {
    void saveAuthSettings('', 'path');
  };

  const handleSaveAdminApiToken = () => {
    try {
      const token = adminApiToken.trim();
      if (token) {
        localStorage.setItem(ADMIN_API_TOKEN_STORAGE_KEY, token);
        setAdminApiToken(token);
      } else {
        localStorage.removeItem(ADMIN_API_TOKEN_STORAGE_KEY);
      }
      setSavedToken(true);
      setTimeout(() => setSavedToken(false), 3000);
    } catch {
      setSavedToken(false);
    }
  };

  const handleSaveTg = () => {
    setTelegramLink(tgLink.trim() || 'https://t.me/junchae_admin');
    setSavedTg(true);
    setTimeout(() => setSavedTg(false), 3000);
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
            placeholder="admin"
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
              placeholder="비워두면 변경하지 않음"
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
            <span className="text-[11px] font-mono text-emerald-300">저장 완료. 관리자 주소가 변경된 경우 새 주소로 다시 접속해 주세요.</span>
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

      {/* API Token Settings */}
      <div className="glass-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <KeyRound size={14} className="text-neon-orange" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">API Token 설정</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          관리자 저장/수정/삭제 요청과 n8n 자동 등록에 사용되는 x-admin-token입니다.
        </p>

        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">
            x-admin-token
          </label>
          <input
            type="password"
            value={adminApiToken}
            onChange={(e) => setAdminApiToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAdminApiToken();
            }}
            className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all"
            placeholder="x-admin-token"
          />
        </div>

        {savedToken && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <Check size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300">API Token이 저장되었습니다.</span>
          </div>
        )}

        <button
          onClick={handleSaveAdminApiToken}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-obsidian-600 border border-white/[0.08] text-slate-200 text-sm font-bold hover:bg-obsidian-500 transition-colors"
        >
          <KeyRound size={14} />
          API Token 저장
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
              저장 완료. 관리자 주소가 변경된 경우 새 주소로 다시 접속해 주세요.
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

      {/* Telegram Control Panel */}
      <div className="glass-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Send size={14} className="text-neon-orange" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">텔레그램 제어판</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          메인 화면 하단 및 플로팅 버튼에 노출되는 텔레그램 문의 링크를 관리합니다. 변경 즉시 메인 대문에 반영됩니다.
        </p>

        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 block">
            텔레그램 링크
          </label>
          <input
            type="text"
            value={tgLink}
            onChange={(e) => setTgLink(e.target.value)}
            className="w-full bg-obsidian-700/60 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-neon-orange/40 focus:ring-1 focus:ring-neon-orange/20 transition-all"
            placeholder="https://t.me/계정ID"
          />
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-obsidian-700/40 border border-white/[0.04]">
          <div>
            <span className="text-xs text-slate-300 font-semibold">노출 상태</span>
            <p className="text-[10px] text-slate-600 mt-0.5">메인 화면 텔레그램 버튼 노출/숨김</p>
          </div>
          <button
            onClick={() => setTelegramVisible(!telegramVisible)}
            className="flex items-center gap-2"
          >
            {telegramVisible ? (
              <><ToggleRight size={24} className="text-neon-orange" /><span className="text-xs text-neon-orange font-semibold">ON</span></>
            ) : (
              <><ToggleLeft size={24} className="text-slate-600" /><span className="text-xs text-slate-600 font-semibold">OFF</span></>
            )}
          </button>
        </div>

        {savedTg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <Check size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300">텔레그램 링크가 저장되었습니다. 메인에서 즉시 반영됩니다.</span>
          </div>
        )}

        <button
          onClick={handleSaveTg}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neon-orange text-white text-sm font-bold hover:bg-neon-orangeDark transition-colors shadow-[0_0_10px_rgba(249,115,22,0.3)]"
        >
          <Send size={14} />
          텔레그램 링크 저장
        </button>
      </div>
    </div>
  );
}
