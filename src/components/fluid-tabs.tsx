import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTabSelection } from '@/hooks/use-tab-selection';
import { type Href } from 'expo-router';
import { useTabsWithTriggers } from 'expo-router/ui';
import { type PropsWithChildren, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Screen, ScreenContainer } from 'react-native-screens';
import Animated, { cancelAnimation, Easing, type SharedValue, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { NavigationBar, type NavItem } from './navigation-bar';

type FluidItem = NavItem & { href: Href };

export function FluidPage({ children, index, focused, visible, position, width }: PropsWithChildren<{
  index: number; focused: boolean; visible: boolean; position: SharedValue<number>; width: number;
}>) {
  const colors = useAppTheme();
  const ref = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !(ref.current instanceof HTMLElement)) return;
    ref.current.inert = !focused;
  }, [focused]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (index - position.get()) * width }] }));
  const [loaded, setLoaded] = useState(visible);
  if (visible && !loaded) setLoaded(true);
  const content = <Animated.View ref={ref} pointerEvents={focused ? 'auto' : 'none'} accessibilityElementsHidden={!focused} importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'} aria-hidden={!focused}
    style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSubtle, display: visible ? 'flex' : 'none' }, style]}>
    {loaded ? children : null}
  </Animated.View>;
  return Platform.OS === 'web' ? content : <Screen activityState={visible ? 2 : 0} freezeOnBlur pointerEvents={focused ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>{content}</Screen>;
}

export function useFluidPager(selectedIndex: number, instant = false) {
  const reduced = useReducedMotion();
  const position = useSharedValue(selectedIndex);
  const active = useSharedValue(false);
  const [settled, setSettled] = useState(selectedIndex);
  const [warm, setWarm] = useState(false);
  const selectedRef = useRef(selectedIndex);
  useLayoutEffect(() => { selectedRef.current = selectedIndex; }, [selectedIndex]);
  const prepare = useCallback(() => setWarm(true), []);
  const settle = useCallback(() => { active.set(false); setWarm(false); setSettled(selectedRef.current); }, [active]);
  const complete = useCallback((index: number) => setSettled(index), []);
  useLayoutEffect(() => {
    if (active.get()) return;
    if (reduced || instant) { position.set(selectedIndex); return; }
    position.set(withTiming(selectedIndex, { duration: 220, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }, finished => {
      if (finished) runOnJS(complete)(selectedIndex);
    }));
  }, [active, instant, complete, position, reduced, selectedIndex]);
  useEffect(() => () => cancelAnimation(position), [position]);
  const moving = warm || (!reduced && !instant && settled !== selectedIndex);
  const scrub = useMemo(() => ({ position, active, prepare, settle }), [position, active, prepare, settle]);
  return { position, moving, scrub };
}

export function FluidTabs({ items, onSelect }: { items: readonly FluidItem[]; onSelect?: (id: string) => void }) {
  const colors = useAppTheme();
  const { booking } = useNavigationMotion();
  const { state, descriptors, navigation, NavigationContent } = useTabsWithTriggers({
    triggers: items.map(item => ({ type: 'internal', name: item.id, href: item.href })),
    backBehavior: 'initialRoute',
  });
  const selected = state.routes[state.index].name;
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === selected));
  const { position, moving, scrub } = useFluidPager(selectedIndex, booking);
  const [width, setWidth] = useState(0);
  const select = useTabSelection(navigation);
  return <NavigationContent>
    <View style={[styles.fill, { backgroundColor: colors.surfaceSubtle }]}>
      <ScreenContainer enabled={Platform.OS !== 'web'} hasTwoStates testID="tab-viewport" style={styles.viewport} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {state.routes.map((route, index) => <FluidPage key={route.key} index={items.findIndex(item => item.id === route.name)} focused={index === state.index} visible={moving || index === state.index} width={width} position={position}>
          {descriptors[route.key].render()}
        </FluidPage>)}
      </ScreenContainer>
      <NavigationBar tabs items={items} selected={selected} scrub={scrub}
        onSelect={(id, immediate) => { onSelect?.(id); select(id, immediate); }}
        onLongPress={id => { const route = state.routes.find(route => route.name === id); if (route) navigation.emit({ type: 'tabLongPress', target: route.key }); }} />
    </View>
  </NavigationContent>;
}

const styles = StyleSheet.create({ fill: { flex: 1 }, viewport: { flex: 1, overflow: 'hidden' } });
