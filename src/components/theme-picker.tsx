import { ThemeOptions } from '@/constants/app-colors';
import { useAppearance } from '@/contexts/appearance';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Disclosure } from './disclosure';
import { MotionButton } from './motion';

export function ThemePicker() {
  const { themeName, setThemeName, isReady } = useAppearance();
  const colors = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const currentTheme = ThemeOptions.find((option) => option.id === themeName) ?? ThemeOptions[0];

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <MotionButton
        style={styles.toggle}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel="Color Theme"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.icon, { backgroundColor: colors.infoSurface }]}><Ionicons name="color-palette-outline" size={19} color={colors.brandText} /></View>
        <View style={styles.toggleLabel}>
          <Text style={[styles.title, { color: colors.text }]}>Color Theme</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{currentTheme.label}</Text>
        </View>
        <View style={[styles.swatch, { backgroundColor: currentTheme.swatch, borderColor: colors.borderStrong }]} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </MotionButton>
      <Disclosure open={expanded} style={styles.options} accessibilityRole="radiogroup">
        {ThemeOptions.map((option) => {
          const selected = themeName === option.id;
          return (
            <MotionButton
              key={option.id}
              style={[styles.option, {
                backgroundColor: selected ? colors.infoSurface : colors.surfaceSubtle,
                borderColor: selected ? colors.brandText : colors.border,
              }]}
              onPress={() => {
                setThemeName(option.id);
                setExpanded(false);
              }}
              disabled={!isReady}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: selected, disabled: !isReady }}
              aria-checked={selected}
            >
              <View style={[styles.swatch, { backgroundColor: option.swatch, borderColor: colors.borderStrong }]} />
              <Text style={[styles.optionLabel, { color: selected ? colors.brandText : colors.textBody }]} numberOfLines={1}>
                {option.label}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={18} color={colors.brandText} />}
            </MotionButton>
          );
        })}
      </Disclosure>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  toggle: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 18, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 3 },
  options: { gap: 8, paddingHorizontal: 18, paddingBottom: 18 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 16 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  optionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
});
