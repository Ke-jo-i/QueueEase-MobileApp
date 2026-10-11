import { ActionButton, Field, Notice } from '@/components/form';
import { AdminShell } from '@/components/admin-shell';
import { AdminOverview } from '@/components/admin-overview';
import { ProfilePhoto } from '@/components/profile-photo';
import { CardOverlay } from '@/components/card-overlay';
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
import { ApiError, request } from '@/data/api';
import type { AdminAccount, AdminAccountsPage, AdminAuditPage, AdminData, AdminOverviewData, AdminHistoryPage, AdminService, AdminWindow } from '@/data/admin-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
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
};

function useDebounced(value: string) {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDelayed(value.trim()), 300); return () => clearTimeout(timer); }, [value]);
  return delayed;
}

function useAdminPage<T>(path: string, token: string | null, expire: () => void, query: string, revision: number) {
  const key = `${path}:${token}:${query}:${revision}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let active = true;
    request<T>(`${path}?${query}`, token).then(data => { if (active) setResult({ key, data, error: '' }); })
      .catch(failure => {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401) expire();
        else setResult({ key, data: null, error: failure instanceof ApiError && failure.status === 404 ? 'The queue server needs an update. Restart it, then refresh.' : failure instanceof Error ? failure.message : 'Could not load records.' });
      });
    return () => { active = false; };
  }, [path, token, expire, query, key]);
  return { data: result.key === key ? result.data : null, busy: result.key !== key, error: result.key === key ? result.error : '' };
}

function AccountEditor({ account, assignments, ownId, busy, act, error }: { account: AdminAccount; assignments: AdminWindow[]; ownId?: string; busy: boolean; act: Act; error: MutationError | null }) {
  const colors = useAppTheme();
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [resetOpen, setResetOpen] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const available = windows.filter(window => window.value === account.window || !assignments.some(other => other.window === window.value && other.staff));
  return <View style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{account.login} · {humanize(account.role)} · {account.activeSessions} active {account.activeSessions === 1 ? 'session' : 'sessions'}</Text>
    <Field label={`Name for ${account.login}`} value={name} onChangeText={setName} maxLength={80} editable={!busy} />
    <Field label={`Email for ${account.login}`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={160} editable={!busy} />
    <Notice text={error?.type === 'UPDATE_ACCOUNT' ? error.message : ''} error />
    <ActionButton label={`Save details for ${account.login}`} secondary disabled={busy || (name.trim() === account.name && email.trim().toLowerCase() === account.email)} onPress={() => void act({ type: 'UPDATE_ACCOUNT', id: account.id, name, email })} />
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
      <ActionButton label={account.active ? `Disable ${account.login}` : `Enable ${account.login}`} secondary disabled={busy}
        onPress={() => { if (account.active) setConfirmDisable(true); else void act({ type: 'SET_ACTIVE', id: account.id, active: true }); }} />
      <Disclosure open={confirmDisable && !!account.active} style={{ gap: 12 }}>
        <Notice text={`Disable ${account.login}? Active sessions will end.`} />
        <Notice text={error?.type === 'SET_ACTIVE' ? error.message : ''} error />
        <ActionButton label={`Confirm disable ${account.login}`} disabled={busy} onPress={() => void act({ type: 'SET_ACTIVE', id: account.id, active: false }).then(ok => { if (ok) setConfirmDisable(false); })} />
        <ActionButton label="Keep account active" secondary disabled={busy} onPress={() => setConfirmDisable(false)} />
      </Disclosure>
    </>}
  </View>;
}

function Accounts({ data, ownId, busy, act, error, token, expire, revision }: { data: AdminData; ownId?: string; busy: boolean; act: Act; error: MutationError | null; token: string | null; expire: () => void; revision: number }) {
  const colors = useAppTheme();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [access, setAccess] = useState('');
  const [page, setPage] = useState(1);
  const delayed = useDebounced(search);
  const query = useMemo(() => new URLSearchParams({ search: delayed, role, access, page: String(page), pageSize: '10' }).toString(), [delayed, role, access, page]);
  const directory = useAdminPage<AdminAccountsPage>('/admin/accounts', token, expire, query, revision);
  const [expanded, setExpanded] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'staff' | 'admin'>('staff');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const filtered = directory.data?.accounts ?? [];
  const prefix = createRole === 'staff' ? 'Staff' : 'Admin';
  return <View style={{ gap: 20 }}>
    <AdminPanel title={directory.data ? `Accounts (${directory.data.total})` : 'Accounts'}>
      <Field label="Search accounts" value={search} onChangeText={value => { setSearch(value); setPage(1); setExpanded(''); }} autoCapitalize="none" maxLength={100} />
      <AdminSelect label="Account role" value={role} options={[{ value: '', label: 'All roles' }, ...['student', 'staff', 'admin'].map(value => ({ value, label: humanize(value) }))]} onChange={value => { setRole(value); setPage(1); setExpanded(''); }} />
      <AdminSelect label="Account access" value={access} options={[{ value: '', label: 'All access' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]} onChange={value => { setAccess(value); setPage(1); setExpanded(''); }} />
    </AdminPanel>
    <Notice text={directory.error} error />
    {directory.busy && <ActivityIndicator accessibilityLabel="Loading accounts" color={colors.brandText} />}
    {filtered.map(account => <GlassSurface key={account.id} testID={`admin-account-${account.login}`} style={{ borderRadius: 24, overflow: 'hidden' }}>
      <SettingsRow title={account.name} subtitle={`${account.login} · ${humanize(account.role)} · ${account.active ? 'Active' : 'Disabled'}`} icon={account.role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'} expanded={expanded === account.id}
        onPress={() => setExpanded(expanded === account.id ? '' : account.id)} />
      <Disclosure open={expanded === account.id}><AccountEditor key={account.id} account={account} assignments={data.windows} ownId={ownId} busy={busy} act={act} error={error?.id === account.id ? error : null} /></Disclosure>
    </GlassSurface>)}
    {directory.data && !filtered.length && <Text style={{ color: colors.textMuted }}>No matching accounts.</Text>}
    {directory.data && <AdminPager page={directory.data.page} total={directory.data.total} pageSize={directory.data.pageSize} busy={busy || directory.busy} noun="accounts" onChange={value => { setPage(value); setExpanded(''); }} />}
    <GlassSurface style={{ borderRadius: 24, overflow: 'hidden' }}>
      <SettingsRow title={`Create ${createRole === 'staff' ? 'staff' : 'admin'} account`} icon="person-add-outline" expanded={createOpen} onPress={() => setCreateOpen(!createOpen)} />
      <Disclosure open={createOpen} style={{ gap: 15, paddingHorizontal: 18, paddingBottom: 20 }}>
        <AdminChoices label="New account role" value={createRole} options={[{ value: 'staff', label: 'Staff account' }, { value: 'admin', label: 'Admin account' }]} onChange={setCreateRole} disabled={busy} />
        <Field label={`${prefix} name`} value={name} onChangeText={setName} maxLength={80} editable={!busy} />
        <Field label={`${prefix} ID`} value={login} onChangeText={setLogin} autoCapitalize="none" maxLength={40} editable={!busy} />
        <Field label={`${prefix} email`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={160} editable={!busy} />
        <Field label="Initial password (at least 10 characters)" value={password} onChangeText={setPassword} secureTextEntry editable={!busy} />
        <Notice text={error?.type === 'CREATE_ACCOUNT' ? error.message : ''} error />
        <ActionButton label={`Save ${createRole} account`} disabled={busy || !name.trim() || !login.trim() || !email.trim() || password.length < 10} onPress={() => void act({ type: 'CREATE_ACCOUNT', role: createRole, name, login, email, password }).then(ok => { if (ok) { setName(''); setLogin(''); setEmail(''); setPassword(''); setCreateOpen(false); } })} />
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
  return <AdminShell section={section} name={data?.accounts.find(account => account.id === user?.id)?.name ?? user?.name} busy={busy} onRefresh={reload} onSettings={() => setSettingsOpen(true)} onSignOut={() => { if (!mutation.current) void signOut(); }}
    onSelect={value => { const next = sections.find(item => item === value); if (next) { setSection(next); setError(''); setNotice(''); setActionError(null); } }}>
    <Notice text={data ? error : ''} error /><Notice text={notice} />
    {!data && <StateScreen compact loading={!error} title={error ? 'Administration is unavailable' : 'Loading administration'} message={error || undefined} onRetry={error ? reload : undefined} />}
    {data && section === 'Overview' && <AdminOverview data={data} busy={busy} error={actionError?.type === 'SET_ACCEPTING' ? actionError.message : ''} toggle={() => void act({ type: 'SET_ACCEPTING', accepting: !data.acceptingTickets })} />}
    {data && section === 'Accounts' && <Accounts data={data} ownId={user?.id} busy={busy} act={act} error={actionError} token={token} expire={expire} revision={revision} />}
    {data && section === 'Services' && <Services services={data.services} busy={busy} act={act} error={actionError} />}
    {data && section === 'Records' && <Records services={data.services} token={token} expire={expire} revision={revision} />}
    {data && section === 'Activity' && <Activity token={token} expire={expire} revision={revision} />}
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
