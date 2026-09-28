import { useAppearance } from '@/contexts/appearance';

export function useColorScheme() {
  return useAppearance().colorScheme;
}
