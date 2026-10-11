import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { request } from '@/data/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { GlassSurface } from '@/components/glass-surface';
import { MotionButton, Reveal } from '@/components/motion';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Disclosure } from '@/components/disclosure';

export default function ScanTicketScreen() {
  const router = useRouter(); const { token } = useSession();
  const colors = useAppTheme();
  const { currentServing, assignedWindow, refresh } = useQueue();
  const [permission, askPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false); const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const matches = !!currentServing && (code.trim() === `queueease:v1:${currentServing.id}` || code.trim().replace(/\s/g, '').toUpperCase() === currentServing.number.replace(/\s/g, ''));
  const confirm = async () => {
    if (busy || !matches) return;
    setBusy(true); setError('');
    try {
      await request('/queue/command', token, { type: 'ACT', action: 'CHECKED_IN', expectedTicketId: currentServing?.id }, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await refresh(); setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not confirm arrival.'); }
    finally { setBusy(false); }
  };
  return <FormPage title="Verify ticket" subtitle={assignedWindow || 'Select a window in Profile first.'} back={false}>
    <MotionButton accessibilityLabel="Back to queue" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surface }} onPress={() => router.dismissTo('/staff/dashboard')}><Ionicons name="arrow-back" size={17} color={colors.brandText} /><Text style={{ color: colors.brandText, fontSize: 13, fontWeight: '600' }}>Back to queue</Text></MotionButton>
    {currentServing ? <GlassSurface variant="tinted" style={{ gap: 8, padding: 24, borderRadius: 28, alignItems: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.9 }}>CURRENTLY CALLED</Text>
      <Text style={{ color: colors.text, fontSize: 42, fontWeight: '700', letterSpacing: -1.3, fontVariant: ['tabular-nums'] }}>{currentServing.number}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{currentServing.service}</Text>
    </GlassSurface> : <Notice text="Call the next student from the queue before verifying their ticket." />}
    {!done && currentServing && <GlassSurface style={{ gap: 18, padding: 20, borderRadius: 26 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>Scan the student’s QR or enter their ticket number to confirm arrival.</Text>
      {Platform.OS !== 'web' && <ActionButton label={scanning ? 'Stop camera' : 'Scan QR ticket'} secondary onPress={() => { void (async () => {
        if (scanning) { setScanning(false); return; }
        const result = permission?.granted ? permission : await askPermission();
        if (result.granted) setScanning(true); else setError('Camera access is unavailable. You can enter the ticket number below.');
      })(); }} />}
      <Disclosure open={scanning} gap={18} style={{ height: 280, borderRadius: 24, overflow: 'hidden' }}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanning ? ({ data }) => { setScanning(false); setCode(data); setError(''); } : undefined} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 34, bottom: 34, left: 34, right: 34, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFFB3' }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, alignSelf: 'center', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: '#00000080' }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Align the QR inside the frame</Text></View>
      </Disclosure>
      <Field label="Ticket number or QR text" placeholder="R - 1" value={code} onChangeText={(value) => { setCode(value); setError(''); }} autoCapitalize="none" maxLength={120} />
      {!!code && <Notice text={matches ? 'This is the called ticket. Check the student’s ID before confirming.' : 'This does not match the ticket currently called at your window. Check the number and assigned window.'} error={!matches} />}
      <ActionButton label="Confirm arrival" disabled={!matches} busy={busy} onPress={() => void confirm()} />
    </GlassSurface>}
    {done && <Reveal><GlassSurface style={{ padding: 24, borderRadius: 28, alignItems: 'center', gap: 15 }}>
      <View style={{ width: 60, height: 60, borderRadius: 23, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={30} color={colors.successStrong} /></View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600', letterSpacing: -0.5 }}>Ready to serve</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 21 }}>Arrival confirmed and recorded. Serve this student, then mark the ticket as done. Call Next remains a separate staff action.</Text>
    </GlassSurface></Reveal>}
    <Notice text={error} error />
  </FormPage>;
}
