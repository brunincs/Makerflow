import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // Carregar perfil do usuario com timeout
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    if (!supabase) return null;

    try {
      // Timeout de 5 segundos para evitar travamento
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log('[Auth] Timeout ao carregar perfil');
          resolve(null);
        }, 5000);
      });

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[Auth] Erro ao carregar perfil:', error);
            return null;
          }
          return data;
        });

      return await Promise.race([profilePromise, timeoutPromise]);
    } catch (err) {
      console.error('[Auth] Erro inesperado ao carregar perfil:', err);
      return null;
    }
  };

  // Inicializar autenticacao
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('[Auth] Supabase nao configurado - modo dev');
      setProfile({
        id: 'dev-user',
        name: 'Usuario Dev',
        email: 'dev@local.com',
        role: 'admin',
        suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        console.log('[Auth] Verificando sessao...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Erro ao obter sessao:', error);
          if (mounted) setLoading(false);
          return;
        }

        console.log('[Auth] Sessao:', session ? 'encontrada' : 'nenhuma');

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            const profileData = await loadProfile(session.user.id);
            if (mounted) {
              setProfile(profileData || {
                id: session.user.id,
                name: session.user.email?.split('@')[0] || 'Usuario',
                email: session.user.email || '',
                role: 'user',
                suspended: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }

          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Erro na inicializacao:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Escutar mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Estado mudou:', event);

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await loadProfile(session.user.id);
          if (mounted) {
            setProfile(profileData || {
              id: session.user.id,
              name: session.user.email?.split('@')[0] || 'Usuario',
              email: session.user.email || '',
              role: 'user',
              suspended: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          setProfile(null);
        }

        // Nao mudar loading aqui para evitar flicker
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Login
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Cadastro
  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        return { error: error as Error };
      }

      // Criar perfil inicial (o trigger deve fazer isso, mas garantir)
      if (data.user) {
        try {
          await supabase
            .from('profiles')
            .upsert([{
              id: data.user.id,
              name,
              email,
              role: 'user',
              suspended: false,
            }], { onConflict: 'id' });
        } catch (profileError) {
          console.error('[Auth] Erro ao criar perfil:', profileError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Logout
  const signOut = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Erro ao fazer logout:', err);
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Recuperar senha
  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase nao configurado') };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error as Error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Atualizar perfil
  const updateProfile = async (data: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error('Usuario nao autenticado') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) {
        return { error: error as Error };
      }

      // Recarregar perfil
      const newProfile = await loadProfile(user.id);
      if (newProfile) setProfile(newProfile);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Recarregar perfil
  const refreshProfile = async () => {
    if (user) {
      const newProfile = await loadProfile(user.id);
      if (newProfile) setProfile(newProfile);
    }
  };

  // Verificar se e admin
  const isAdmin = profile?.role === 'admin';

  // Verificar se esta autenticado
  const isAuthenticated = !!user;

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
