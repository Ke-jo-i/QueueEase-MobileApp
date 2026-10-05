import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { requestTurnAlerts } from '@/data/notifications';

const key = 'queueease.turn-alerts';
const Context = createContext<{ enabled: boolean; toggle: () => Promise<boolean> }>({ enabled: false, toggle: async () => false });
export function TurnAlertsProvider({ children }: PropsWithChildren) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(key).then((value) => setEnabled(value === 'true')).catch(() => {}); }, []);
  return <Context.Provider value={{ enabled, toggle: async () => {
    const next = enabled ? false : await requestTurnAlerts();
    await AsyncStorage.setItem(key, String(next)); setEnabled(next); return next;
  } }}>{children}</Context.Provider>;
}
export const useTurnAlerts = () => useContext(Context);
