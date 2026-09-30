import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { useQueue } from '@/contexts/queue';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

export default function StaffHistoryScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { staffHistory, reopenTicket } = useQueue();
  const [dateFilter, setDateFilter] = useState<'All Dates' | 'Today'>('All Dates');
  const [windowFilter, setWindowFilter] = useState('All Windows');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const windows = ['All Windows', ...Array.from(new Set(staffHistory.map((ticket) => ticket.window)))];
  const statuses = ['All Statuses', 'COMPLETED', 'HELD', 'SKIPPED', 'NO_SHOW', 'CANCELLED'];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const activeFilterCount = Number(dateFilter !== 'All Dates') + Number(windowFilter !== 'All Windows') + Number(statusFilter !== 'All Statuses');
  const filteredHistory = staffHistory.filter((ticket) => (
    (dateFilter === 'All Dates' || new Date(ticket.date).toDateString() === new Date().toDateString())
    && (windowFilter === 'All Windows' || ticket.window === windowFilter)
    && (statusFilter === 'All Statuses' || ticket.status === statusFilter)
    && (!normalizedSearch || ticket.number.toLowerCase().includes(normalizedSearch) || ticket.ownerId?.toLowerCase().includes(normalizedSearch))
  ));
  const getStatusStyle = (status: string) => {
    if (status === 'COMPLETED') return [styles.statusBadge, styles.completedBadge];
    if (status === 'HELD') return [styles.statusBadge, styles.heldBadge];
    return [styles.statusBadge, styles.exceptionBadge];
  };
  const getStatusTextStyle = (status: string) => {
    if (status === 'COMPLETED') return styles.completedStatusText;
    if (status === 'HELD') return styles.heldStatusText;
    if (status === 'SKIPPED') return styles.skippedStatusText;
    if (status === 'NO_SHOW') return styles.noShowStatusText;
    return styles.cancelledStatusText;
  };
  const formatTimestamp = (value: string) => new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const clearFilters = () => {
    setDateFilter('All Dates');
    setWindowFilter('All Windows');
    setStatusFilter('All Statuses');
    setSearchTerm('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.kicker}>STAFF ACTIVITY</Text>
            <Text style={styles.title}>Queue History</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredHistory.length}</Text>
            <Text style={styles.countLabel}>shown</Text>
          </View>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ticket # or ID"
              accessibilityLabel="Search ticket number or student ID"
              placeholderTextColor={colors.textDisabled}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
            />
            {!!searchTerm && (
              <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterTrigger, activeFilterCount > 0 && styles.filterTriggerActive]}
            onPress={() => setFiltersOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            accessibilityState={{ expanded: filtersOpen }}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? colors.brandText : colors.textBody} />
            <Text style={[styles.filterTriggerText, activeFilterCount > 0 && styles.filterTriggerTextActive]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        {filtersOpen && <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <Text style={styles.filterPanelTitle}>Filter records</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.filterLabel}>Date</Text>
          <View style={styles.filterRow}>
            {(['All Dates', 'Today'] as const).map((filter) => (
              <TouchableOpacity key={filter} style={[styles.filterButton, dateFilter === filter && styles.filterButtonActive]} onPress={() => setDateFilter(filter)}>
                <Text style={[styles.filterText, dateFilter === filter && styles.filterTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Window</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {windows.map((filter) => (
              <TouchableOpacity key={filter} style={[styles.filterButton, windowFilter === filter && styles.filterButtonActive]} onPress={() => setWindowFilter(filter)}>
                <Text style={[styles.filterText, windowFilter === filter && styles.filterTextActive]}>{filter.replace(' - Registrar', '')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {statuses.map((filter) => (
              <TouchableOpacity key={filter} style={[styles.filterButton, statusFilter === filter && styles.filterButtonActive]} onPress={() => setStatusFilter(filter)}>
                <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>}
        {filteredHistory.length === 0 ? (
          <Text style={styles.empty}>{staffHistory.length === 0 ? 'No queue activity yet.' : 'No tickets match the selected filters.'}</Text>
        ) : filteredHistory.map((ticket) => (
          <View key={ticket.number} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.number}>{ticket.number}</Text>
                <Text style={styles.service}>{ticket.service}</Text>
              </View>
              <View style={getStatusStyle(ticket.status)}>
                <Text style={[styles.statusText, getStatusTextStyle(ticket.status)]}>{ticket.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detail}>{ticket.window.replace(' - Registrar', '')}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detail}>{formatTimestamp(ticket.date)}</Text>
              </View>
            </View>
            {ticket.reason && <Text style={styles.reason}>{ticket.reason}</Text>}
            {ticket.status !== 'COMPLETED' && (
              <TouchableOpacity style={styles.reopenButton} onPress={() => reopenTicket(ticket.number)}>
                <Ionicons name="refresh-outline" size={16} color={colors.warningStrong} />
                <Text style={styles.reopenText}>Reopen ticket</Text>
              </TouchableOpacity>
            )}
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
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  kicker: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.brandText },
  countBadge: { minWidth: 58, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.blueSoft },
  countText: { color: colors.brandText, fontSize: 18, fontWeight: '800' },
  countLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  filterTrigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  filterTriggerActive: { borderColor: colors.brandText, backgroundColor: colors.blueSoft },
  filterTriggerText: { color: colors.textBody, fontSize: 12, fontWeight: '700' },
  filterTriggerTextActive: { color: colors.brandText },
  filterPanel: { padding: 14, borderRadius: 14, marginBottom: 18, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.borderSubtle },
  filterPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  filterPanelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  clearFiltersText: { color: colors.brandText, fontSize: 11, fontWeight: '800' },
  searchBox: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 9, paddingHorizontal: 12, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 10 },
  filterLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface },
  filterButtonActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: colors.surface },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  number: { fontSize: 18, fontWeight: '800', color: colors.brandText },
  service: { color: colors.textBody, marginTop: 4, fontSize: 13, maxWidth: 190 },
  statusBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  completedBadge: { backgroundColor: colors.successSurface },
  heldBadge: { backgroundColor: colors.warningSurface },
  exceptionBadge: { backgroundColor: colors.dangerSurface },
  statusText: { fontSize: 10, fontWeight: '800', color: colors.textBody },
  completedStatusText: { color: colors.successText },
  heldStatusText: { color: colors.warningStrong },
  skippedStatusText: { color: colors.warningText },
  noShowStatusText: { color: colors.dangerStrong },
  cancelledStatusText: { color: colors.danger },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detail: { color: colors.textMuted, fontSize: 12 },
  reason: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  reopenButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warningSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  reopenText: { color: colors.warningStrong, fontSize: 11, fontWeight: '800' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingVertical: 12 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: colors.textDisabled, fontSize: 11, fontWeight: '600', marginTop: 2 },
  activeNavLabel: { color: colors.brandText, fontWeight: '800' },
});
