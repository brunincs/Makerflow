import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { EstoqueProduto, EstoqueMovimentacao, OrigemMovimentacao } from '../types';

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

// ============ MOVIMENTACOES ============

const MOVIMENTACOES_KEY = 'makerflow_estoque_movimentacoes';

const getLocalMovimentacoes = (): EstoqueMovimentacao[] => {
  const data = localStorage.getItem(MOVIMENTACOES_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalMovimentacoes = (movimentacoes: EstoqueMovimentacao[]): void => {
  localStorage.setItem(MOVIMENTACOES_KEY, JSON.stringify(movimentacoes));
};

// Registrar movimentacao de estoque
export const registrarMovimentacao = async (
  produtoId: string,
  variacaoId: string | null,
  tipo: 'entrada' | 'saida',
  quantidade: number,
  origem: OrigemMovimentacao,
  observacao?: string
): Promise<EstoqueMovimentacao | null> => {
  const dadosParaSalvar = {
    produto_id: produtoId,
    variacao_id: variacaoId,
    tipo,
    quantidade,
    origem,
    observacao: observacao || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const nova: EstoqueMovimentacao = {
      ...dadosParaSalvar,
      observacao: observacao || undefined,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const movimentacoes = getLocalMovimentacoes();
    movimentacoes.unshift(nova);
    setLocalMovimentacoes(movimentacoes);

    return nova;
  }

  const user_id = await getCurrentUserId();
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('estoque_movimentacoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar movimentacao:', error);
    return null;
  }

  return data;
};

// Buscar movimentacoes
export const getMovimentacoes = async (limite: number = 50): Promise<EstoqueMovimentacao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalMovimentacoes().slice(0, limite);
  }

  const { data, error } = await supabase
    .from('estoque_movimentacoes')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url),
      variacao:variacoes_produto(nome_variacao)
    `)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar movimentacoes:', error);
    return [];
  }

  return data || [];
};

// Adicionar estoque COM movimentacao
export const adicionarEstoqueComMovimentacao = async (
  produtoId: string,
  variacaoId: string | null,
  quantidade: number,
  origem: OrigemMovimentacao,
  observacao?: string
): Promise<EstoqueProduto | null> => {
  // Registrar movimentacao
  await registrarMovimentacao(produtoId, variacaoId, 'entrada', quantidade, origem, observacao);

  // Adicionar ao estoque
  return adicionarEstoque(produtoId, variacaoId, quantidade);
};

// Remover estoque COM movimentacao
export const removerEstoqueComMovimentacao = async (
  produtoId: string,
  variacaoId: string | null,
  quantidade: number,
  origem: OrigemMovimentacao,
  observacao?: string
): Promise<EstoqueProduto | null> => {
  // Verificar se tem estoque suficiente
  const existente = await getEstoquePorProduto(produtoId, variacaoId);
  if (!existente || existente.quantidade < quantidade) {
    console.error('Estoque insuficiente');
    return null;
  }

  // Registrar movimentacao
  await registrarMovimentacao(produtoId, variacaoId, 'saida', quantidade, origem, observacao);

  // Remover do estoque
  return removerDoEstoque(produtoId, variacaoId, quantidade);
};

// Buscar estoque agrupado por produto
export const getEstoqueAgrupado = async (): Promise<Map<string, EstoqueProduto[]>> => {
  const estoque = await getEstoqueProdutos();
  const agrupado = new Map<string, EstoqueProduto[]>();

  estoque.forEach(item => {
    const key = item.produto_id;
    if (!agrupado.has(key)) {
      agrupado.set(key, []);
    }
    agrupado.get(key)!.push(item);
  });

  return agrupado;
};
