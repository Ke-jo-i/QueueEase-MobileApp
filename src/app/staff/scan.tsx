import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { request } from '@/data/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

export default function ScanTicketScreen() {
  const router = useRouter(); const { token } = useSession();
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
    <ActionButton label="Back to queue" secondary onPress={() => router.dismissTo('/staff/dashboard')} />
    <Notice text={currentServing ? `Currently called: ${currentServing.number} · ${currentServing.service}. Scan the student's QR or enter their ticket number to confirm arrival.` : 'Call the next student from the queue before verifying their ticket.'} />
    {!done && currentServing && <View style={{ gap: 16 }}>
      {Platform.OS !== 'web' && <ActionButton label={scanning ? 'Stop camera' : 'Scan QR ticket'} secondary onPress={() => { void (async () => {
        if (scanning) { setScanning(false); return; }
        const result = permission?.granted ? permission : await askPermission();
        if (result.granted) setScanning(true); else setError('Camera access is unavailable. You can enter the ticket number below.');
      })(); }} />}
      {scanning && <View style={{ height: 260, borderRadius: 16, overflow: 'hidden' }}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { setScanning(false); setCode(data); setError(''); }} /></View>}
      <Field label="Ticket number or QR text" placeholder="R - 1" value={code} onChangeText={(value) => { setCode(value); setError(''); }} autoCapitalize="none" maxLength={120} />
      {!!code && <Notice text={matches ? 'This is the called ticket. Check the student’s ID before confirming.' : 'This does not match the ticket currently called at your window. Check the number and assigned window.'} error={!matches} />}
      <ActionButton label="Confirm arrival" disabled={!matches} busy={busy} onPress={() => void confirm()} />
    </View>}
    {done && <Notice text="Arrival confirmed and recorded. Serve this student, then mark the ticket as done. Call Next remains a separate staff action." />}
    <Notice text={error} error />
  </FormPage>;
}
