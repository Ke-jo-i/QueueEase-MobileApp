import { useMemo } from 'react';
import { AppColors, AppPalette } from '@/constants/app-colors';
import { useAppearance } from '@/contexts/appearance';

export function useAppTheme() {
  const { colorScheme, themeName } = useAppearance();
  return AppColors[themeName][colorScheme];
}

export function useThemedStyles<T>(createStyles: (colors: AppPalette) => T) {
  const colors = useAppTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
