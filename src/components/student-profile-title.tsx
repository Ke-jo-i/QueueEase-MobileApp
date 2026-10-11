import { useAppTheme } from '@/hooks/use-app-theme';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { useSceneResponse } from '@/contexts/scene-responses';

export function StudentProfileTitle() {
  const colors = useAppTheme();
  const respond = useSceneResponse();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  const title = <Text accessibilityRole="header" selectable={false} style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Student Profile</Text>;
  const active = focused && foreground;
  return <>
    {active ? <Pressable onPress={() => respond('identity')} style={{ alignSelf: 'flex-start' }}>{title}</Pressable> : title}
  </>;
}
