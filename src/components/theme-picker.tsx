import { ThemeOptions } from '@/constants/app-colors';
import { useAppearance } from '@/contexts/appearance';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Reveal } from './motion';

export function ThemePicker() {
  const { themeName, setThemeName, isReady } = useAppearance();
  const colors = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const currentTheme = ThemeOptions.find((option) => option.id === themeName) ?? ThemeOptions[0];

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel="Color Theme"
        accessibilityState={{ expanded }}
      >
        <View style={styles.toggleLabel}>
          <Text style={[styles.title, { color: colors.text }]}>Color Theme</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{currentTheme.label}</Text>
        </View>
        <View style={[styles.swatch, { backgroundColor: currentTheme.swatch, borderColor: colors.borderStrong }]} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {expanded && <Reveal style={styles.options} accessibilityRole="radiogroup">
        {ThemeOptions.map((option) => {
          const selected = themeName === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, {
                backgroundColor: selected ? colors.blueSoft : colors.surface,
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
            </Pressable>
          );
        })}
      </Reveal>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1 },
  toggle: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  toggleLabel: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 3 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 16 },
  option: { minWidth: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderWidth: 1.5, borderRadius: 10 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  optionLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
