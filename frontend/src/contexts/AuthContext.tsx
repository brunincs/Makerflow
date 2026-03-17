import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);

  const isAdmin = profile?.role === 'admin' && !profile?.suspended;
  const isAuthenticated = !!user && !!profile && !profile.suspended;

  // Buscar perfil do usuario
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err);
      return null;
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Inicializar autenticacao
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Timeout de seguranca - 5 segundos
    const timeout = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        console.warn('Timeout ao carregar autenticacao');
        loadingRef.current = false;
        setLoading(false);
      }
    }, 5000);

    // Buscar sessao atual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        if (isMounted) setProfile(profileData);
      }

      if (isMounted) {
        loadingRef.current = false;
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Erro ao buscar sessao:', error);
      if (isMounted) {
        loadingRef.current = false;
        setLoading(false);
      }
    });

    // Escutar mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (isMounted) setProfile(profileData);
        } else {
          setProfile(null);
        }

        if (isMounted) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Sign In
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  // Sign Up
  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  // Sign Out
  const signOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  // Update Profile
  const updateProfile = async (data: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error('Nao autenticado') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) {
      return { error };
    }

    // Atualizar estado local
    await refreshProfile();

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
