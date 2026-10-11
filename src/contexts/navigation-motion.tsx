import { useRouter } from 'expo-router';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

type NavigationMotion = { booking: boolean; entry: number; openTickets: () => void; finishBooking: () => void };
const MotionContext = createContext<NavigationMotion | null>(null);

export function NavigationMotionProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [entry, setEntry] = useState(0);
  const finishBooking = useCallback(() => setBooking(false), []);
  useEffect(() => {
    if (!booking) return;
    const frame = requestAnimationFrame(() => router.dismissTo('/tickets'));
    return () => cancelAnimationFrame(frame);
  }, [booking, router]);
  return <MotionContext.Provider value={{ booking, entry, openTickets: () => { setEntry(value => value + 1); setBooking(true); }, finishBooking }}>{children}</MotionContext.Provider>;
}

export function useNavigationMotion() {
  const motion = useContext(MotionContext);
  if (!motion) throw new Error('useNavigationMotion must be used within NavigationMotionProvider');
  return motion;
}
