import { ApiError, request } from '@/data/api';
import { demoLoginEnabled } from '@/constants/demo-mode';
import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';

export type Role = 'student' | 'staff' | 'admin';
export type User = { id: string; login: string; name: string; email: string; role: Role; window: string | null };
type Session = {
  role: Role | null; studentId: string | null; signedOutRole: Role | null;
  user: User | null; token: string | null;
  signIn: (portal: 'student' | 'staff', login: string, password: string) => Promise<User>;
  quickSignIn: (role: Role) => Promise<User>;
  signOut: () => Promise<void>;
  expire: () => void;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(null);
  const [signedOutRole, setSignedOutRole] = useState<Role | null>(null);
  const generation = useRef(0);
  const clear = useCallback(() => { generation.current++; setSignedOutRole(auth?.user.role ?? null); setAuth(null); }, [auth]);
  const authenticate = async (path: string, input: Record<string, unknown>) => {
    const version = ++generation.current;
    const result = await request<{ token: string; user: User }>(path, null, input);
    if (version !== generation.current) throw new ApiError('Sign-in was cancelled.');
    setSignedOutRole(null); setAuth(result); return result.user;
  };
  return <SessionContext.Provider value={{
    role: auth?.user.role ?? null, studentId: auth?.user.role === 'student' ? auth.user.login : null,
    user: auth?.user ?? null, token: auth?.token ?? null, signedOutRole,
    signIn: (portal, login, password) => authenticate('/auth/login', { portal, login, password }),
    quickSignIn: async (role) => {
      if (!demoLoginEnabled) throw new ApiError('Quick login is available only while testing.');
      return authenticate('/auth/demo-login', { role });
    },
    signOut: async () => {
      clear();
      if (auth) await request('/auth/logout', auth.token, {}).catch(() => {});
    },
    expire: clear,
  }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used within SessionProvider');
  return session;
}
