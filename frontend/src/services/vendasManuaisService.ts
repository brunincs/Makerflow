import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { VendaManual } from '../types';

const STORAGE_KEY = 'makerflow_vendas_manuais';

// Local storage fallback
const getLocalVendas = (): VendaManual[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalVendas = (vendas: VendaManual[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vendas));
};

export const getVendasManuais = async (): Promise<VendaManual[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalVendas();
  }

  const { data, error } = await supabase
    .from('vendas_manuais')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar vendas manuais:', error);
    return [];
  }

  return data || [];
};

export const createVendaManual = async (
  venda: Omit<VendaManual, 'id' | 'created_at' | 'updated_at' | 'produto' | 'variacao'>
): Promise<VendaManual | null> => {
  const dadosParaSalvar = {
    produto_id: venda.produto_id || null,
    variacao_id: venda.variacao_id || null,
    quantidade: venda.quantidade,
    preco_unitario: venda.preco_unitario,
    preco_total: venda.preco_total,
    forma_pagamento: venda.forma_pagamento,
    observacao: venda.observacao || null,
    enviado_producao: venda.enviado_producao || false,
    pedido_id: venda.pedido_id || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const nova: VendaManual = {
      ...dadosParaSalvar,
      observacao: dadosParaSalvar.observacao || undefined,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const vendas = getLocalVendas();
    vendas.unshift(nova);
    setLocalVendas(vendas);

    return nova;
  }

  const user_id = await getCurrentUserId();
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('vendas_manuais')
    .insert([dadosComUserId])
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .single();

  if (error) {
    console.error('Erro ao criar venda manual:', error);
    return null;
  }

  return data;
};

export const updateVendaManual = async (
  id: string,
  updates: Partial<VendaManual>
): Promise<VendaManual | null> => {
  const dadosParaAtualizar = {
    ...(updates.quantidade !== undefined && { quantidade: updates.quantidade }),
    ...(updates.preco_unitario !== undefined && { preco_unitario: updates.preco_unitario }),
    ...(updates.preco_total !== undefined && { preco_total: updates.preco_total }),
    ...(updates.forma_pagamento !== undefined && { forma_pagamento: updates.forma_pagamento }),
    ...(updates.observacao !== undefined && { observacao: updates.observacao }),
    ...(updates.enviado_producao !== undefined && { enviado_producao: updates.enviado_producao }),
    ...(updates.pedido_id !== undefined && { pedido_id: updates.pedido_id }),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() || !supabase) {
    const vendas = getLocalVendas();
    const index = vendas.findIndex(v => v.id === id);
    if (index === -1) return null;

    vendas[index] = { ...vendas[index], ...dadosParaAtualizar };
    setLocalVendas(vendas);

    return vendas[index];
  }

  const { data, error } = await supabase
    .from('vendas_manuais')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .single();

  if (error) {
    console.error('Erro ao atualizar venda manual:', error);
    return null;
  }

  return data;
};

export const deleteVendaManual = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const vendas = getLocalVendas();
    const filtered = vendas.filter(v => v.id !== id);
    setLocalVendas(filtered);
    return true;
  }

  const { error } = await supabase
    .from('vendas_manuais')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar venda manual:', error);
    return false;
  }

  return true;
};
