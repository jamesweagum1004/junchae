import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

const STORAGE_KEYS = {
  legacyCred: 'admin_cred',
  session: 'admin_session',
  failCount: 'admin_fail_count',
  lockUntil: 'admin_lock_until',
  legacyAdminPath: 'admin_path',
};

const DEFAULT_ADMIN_PATH = 'admin';
const DEFAULT_ADMIN_USERNAME = 'admin1004';
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

interface AdminConfig {
  adminPath: string;
  adminUsername: string;
}

interface LoginResult {
  ok: boolean;
  locked?: boolean;
  remaining?: number;
}

interface AdminAuthType {
  isAuthenticated: boolean;
  isConfigLoaded: boolean;
  adminPath: string;
  adminUsername: string;
  login: (id: string, pw: string) => Promise<LoginResult>;
  logout: () => void;
  refreshAdminConfig: () => Promise<AdminConfig>;
  applyAdminConfig: (config: AdminConfig) => void;
  failCount: number;
  lockRemaining: number;
}

const AdminAuthContext = createContext<AdminAuthType | null>(null);

function cleanAdminPath(path: string) {
  const clean = path.replace(/[\/\\]+/g, '').replace(/\s+/g, '').trim();
  return /^[a-zA-Z0-9_-]+$/.test(clean) ? clean : DEFAULT_ADMIN_PATH;
}

async function fetchAdminConfig(): Promise<AdminConfig> {
  const res = await fetch('/api/admin/config');
  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || `Request failed with ${res.status}`);
  }

  return {
    adminPath: cleanAdminPath(body.data?.adminPath || DEFAULT_ADMIN_PATH),
    adminUsername: String(body.data?.adminUsername || DEFAULT_ADMIN_USERNAME),
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminPath, setAdminPath] = useState(DEFAULT_ADMIN_PATH);
  const [adminUsername, setAdminUsername] = useState(DEFAULT_ADMIN_USERNAME);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockRemaining, setLockRemaining] = useState(0);

  const applyAdminConfig = useCallback((config: AdminConfig) => {
    setAdminPath(cleanAdminPath(config.adminPath));
    setAdminUsername(config.adminUsername.trim() || DEFAULT_ADMIN_USERNAME);
  }, []);

  const refreshAdminConfig = useCallback(async () => {
    const config = await fetchAdminConfig();
    applyAdminConfig(config);
    return config;
  }, [applyAdminConfig]);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.legacyCred);
      localStorage.removeItem(STORAGE_KEYS.legacyAdminPath);

      const session = sessionStorage.getItem(STORAGE_KEYS.session);
      if (session === 'true') setIsAuthenticated(true);

      const fc = Number(localStorage.getItem(STORAGE_KEYS.failCount) || 0);
      setFailCount(fc);

      const lu = Number(localStorage.getItem(STORAGE_KEYS.lockUntil) || 0);
      if (lu && lu > Date.now()) {
        setLockRemaining(Math.ceil((lu - Date.now()) / 1000));
      }
    } catch {
      // Browser storage may be unavailable.
    }

    refreshAdminConfig().catch((err) => {
      console.error('Failed to load admin config', err);
      applyAdminConfig({
        adminPath: DEFAULT_ADMIN_PATH,
        adminUsername: DEFAULT_ADMIN_USERNAME,
      });
    }).finally(() => {
      setIsConfigLoaded(true);
    });
  }, [applyAdminConfig, refreshAdminConfig]);

  const login = useCallback(async (id: string, pw: string): Promise<LoginResult> => {
    const lu = Number(localStorage.getItem(STORAGE_KEYS.lockUntil) || 0);
    if (lu && lu > Date.now()) {
      return { ok: false, locked: true, remaining: Math.ceil((lu - Date.now()) / 1000) };
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, password: pw }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setFailCount(0);
        localStorage.setItem(STORAGE_KEYS.failCount, '0');
        localStorage.removeItem(STORAGE_KEYS.lockUntil);
        sessionStorage.setItem(STORAGE_KEYS.session, 'true');
        await refreshAdminConfig().catch(() => undefined);
        return { ok: true };
      }
    } catch (err) {
      console.error('Admin login request failed', err);
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
  }, [failCount, refreshAdminConfig]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEYS.session);
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      isAuthenticated,
      isConfigLoaded,
      adminPath,
      adminUsername,
      login,
      logout,
      refreshAdminConfig,
      applyAdminConfig,
      failCount,
      lockRemaining,
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
