import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Funcao para obter o user_id do usuario logado
export const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) {
    console.warn('[Auth] Supabase não configurado');
    return null;
  }

  try {
    // Primeiro verificar a sessão
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Auth] Erro ao obter sessão:', sessionError.message);
    } else {
      console.log('[Auth] Sessão:', sessionData.session ? 'Ativa' : 'Nenhuma');
      if (sessionData.session) {
        console.log('[Auth] Token expira em:', new Date(sessionData.session.expires_at! * 1000).toLocaleString());
      }
    }

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Erro ao obter usuário:', error.message);
      console.error('[Auth] Código do erro:', error.name);
      return null;
    }

    if (!user) {
      console.warn('[Auth] Nenhum usuário logado - getUser retornou null');
      console.warn('[Auth] Verifique se fez login corretamente');
      return null;
    }

    console.log('[Auth] Usuário autenticado:', user.id);
    console.log('[Auth] Email:', user.email);
    return user.id;
  } catch (err) {
    console.error('[Auth] Exceção ao obter usuário:', err);
    return null;
  }
};

// Funcao sincrona para obter user_id da sessao atual (cache)
// Nota: Esta funcao retorna null pois getSession() e async
// Use getCurrentUserId() para obter o user_id corretamente
export const getCurrentUserIdSync = (): string | null => {
  return null;
};
