import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, useState } from 'react';
import { Text, View } from 'react-native';
import { Disclosure } from './disclosure';
import { GlassSurface } from './glass-surface';
import { MotionButton } from './motion';

export function AdminPanel({ title, children }: PropsWithChildren<{ title?: string }>) {
  const colors = useAppTheme();
  return <GlassSurface style={{ borderRadius: 25, padding: 20, gap: 17 }}>
    {!!title && <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600', letterSpacing: -0.4 }}>{title}</Text>}
    {children}
  </GlassSurface>;
}

export function AdminChoices<T extends string>({ label, value, options, onChange, disabled = false }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean;
}) {
  const colors = useAppTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map(option => <MotionButton key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
      accessibilityState={{ checked: value === option.value, disabled }} disabled={disabled} onPress={() => onChange(option.value)}
      style={{ paddingHorizontal: 14, minHeight: 42, justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: value === option.value ? colors.brandText : colors.border, backgroundColor: value === option.value ? colors.infoSurface : 'transparent' }}>
      <Text style={{ color: value === option.value ? colors.brandText : colors.textMuted, fontSize: 13, fontWeight: '600' }}>{option.label}</Text>
    </MotionButton>)}
  </View>;
}

export function AdminSelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const colors = useAppTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 6 }}>
    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    <MotionButton disabled={disabled} accessibilityLabel={`${label}: ${options.find(option => option.value === value)?.label ?? value}`}
      accessibilityState={{ expanded: open, disabled }} onPress={() => setOpen(!open)}
      style={{ minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 16, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: colors.text, flex: 1, fontSize: 14 }}>{options.find(option => option.value === value)?.label ?? value}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
    </MotionButton>
    <Disclosure open={open} gap={6} style={{ gap: 2, padding: 6, backgroundColor: colors.surface, borderRadius: 16 }}>
      {options.map(option => <MotionButton key={option.value} accessibilityLabel={`${label}: select ${option.label}`} disabled={disabled} accessibilityState={{ disabled }} onPress={() => { onChange(option.value); setOpen(false); }}
        style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: value === option.value ? colors.infoSurface : 'transparent' }}>
        <Text style={{ color: value === option.value ? colors.brandText : colors.text, fontSize: 14 }}>{option.label}</Text>
      </MotionButton>)}
    </Disclosure>
  </View>;
}

export function AdminPager({ page, total, pageSize, busy, onChange, noun = 'records' }: { page: number; total: number; pageSize: number; busy: boolean; onChange: (page: number) => void; noun?: string }) {
  const colors = useAppTheme();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
    <MotionButton accessibilityLabel="Previous page" disabled={busy || page === 1} onPress={() => onChange(page - 1)} style={{ padding: 12, opacity: page === 1 ? 0.35 : 1 }}><Ionicons name="chevron-back" size={22} color={colors.brandText} /></MotionButton>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{total} {noun} · Page {page} of {pages}</Text>
    <MotionButton accessibilityLabel="Next page" disabled={busy || page >= pages} onPress={() => onChange(page + 1)} style={{ padding: 12, opacity: page >= pages ? 0.35 : 1 }}><Ionicons name="chevron-forward" size={22} color={colors.brandText} /></MotionButton>
  </View>;
}
