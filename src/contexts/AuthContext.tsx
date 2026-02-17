import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/database';

export interface SubscriptionInfo {
  has_subscription: boolean;
  is_valid: boolean;
  requires_subscription: boolean;
  status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled';
  plan_name?: string;
  plan_id?: string;
  price_php?: number;
  trial_ends_at?: string;
  current_period_end?: string;
  days_left?: number;
  trial_used?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ data: { user: User | null }; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    }
    setProfile(data);

    if (data?.role === 'lending_admin' && data?.tenant_id) {
      await fetchSubscription(data.tenant_id);
    } else {
      setSubscription(null);
    }

    setLoading(false);
  }

  async function fetchSubscription(tenantId: string) {
    const { data, error } = await supabase.rpc('get_subscription_status', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
      return;
    }

    setSubscription(data as SubscriptionInfo);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  async function refreshSubscription() {
    if (profile?.tenant_id && profile?.role === 'lending_admin') {
      await fetchSubscription(profile.tenant_id);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return { data: { user: null }, error: error || new Error('Sign up failed') };
    }
    return { data: { user: data.user }, error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setSubscription(null);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, subscription, loading,
      signIn, signUp, signOut, refreshProfile, refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
