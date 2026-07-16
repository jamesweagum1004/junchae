import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const STORAGE_KEYS = {
  cred: 'admin_cred',
  session: 'admin_session',
  failCount: 'admin_fail_count',
  lockUntil: 'admin_lock_until',
  adminPath: 'admin_path',
};

const DEFAULT_CRED = { id: 'admin', pw: 'change-me-now' };
const DEFAULT_ADMIN_PATH = 'admin';
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

interface AdminCred { id: string; pw: string }

interface AdminAuthType {
  isAuthenticated: boolean;
  cred: AdminCred;
  adminPath: string;
  login: (id: string, pw: string) => { ok: boolean; locked?: boolean; remaining?: number };
  logout: () => void;
  updateCred: (next: AdminCred) => void;
  updateAdminPath: (path: string) => void;
  failCount: number;
  lockRemaining: number;
}

const AdminAuthContext = createContext<AdminAuthType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [cred, setCred] = useState<AdminCred>(DEFAULT_CRED);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPath, setAdminPath] = useState(DEFAULT_ADMIN_PATH);
  const [failCount, setFailCount] = useState(0);
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    try {
      const savedCred = localStorage.getItem(STORAGE_KEYS.cred);
      if (savedCred) setCred(JSON.parse(savedCred));
      else localStorage.setItem(STORAGE_KEYS.cred, JSON.stringify(DEFAULT_CRED));

      const savedPath = localStorage.getItem(STORAGE_KEYS.adminPath);
      if (savedPath) setAdminPath(savedPath);
      else localStorage.setItem(STORAGE_KEYS.adminPath, DEFAULT_ADMIN_PATH);

      const session = sessionStorage.getItem(STORAGE_KEYS.session);
      if (session === 'true') setIsAuthenticated(true);

      const fc = Number(localStorage.getItem(STORAGE_KEYS.failCount) || 0);
      setFailCount(fc);

      const lu = Number(localStorage.getItem(STORAGE_KEYS.lockUntil) || 0);
      if (lu && lu > Date.now()) {
        setLockRemaining(Math.ceil((lu - Date.now()) / 1000));
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const login = useCallback((id: string, pw: string): { ok: boolean; locked?: boolean; remaining?: number } => {
    const lu = Number(localStorage.getItem(STORAGE_KEYS.lockUntil) || 0);
    if (lu && lu > Date.now()) {
      return { ok: false, locked: true, remaining: Math.ceil((lu - Date.now()) / 1000) };
    }

    if (id === cred.id && pw === cred.pw) {
      setIsAuthenticated(true);
      setFailCount(0);
      localStorage.setItem(STORAGE_KEYS.failCount, '0');
      localStorage.removeItem(STORAGE_KEYS.lockUntil);
      sessionStorage.setItem(STORAGE_KEYS.session, 'true');
      return { ok: true };
    }

    const nextFail = failCount + 1;
    setFailCount(nextFail);
    localStorage.setItem(STORAGE_KEYS.failCount, String(nextFail));

    if (nextFail >= MAX_FAILS) {
      const lockUntil = Date.now() + LOCK_MS;
      localStorage.setItem(STORAGE_KEYS.lockUntil, String(lockUntil));
      setLockRemaining(Math.ceil(LOCK_MS / 1000));
      return { ok: false, locked: true, remaining: Math.ceil(LOCK_MS / 1000) };
    }

    return { ok: false };
  }, [cred, failCount]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEYS.session);
  }, []);

  const updateCred = useCallback((next: AdminCred) => {
    setCred(next);
    localStorage.setItem(STORAGE_KEYS.cred, JSON.stringify(next));
  }, []);

  const updateAdminPath = useCallback((path: string) => {
    const clean = path.replace(/^\/+/, '').trim();
    setAdminPath(clean || DEFAULT_ADMIN_PATH);
    localStorage.setItem(STORAGE_KEYS.adminPath, clean || DEFAULT_ADMIN_PATH);
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      isAuthenticated, cred, adminPath, login, logout, updateCred, updateAdminPath,
      failCount, lockRemaining,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
