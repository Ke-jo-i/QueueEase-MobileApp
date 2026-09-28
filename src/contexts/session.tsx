import { createContext, PropsWithChildren, useContext, useState } from 'react';

type Role = 'student' | 'staff';
type Session = {
  role: Role | null;
  signedOutRole: Role | null;
  clearSignedOutRole: () => void;
  signIn: (role: Role) => void;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role | null>(null);
  const [signedOutRole, setSignedOutRole] = useState<Role | null>(null);

  return (
    <SessionContext.Provider value={{
      role,
      signedOutRole,
      clearSignedOutRole: () => setSignedOutRole(null),
      signIn: (nextRole) => {
        setSignedOutRole(null);
        setRole(nextRole);
      },
      signOut: () => {
        setSignedOutRole(role);
        setRole(null);
      },
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used within SessionProvider');
  return session;
}
