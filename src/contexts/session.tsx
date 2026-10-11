import { demoLoginEnabled } from '@/constants/demo-mode';
import { supabase } from '@/lib/supabase';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
  const [isLoading, setIsLoading] = useState(true);
  const generation = useRef(0);

  const clear = useCallback(() => { 
    generation.current++; 
    setSignedOutRole(auth?.user.role ?? null); 
    setAuth(null); 
  }, [auth]);

  const fetchUserProfile = async (userId: string, userEmail: string, fallbackRole: Role): Promise<User> => {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const userRole: Role = (userProfile?.role as Role) || fallbackRole;

    return {
      id: userId,
      login: userProfile?.student_id || userEmail,
      name: userProfile?.full_name || 'User',
      email: userEmail,
      role: userRole,
      window: userProfile?.window || null,
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const userProfile = await fetchUserProfile(session.user.id, session.user.email || '', 'student');
          setAuth({ token: session.access_token, user: userProfile });
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && isMounted) {
        const userProfile = await fetchUserProfile(session.user.id, session.user.email || '', 'student');
        setAuth({ token: session.access_token, user: userProfile });
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setAuth(null);
      }
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (portal: 'student' | 'staff', loginInput: string, passwordInput: string): Promise<User> => {
    const version = ++generation.current;
    const cleanInput = loginInput.trim().toLowerCase();
    let targetEmail = cleanInput;

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

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: passwordInput,
    });

    if (authErr || !authData.user) {
      throw new Error('Incorrect password. Please check and try again.');
    }

    const sessionUser = await fetchUserProfile(authData.user.id, authData.user.email || targetEmail, portal);

    // RESTRICTION: DILI TUGOTAN ANG CROSS-PORTAL LOGIN
    if (portal === 'student' && sessionUser.role === 'staff') {
      await supabase.auth.signOut();
      throw new Error('STAFF_PORTAL_ONLY');
    }

    if (portal === 'staff' && sessionUser.role === 'student') {
      await supabase.auth.signOut();
      throw new Error('STUDENT_PORTAL_ONLY');
    }

    if (version !== generation.current) {
      throw new Error('Sign-in was cancelled.');
    }

    const token = authData.session?.access_token || 'supabase-session-token';
    setSignedOutRole(null);
    setAuth({ token, user: sessionUser });

    return sessionUser;
  };

  const quickSignIn = async (role: Role): Promise<User> => {
    if (!demoLoginEnabled) throw new Error('Quick login is available only while testing.');

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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