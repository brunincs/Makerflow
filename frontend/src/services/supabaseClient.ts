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
// TEMPORARIO: Retorna null enquanto auth esta desabilitada
// Isso permite inserir registros sem user_id valido
export const getCurrentUserId = async (): Promise<string | null> => {
  // TODO: Restaurar depois de corrigir auth
  // Quando auth for reativada, usar:
  // const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  // return user?.id ?? null;
  return null; // Auth desabilitada temporariamente
};

// Funcao sincrona para obter user_id da sessao atual (cache)
// TEMPORARIO: Retorna null enquanto auth esta desabilitada
export const getCurrentUserIdSync = (): string | null => {
  return null; // Auth desabilitada temporariamente
};
