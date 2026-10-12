import { useAppearance, type AppearanceTransition } from '@/contexts/appearance';
import { PropsWithChildren, useEffect } from 'react';
import { flushSync } from 'react-dom';

type TransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

export function AppearanceSurface({ children, active = true, priority = 0 }: PropsWithChildren<{ active?: boolean; priority?: number }>) {
  const { registerTransition } = useAppearance();
  useEffect(() => {
    if (!active || priority > 0 || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes queue-theme-reveal { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
      ::view-transition-old(root) { animation: none; z-index: 1; }
      ::view-transition-new(root) { animation: queue-theme-reveal 520ms cubic-bezier(.22,.61,.36,1) both; z-index: 2; mix-blend-mode: normal; }
      ::view-transition-group(root) { animation-duration: 520ms; }
      @media (prefers-reduced-motion: reduce) { ::view-transition-new(root) { animation: none; } }
    `;
    document.head.appendChild(style);
    const reveal: AppearanceTransition = (apply, finished) => {
      const doc = document as TransitionDocument;
      if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); finished(); return; }
      const transition = doc.startViewTransition(() => flushSync(apply));
      void transition.finished.catch(() => {}).finally(finished);
    };
    const unregister = registerTransition(reveal, priority);
    return () => { unregister(); style.remove(); };
  }, [active, priority, registerTransition]);
  return <>{children}</>;
}
