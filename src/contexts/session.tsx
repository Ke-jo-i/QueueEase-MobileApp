import { demoLoginEnabled } from '@/constants/demo-mode';
import { supabase } from '@/lib/supabase';
import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';

export type Role = 'student' | 'staff' | 'admin';
export type User = { 
  id: string; 
  login: string; 
  name: string; 
  email: string; 
  role: Role; 
  window: string | null 
};

type Session = {
  role: Role | null; 
  studentId: string | null; 
  signedOutRole: Role | null;
  user: User | null; 
  token: string | null;
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

  const clear = useCallback(() => { 
    generation.current++; 
    setSignedOutRole(auth?.user.role ?? null); 
    setAuth(null); 
  }, [auth]);

  // Direct Supabase Authentication with Specific Error Messages & Dual Login (ID / Email)
  const signIn = async (portal: 'student' | 'staff', loginInput: string, passwordInput: string): Promise<User> => {
    const version = ++generation.current;
    const cleanInput = loginInput.trim().toLowerCase();
    let targetEmail = cleanInput;

    // 1. KUNG STUDENT ID (puro numero / walang '@') ANG INILAGAY:
    if (!cleanInput.includes('@')) {
      const { data: profileByStudentId } = await supabase
        .from('profiles')
        .select('email')
        .eq('student_id', cleanInput)
        .maybeSingle();

      if (!profileByStudentId?.email) {
        throw new Error('Unregistered Account. Please check your Student ID.');
      }
      targetEmail = profileByStudentId.email;
    }

    // 2. MAG-SIGN IN DIRECTLY SA SUPABASE AUTH GAMIT ANG EMAIL
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: passwordInput,
    });

    if (authErr || !authData.user) {
      const errMsg = authErr?.message || '';
      if (errMsg.toLowerCase().includes('invalid login credentials')) {
        // Titingnan natin sa profiles kung talagang wala ang account o mali lang ang password
        const { data: checkProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', targetEmail)
          .maybeSingle();

        if (!checkProfile && cleanInput.includes('@')) {
          throw new Error('Unregistered Account. Please check your email or sign up.');
        } else {
          throw new Error('Incorrect Password. Please try again.');
        }
      }
      throw new Error(errMsg || 'Could not sign in.');
    }

    // 3. KUNIN ANG PROFILE DETAILS MULA SA DATABASE
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    const userRole: Role = (userProfile?.role as Role) || (portal === 'staff' ? 'staff' : 'student');

    // Harangan kung magkaiba ang Portal at Role
    if (portal === 'staff' && userRole === 'student') {
      await supabase.auth.signOut();
      throw new Error('Student accounts cannot log in to the Staff portal.');
    }

    const sessionUser: User = {
      id: authData.user.id,
      login: userProfile?.student_id || authData.user.email || targetEmail,
      name: userProfile?.full_name || authData.user.user_metadata?.full_name || 'User',
      email: authData.user.email || targetEmail,
      role: userRole,
      window: userProfile?.window || null,
    };

    if (version !== generation.current) {
      throw new Error('Sign-in was cancelled.');
    }

    const token = authData.session?.access_token || 'supabase-session-token';
    setSignedOutRole(null);
    setAuth({ token, user: sessionUser });

    return sessionUser;
  };

  // Quick Demo Login (ginagamit para sa mabilisang testing at demo)
  const quickSignIn = async (role: Role): Promise<User> => {
    if (!demoLoginEnabled) {
      throw new Error('Quick login is available only while testing.');
    }

    const demoUser: User = {
      id: `demo-${role}-id`,
      login: role === 'student' ? '147611' : `${role}@school.edu.ph`,
      name: `Demo ${role.toUpperCase()}`,
      email: `demo-${role}@school.edu.ph`,
      role: role,
      window: role === 'staff' ? 'Window 1' : null,
    };

    setSignedOutRole(null);
    setAuth({ token: `demo-token-${role}`, user: demoUser });
    return demoUser;
  };

  const signOut = async () => {
    clear();
    await supabase.auth.signOut().catch(() => {});
  };

  return (
    <SessionContext.Provider
      value={{
        role: auth?.user.role ?? null,
        studentId: auth?.user.role === 'student' ? auth.user.login : null,
        user: auth?.user ?? null,
        token: auth?.token ?? null,
        signedOutRole,
        signIn,
        quickSignIn,
        signOut,
        expire: clear,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used within SessionProvider');
  return session;
}