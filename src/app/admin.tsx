import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { ThemePicker } from '@/components/theme-picker';
import { useSession, type User } from '@/contexts/session';
import { request } from '@/data/api';
import { registrarWindows } from '@/constants/service-windows';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { Service } from '@/contexts/queue';
import type { Ticket } from '@/data/queue-model';
import { TicketActivity } from '@/components/ticket-activity';
import { GlassSurface } from '@/components/glass-surface';
import { Disclosure } from '@/components/disclosure';
import { SettingsRow } from '@/components/settings-row';
import { Ionicons } from '@expo/vector-icons';

type AdminData = { accounts: (User & { active: number })[]; services: Service[]; acceptingTickets: boolean; counts: { status: string; count: number }[]; records: Ticket[] };
export default function AdminScreen() {
  const { token, signOut } = useSession(); const colors = useAppTheme();
  const [data, setData] = useState<AdminData | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [section, setSection] = useState(''); const [name, setName] = useState(''); const [login, setLogin] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [resetId, setResetId] = useState(''); const [resetPassword, setResetPassword] = useState('');
  const [search, setSearch] = useState('');
  const refresh = useCallback(async () => {
    try { setData(await request<AdminData>('/admin', token)); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load administration.'); }
  }, [token]);
  useEffect(() => {
    let active = true;
    request<AdminData>('/admin', token).then((value) => { if (active) setData(value); })
      .catch((failure: Error) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [token]);
  const act = async (body: object) => {
    if (busy) return false;
    setBusy(true); setError('');
    try { setData(await request<AdminData>('/admin', token, body)); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save changes.'); return false; }
    finally { setBusy(false); }
  };
  const heading = { color: colors.text, fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 };
  const details = { gap: 14, paddingHorizontal: 18, paddingBottom: 20 };
  const recordCard = { gap: 12, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface };
  const divider = <View style={{ height: 1, backgroundColor: colors.borderSubtle, marginLeft: 67 }} />;
  return <FormPage title="Administration" subtitle="Manage access, service windows and queue availability." back={false}>
    <Notice text={error} error />
    <GlassSurface variant="tinted" style={{ gap: 15, padding: 23, borderRadius: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 44, height: 44, borderRadius: 17, backgroundColor: data?.acceptingTickets ? colors.successSurface : colors.warningSurface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={data?.acceptingTickets ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={23} color={data?.acceptingTickets ? colors.successStrong : colors.warningStrong} />
        </View>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>QUEUE AVAILABILITY</Text>
          <Text style={heading}>{data ? data.acceptingTickets ? 'Accepting new tickets' : 'New tickets paused' : 'Loading queue status'}</Text>
        </View>
      </View>
      <Text style={{ color: colors.textMuted, lineHeight: 20, fontSize: 13 }}>Pausing stops new bookings. Staff can continue serving tickets already in the queue.</Text>
      <ActionButton label={data?.acceptingTickets ? 'Pause new tickets' : 'Open queue'} busy={busy} disabled={!data} onPress={() => void act({ type: 'SET_ACCEPTING', accepting: !data?.acceptingTickets })} />
    </GlassSurface>
    {!!data?.counts.length && <GlassSurface style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, padding: 22, borderRadius: 25 }}>{data.counts.map((item) => <View key={item.status} style={{ minWidth: 75, gap: 4 }}><Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8, fontVariant: ['tabular-nums'] }}>{item.count}</Text><Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>{item.status.replace('_', ' ')}</Text></View>)}</GlassSurface>}
    <View style={{ gap: 9 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingLeft: 5 }}>MANAGEMENT</Text>
      <GlassSurface style={{ borderRadius: 25, overflow: 'hidden' }}>
    <SettingsRow title="Service routing" subtitle="Set the window for each service" icon="git-branch-outline" expanded={section === 'services'} onPress={() => setSection(section === 'services' ? '' : 'services')} />
    <Disclosure open={section === 'services'} style={details}>
      <Notice text="Choose which window handles each service. Changes apply to new tickets; existing tickets keep their assigned window." />
      {data?.services.map((service) => <View key={service.name} style={recordCard}>
        <Text style={heading}>{service.name}</Text>
        <ActionButton label={service.enabled ? 'Enabled · tap to pause service' : 'Paused · tap to enable service'} secondary disabled={busy} onPress={() => void act({ type: 'SET_SERVICE', ...service, enabled: !service.enabled })} />
        {registrarWindows.map((window) => <ActionButton key={window} label={window} secondary={service.window !== window} disabled={busy} onPress={() => void act({ type: 'SET_SERVICE', name: service.name, window, enabled: !!service.enabled })} />)}
      </View>)}
    </Disclosure>{divider}
    <SettingsRow title="Create staff account" subtitle="Invite another window operator" icon="person-add-outline" expanded={section === 'create'} onPress={() => setSection(section === 'create' ? '' : 'create')} />
    <Disclosure open={section === 'create'} style={details}>
      <Field label="Staff name" value={name} onChangeText={setName} /><Field label="Staff ID" value={login} onChangeText={setLogin} autoCapitalize="none" />
      <Field label="Staff email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Initial password (at least 10 characters)" value={password} onChangeText={setPassword} secureTextEntry />
      <ActionButton label="Save staff account" busy={busy} onPress={() => { void act({ type: 'CREATE_STAFF', name, login, email, password }).then((ok) => { if (ok) { setSection(''); setPassword(''); setName(''); setLogin(''); setEmail(''); } }); }} />
    </Disclosure>{divider}
    <SettingsRow title={`Accounts (${data?.accounts.length ?? 0})`} subtitle="Access, passwords and assignments" icon="people-outline" expanded={section === 'accounts'} onPress={() => setSection(section === 'accounts' ? '' : 'accounts')} />
    <Disclosure open={section === 'accounts'} style={details}><Field label="Search accounts" value={search} onChangeText={setSearch} />
      {data?.accounts.filter((account) => `${account.name} ${account.login}`.toLowerCase().includes(search.toLowerCase())).map((account) => <View key={account.id} style={recordCard}>
        <Text style={heading}>{account.name}</Text><Text style={{ color: colors.textMuted }}>{account.login} · {account.role} · {account.active ? 'Active' : 'Disabled'}</Text>
        {account.window && <><Text style={{ color: colors.textMuted }}>{account.window}</Text><ActionButton label={`Release window for ${account.login}`} secondary disabled={busy} onPress={() => void act({ type: 'RELEASE_WINDOW', id: account.id })} /></>}
        {account.role !== 'admin' && <><ActionButton label={account.active ? `Disable ${account.login}` : `Enable ${account.login}`} secondary disabled={busy} onPress={() => void act({ type: 'SET_ACTIVE', id: account.id, active: !account.active })} />
          <ActionButton label={`Reset password for ${account.login}`} secondary onPress={() => { setResetId(resetId === account.id ? '' : account.id); setResetPassword(''); }} />
          {resetId === account.id && <><Notice text="Verify the account holder’s identity before resetting. Share the new password privately and ask them to change it in Profile." /><Field label="Replacement password" value={resetPassword} onChangeText={setResetPassword} secureTextEntry />
            <ActionButton label="Confirm password reset" busy={busy} onPress={() => { void act({ type: 'RESET_PASSWORD', id: account.id, password: resetPassword }).then((ok) => { if (ok) { setResetId(''); setResetPassword(''); } }); }} /></>}
        </>}
      </View>)}
    </Disclosure>{divider}
    <SettingsRow title={`Queue records (${data?.records.length ?? 0})`} subtitle="Search the complete ticket activity" icon="receipt-outline" expanded={section === 'records'} onPress={() => setSection(section === 'records' ? '' : 'records')} />
    <Disclosure open={section === 'records'} style={details}><Field label="Search ticket or student ID" value={search} onChangeText={setSearch} />
      {data?.records.filter((ticket) => `${ticket.number} ${ticket.ownerId}`.toLowerCase().includes(search.toLowerCase())).map((ticket) => <View key={ticket.id} style={recordCard}>
        <Text style={heading}>{ticket.number} · {ticket.status.replace('_', ' ')}</Text><Text style={{ color: colors.textMuted }}>{ticket.service} · {ticket.ownerId}</Text><TicketActivity ticket={ticket} />
      </View>)}
    </Disclosure>{divider}
    <SettingsRow title="Refresh records" icon="refresh-outline" onPress={() => void refresh()} />
    </GlassSurface></View>
    <View style={{ gap: 9 }}><Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingLeft: 5 }}>APPEARANCE</Text>
      <GlassSurface style={{ borderRadius: 25, overflow: 'hidden' }}><DarkModeToggle /><ThemePicker /></GlassSurface>
    </View>
    <GlassSurface style={{ borderRadius: 25 }}><SettingsRow title="Log Out" icon="log-out-outline" danger onPress={() => { void signOut().catch((failure: Error) => setError(failure.message)); }} /></GlassSurface>
  </FormPage>;
}
