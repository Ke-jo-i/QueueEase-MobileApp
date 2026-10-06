import { useAppTheme } from '@/hooks/use-app-theme';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { ProfileMedia } from './profile-media';

export function StudentProfileTitle() {
  const colors = useAppTheme();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useFocusEffect(useCallback(() => close, [close]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active') close();
    });
    return () => subscription.remove();
  }, [close]);
  const title = <Text accessibilityRole="header" selectable={false} style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Student Profile</Text>;
  const active = focused && foreground;
  return <>
    {active ? <Pressable delayLongPress={10000} onLongPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>{title}</Pressable> : title}
    {open && active && <ProfileMedia onClose={close} />}
  </>;
}
