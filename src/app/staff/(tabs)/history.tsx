import { MotionButton as TouchableOpacity, Reveal } from '@/components/motion';
import { Disclosure } from '@/components/disclosure';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { useQueue } from '@/contexts/queue';
import { TicketActivity } from '@/components/ticket-activity';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { GlassSurface } from '@/components/glass-surface';

export default function StaffHistoryScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { staffHistory, reopenTicket, assignedWindow, busy, connected } = useQueue();
  const [dateFilter, setDateFilter] = useState<'All Dates' | 'Today'>('All Dates');
  const [windowFilter, setWindowFilter] = useState('All Windows');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
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
        <Reveal style={styles.pageHeader}>
          <View>
            <Text accessibilityRole="header" style={styles.title}>Queue History</Text>
            <Text style={styles.kicker}>A record of every visit.</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredHistory.length}</Text>
            <Text style={styles.countLabel}>shown</Text>
          </View>
        </Reveal>
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
        <Disclosure open={filtersOpen}><GlassSurface style={styles.filterPanel}>
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
        </GlassSurface></Disclosure>
        {filteredHistory.length === 0 ? (
          <GlassSurface style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="time-outline" size={30} color={colors.brandText} /></View>
            <Text style={styles.emptyTitle}>{staffHistory.length === 0 ? 'No queue activity yet.' : 'No matching tickets'}</Text>
            <Text style={styles.empty}>{staffHistory.length === 0 ? 'Completed and held tickets will appear here.' : 'Try another search or clear your filters.'}</Text>
          </GlassSurface>
        ) : filteredHistory.map((ticket) => (
          <View key={ticket.id} style={styles.card}>
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
            <TouchableOpacity style={styles.activityButton} accessibilityRole="button" accessibilityLabel={`Activity for ${ticket.number}`} accessibilityState={{ expanded: expandedHistory === ticket.id }} onPress={() => setExpandedHistory(expandedHistory === ticket.id ? null : ticket.id)}>
              <Text style={styles.activityButtonText}>{expandedHistory === ticket.id ? 'Hide activity' : 'View activity'}</Text>
              <Ionicons name={expandedHistory === ticket.id ? 'chevron-up' : 'chevron-down'} size={15} color={colors.brandText} />
            </TouchableOpacity>
            <Disclosure open={expandedHistory === ticket.id}><TicketActivity ticket={ticket} /></Disclosure>
            {ticket.status !== 'COMPLETED' && (
              <TouchableOpacity disabled={busy || !connected || ticket.window !== assignedWindow} style={[styles.reopenButton, ticket.window !== assignedWindow && { opacity: 0.4 }]} onPress={() => reopenTicket(ticket.number)}>
                <Ionicons name="refresh-outline" size={16} color={colors.warningStrong} />
                <Text style={styles.reopenText}>Reopen ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  activityButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, minHeight: 44, marginTop: 6 },
  activityButtonText: { color: colors.brandText, fontSize: 12, fontWeight: '700' },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  kicker: { color: colors.textMuted, fontSize: 14, marginTop: 5 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -1, color: colors.text },
  countBadge: { minWidth: 54, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 18, alignItems: 'center', backgroundColor: colors.infoSurface },
  countText: { color: colors.brandText, fontSize: 18, fontWeight: '800' },
  countLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  filterTrigger: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterTriggerActive: { borderColor: colors.brandText, backgroundColor: colors.blueSoft },
  filterTriggerText: { color: colors.textBody, fontSize: 12, fontWeight: '700' },
  filterTriggerTextActive: { color: colors.brandText },
  filterPanel: { padding: 18, borderRadius: 24, marginBottom: 18 },
  filterPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  filterPanelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  clearFiltersText: { color: colors.brandText, fontSize: 11, fontWeight: '800' },
  searchBox: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 13, backgroundColor: colors.surface },
  searchInput: { flex: 1, minWidth: 0, height: 48, color: colors.text, fontSize: 14, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
  filterLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterButton: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surface },
  filterButtonActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  emptyCard: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 36, borderRadius: 28, marginTop: 6 },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoSurface },
  emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center' },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, marginBottom: 14, backgroundColor: `${colors.surface}E8` },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  number: { fontSize: 23, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'], color: colors.text },
  service: { color: colors.textBody, marginTop: 5, fontSize: 13, lineHeight: 18, maxWidth: 190 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7 },
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
  reopenButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 7, backgroundColor: colors.warningSoft, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, marginTop: 6 },
  reopenText: { color: colors.warningStrong, fontSize: 11, fontWeight: '800' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingVertical: 12 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: colors.textDisabled, fontSize: 11, fontWeight: '600', marginTop: 2 },
  activeNavLabel: { color: colors.brandText, fontWeight: '800' },
});
