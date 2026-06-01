import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'medqueue_manage_theme';

export const ManageThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function ManageThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return <ManageThemeContext.Provider value={value}>{children}</ManageThemeContext.Provider>;
}

export function useManageTheme() {
  const ctx = useContext(ManageThemeContext);
  if (!ctx) throw new Error('useManageTheme must be used within ManageThemeProvider');
  return ctx;
}

/** For login page — same preference without requiring provider */
export function getManageThemePreference() {
  return readStoredTheme();
}
