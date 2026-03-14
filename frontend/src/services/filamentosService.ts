import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Filamento } from '../types';

const STORAGE_KEY = 'makerflow_filamentos';

// Local storage fallback
const getLocalFilamentos = (): Filamento[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalFilamentos = (filamentos: Filamento[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filamentos));
};

export const createFilamento = async (
  filamento: Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg'>
): Promise<Filamento | null> => {
  const dadosParaSalvar = {
    marca: filamento.marca,
    nome_filamento: filamento.nome_filamento,
    cor: filamento.cor,
    material: filamento.material,
    preco_pago: filamento.preco_pago,
    preco_por_kg: filamento.preco_pago, // Todos são 1kg
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Filamento = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const filamentos = getLocalFilamentos();
    filamentos.unshift(novo);
    setLocalFilamentos(filamentos);

    return novo;
  }

  const { data, error } = await supabase
    .from('filamentos')
    .insert([dadosParaSalvar])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar filamento:', error);
    return null;
  }

  return data;
};

export const getFilamentos = async (): Promise<Filamento[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalFilamentos();
  }

  const { data, error } = await supabase
    .from('filamentos')
    .select('*')
    .order('marca', { ascending: true })
    .order('nome_filamento', { ascending: true });

  if (error) {
    console.error('Erro ao buscar filamentos:', error);
    return [];
  }

  return data || [];
};

export const updateFilamento = async (
  id: string,
  filamento: Partial<Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg'>>
): Promise<Filamento | null> => {
  const dadosParaAtualizar: Record<string, unknown> = { ...filamento };

  // Se atualizou preco_pago, atualizar preco_por_kg também
  if (filamento.preco_pago !== undefined) {
    dadosParaAtualizar.preco_por_kg = filamento.preco_pago;
  }

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === id);
    if (index === -1) return null;

    filamentos[index] = { ...filamentos[index], ...dadosParaAtualizar } as Filamento;
    setLocalFilamentos(filamentos);
    return filamentos[index];
  }

  const { data, error } = await supabase
    .from('filamentos')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar filamento:', error);
    return null;
  }

  return data;
};

export const deleteFilamento = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const filtered = filamentos.filter(f => f.id !== id);
    setLocalFilamentos(filtered);
    return true;
  }

  const { error } = await supabase
    .from('filamentos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar filamento:', error);
    return false;
  }

  return true;
};
