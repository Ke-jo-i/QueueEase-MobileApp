import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MotionButton, settleSpring } from './motion';

type NavItem = { id: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; selectedIcon: ComponentProps<typeof Ionicons>['name'] };
type NavProps = { items: readonly NavItem[]; selected: string; onSelect: (id: string) => void; onLongPress?: (id: string) => void; tabs?: boolean };

function NavIcon({ item, selected, position, index }: { item: NavItem; selected: boolean; position: SharedValue<number>; index: number }) {
  const colors = useAppTheme();
  const motion = useAnimatedStyle(() => {
    const emphasis = Math.max(0, 1 - Math.abs(position.get() - index));
    return { transform: [{ translateY: -2 * emphasis }, { scale: 1 + 0.06 * emphasis }] };
  });
  return <Animated.View style={motion}><Ionicons name={selected ? item.selectedIcon : item.icon} size={22} color={selected ? colors.brandText : colors.textMuted} /></Animated.View>;
}

export function NavigationBar({ items, selected, onSelect, onLongPress, tabs = false }: NavProps) {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, items.findIndex(item => item.id === selected));
  const position = useSharedValue(index);
  useEffect(() => { position.set(withSpring(index, settleSpring)); }, [index, position]);
  const indicator = useAnimatedStyle(() => ({ opacity: width > 0 ? 1 : 0, transform: [{ translateX: width / items.length * (position.get() + 0.5) - 23 }] }));
  return <View accessibilityRole={tabs ? 'tablist' : undefined} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', paddingBottom: Math.max(8, insets.bottom), paddingTop: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 6, left: 0, width: 46, height: 30, borderRadius: 15, backgroundColor: colors.infoSurface }, indicator]} />
    {items.map((item, itemIndex) => <MotionButton key={item.id} accessibilityLabel={item.label} accessibilityRole={tabs ? 'tab' : 'button'} accessibilityState={{ selected: item.id === selected }}
      onPress={() => onSelect(item.id)} onLongPress={() => onLongPress?.(item.id)}
      style={{ flex: 1, minHeight: tabs ? 48 : 46, gap: 3, alignItems: 'center', justifyContent: 'center' }}>
      <NavIcon item={item} selected={item.id === selected} position={position} index={itemIndex} />
      <Text style={{ fontSize: 11, lineHeight: 15, fontWeight: '600', color: item.id === selected ? colors.brandText : colors.textMuted }}>{item.label}</Text>
    </MotionButton>)}
  </View>;
}
