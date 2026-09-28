import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppearance } from '@/contexts/appearance';
import { useAppTheme } from '@/hooks/use-app-theme';

export function DarkModeToggle() {
  const { colorScheme, setDarkMode, isReady, storageError } = useAppearance();
  const colors = useAppTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.label}>
        <Text style={[styles.title, { color: colors.text }]}>Dark Mode</Text>
        {storageError && (
          <Text accessibilityRole="alert" style={{ color: colors.textMuted }}>
            Appearance works, but your preference could not be saved.
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel="Dark mode"
        value={colorScheme === 'dark'}
        onValueChange={setDarkMode}
        disabled={!isReady}
        trackColor={{ false: colors.borderStrong, true: colors.blueLight }}
        thumbColor={colorScheme === 'dark' ? colors.brandText : colors.surfaceMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1 },
  label: { flex: 1, paddingRight: 12 },
  title: { fontSize: 14, fontWeight: '700' },
});
