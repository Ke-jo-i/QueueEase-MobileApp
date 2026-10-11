import { ApiError, request } from '@/data/api';
import { demoLoginEnabled } from '@/constants/demo-mode';
import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';

export type Role = 'student' | 'staff' | 'admin';
export type User = { id: string; login: string; name: string; email: string; role: Role; window: string | null };
export type AuthTransition = { id: number; role: Role; direction: 'login' | 'logout' };
type Session = {
  role: Role | null; studentId: string | null; signedOutRole: Role | null;
  user: User | null; token: string | null;
  signIn: (portal: 'student' | 'staff', login: string, password: string) => Promise<User>;
  quickSignIn: (role: Role) => Promise<User>;
  signOut: () => Promise<void>;
  expire: () => void;
  cancelSignIn: () => void;
  transition: AuthTransition | null;
  finishTransition: (id: number) => void;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(null);
  const [signedOutRole, setSignedOutRole] = useState<Role | null>(null);
  const [transition, setTransition] = useState<AuthTransition | null>(null);
  const authRef = useRef(auth);
  const transitionId = useRef(0);
  const generation = useRef(0);
  const clear = useCallback((animate = false) => {
    generation.current++;
    const previous = authRef.current;
    authRef.current = null;
    setSignedOutRole(previous?.user.role ?? null);
    setAuth(null);
    setTransition(animate && previous ? { id: ++transitionId.current, role: previous.user.role, direction: 'logout' } : null);
  }, []);
  const finishTransition = useCallback((id: number) => {
    setTransition(current => current?.id === id ? null : current);
  }, []);
  const cancelSignIn = useCallback(() => { generation.current++; }, []);
  const expire = useCallback(() => {
    if (authRef.current && authRef.current.token === auth?.token) clear();
  }, [auth?.token, clear]);
  const authenticate = async (path: string, input: Record<string, unknown>) => {
    const version = ++generation.current;
    const result = await request<{ token: string; user: User }>(path, null, input);
    if (version !== generation.current) {
      void request('/auth/logout', result.token, {}).catch(() => {});
      throw new ApiError('Sign-in was cancelled.');
    }
    authRef.current = result;
    setSignedOutRole(null);
    setTransition({ id: ++transitionId.current, role: result.user.role, direction: 'login' });
    setAuth(result);
    return result.user;
  };
  return <SessionContext.Provider value={{
    role: auth?.user.role ?? null, studentId: auth?.user.role === 'student' ? auth.user.login : null,
    user: auth?.user ?? null, token: auth?.token ?? null, signedOutRole, transition, finishTransition, cancelSignIn,
    signIn: (portal, login, password) => authenticate('/auth/login', { portal, login, password }),
    quickSignIn: async (role) => {
      if (!demoLoginEnabled) throw new ApiError('Quick login is available only while testing.');
      return authenticate('/auth/demo-login', { role });
    },
    signOut: async () => {
      const previous = authRef.current;
      if (!previous) { cancelSignIn(); return; }
      clear(true);
      await request('/auth/logout', previous.token, {}).catch(() => {});
    },
    expire,
  }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used within SessionProvider');
  return session;
}
