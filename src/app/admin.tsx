import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { Reveal } from '@/components/motion';
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
  const heading = { color: colors.text, fontSize: 18, fontWeight: '700' as const };
  return <FormPage title="Administration" subtitle="Manage access, service windows and queue availability." back={false}>
    <Notice text={error} error />
    <View style={{ gap: 12, padding: 18, borderRadius: 16, backgroundColor: colors.infoSurface }}>
      <Text style={heading}>{data?.acceptingTickets ? 'Accepting new tickets' : 'New tickets paused'}</Text>
      <Text style={{ color: colors.textMuted, lineHeight: 20 }}>Pausing stops new bookings. Staff can continue serving tickets already in the queue.</Text>
      <ActionButton label={data?.acceptingTickets ? 'Pause new tickets' : 'Open queue'} busy={busy} disabled={!data} onPress={() => void act({ type: 'SET_ACCEPTING', accepting: !data?.acceptingTickets })} />
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{data?.counts.map((item) => <View key={item.status} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}><Text style={heading}>{item.count}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.status.replace('_', ' ')}</Text></View>)}</View>
    <ActionButton label="Service routing" secondary onPress={() => setSection(section === 'services' ? '' : 'services')} />
    {section === 'services' && <Reveal style={{ gap: 20 }}>
      <Notice text="These are the six service categories in the approved proposal. Window assignments are configurable project settings, not a verified UM Tagum office policy. Changes apply to new tickets; existing tickets keep their assigned window." />
      {data?.services.map((service) => <View key={service.name} style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
        <Text style={heading}>{service.name}</Text>
        <ActionButton label={service.enabled ? 'Enabled · tap to pause service' : 'Paused · tap to enable service'} secondary disabled={busy} onPress={() => void act({ type: 'SET_SERVICE', ...service, enabled: !service.enabled })} />
        {registrarWindows.map((window) => <ActionButton key={window} label={window} secondary={service.window !== window} disabled={busy} onPress={() => void act({ type: 'SET_SERVICE', name: service.name, window, enabled: !!service.enabled })} />)}
      </View>)}
    </Reveal>}
    <ActionButton label="Create staff account" secondary onPress={() => setSection(section === 'create' ? '' : 'create')} />
    {section === 'create' && <Reveal style={{ gap: 14 }}>
      <Field label="Staff name" value={name} onChangeText={setName} /><Field label="Staff ID" value={login} onChangeText={setLogin} autoCapitalize="none" />
      <Field label="Staff email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Initial password (at least 10 characters)" value={password} onChangeText={setPassword} secureTextEntry />
      <ActionButton label="Save staff account" busy={busy} onPress={() => { void act({ type: 'CREATE_STAFF', name, login, email, password }).then((ok) => { if (ok) { setSection(''); setPassword(''); setName(''); setLogin(''); setEmail(''); } }); }} />
    </Reveal>}
    <ActionButton label={`Accounts (${data?.accounts.length ?? 0})`} secondary onPress={() => setSection(section === 'accounts' ? '' : 'accounts')} />
    {section === 'accounts' && <Reveal style={{ gap: 14 }}><Field label="Search accounts" value={search} onChangeText={setSearch} />
      {data?.accounts.filter((account) => `${account.name} ${account.login}`.toLowerCase().includes(search.toLowerCase())).map((account) => <View key={account.id} style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
        <Text style={heading}>{account.name}</Text><Text style={{ color: colors.textMuted }}>{account.login} · {account.role} · {account.active ? 'Active' : 'Disabled'}</Text>
        {account.window && <><Text style={{ color: colors.textMuted }}>{account.window}</Text><ActionButton label={`Release window for ${account.login}`} secondary disabled={busy} onPress={() => void act({ type: 'RELEASE_WINDOW', id: account.id })} /></>}
        {account.role !== 'admin' && <><ActionButton label={account.active ? `Disable ${account.login}` : `Enable ${account.login}`} secondary disabled={busy} onPress={() => void act({ type: 'SET_ACTIVE', id: account.id, active: !account.active })} />
          <ActionButton label={`Reset password for ${account.login}`} secondary onPress={() => { setResetId(resetId === account.id ? '' : account.id); setResetPassword(''); }} />
          {resetId === account.id && <><Notice text="Verify the account holder’s identity before resetting. Share the new password privately and ask them to change it in Profile." /><Field label="Replacement password" value={resetPassword} onChangeText={setResetPassword} secureTextEntry />
            <ActionButton label="Confirm password reset" busy={busy} onPress={() => { void act({ type: 'RESET_PASSWORD', id: account.id, password: resetPassword }).then((ok) => { if (ok) { setResetId(''); setResetPassword(''); } }); }} /></>}
        </>}
      </View>)}
    </Reveal>}
    <ActionButton label={`Queue records (${data?.records.length ?? 0})`} secondary onPress={() => setSection(section === 'records' ? '' : 'records')} />
    {section === 'records' && <Reveal style={{ gap: 14 }}><Field label="Search ticket or student ID" value={search} onChangeText={setSearch} />
      {data?.records.filter((ticket) => `${ticket.number} ${ticket.ownerId}`.toLowerCase().includes(search.toLowerCase())).map((ticket) => <View key={ticket.id} style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
        <Text style={heading}>{ticket.number} · {ticket.status.replace('_', ' ')}</Text><Text style={{ color: colors.textMuted }}>{ticket.service} · {ticket.ownerId}</Text><TicketActivity ticket={ticket} />
      </View>)}
    </Reveal>}
    <ActionButton label="Refresh records" secondary onPress={() => void refresh()} /><DarkModeToggle /><ThemePicker />
    <ActionButton label="Log Out" onPress={() => { void signOut().catch((failure: Error) => setError(failure.message)); }} />
  </FormPage>;
}
