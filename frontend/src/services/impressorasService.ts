import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Impressora } from '../types';

const STORAGE_KEY = 'makerflow_impressoras';

// Local storage fallback
const getLocalImpressoras = (): Impressora[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalImpressoras = (impressoras: Impressora[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(impressoras));
};

export const getImpressoras = async (): Promise<Impressora[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalImpressoras();
  }

  const { data, error } = await supabase
    .from('impressoras')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar impressoras:', error);
    return [];
  }

  return data || [];
};

export const getImpressorasAtivas = async (): Promise<Impressora[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalImpressoras().filter(i => i.status === 'ativa');
  }

  const { data, error } = await supabase
    .from('impressoras')
    .select('*')
    .eq('status', 'ativa')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar impressoras ativas:', error);
    return [];
  }

  return data || [];
};

export const createImpressora = async (
  impressora: Omit<Impressora, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Impressora | null> => {
  const dadosParaSalvar = {
    modelo: impressora.modelo,
    apelido: impressora.apelido || null,
    marca: impressora.marca || null,
    status: impressora.status || 'ativa',
    consumo_kwh: impressora.consumo_kwh || 0.12,
    notas: impressora.notas || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const nova: Impressora = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const impressoras = getLocalImpressoras();
    impressoras.push(nova);
    setLocalImpressoras(impressoras);

    return nova;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('impressoras')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar impressora:', error);
    return null;
  }

  return data;
};

export const updateImpressora = async (
  id: string,
  impressora: Partial<Omit<Impressora, 'id' | 'user_id' | 'created_at'>>
): Promise<Impressora | null> => {
  const dadosParaAtualizar = {
    ...impressora,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() || !supabase) {
    const impressoras = getLocalImpressoras();
    const index = impressoras.findIndex(i => i.id === id);
    if (index === -1) return null;

    impressoras[index] = { ...impressoras[index], ...dadosParaAtualizar };
    setLocalImpressoras(impressoras);
    return impressoras[index];
  }

  const { data, error } = await supabase
    .from('impressoras')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar impressora:', error);
    return null;
  }

  return data;
};

export const deleteImpressora = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const impressoras = getLocalImpressoras();
    const filtered = impressoras.filter(i => i.id !== id);
    setLocalImpressoras(filtered);
    return true;
  }

  const { error } = await supabase
    .from('impressoras')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar impressora:', error);
    return false;
  }

  return true;
};
