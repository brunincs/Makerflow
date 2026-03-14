import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Filamento } from '../types';

const STORAGE_KEY = 'makerflow_filamentos';
const IMPRESSOES_STORAGE_KEY = 'makerflow_impressoes';

// Função auxiliar para calcular consumo total de um filamento
const calcularConsumoFilamento = async (filamentoId: string): Promise<number> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback local: ler impressões do localStorage
    const impressoesData = localStorage.getItem(IMPRESSOES_STORAGE_KEY);
    if (!impressoesData) return 0;

    const impressoes = JSON.parse(impressoesData);
    return impressoes
      .filter((imp: { filamento_id: string }) => imp.filamento_id === filamentoId)
      .reduce((acc: number, imp: { peso_total_g: number }) => acc + (imp.peso_total_g || 0), 0);
  }

  // Buscar do Supabase
  const { data, error } = await supabase
    .from('impressoes')
    .select('peso_total_g')
    .eq('filamento_id', filamentoId);

  if (error) {
    console.error('Erro ao buscar consumo do filamento:', error);
    return 0;
  }

  return (data || []).reduce((acc, imp) => acc + (imp.peso_total_g || 0), 0);
};

// Local storage fallback
const getLocalFilamentos = (): Filamento[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalFilamentos = (filamentos: Filamento[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filamentos));
};

export const createFilamento = async (
  filamento: Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg' | 'estoque_gramas'>
): Promise<Filamento | null> => {
  const estoqueGramas = (filamento.quantidade_rolos || 0) * 1000;

  const dadosParaSalvar = {
    marca: filamento.marca,
    nome_filamento: filamento.nome_filamento,
    cor: filamento.cor,
    material: filamento.material,
    preco_pago: filamento.preco_pago,
    preco_por_kg: filamento.preco_pago, // Todos são 1kg
    quantidade_rolos: filamento.quantidade_rolos || 0,
    estoque_gramas: estoqueGramas,
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
  filamento: Partial<Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg' | 'estoque_gramas'>>
): Promise<Filamento | null> => {
  const dadosParaAtualizar: Record<string, unknown> = { ...filamento };

  // Se atualizou preco_pago, atualizar preco_por_kg também
  if (filamento.preco_pago !== undefined) {
    dadosParaAtualizar.preco_por_kg = filamento.preco_pago;
  }

  // Se atualizou quantidade_rolos, recalcular estoque_gramas
  // Nova lógica: estoque = (rolos * 1000g) - consumo_total
  if (filamento.quantidade_rolos !== undefined) {
    const consumoTotal = await calcularConsumoFilamento(id);
    const estoqueTotal = filamento.quantidade_rolos * 1000;
    dadosParaAtualizar.estoque_gramas = Math.max(0, estoqueTotal - consumoTotal);
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
    console.error('Detalhes:', error.message, error.details, error.hint);
    alert(`Erro do Supabase: ${error.message}\n\nVoce ja adicionou as colunas 'quantidade_rolos' e 'estoque_gramas' na tabela 'filamentos'?`);
    return null;
  }

  return data;
};

// Descontar estoque de um filamento (usado após impressão)
export const descontarEstoqueFilamento = async (
  id: string,
  gramasUsados: number
): Promise<Filamento | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === id);
    if (index === -1) return null;

    filamentos[index].estoque_gramas = Math.max(0, filamentos[index].estoque_gramas - gramasUsados);
    setLocalFilamentos(filamentos);
    return filamentos[index];
  }

  // Primeiro buscar o estoque atual
  const { data: filamentoAtual, error: fetchError } = await supabase
    .from('filamentos')
    .select('estoque_gramas')
    .eq('id', id)
    .single();

  if (fetchError || !filamentoAtual) {
    console.error('Erro ao buscar filamento:', fetchError);
    return null;
  }

  const novoEstoque = Math.max(0, filamentoAtual.estoque_gramas - gramasUsados);

  const { data, error } = await supabase
    .from('filamentos')
    .update({ estoque_gramas: novoEstoque })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao descontar estoque:', error);
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
