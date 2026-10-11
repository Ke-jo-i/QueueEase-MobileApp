import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { type SharedValue, cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GlassSurface } from './glass-surface';
import { MotionButton, settleSpring } from './motion';

type NavItem = { id: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; selectedIcon: ComponentProps<typeof Ionicons>['name'] };
type NavProps = { items: readonly NavItem[]; selected: string; onSelect: (id: string) => void; onLongPress?: (id: string) => void; tabs?: boolean };

function createTouchGate() {
  let startedAt = 0;
  let dragging = false;
  let until = 0;
  return {
    begin: () => { startedAt = Date.now(); },
    elapsed: () => Date.now() - startedAt,
    drag: (active: boolean) => { dragging = active; until = active ? Infinity : Date.now() + 120; },
    reset: () => { if (!dragging) until = 0; },
    allowsPress: () => Date.now() >= until,
  };
}

function NavIcon({ item, selected, position, held, index, reduced }: { item: NavItem; selected: boolean; position: SharedValue<number>; held: SharedValue<number>; index: number; reduced: boolean }) {
  const colors = useAppTheme();
  const motion = useAnimatedStyle(() => {
    const emphasis = Math.max(0, 1 - Math.abs(position.get() - index));
    return { transform: [{ translateY: reduced ? 0 : -2 * emphasis }, { scale: reduced ? 1 : 1 + emphasis * (0.06 + held.get() * 0.06) }] };
  });
  return <Animated.View style={motion}><Ionicons name={selected ? item.selectedIcon : item.icon} size={22} color={selected ? colors.brandText : colors.textMuted} /></Animated.View>;
}

export function NavigationBar({ items, selected, onSelect, onLongPress, tabs = false }: NavProps) {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const index = Math.max(0, items.findIndex(item => item.id === selected));
  const count = items.length;
  const width = useSharedValue(0);
  const [barWidth, setBarWidth] = useState(0);
  const position = useSharedValue(index);
  const selectedPosition = useSharedValue(index);
  const held = useSharedValue(0);
  const stretch = useSharedValue(0);
  const dragging = useSharedValue(false);
  const startPosition = useSharedValue(index);
  const distance = useSharedValue(0);
  const [touch] = useState(createTouchGate);

  useEffect(() => {
    selectedPosition.set(index);
  }, [index, selectedPosition]);
  useAnimatedReaction(() => selectedPosition.get(), next => {
    if (!dragging.get()) position.set(reduced ? next : withSpring(next, settleSpring));
  }, [reduced]);

  const beginTouch = touch.begin;
  const setDragging = touch.drag;
  const commit = useCallback((target: number, stationaryHold: boolean) => {
    const item = items[target];
    if (!item) return;
    if (stationaryHold && touch.elapsed() >= 500) onLongPress?.(item.id);
    else onSelect(item.id);
  }, [items, onLongPress, onSelect, touch]);

  const pan = Gesture.Pan().activateAfterLongPress(180).maxPointers(1).shouldCancelWhenOutside(false)
    .onTouchesDown((event, manager) => {
      const touch = event.allTouches[0];
      const cell = width.get() / count;
      if (!touch || cell <= 0 || Math.abs(touch.x / cell - 0.5 - position.get()) > 0.5) {
        manager.fail();
        return;
      }
      runOnJS(beginTouch)();
      distance.set(0);
    })
    .onStart(() => {
      cancelAnimation(position);
      startPosition.set(position.get());
      dragging.set(true);
      held.set(reduced ? 0 : withSpring(1, settleSpring));
      runOnJS(setDragging)(true);
    })
    .onUpdate(event => {
      const cell = width.get() / count;
      if (cell <= 0) return;
      const next = startPosition.get() + event.translationX / cell;
      const bounded = Math.max(0, Math.min(count - 1, next));
      position.set(bounded + Math.max(-0.12, Math.min(0.12, (next - bounded) * 0.18)));
      distance.set(Math.max(distance.get(), Math.abs(event.translationX), Math.abs(event.translationY)));
      stretch.set(reduced ? 0 : withTiming(Math.min(14, Math.abs(event.velocityX) * 0.008), { duration: 75 }));
    })
    .onEnd((_event, success) => {
      if (!success) return;
      const target = Math.max(0, Math.min(count - 1, Math.round(position.get())));
      position.set(reduced ? target : withSpring(target, settleSpring));
      runOnJS(commit)(target, distance.get() < 7);
    })
    .onFinalize((_event, success) => {
      if (!dragging.get()) return;
      if (!success) position.set(reduced ? selectedPosition.get() : withSpring(selectedPosition.get(), settleSpring));
      held.set(reduced ? 0 : withSpring(0, settleSpring));
      stretch.set(reduced ? 0 : withSpring(0, settleSpring));
      dragging.set(false);
      runOnJS(setDragging)(false);
    });

  const indicator = useAnimatedStyle(() => {
    const cell = width.get() / count;
    const pillWidth = Math.max(1, cell - 4);
    return {
      opacity: width.get() > 0 ? 1 : 0,
      transform: [{ translateX: cell * (position.get() + 0.5) - pillWidth / 2 }, { scaleX: 1 + held.get() * 0.035 + stretch.get() / pillWidth }, { scaleY: 1 + held.get() * 0.065 - stretch.get() * 0.0015 }],
    };
  });

  return <View style={[styles.container, { paddingBottom: Math.max(8, insets.bottom) }]}>
    <GlassSurface interactive style={styles.surface}>
      <GestureDetector gesture={pan}>
        <Animated.View testID="navigation-bar" accessibilityRole={tabs ? 'tablist' : undefined} onLayout={event => { const next = event.nativeEvent.layout.width; width.set(next); setBarWidth(next); }} style={styles.bar}>
          <Animated.View testID="navigation-indicator" pointerEvents="none" style={[styles.indicator, { width: Math.max(0, barWidth / count - 4), backgroundColor: colors.infoSurface, borderColor: `${colors.brandText}24` }, indicator]} />
          {items.map((item, itemIndex) => <MotionButton key={item.id} accessibilityLabel={item.label} accessibilityRole={tabs ? 'tab' : 'button'} accessibilityState={{ selected: item.id === selected }}
            accessibilityHint={item.id === selected ? 'Hold and drag to another tab.' : undefined}
            onPressIn={touch.reset}
            onPress={() => { if (touch.allowsPress()) onSelect(item.id); }}
            onLongPress={item.id === selected ? undefined : () => onLongPress?.(item.id)}
            style={styles.item}>
            <NavIcon item={item} selected={item.id === selected} position={position} held={held} index={itemIndex} reduced={reduced} />
            <Text style={[styles.label, { color: item.id === selected ? colors.brandText : colors.textMuted }]}>{item.label}</Text>
          </MotionButton>)}
        </Animated.View>
      </GestureDetector>
    </GlassSurface>
  </View>;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 8, alignItems: 'center' },
  surface: { width: '100%', maxWidth: 560, padding: 6, borderRadius: 34 },
  bar: { flexDirection: 'row', height: 56, position: 'relative' },
  indicator: { position: 'absolute', top: 0, left: 0, height: 56, borderRadius: 28, borderWidth: 1 },
  item: { flex: 1, minWidth: 0, minHeight: 56, gap: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 28 },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
});
