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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Erro ao obter usuário:', error.message);
      return null;
    }

    if (!user) {
      console.warn('[Auth] Nenhum usuário logado');
      return null;
    }

    console.log('[Auth] Usuário autenticado:', user.id);
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
