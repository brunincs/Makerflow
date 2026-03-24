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
  console.log('[Estoque] Buscando todos os produtos em estoque...');

  if (!isSupabaseConfigured() || !supabase) {
    return getLocalEstoque();
  }

  const user_id = await getCurrentUserId();
  if (!user_id) {
    console.error('[Estoque] ERRO: Usuário não autenticado');
    return [];
  }

  const { data, error } = await supabase
    .from('estoque_produtos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url),
      variacao:variacoes_produto(nome_variacao)
    `)
    .eq('user_id', user_id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Estoque] Erro ao buscar estoque:', error);
    return [];
  }

  console.log('[Estoque] Produtos em estoque encontrados:', data?.length || 0);
  return data || [];
};

export const getEstoquePorProduto = async (
  produtoId: string,
  variacaoId?: string | null
): Promise<EstoqueProduto | null> => {
  console.log('[Estoque] Buscando estoque para produto:', produtoId, 'variacao:', variacaoId);

  if (!isSupabaseConfigured() || !supabase) {
    const estoque = getLocalEstoque();
    return estoque.find(e =>
      e.produto_id === produtoId &&
      (variacaoId ? e.variacao_id === variacaoId : !e.variacao_id)
    ) || null;
  }

  const user_id = await getCurrentUserId();
  if (!user_id) {
    console.error('[Estoque] ERRO: Usuário não autenticado - não é possível buscar estoque');
    return null;
  }

  let query = supabase
    .from('estoque_produtos')
    .select('*')
    .eq('produto_id', produtoId)
    .eq('user_id', user_id);

  if (variacaoId) {
    query = query.eq('variacao_id', variacaoId);
  } else {
    query = query.is('variacao_id', null);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('[Estoque] Erro ao buscar estoque:', error);
    return null;
  }

  console.log('[Estoque] Estoque encontrado:', data);
  return data || null;
};

export const adicionarEstoque = async (
  produtoId: string,
  variacaoId: string | null,
  quantidade: number
): Promise<EstoqueProduto | null> => {
  console.log('[Estoque] Adicionando estoque:', { produtoId, variacaoId, quantidade });

  // Verificar se já existe registro
  const existente = await getEstoquePorProduto(produtoId, variacaoId);

  if (existente) {
    // Atualizar quantidade existente
    console.log('[Estoque] Registro existente, atualizando quantidade');
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
  console.log('[Estoque] user_id obtido:', user_id);

  if (!user_id) {
    console.error('[Estoque] ERRO: Usuário não autenticado - não é possível adicionar estoque');
    return null;
  }

  const dadosComUserId = { ...dadosParaSalvar, user_id };

  const { data, error } = await supabase
    .from('estoque_produtos')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('[Estoque] Erro ao adicionar estoque:', error);
    console.error('[Estoque] Código:', error.code, 'Mensagem:', error.message);
    return null;
  }

  console.log('[Estoque] Estoque adicionado com sucesso:', data);
  return data;
};

export const atualizarEstoque = async (
  id: string,
  novaQuantidade: number
): Promise<EstoqueProduto | null> => {
  console.log('[Estoque] Atualizando estoque id:', id, 'nova quantidade:', novaQuantidade);

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

  const user_id = await getCurrentUserId();
  if (!user_id) {
    console.error('[Estoque] ERRO: Usuário não autenticado - não é possível atualizar estoque');
    return null;
  }

  const { data, error } = await supabase
    .from('estoque_produtos')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) {
    console.error('[Estoque] Erro ao atualizar estoque:', error);
    console.error('[Estoque] Código:', error.code, 'Mensagem:', error.message);
    return null;
  }

  console.log('[Estoque] Estoque atualizado com sucesso:', data);
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
  console.log('[Movimentacao] Registrando:', { produtoId, variacaoId, tipo, quantidade, origem });

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
  console.log('[Movimentacao] user_id obtido:', user_id);

  if (!user_id) {
    console.error('[Movimentacao] ERRO: Usuário não autenticado - não é possível registrar movimentação');
    return null;
  }

  const dadosComUserId = { ...dadosParaSalvar, user_id };

  const { data, error } = await supabase
    .from('estoque_movimentacoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('[Movimentacao] Erro ao registrar movimentacao:', error);
    console.error('[Movimentacao] Código:', error.code, 'Mensagem:', error.message);
    return null;
  }

  console.log('[Movimentacao] Movimentação registrada com sucesso:', data);
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
  const movimentacao = await registrarMovimentacao(produtoId, variacaoId, 'entrada', quantidade, origem, observacao);
  if (!movimentacao) {
    console.error('Erro ao registrar movimentacao de entrada');
    return null;
  }

  // Adicionar ao estoque
  const resultado = await adicionarEstoque(produtoId, variacaoId, quantidade);
  if (!resultado) {
    console.error('Erro ao adicionar ao estoque');
    return null;
  }

  return resultado;
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
    console.warn(`Estoque insuficiente para produto ${produtoId}: disponivel=${existente?.quantidade || 0}, solicitado=${quantidade}`);
    return null;
  }

  // Registrar movimentacao
  const movimentacao = await registrarMovimentacao(produtoId, variacaoId, 'saida', quantidade, origem, observacao);
  if (!movimentacao) {
    console.error('Erro ao registrar movimentacao de saida');
    return null;
  }

  // Remover do estoque
  const resultado = await removerDoEstoque(produtoId, variacaoId, quantidade);
  if (!resultado) {
    console.error('Erro ao remover do estoque');
    return null;
  }

  return resultado;
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
