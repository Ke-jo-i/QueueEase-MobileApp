import { useIsFocused } from 'expo-router';
import { type useTabsWithTriggers } from 'expo-router/ui';
import { useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export type TabNavigation = ReturnType<typeof useTabsWithTriggers>['navigation'];

export function useTabSelection(navigation: TabNavigation) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const gate = useRef<{ timer?: ReturnType<typeof setTimeout>; pending: string | null }>({ pending: null });
  const cancel = useCallback(() => {
    clearTimeout(gate.current.timer);
    gate.current.timer = undefined;
    gate.current.pending = null;
  }, []);
  useEffect(() => { if (!focused) cancel(); return cancel; }, [focused, cancel]);
  return useCallback((id: string, immediate = false) => {
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
    if (immediate) { cancel(); commit(id); }
    else if (gate.current.timer !== undefined) gate.current.pending = id;
    else commit(id);
  }, [cancel, navigation, reduced]);
}
