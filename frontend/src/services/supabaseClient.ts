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
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// Funcao sincrona para obter user_id da sessao atual (cache)
// Nota: Esta funcao retorna null pois getSession() e async
// Use getCurrentUserId() para obter o user_id corretamente
export const getCurrentUserIdSync = (): string | null => {
  return null;
};
