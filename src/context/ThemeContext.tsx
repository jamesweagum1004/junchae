import { createContext, useContext, useState, ReactNode } from 'react';

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('standard');

  const toggleMode = () => {
    setModeState((prev) => (prev === 'standard' ? 'secure' : 'standard'));
  };

  const setMode = (m: AppMode) => setModeState(m);

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
