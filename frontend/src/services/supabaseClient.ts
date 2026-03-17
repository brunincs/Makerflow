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
// TEMPORARIO: Retorna ID fixo do admin
export const getCurrentUserId = async (): Promise<string | null> => {
  // TODO: Restaurar depois de corrigir auth
  return 'e8f90f56-ff0a-4ea2-aa84-391c70fdf93d'; // ID do admin m3dmatrix
};

// Funcao sincrona para obter user_id da sessao atual (cache)
// TEMPORARIO: Retorna ID fixo do admin
export const getCurrentUserIdSync = (): string | null => {
  return 'e8f90f56-ff0a-4ea2-aa84-391c70fdf93d'; // ID do admin m3dmatrix
};
