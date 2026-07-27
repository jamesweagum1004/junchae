import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type AppMode = 'standard' | 'secure';

interface ThemeContextType {
  mode: AppMode;
  isSecure: boolean;
  toggleMode: () => void;
  setMode: (m: AppMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'standard',
  isSecure: false,
  toggleMode: () => {},
  setMode: () => {},
});

const MODE_STORAGE_KEY = 'junchae_mode';
const secureQueryModes = new Set(['secure', 'safe', 'sec']);

const isAppMode = (value: unknown): value is AppMode =>
  value === 'standard' || value === 'secure';

const readInitialMode = (): AppMode => {
  if (typeof window === 'undefined') return 'standard';

  try {
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get('mode')?.trim().toLowerCase();

    if (queryMode && secureQueryModes.has(queryMode)) {
      window.localStorage.setItem(MODE_STORAGE_KEY, 'secure');
      params.delete('mode');
      const nextSearch = params.toString();
      const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl || '/');
      return 'secure';
    }

    const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (isAppMode(savedMode)) return savedMode;
  } catch {
    // Fall back to standard mode when storage or history is unavailable.
  }

  return 'standard';
};

const persistMode = (mode: AppMode) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures.
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(readInitialMode);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'standard' ? 'secure' : 'standard';
      persistMode(next);
      return next;
    });
  }, []);

  const setMode = useCallback((m: AppMode) => {
    persistMode(m);
    setModeState(m);
  }, []);

  const isSecure = mode === 'secure';

  return (
    <ThemeContext.Provider value={{ mode, isSecure, toggleMode, setMode }}>
      <div className={isSecure ? 'dark' : ''} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
