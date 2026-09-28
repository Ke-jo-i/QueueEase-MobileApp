import { createContext, PropsWithChildren, useContext, useState } from 'react';

type Role = 'student' | 'staff';
type Session = {
  role: Role | null;
  studentId: string | null;
  signedOutRole: Role | null;
  signIn: (role: Role, studentId?: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [signedOutRole, setSignedOutRole] = useState<Role | null>(null);

  return (
    <SessionContext.Provider value={{
      role,
      studentId,
      signedOutRole,
      signIn: (nextRole, nextStudentId) => {
        setSignedOutRole(null);
        setStudentId(nextRole === 'student' ? (nextStudentId?.trim().toLowerCase() || '2021-00123') : null);
        setRole(nextRole);
      },
      signOut: () => {
        setSignedOutRole(role);
        setStudentId(null);
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
