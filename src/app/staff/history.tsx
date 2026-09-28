import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { useQueue } from '@/contexts/queue';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffHistoryScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { staffHistory } = useQueue();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Queue History</Text>
        {staffHistory.length === 0 ? (
          <Text style={styles.empty}>Completed tickets will appear here.</Text>
        ) : staffHistory.map((ticket) => (
          <View key={ticket.number} style={styles.card}>
            <Text style={styles.number}>{ticket.number}</Text>
            <Text style={styles.service}>{ticket.service}</Text>
            <Text style={styles.detail}>{ticket.window} · {ticket.status} · {ticket.date}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/staff/dashboard')}>
          <Ionicons name="list-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time" size={22} color={colors.brandText} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/staff/profile')}>
          <Ionicons name="person-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.brandText, marginBottom: 20, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: colors.surfaceSubtle },
  number: { fontSize: 18, fontWeight: '800', color: colors.brandText },
  service: { color: colors.textBody, marginTop: 4 },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingVertical: 12 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: colors.textDisabled, fontSize: 11, fontWeight: '600', marginTop: 2 },
  activeNavLabel: { color: colors.brandText, fontWeight: '800' },
});
