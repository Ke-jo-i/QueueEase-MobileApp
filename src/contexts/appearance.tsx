import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Appearance, Platform } from 'react-native';

type ColorScheme = 'light' | 'dark';
type AppearancePreference = {
  colorScheme: ColorScheme;
  setDarkMode: (enabled: boolean) => void;
  isReady: boolean;
  storageError: boolean;
};

const storageKey = 'queueease.color-scheme';
const AppearanceContext = createContext<AppearancePreference | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (active && (saved === 'light' || saved === 'dark')) setColorScheme(saved);
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
      .then(() => AsyncStorage.setItem(storageKey, nextScheme))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  };

  return (
    <AppearanceContext.Provider value={{ colorScheme, setDarkMode, isReady, storageError }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const preference = useContext(AppearanceContext);
  if (!preference) throw new Error('useAppearance must be used within AppearanceProvider');
  return preference;
}
