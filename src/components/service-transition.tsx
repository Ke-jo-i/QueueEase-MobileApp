import { type PropsWithChildren } from 'react';

export function ServiceTransition({ children }: PropsWithChildren<{ mode?: 'service' | 'form' }>) { return <>{children}</>; }
