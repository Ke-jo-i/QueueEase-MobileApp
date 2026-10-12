import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppearance } from '@/contexts/appearance';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';

export function DarkModeToggle() {
  const { colorScheme, setDarkMode, isReady, storageError, isTransitioning } = useAppearance();
  const colors = useAppTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.infoSurface }]}><Ionicons name={colorScheme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={19} color={colors.brandText} /></View>
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
        disabled={!isReady || isTransitioning}
        trackColor={{ false: colors.borderStrong, true: colors.brand }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 72, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, paddingRight: 12 },
  title: { fontSize: 15, fontWeight: '600' },
});
