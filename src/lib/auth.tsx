import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile, Role } from '../types';

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (roleNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        (async () => {
          await loadProfile(session.user.id);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, role:roles(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as UserProfile | null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };

      if (data.user) {
        const viewerRole = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'viewer')
          .maybeSingle();

        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          role_id: viewerRole.data?.id ?? null,
          is_active: true,
        });
      }
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  function hasRole(roleNames: string[]): boolean {
    if (!profile?.role) return false;
    return roleNames.includes(profile.role.name);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
