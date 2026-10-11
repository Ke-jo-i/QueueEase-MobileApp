import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { type PropsWithChildren, type ReactNode, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { ScreenContainer } from 'react-native-screens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardScrollView } from './keyboard-scroll-view';
import { MotionButton } from './motion';
import { NavigationBar } from './navigation-bar';
import { BrandMark } from './brand-mark';
import { FluidPage, useFluidPager } from './fluid-tabs';
import { AdminSectionFocus } from '@/contexts/admin-section';

const destinations = [
  { id: 'Overview', label: 'Overview', icon: 'grid-outline', selectedIcon: 'grid' },
  { id: 'Accounts', label: 'Accounts', icon: 'people-outline', selectedIcon: 'people' },
  { id: 'Services', label: 'Services', icon: 'albums-outline', selectedIcon: 'albums' },
  { id: 'Records', label: 'Records', icon: 'receipt-outline', selectedIcon: 'receipt' },
  { id: 'Activity', label: 'Activity', icon: 'pulse-outline', selectedIcon: 'pulse' },
] as const;

export function AdminShell({ children, pages, section, name, busy, onSelect, onRefresh, onSettings, onSignOut }: PropsWithChildren<{
  pages: { id: string; content: ReactNode }[];
  section: string; name?: string; busy: boolean; onSelect: (section: string) => void;
  onRefresh: () => void; onSettings: () => void; onSignOut: () => void;
}>) {
  const colors = useAppTheme();
  const index = Math.max(0, destinations.findIndex(item => item.id === section));
  const { position, moving, scrub } = useFluidPager(index);
  const [width, setWidth] = useState(0);
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <View style={{ padding: 20, paddingBottom: 12, gap: 9, width: '100%', maxWidth: 1040, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><BrandMark size={24} color={colors.brandText} /><Text style={{ color: colors.brandText, fontSize: 13, fontWeight: '600' }}>Queue Ease</Text><Text style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{name}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, fontSize: 25, fontWeight: '700', letterSpacing: -0.8, color: colors.textStrong }}>Administration</Text>
        {([
          ['Refresh administration', 'refresh-outline', onRefresh],
          ['Administration settings', 'options-outline', onSettings],
          ['Log Out', 'log-out-outline', onSignOut],
        ] as const).map(([label, icon, onPress]) => <MotionButton key={label} accessibilityLabel={label} disabled={busy} onPress={onPress} style={{ width: 38, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15 }}><Ionicons name={icon} size={21} color={colors.textMuted} /></MotionButton>)}
      </View>
    </View>
    <ScreenContainer enabled={Platform.OS !== 'web'} hasTwoStates style={{ flex: 1, overflow: 'hidden' }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {pages.map((page, pageIndex) => <FluidPage key={page.id} index={pageIndex} focused={page.id === section} visible={moving || page.id === section} position={position} width={width}>
        <AdminSectionFocus.Provider value={page.id === section}><KeyboardScrollView testID={`admin-section-${page.id.toLowerCase()}`} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, width: '100%', maxWidth: 1040, alignSelf: 'center', gap: 20 }}>{page.content}</KeyboardScrollView></AdminSectionFocus.Provider>
      </FluidPage>)}
    </ScreenContainer>
    <NavigationBar disabled={busy} items={destinations} selected={section} scrub={scrub} onSelect={value => { if (!busy && value !== section) onSelect(value); }} />
    {children}
  </SafeAreaView>;
}
