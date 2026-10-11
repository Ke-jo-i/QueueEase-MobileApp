import { type Tabs, useIsFocused } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function useTabSelection(navigation: TabBarProps['navigation']) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const gate = useRef<{ timer?: ReturnType<typeof setTimeout>; pending: string | null }>({ pending: null });
  const cancel = useCallback(() => {
    clearTimeout(gate.current.timer);
    gate.current.timer = undefined;
    gate.current.pending = null;
  }, []);
  useEffect(() => { if (!focused) cancel(); return cancel; }, [focused, cancel]);
  return useCallback((id: string) => {
    const commit = (target: string) => {
      const state = navigation.getState();
      const route = state.routes.find(route => route.name === target);
      if (!route || state.routes[state.index].key === route.key) return;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (event.defaultPrevented) return;
      if (!reduced) gate.current.timer = setTimeout(() => {
        gate.current.timer = undefined;
        const next = gate.current.pending;
        gate.current.pending = null;
        if (next) commit(next);
      }, 250);
      navigation.navigate(route.name, route.params);
    };
    if (gate.current.timer !== undefined) gate.current.pending = id;
    else commit(id);
  }, [navigation, reduced]);
}
