import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { EstoqueProduto } from '../types';

const STORAGE_KEY = 'makerflow_estoque_produtos';

// Local storage fallback
const getLocalEstoque = (): EstoqueProduto[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalEstoque = (estoque: EstoqueProduto[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estoque));
};

export const getEstoqueProdutos = async (): Promise<EstoqueProduto[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalEstoque();
  }

  const { data, error } = await supabase
    .from('estoque_produtos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url),
      variacao:variacoes_produto(nome_variacao)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar estoque:', error);
    return [];
  }

  return data || [];
};

export const getEstoquePorProduto = async (
  produtoId: string,
  variacaoId?: string | null
): Promise<EstoqueProduto | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const estoque = getLocalEstoque();
    return estoque.find(e =>
      e.produto_id === produtoId &&
      (variacaoId ? e.variacao_id === variacaoId : !e.variacao_id)
    ) || null;
  }

  let query = supabase
    .from('estoque_produtos')
    .select('*')
    .eq('produto_id', produtoId);

  if (variacaoId) {
    query = query.eq('variacao_id', variacaoId);
  } else {
    query = query.is('variacao_id', null);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Erro ao buscar estoque:', error);
    return null;
  }

  return data || null;
};

export const adicionarEstoque = async (
  produtoId: string,
  variacaoId: string | null,
  quantidade: number
): Promise<EstoqueProduto | null> => {
  // Verificar se já existe registro
  const existente = await getEstoquePorProduto(produtoId, variacaoId);

  if (existente) {
    // Atualizar quantidade existente
    return atualizarEstoque(existente.id!, existente.quantidade + quantidade);
  }

  // Criar novo registro
  const dadosParaSalvar = {
    produto_id: produtoId,
    variacao_id: variacaoId,
    quantidade,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: EstoqueProduto = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const estoque = getLocalEstoque();
    estoque.push(novo);
    setLocalEstoque(estoque);

    return novo;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('estoque_produtos')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar estoque:', error);
    return null;
  }

  return data;
};

export const atualizarEstoque = async (
  id: string,
  novaQuantidade: number
): Promise<EstoqueProduto | null> => {
  const dadosParaAtualizar = {
    quantidade: Math.max(0, novaQuantidade),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() || !supabase) {
    const estoque = getLocalEstoque();
    const index = estoque.findIndex(e => e.id === id);
    if (index === -1) return null;

    estoque[index] = { ...estoque[index], ...dadosParaAtualizar };
    setLocalEstoque(estoque);

    return estoque[index];
  }

  const { data, error } = await supabase
    .from('estoque_produtos')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar estoque:', error);
    return null;
  }

  return data;
};

export const removerDoEstoque = async (
  produtoId: string,
  variacaoId: string | null,
  quantidade: number
): Promise<EstoqueProduto | null> => {
  const existente = await getEstoquePorProduto(produtoId, variacaoId);

  if (!existente) {
    return null;
  }

  const novaQuantidade = Math.max(0, existente.quantidade - quantidade);
  return atualizarEstoque(existente.id!, novaQuantidade);
};

export const deleteEstoque = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const estoque = getLocalEstoque();
    const filtered = estoque.filter(e => e.id !== id);
    setLocalEstoque(filtered);
    return true;
  }

  const { error } = await supabase
    .from('estoque_produtos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar estoque:', error);
    return false;
  }

  return true;
};
