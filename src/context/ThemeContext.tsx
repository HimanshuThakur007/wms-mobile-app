import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { darkColors, lightColors, ThemeMode } from '../constants/theme';
import { SafeStorage } from '../utils/storage';

interface ThemeContextType {
  theme: ThemeMode;
  colors: typeof darkColors;
  isDark: boolean;
  isSystemTheme: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  useSystemTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkColors,
  isDark: true,
  isSystemTheme: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
  useSystemTheme: () => {},
});

const THEME_STORAGE_KEY = 'wms_theme_mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [userThemeOverride, setUserThemeOverride] = useState<ThemeMode | null>(null);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await SafeStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setUserThemeOverride(saved);
      }
    } catch (e) {
      console.log('Failed to load saved theme preference:', e);
    }
  };

  // Determine active theme: user override takes priority; otherwise default to system appearance
  const resolvedTheme: ThemeMode = userThemeOverride
    ? userThemeOverride
    : systemScheme === 'light'
    ? 'light'
    : 'dark';

  const isDark = resolvedTheme === 'dark';
  const isSystemTheme = userThemeOverride === null;
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = async () => {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setUserThemeOverride(next);
    try {
      await SafeStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      console.log('Failed to save theme:', e);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setUserThemeOverride(mode);
    try {
      await SafeStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.log('Failed to save theme mode:', e);
    }
  };

  const useSystemTheme = async () => {
    setUserThemeOverride(null);
    try {
      await SafeStorage.removeItem(THEME_STORAGE_KEY);
    } catch (e) {
      console.log('Failed to reset theme to system:', e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        colors,
        isDark,
        isSystemTheme,
        toggleTheme,
        setThemeMode,
        useSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

