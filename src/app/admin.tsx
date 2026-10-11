import { ActionButton, Field, Notice } from '@/components/form';
import { AdminShell } from '@/components/admin-shell';
import { AdminOverview } from '@/components/admin-overview';
import { ProfilePhoto } from '@/components/profile-photo';
import { CardOverlay } from '@/components/card-overlay';
import { DirectoryTransition } from '@/components/directory-transition';
import { StateScreen } from '@/components/state-screen';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { AdminChoices, AdminPager, AdminPanel, AdminSelect } from '@/components/admin-controls';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { Disclosure } from '@/components/disclosure';
import { GlassSurface } from '@/components/glass-surface';
import { MotionButton } from '@/components/motion';
import { SettingsRow } from '@/components/settings-row';
import { ThemePicker } from '@/components/theme-picker';
import { TicketActivity } from '@/components/ticket-activity';
import { registrarWindows } from '@/constants/service-windows';
import { useSession } from '@/contexts/session';
import { AdminSectionFocus } from '@/contexts/admin-section';
import { ApiError, request } from '@/data/api';
import type { AdminAccount, AdminAccountsPage, AdminAuditPage, AdminData, AdminOverviewData, AdminHistoryPage, AdminService, AdminWindow } from '@/data/admin-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = 'Overview' | 'Accounts' | 'Services' | 'Records' | 'Activity';
type Act = (body: Record<string, unknown>) => Promise<boolean>;
type MutationError = { type: string; id?: string; name?: string; message: string };
const sections: Section[] = ['Overview', 'Accounts', 'Services', 'Records', 'Activity'];
const windowLabel = (window: string) => window.replace(' - Registrar', '');
const windows = registrarWindows.map(window => ({ value: window, label: windowLabel(window) }));
const humanize = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase());
const timestamp = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const auditNames: Record<string, string> = {
  CREATE_ACCOUNT: 'Account created', UPDATE_ACCOUNT: 'Account updated', SET_ACTIVE: 'Account access changed',
  ASSIGN_WINDOW: 'Window assigned', RELEASE_WINDOW: 'Window released', RESET_PASSWORD: 'Password reset',
  CREATE_SERVICE: 'Service added', SET_SERVICE: 'Service updated', SET_ACCEPTING: 'Queue availability changed',
  REMOVE_ACCOUNT: 'Account removed', REVOKE_SESSIONS: 'Sessions ended',
};

function useDebounced(value: string) {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDelayed(value.trim()), 300); return () => clearTimeout(timer); }, [value]);
  return delayed;
}

function useAdminPage<T>(path: string, token: string | null, expire: () => void, query: string, revision: number) {
  const focused = useContext(AdminSectionFocus);
  const key = `${path}:${token}:${query}:${revision}:${focused}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    if (!focused) return;
    let active = true;
    request<T>(`${path}?${query}`, token).then(data => { if (active) setResult({ key, data, error: '' }); })
      .catch(failure => {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401) expire();
        else setResult({ key, data: null, error: failure instanceof ApiError && failure.status === 404 ? 'The queue server needs an update. Restart it, then refresh.' : failure instanceof Error ? failure.message : 'Could not load records.' });
      });
    return () => { active = false; };
  }, [focused, path, token, expire, query, key]);
  return { data: !focused || result.key === key ? result.data : null, busy: focused && result.key !== key, error: result.key === key ? result.error : '' };
}

function AccountEditor({ account, assignments, ownId, busy, act, error }: { account: AdminAccount; assignments: AdminWindow[]; ownId?: string; busy: boolean; act: Act; error: MutationError | null }) {
  const colors = useAppTheme();
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [login, setLogin] = useState(account.login);
  const [role, setRole] = useState(account.role);
  const [resetOpen, setResetOpen] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [revokeOpen, setRevokeOpen] = useState(false);
  const available = windows.filter(window => window.value === account.window || !assignments.some(other => other.window === window.value && other.staff));
  return <View style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{account.login} · {humanize(account.role)} · {account.activeSessions} active {account.activeSessions === 1 ? 'session' : 'sessions'}</Text>
    <Field label={`Name for ${account.login}`} value={name} onChangeText={setName} maxLength={80} editable={!busy} />
    <Field label={`Email for ${account.login}`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={160} editable={!busy} />
    <Field label={`ID for ${account.login}`} value={login} onChangeText={setLogin} autoCapitalize="none" maxLength={40} editable={!busy} />
    <AdminSelect label={`Role for ${account.login}`} value={role} options={['student', 'staff', 'admin'].map(value => ({ value, label: humanize(value) }))} onChange={value => setRole(value as AdminAccount['role'])} disabled={busy || ownId === account.id} />
    <Notice text={error?.type === 'UPDATE_ACCOUNT' ? error.message : ''} error />
    <ActionButton label={`Save details for ${account.login}`} secondary disabled={busy || (name.trim() === account.name && email.trim().toLowerCase() === account.email && login.trim().toLowerCase() === account.login && role === account.role)} onPress={() => void act({ type: 'UPDATE_ACCOUNT', id: account.id, name, email, login, role })} />
    {account.role === 'staff' && <AdminSelect label={`Window for ${account.login}`} value={account.window ?? ''} options={[{ value: '', label: 'Unassigned' }, ...available]} disabled={busy || !account.active}
      onChange={window => { if (window !== (account.window ?? '')) void act(window ? { type: 'ASSIGN_WINDOW', id: account.id, window } : { type: 'RELEASE_WINDOW', id: account.id }); }} />}
    <Notice text={error && ['ASSIGN_WINDOW', 'RELEASE_WINDOW'].includes(error.type) ? error.message : ''} error />
    {ownId !== account.id && <>
      <ActionButton label={`Reset password for ${account.login}`} secondary disabled={busy} onPress={() => { setResetOpen(!resetOpen); setReplacement(''); }} />
      <Disclosure open={resetOpen} style={{ gap: 13 }}>
        <Notice text="Resetting the password signs this account out on all devices." />
        <Field label={`Replacement password for ${account.login}`} value={replacement} onChangeText={setReplacement} secureTextEntry editable={!busy} />
        <Notice text={error?.type === 'RESET_PASSWORD' ? error.message : ''} error />
        <ActionButton label={`Confirm password reset for ${account.login}`} disabled={busy || replacement.length < 10} onPress={() => void act({ type: 'RESET_PASSWORD', id: account.id, password: replacement }).then(ok => { if (ok) { setResetOpen(false); setReplacement(''); } })} />
      </Disclosure>
      {!account.active && <Notice text={error?.type === 'SET_ACTIVE' ? error.message : ''} error />}
      <ActionButton label={account.active ? `Suspend ${account.login}` : `Restore ${account.login}`} secondary disabled={busy}
        onPress={() => { if (account.active) setConfirmDisable(true); else void act({ type: 'SET_ACTIVE', id: account.id, active: true }); }} />
      <Disclosure open={confirmDisable && !!account.active} style={{ gap: 12 }}>
        <Notice text={`Suspend ${account.login}? Active sessions will end.`} />
        <Notice text={error?.type === 'SET_ACTIVE' ? error.message : ''} error />
        <ActionButton label={`Confirm suspension ${account.login}`} disabled={busy} onPress={() => void act({ type: 'SET_ACTIVE', id: account.id, active: false }).then(ok => { if (ok) setConfirmDisable(false); })} />
        <ActionButton label="Keep account active" secondary disabled={busy} onPress={() => setConfirmDisable(false)} />
      </Disclosure>
      <ActionButton label={`End sessions for ${account.login}`} secondary disabled={busy || !account.activeSessions} onPress={() => setRevokeOpen(!revokeOpen)} />
      <Disclosure open={revokeOpen} style={{ gap: 12 }}>
        <Notice text="This account will need to sign in again on every device." />
        <Notice text={error?.type === 'REVOKE_SESSIONS' ? error.message : ''} error />
        <ActionButton label={`Confirm end sessions for ${account.login}`} disabled={busy} onPress={() => void act({ type: 'REVOKE_SESSIONS', id: account.id }).then(ok => { if (ok) setRevokeOpen(false); })} />
      </Disclosure>
      <ActionButton label={`Remove ${account.login}`} secondary disabled={busy} onPress={() => { setRemoveOpen(!removeOpen); setConfirmation(''); }} />
      <Disclosure open={removeOpen} style={{ gap: 12 }}>
        <Notice text="Removal ends access and retains queue records. This action cannot be undone here." />
        <Field label={`Enter ${account.login} to confirm removal`} value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" editable={!busy} />
        <Notice text={error?.type === 'REMOVE_ACCOUNT' ? error.message : ''} error />
        <ActionButton label={`Confirm removal ${account.login}`} disabled={busy || confirmation !== account.login} onPress={() => void act({ type: 'REMOVE_ACCOUNT', id: account.id, confirmation })} />
        <ActionButton label="Keep account" secondary disabled={busy} onPress={() => setRemoveOpen(false)} />
      </Disclosure>
    </>}
  </View>;
}

type AccountsProps = { data: AdminData; ownId?: string; busy: boolean; act: Act; error: MutationError | null; token: string | null; expire: () => void; revision: number };
const accountGroups = [
  { role: 'student', title: 'Students', icon: 'school-outline' },
  { role: 'staff', title: 'Staff', icon: 'people-outline' },
  { role: 'admin', title: 'Admins', icon: 'shield-checkmark-outline' },
] as const;

function AccountDirectory({ role, onBack, data, ownId, busy, act, error, token, expire, revision }: AccountsProps & { role: AdminAccount['role']; onBack: () => void }) {
  const colors = useAppTheme();
  const [search, setSearch] = useState('');
  const [access, setAccess] = useState('');
  const [window, setWindow] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ column: 'name', order: 'asc' });
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const delayed = useDebounced(search);
  const query = useMemo(() => new URLSearchParams({ search: delayed, role, access, window, page: String(page), pageSize, sort: sort.column, order: sort.order }).toString(), [delayed, role, access, window, page, pageSize, sort]);
  const directory = useAdminPage<AdminAccountsPage>('/admin/accounts', token, expire, query, revision);
  const account = directory.data?.accounts.find(account => account.id === editing?.id) ?? editing;
  const title = accountGroups.find(group => group.role === role)!.title;
  const columns = [
    { label: 'Name', key: 'name', width: 175 }, { label: 'ID', key: 'login', width: 130 },
    { label: 'Email', key: 'email', width: 235 }, { label: 'Status', key: 'access', width: 115 },
    ...(role === 'staff' ? [{ label: 'Window', key: '', width: 150 }] : []),
    { label: 'Sessions', key: 'sessions', width: 95 }, { label: 'Actions', key: '', width: 105 },
  ];
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const editAction: Act = async body => {
    const ok = await act(body);
    if (ok && (body.type === 'REMOVE_ACCOUNT' || (body.type === 'UPDATE_ACCOUNT' && body.role !== role))) setEditing(null);
    return ok;
  };
  return <View style={{ gap: 18 }}>
    <MotionButton accessibilityLabel="Back to account groups" onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', minHeight: 44 }}>
      <Ionicons name="chevron-back" size={20} color={colors.brandText} /><Text style={{ color: colors.brandText, fontWeight: '600' }}>Accounts</Text>
    </MotionButton>
    <AdminPanel title={`${humanize(role)} accounts`}>
      <Field label="Search accounts" value={search} onChangeText={value => { setSearch(value); setPage(1); }} autoCapitalize="none" maxLength={100} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 140 }}><AdminSelect label="Account access" value={access} options={[{ value: '', label: 'All access' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Suspended' }]} onChange={value => { setAccess(value); setPage(1); }} /></View>
        {role === 'staff' && <View style={{ flex: 1, minWidth: 140 }}><AdminSelect label="Assigned window" value={window} options={[{ value: '', label: 'All windows' }, { value: 'unassigned', label: 'Unassigned' }, ...windows]} onChange={value => { setWindow(value); setPage(1); }} /></View>}
        <View style={{ width: 140 }}><AdminSelect label="Rows per page" value={pageSize} options={['10', '25', '50'].map(value => ({ value, label: value }))} onChange={value => { setPageSize(value); setPage(1); }} /></View>
      </View>
    </AdminPanel>
    <Notice text={directory.error} error />
    {directory.busy && <ActivityIndicator accessibilityLabel="Loading accounts" color={colors.brandText} />}
    <GlassSurface style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
        <View role="table" accessibilityLabel={`${title} account directory`} style={{ width: tableWidth }}>
          <View role="row" style={{ flexDirection: 'row', backgroundColor: colors.infoSurface, borderBottomWidth: 1, borderColor: colors.border }}>
            {columns.map(column => <MotionButton key={column.label} role="columnheader" accessibilityLabel={`Sort accounts by ${column.label}`} disabled={!column.key} onPress={() => { setSort({ column: column.key, order: sort.column === column.key && sort.order === 'asc' ? 'desc' : 'asc' }); setPage(1); }} style={{ width: column.width, paddingHorizontal: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.textStrong, fontWeight: '600', fontSize: 13 }}>{column.label}</Text>
              {sort.column === column.key && <Ionicons name={sort.order === 'asc' ? 'chevron-up' : 'chevron-down'} size={13} color={colors.brandText} />}
            </MotionButton>)}
          </View>
          {directory.data?.accounts.map((account, index) => <View key={account.id} role="row" testID={`admin-account-${account.login}`} style={{ flexDirection: 'row', minHeight: 62, alignItems: 'center', backgroundColor: index % 2 ? colors.surfaceSubtle : colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text role="cell" numberOfLines={2} style={{ width: 175, paddingHorizontal: 14, color: colors.text, fontSize: 14, fontWeight: '600' }}>{account.name}</Text>
            <Text role="cell" numberOfLines={1} style={{ width: 130, paddingHorizontal: 14, color: colors.textMuted, fontSize: 13 }}>{account.login}</Text>
            <Text role="cell" numberOfLines={1} style={{ width: 235, paddingHorizontal: 14, color: colors.textMuted, fontSize: 13 }}>{account.email}</Text>
            <View role="cell" style={{ width: 115, paddingHorizontal: 12 }}><Text style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: account.active ? colors.successSurface : colors.warningSurface, color: account.active ? colors.successStrong : colors.warningText, fontSize: 12, fontWeight: '600' }}>{account.active ? 'Active' : 'Suspended'}</Text></View>
            {role === 'staff' && <Text role="cell" numberOfLines={1} style={{ width: 150, paddingHorizontal: 14, color: colors.textMuted, fontSize: 13 }}>{account.window ? windowLabel(account.window) : 'Unassigned'}</Text>}
            <Text role="cell" style={{ width: 95, paddingHorizontal: 14, color: colors.textMuted, fontSize: 13 }}>{account.activeSessions}</Text>
            <View role="cell" style={{ width: 105, paddingHorizontal: 8 }}><MotionButton accessibilityLabel={`Manage ${account.login}`} onPress={() => setEditing(account)} style={{ minHeight: 44, borderRadius: 12, backgroundColor: colors.infoSurface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.brandText, fontWeight: '600', fontSize: 13 }}>Manage</Text></MotionButton></View>
          </View>)}
        </View>
      </ScrollView>
      {directory.data && !directory.data.accounts.length && <Text style={{ padding: 20, color: colors.textMuted }}>No matching accounts.</Text>}
    </GlassSurface>
    {directory.data && <AdminPager page={directory.data.page} total={directory.data.total} pageSize={directory.data.pageSize} busy={busy || directory.busy} noun="accounts" onChange={setPage} />}
    <CardOverlay open={!!account} onClose={() => setEditing(null)}><SafeAreaView style={{ flex: 1 }}>
      <KeyboardScrollView contentContainerStyle={{ width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, gap: 20 }}>
        <ActionButton label="Close account editor" secondary onPress={() => setEditing(null)} />
        {account && <View testID="admin-account-editor" style={{ gap: 18 }}>
          <Text accessibilityRole="header" style={{ color: colors.textStrong, fontWeight: '700', fontSize: 25 }}>{account.name}</Text>
          <AccountEditor key={account.id} account={account} assignments={data.windows} ownId={ownId} busy={busy} act={editAction} error={error?.id === account.id ? error : null} />
        </View>}
      </KeyboardScrollView>
    </SafeAreaView></CardOverlay>
  </View>;
}

function Accounts(props: AccountsProps) {
  const colors = useAppTheme();
  const [role, setRole] = useState<AdminAccount['role'] | null>(null);
  const closeDirectory = useCallback(() => setRole(null), []);
  const groups = useAdminPage<AdminAccountsPage>('/admin/accounts', props.token, props.expire, 'pageSize=1', props.revision);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<AdminAccount['role']>('staff');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const prefix = humanize(createRole);
  if (role) return <DirectoryTransition key={role} onClose={closeDirectory}>{close => <AccountDirectory {...props} role={role} onBack={close} />}</DirectoryTransition>;
  return <View style={{ gap: 20 }}>
    <Text accessibilityRole="header" style={{ color: colors.textStrong, fontWeight: '600', fontSize: 21 }}>Account directories</Text>
    <Notice text={groups.error} error />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {accountGroups.map(group => <GlassSurface key={group.role} style={{ flex: 1, minWidth: 240, borderRadius: 24 }}>
        <MotionButton accessibilityLabel={group.title} onPress={() => setRole(group.role)} style={{ padding: 22, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name={group.icon} size={24} color={colors.brandText} /><Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', flex: 1 }}>{group.title}</Text><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></View>
          <Text style={{ color: colors.textStrong, fontSize: 34, fontWeight: '700' }}>{groups.data?.groups[group.role].total ?? '—'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{groups.data ? `${groups.data.groups[group.role].active} active · ${groups.data.groups[group.role].total - groups.data.groups[group.role].active} suspended` : 'Loading accounts'}</Text>
        </MotionButton>
      </GlassSurface>)}
    </View>
    <GlassSurface style={{ borderRadius: 24, overflow: 'hidden' }}>
      <SettingsRow title={`Create ${createRole} account`} icon="person-add-outline" expanded={createOpen} onPress={() => setCreateOpen(!createOpen)} />
      <Disclosure open={createOpen} style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
        <AdminChoices label="New account role" value={createRole} options={['staff', 'admin', 'student'].map(value => ({ value: value as AdminAccount['role'], label: `${humanize(value)} account` }))} onChange={setCreateRole} disabled={props.busy} />
        <Field label={`${prefix} name`} value={name} onChangeText={setName} maxLength={80} editable={!props.busy} />
        <Field label={`${prefix} ID`} value={login} onChangeText={setLogin} autoCapitalize="none" maxLength={40} editable={!props.busy} />
        <Field label={`${prefix} email`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={160} editable={!props.busy} />
        <Field label="Initial password (at least 10 characters)" value={password} onChangeText={setPassword} secureTextEntry editable={!props.busy} />
        <Notice text={props.error?.type === 'CREATE_ACCOUNT' ? props.error.message : ''} error />
        <ActionButton label={`Save ${createRole} account`} disabled={props.busy || !name.trim() || !login.trim() || !email.trim() || password.length < 10} onPress={() => void props.act({ type: 'CREATE_ACCOUNT', role: createRole, name, login, email, password }).then(ok => { if (ok) { setName(''); setLogin(''); setEmail(''); setPassword(''); setCreateOpen(false); } })} />
      </Disclosure>
    </GlassSurface>
  </View>;
}

function Services({ services, busy, act, error }: { services: AdminService[]; busy: boolean; act: Act; error: MutationError | null }) {
  const colors = useAppTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [window, setWindow] = useState(registrarWindows[0]);
  return <View style={{ gap: 18 }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 19, fontWeight: '600' }}>Registrar services</Text>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Existing tickets keep their assigned window.</Text>
    {services.map(service => <AdminPanel key={service.name} title={service.name}>
      <AdminSelect label={`Window for ${service.name}`} value={service.window} options={windows} disabled={busy} onChange={window => void act({ type: 'SET_SERVICE', name: service.name, window, enabled: !!service.enabled })} />
      <Notice text={error?.type === 'SET_SERVICE' && error.name === service.name ? error.message : ''} error />
      <MotionButton accessibilityRole="switch" accessibilityLabel={`${service.name} enabled`} accessibilityState={{ checked: !!service.enabled, disabled: busy }} disabled={busy}
        onPress={() => void act({ type: 'SET_SERVICE', name: service.name, window: service.window, enabled: !service.enabled })} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 14 }}>{service.enabled ? 'Available for booking' : 'Booking paused'}</Text>
        <View style={{ width: 44, height: 26, borderRadius: 15, padding: 3, backgroundColor: service.enabled ? colors.brand : colors.borderStrong, alignItems: service.enabled ? 'flex-end' : 'flex-start' }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} /></View>
      </MotionButton>
    </AdminPanel>)}
    <GlassSurface style={{ borderRadius: 24, overflow: 'hidden' }}>
      <SettingsRow title="Add service" icon="add-circle-outline" expanded={open} onPress={() => setOpen(!open)} />
      <Disclosure open={open} style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
        <Field label="New service name" value={name} onChangeText={setName} maxLength={120} editable={!busy} />
        <AdminSelect label="New service window" value={window} options={windows} onChange={setWindow} disabled={busy} />
        <Notice text={error?.type === 'CREATE_SERVICE' ? error.message : ''} error />
        <ActionButton label="Save service" disabled={busy || !name.trim()} onPress={() => void act({ type: 'CREATE_SERVICE', name, window, enabled: true }).then(ok => { if (ok) { setName(''); setOpen(false); } })} />
      </Disclosure>
    </GlassSurface>
  </View>;
}

function Records({ services, token, expire, revision }: { services: AdminService[]; token: string | null; expire: () => void; revision: number }) {
  const colors = useAppTheme();
  const [search, setSearch] = useState('');
  const delayed = useDebounced(search);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', window: '', service: '', from: '', to: '' });
  const [draft, setDraft] = useState(filters);
  const [expanded, setExpanded] = useState('');
  const query = useMemo(() => new URLSearchParams({ ...filters, search: delayed, page: String(page), pageSize: '15' }).toString(), [filters, delayed, page]);
  const { data, busy, error } = useAdminPage<AdminHistoryPage>('/admin/history', token, expire, query, revision);
  const filterCount = Object.values(filters).filter(Boolean).length;
  const statusOptions = [{ value: '', label: 'All statuses' }, ...['WAITING', 'SERVING', 'HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'].map(value => ({ value, label: humanize(value) }))];
  return <View style={{ gap: 18 }}>
    <AdminPanel title="Queue records">
      <Field label="Search ticket or student ID" value={search} onChangeText={value => { setSearch(value); setPage(1); }} autoCapitalize="none" />
      <MotionButton accessibilityLabel="Filters" accessibilityState={{ expanded: filtersOpen }} onPress={() => { if (!filtersOpen) setDraft(filters); setFiltersOpen(!filtersOpen); }} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10 }}>
        <Ionicons name="options-outline" size={19} color={colors.brandText} /><Text style={{ color: colors.brandText, fontWeight: '600' }}>Filters{filterCount ? ` (${filterCount})` : ''}</Text>
      </MotionButton>
      <Disclosure open={filtersOpen} style={{ gap: 15 }}>
        <AdminSelect label="Record status" value={draft.status} options={statusOptions} onChange={status => setDraft({ ...draft, status })} />
        <AdminSelect label="Record window" value={draft.window} options={[{ value: '', label: 'All windows' }, ...windows]} onChange={window => setDraft({ ...draft, window })} />
        <AdminSelect label="Record service" value={draft.service} options={[{ value: '', label: 'All services' }, ...services.map(service => ({ value: service.name, label: service.name }))]} onChange={service => setDraft({ ...draft, service })} />
        <Field label="From date (YYYY-MM-DD)" value={draft.from} onChangeText={from => setDraft({ ...draft, from })} maxLength={10} placeholder="YYYY-MM-DD" />
        <Field label="To date (YYYY-MM-DD)" value={draft.to} onChangeText={to => setDraft({ ...draft, to })} maxLength={10} placeholder="YYYY-MM-DD" />
        <ActionButton label="Apply filters" onPress={() => { setFilters(draft); setPage(1); setFiltersOpen(false); }} />
        <ActionButton label="Clear filters" secondary onPress={() => { const clean = { status: '', window: '', service: '', from: '', to: '' }; setDraft(clean); setFilters(clean); setPage(1); setFiltersOpen(false); }} />
      </Disclosure>
    </AdminPanel>
    <Notice text={error} error />
    {busy && <ActivityIndicator accessibilityLabel="Loading queue records" color={colors.brandText} />}
    {data?.records.map(ticket => <GlassSurface key={ticket.id} testID={`admin-record-${ticket.id}`} style={{ borderRadius: 24, overflow: 'hidden' }}>
      <SettingsRow title={`${ticket.number} · ${humanize(ticket.status)}`} subtitle={`${ticket.service} · ${ticket.ownerId}`} icon="receipt-outline" expanded={expanded === ticket.id} onPress={() => setExpanded(expanded === ticket.id ? '' : ticket.id)} />
      <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 18, paddingBottom: 16 }}>{windowLabel(ticket.window)} · {timestamp(ticket.createdAt)}</Text>
      <Disclosure open={expanded === ticket.id} style={{ paddingHorizontal: 18, paddingBottom: 18 }}><TicketActivity ticket={ticket} /></Disclosure>
    </GlassSurface>)}
    {data && !busy && !data.records.length && <Text style={{ color: colors.textMuted }}>No matching tickets.</Text>}
    {data && <AdminPager page={data.page} total={data.total} pageSize={data.pageSize} busy={busy} onChange={setPage} />}
  </View>;
}

function Activity({ token, expire, revision }: { token: string | null; expire: () => void; revision: number }) {
  const colors = useAppTheme();
  const [search, setSearch] = useState('');
  const delayed = useDebounced(search);
  const [page, setPage] = useState(1);
  const query = useMemo(() => new URLSearchParams({ search: delayed, page: String(page), pageSize: '15' }).toString(), [delayed, page]);
  const { data, busy, error } = useAdminPage<AdminAuditPage>('/admin/audit', token, expire, query, revision);
  const detailLabels: Record<string, string> = { name: 'Name', email: 'Email', role: 'Role', window: 'Window', previousWindow: 'Previous window', enabled: 'Booking enabled', active: 'Account active', accepting: 'Accepting tickets', sessionsRevoked: 'Sessions revoked' };
  return <View style={{ gap: 18 }}>
    <AdminPanel title="Administrator activity"><Field label="Search account, service or administrator" value={search} onChangeText={value => { setSearch(value); setPage(1); }} autoCapitalize="none" /></AdminPanel>
    <Notice text={error} error />
    {busy && <ActivityIndicator accessibilityLabel="Loading administrator activity" color={colors.brandText} />}
    {data?.audit.map(entry => <AdminPanel key={entry.id} title={auditNames[entry.action] ?? humanize(entry.action)}>
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{entry.target}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{entry.actorName} ({entry.actorLogin}) · {timestamp(entry.at)}</Text>
      <View style={{ gap: 5 }}>{Object.entries(entry.details).map(([key, value]) => <Text key={key} style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>{detailLabels[key] ?? humanize(key)}: {typeof value === 'boolean' ? value ? 'Yes' : 'No' : value === null ? 'Unassigned' : windowLabel(String(value))}</Text>)}</View>
    </AdminPanel>)}
    {data && !busy && !data.audit.length && <Text style={{ color: colors.textMuted }}>No matching activity.</Text>}
    {data && <AdminPager page={data.page} total={data.total} pageSize={data.pageSize} busy={busy} onChange={setPage} />}
  </View>;
}

export default function AdminScreen() {
  const { token, user, signOut, expire } = useSession();
  const colors = useAppTheme();
  const [data, setData] = useState<AdminData | null>(null);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const [section, setSection] = useState<Section>('Overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState<MutationError | null>(null);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const mutation = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const failure = useCallback((value: unknown) => {
    if (value instanceof ApiError && value.status === 401) expire();
    else setError(value instanceof ApiError && value.status === 404 ? 'The queue server needs an update. Restart it, then refresh.' : value instanceof Error ? value.message : 'Could not complete this action.');
  }, [expire]);
  const refresh = useCallback(async (overview = false) => {
    if (mutation.current) return;
    const version = ++generation.current;
    if (!dataRef.current && !overview) setError('');
    try {
      if (overview && dataRef.current) {
        const result = await request<AdminOverviewData>('/admin/overview', token);
        if (mounted.current && generation.current === version) {
          setData(previous => {
            if (!previous) return previous;
            const { revision, acceptingTickets, statistics, windows } = previous;
            return JSON.stringify({ revision, acceptingTickets, statistics, windows }) === JSON.stringify(result) ? previous : { ...previous, ...result };
          });
          setError('');
        }
      } else {
        const result = await request<AdminData>('/admin?view=workspace', token);
        if (mounted.current && generation.current === version) { setData(result); setError(''); }
      }
    } catch (value) { if (mounted.current && generation.current === version) failure(value); }
  }, [token, failure]);
  useFocusEffect(useCallback(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (initial = false) => {
      if (AppState.currentState !== 'background') await refresh(!initial);
      if (!stopped && section === 'Overview') timer = setTimeout(() => void poll(), 2000);
    };
    void poll(true);
    return () => { stopped = true; clearTimeout(timer); generation.current++; };
  }, [refresh, section]));
  const act: Act = async body => {
    if (mutation.current) return false;
    mutation.current = true;
    const version = ++generation.current;
    setBusy(true); setError(''); setNotice(''); setActionError(null);
    try {
      const result = await request<AdminData>('/admin?view=workspace', token, body);
      if (!mounted.current || generation.current !== version) return false;
      setData(result); setRevision(value => value + 1); setNotice('Changes saved.');
      return true;
    } catch (value) {
      if (mounted.current && generation.current === version) {
        if (value instanceof ApiError && value.status === 401) expire();
        else setActionError({ type: String(body.type), id: typeof body.id === 'string' ? body.id : undefined, name: typeof body.name === 'string' ? body.name : undefined, message: value instanceof Error ? value.message : 'Could not save changes.' });
      }
      return false;
    }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const changePassword = async () => {
    if (mutation.current) return;
    if (newPassword !== confirmPassword) { setActionError({ type: 'CHANGE_PASSWORD', message: 'Passwords do not match.' }); return; }
    mutation.current = true; setBusy(true); setError(''); setNotice(''); setActionError(null); generation.current++;
    try { await request('/auth/password', token, { currentPassword, newPassword }); await signOut(); }
    catch (value) {
      if (mounted.current) {
        if (value instanceof ApiError && value.status === 401) expire();
        else setActionError({ type: 'CHANGE_PASSWORD', message: value instanceof Error ? value.message : 'Could not change your password.' });
      }
    }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  const reload = () => { setRevision(value => value + 1); void refresh(); };
  const pages = sections.map(id => ({ id, content: <>
    {id === section && <><Notice text={data ? error : ''} error /><Notice text={notice} />
    {!data && <StateScreen compact loading={!error} title={error ? 'Administration is unavailable' : 'Loading administration'} message={error || undefined} onRetry={error ? reload : undefined} />}</>}
    {data && id === 'Overview' && <AdminOverview data={data} busy={busy} error={actionError?.type === 'SET_ACCEPTING' ? actionError.message : ''} toggle={() => void act({ type: 'SET_ACCEPTING', accepting: !data.acceptingTickets })} />}
    {data && id === 'Accounts' && <Accounts data={data} ownId={user?.id} busy={busy} act={act} error={actionError} token={token} expire={expire} revision={revision} />}
    {data && id === 'Services' && <Services services={data.services} busy={busy} act={act} error={actionError} />}
    {data && id === 'Records' && <Records services={data.services} token={token} expire={expire} revision={revision} />}
    {data && id === 'Activity' && <Activity token={token} expire={expire} revision={revision} />}
  </> }));
  return <AdminShell pages={pages} section={section} name={data?.accounts.find(account => account.id === user?.id)?.name ?? user?.name} busy={busy} onRefresh={reload} onSettings={() => setSettingsOpen(true)} onSignOut={() => { if (!mutation.current) void signOut(); }}
    onSelect={value => { const next = sections.find(item => item === value); if (next) { setSection(next); setError(''); setNotice(''); setActionError(null); } }}>
    <CardOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)}><SafeAreaView style={{ flex: 1 }}>
    <KeyboardScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 620, alignSelf: 'center' }}>
    <ActionButton label="Close settings" secondary onPress={() => setSettingsOpen(false)} />
    <Text accessibilityRole="header" style={{ fontSize: 29, fontWeight: '700', color: colors.textStrong }}>Administration settings</Text>
    <GlassSurface style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 25 }}>
      <ProfilePhoto storageId={`admin:${user?.id}`} initials={user?.name.split(' ').map(part => part[0]).slice(0, 2).join('') ?? 'A'} size={64} variant="staff" />
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '600' }}>{data?.accounts.find(account => account.id === user?.id)?.name ?? user?.name}</Text><Text style={{ color: colors.textMuted }}>{user?.email}</Text></View>
    </GlassSurface>
    <GlassSurface style={{ borderRadius: 25, overflow: 'hidden' }}><DarkModeToggle /><ThemePicker />
      <SettingsRow title="Change my password" icon="lock-closed-outline" expanded={passwordOpen} onPress={() => setPasswordOpen(!passwordOpen)} />
      <Disclosure open={passwordOpen} style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
        <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry editable={!busy} />
        <Field label="New password (at least 10 characters)" value={newPassword} onChangeText={setNewPassword} secureTextEntry editable={!busy} />
        <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!busy} />
        <Notice text="Changing your password signs you out on all devices." />
        <Notice text={actionError?.type === 'CHANGE_PASSWORD' ? actionError.message : ''} error />
        <ActionButton label="Change password and sign out" disabled={busy || !currentPassword || newPassword.length < 10 || !confirmPassword} onPress={() => void changePassword()} />
      </Disclosure>
    </GlassSurface>
    </KeyboardScrollView></SafeAreaView></CardOverlay>
  </AdminShell>;
}
