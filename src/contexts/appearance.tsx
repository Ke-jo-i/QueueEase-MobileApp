import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { ThemeName, ThemeOptions } from '@/constants/app-colors';

type ColorScheme = 'light' | 'dark';
type AppearancePreference = {
  colorScheme: ColorScheme;
  setDarkMode: (enabled: boolean) => void;
  themeName: ThemeName;
  setThemeName: (theme: ThemeName) => void;
  isReady: boolean;
  storageError: boolean;
};

const colorSchemeKey = 'queueease.color-scheme';
const themeKey = 'queueease.theme';
const AppearanceContext = createContext<AppearancePreference | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [themeName, setThemeNameState] = useState<ThemeName>('classic');
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(colorSchemeKey), AsyncStorage.getItem(themeKey)])
      .then(([savedScheme, savedTheme]) => {
        if (!active) return;
        if (savedScheme === 'light' || savedScheme === 'dark') setColorScheme(savedScheme);
        if (ThemeOptions.some((option) => option.id === savedTheme)) setThemeNameState(savedTheme as ThemeName);
      })
      .catch(() => { if (active) setStorageError(true); })
      .finally(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(colorScheme);
  }, [colorScheme]);

  const setDarkMode = (enabled: boolean) => {
    if (!isReady) return;
    const nextScheme = enabled ? 'dark' : 'light';
    setColorScheme(nextScheme);
    pendingWrite.current = pendingWrite.current
      .then(() => AsyncStorage.setItem(colorSchemeKey, nextScheme))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  };

  const setThemeName = (nextTheme: ThemeName) => {
    if (!isReady || !ThemeOptions.some((option) => option.id === nextTheme)) return;
    setThemeNameState(nextTheme);
    pendingWrite.current = pendingWrite.current
      .then(() => AsyncStorage.setItem(themeKey, nextTheme))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  };

  return (
    <AppearanceContext.Provider value={{ colorScheme, setDarkMode, themeName, setThemeName, isReady, storageError }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const preference = useContext(AppearanceContext);
  if (!preference) throw new Error('useAppearance must be used within AppearanceProvider');
  return preference;
}
