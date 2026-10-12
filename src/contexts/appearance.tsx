import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { ThemeName, ThemeOptions } from '@/constants/app-colors';

type ColorScheme = 'light' | 'dark';
export type AppearanceTransition = (apply: () => void, finished: () => void) => void;
type AppearancePreference = {
  colorScheme: ColorScheme;
  setDarkMode: (enabled: boolean) => void;
  themeName: ThemeName;
  setThemeName: (theme: ThemeName) => void;
  isReady: boolean;
  storageError: boolean;
  isTransitioning: boolean;
  registerTransition: (transition: AppearanceTransition, priority: number) => () => void;
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
  const transitions = useRef<{ transition: AppearanceTransition; priority: number }[]>([]);
  const changing = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const registerTransition = useCallback((transition: AppearanceTransition, priority: number) => {
    const entry = { transition, priority };
    transitions.current.push(entry);
    return () => { transitions.current = transitions.current.filter(item => item !== entry); };
  }, []);
  const changeAppearance = (apply: () => void) => {
    if (changing.current) return;
    const surface = transitions.current.reduce<typeof transitions.current[number] | undefined>((selected, item) => !selected || item.priority >= selected.priority ? item : selected, undefined);
    if (!surface) { apply(); return; }
    changing.current = true;
    setIsTransitioning(true);
    let applied = false;
    let settled = false;
    const commit = () => { if (!applied) { applied = true; apply(); } };
    const finish = () => {
      if (settled) return;
      settled = true;
      commit();
      changing.current = false;
      setIsTransitioning(false);
    };
    try { surface.transition(commit, finish); }
    catch { finish(); }
  };

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
    if (!isReady || changing.current) return;
    const nextScheme = enabled ? 'dark' : 'light';
    if (nextScheme === colorScheme) return;
    changeAppearance(() => {
      setColorScheme(nextScheme);
      pendingWrite.current = pendingWrite.current
      .then(() => AsyncStorage.setItem(colorSchemeKey, nextScheme))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
    });
  };

  const setThemeName = (nextTheme: ThemeName) => {
    if (!isReady || changing.current || nextTheme === themeName || !ThemeOptions.some((option) => option.id === nextTheme)) return;
    changeAppearance(() => {
      setThemeNameState(nextTheme);
      pendingWrite.current = pendingWrite.current
      .then(() => AsyncStorage.setItem(themeKey, nextTheme))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
    });
  };

  return (
    <AppearanceContext.Provider value={{ colorScheme, setDarkMode, themeName, setThemeName, isReady, storageError, isTransitioning, registerTransition }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const preference = useContext(AppearanceContext);
  if (!preference) throw new Error('useAppearance must be used within AppearanceProvider');
  return preference;
}
