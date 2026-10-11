import type { Ticket } from '@/data/queue-model';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function useQueueAnnouncements() {
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const enabledRef = useRef(true);
  const mounted = useRef(true);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    void Speech.stop().catch(() => {});
  }, []);
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { mounted.current = false; listener.remove(); stop(); };
  }, [stop]);
  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    setError('');
    if (!enabledRef.current) stop();
  }, [stop]);
  const announce = useCallback(async (ticket: Ticket) => {
    if (!enabledRef.current || !mounted.current || AppState.currentState === 'background') return;
    const version = ++generation.current;
    setError('');
    const failed = () => {
      if (mounted.current && version === generation.current) setError('Ticket called successfully. Spoken audio is unavailable on this device.');
    };
    try {
      await Speech.stop();
      if (!mounted.current || !enabledRef.current || version !== generation.current) return;
      const number = ticket.number.replace(/\s*-\s*/g, ' ');
      const window = ticket.window.replace(' - Registrar', '');
      Speech.speak(`${number}. Please proceed to ${window}.`, { language: 'en-US', rate: 0.9, pitch: 1, onError: failed });
    } catch { failed(); }
  }, []);
  return { enabled, error, toggle, announce };
}
