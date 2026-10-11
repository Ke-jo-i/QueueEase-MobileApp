import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Text, View } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MotionButton, settleSpring } from './motion';

export function SettingsRow({ title, subtitle, icon, expanded, onPress, danger = false }: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  expanded?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useAppTheme();
  const rotation = useSharedValue(expanded ? 90 : 0);
  useEffect(() => { rotation.set(withSpring(expanded ? 90 : 0, settleSpring)); }, [expanded, rotation]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return <MotionButton accessibilityLabel={title} accessibilityState={expanded === undefined ? undefined : { expanded }}
    onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 68, paddingHorizontal: 18, paddingVertical: 12 }}>
    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: danger ? colors.dangerSubtle : colors.infoSurface, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={19} color={danger ? colors.dangerStrong : colors.brandText} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? colors.dangerStrong : colors.text }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>{subtitle}</Text>}
    </View>
    <Animated.View style={chevron}><Ionicons name="chevron-forward" size={17} color={colors.textMuted} /></Animated.View>
  </MotionButton>;
}
