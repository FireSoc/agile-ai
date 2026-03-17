import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const BOOTSTRAP_URL = `${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'}/bootstrap`;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

async function runUserBootstrap(token: string): Promise<void> {
  try {
    await fetch(BOOTSTRAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Bootstrap failure is non-fatal — the app remains functional.
    // The backend endpoint is idempotent so it will succeed on the next request.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes FIRST so the INITIAL_SESSION event
    // (which handles OAuth hash fragments on redirect) is never missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);

      // Bootstrap the user in the backend on every new sign-in (SIGNED_IN fires
      // both for email/password and for OAuth redirects).
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        newSession?.access_token
      ) {
        runUserBootstrap(newSession.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
