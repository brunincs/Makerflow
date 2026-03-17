import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Pedido } from '../types';
import { getEstoquePorProduto, removerEstoqueComMovimentacao } from './estoqueProdutosService';

const STORAGE_KEY = 'makerflow_pedidos';

// Local storage fallback
const getLocalPedidos = (): Pedido[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalPedidos = (pedidos: Pedido[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
};

export const getPedidos = async (): Promise<Pedido[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalPedidos();
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos:', error);
    return [];
  }

  return data || [];
};

export const getPedidosPendentes = async (): Promise<Pedido[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalPedidos().filter(p => p.status !== 'concluido');
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .neq('status', 'concluido')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    return [];
  }

  return data || [];
};

export const createPedido = async (
  pedido: Omit<Pedido, 'id' | 'created_at' | 'updated_at' | 'produto' | 'variacao'>,
  consumirEstoque: boolean = true
): Promise<Pedido | null> => {
  // Verificar estoque disponivel
  let quantidadeDoEstoque = 0;

  if (consumirEstoque) {
    const estoqueAtual = await getEstoquePorProduto(pedido.produto_id, pedido.variacao_id);
    const estoqueDisponivel = estoqueAtual?.quantidade || 0;

    if (estoqueDisponivel > 0) {
      // Consumir estoque (total ou parcial)
      quantidadeDoEstoque = Math.min(estoqueDisponivel, pedido.quantidade);

      // Remover do estoque
      await removerEstoqueComMovimentacao(
        pedido.produto_id,
        pedido.variacao_id || null,
        quantidadeDoEstoque,
        'venda',
        `Pedido de ${pedido.quantidade} un (${quantidadeDoEstoque} do estoque)`
      );
    }
  }

  // Status inicial sempre pendente - usuario decide quando concluir
  // quantidade_produzida registra o que ja foi atendido (do estoque)
  const statusInicial: Pedido['status'] = 'pendente';

  const dadosParaSalvar = {
    produto_id: pedido.produto_id,
    variacao_id: pedido.variacao_id || null,
    quantidade: pedido.quantidade,
    quantidade_produzida: quantidadeDoEstoque, // Ja contabiliza o que veio do estoque
    status: statusInicial,
    observacao: pedido.observacao || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Pedido = {
      produto_id: dadosParaSalvar.produto_id,
      variacao_id: dadosParaSalvar.variacao_id,
      quantidade: dadosParaSalvar.quantidade,
      quantidade_produzida: dadosParaSalvar.quantidade_produzida,
      status: dadosParaSalvar.status as Pedido['status'],
      observacao: dadosParaSalvar.observacao || undefined,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const pedidos = getLocalPedidos();
    pedidos.unshift(novo);
    setLocalPedidos(pedidos);

    return novo;
  }

  const user_id = await getCurrentUserId();
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('pedidos')
    .insert([dadosComUserId])
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .single();

  if (error) {
    console.error('Erro ao criar pedido:', error);
    return null;
  }

  return data;
};

export const updatePedido = async (
  id: string,
  updates: Partial<Pedido>
): Promise<Pedido | null> => {
  const dadosParaAtualizar = {
    ...(updates.quantidade !== undefined && { quantidade: updates.quantidade }),
    ...(updates.quantidade_produzida !== undefined && { quantidade_produzida: updates.quantidade_produzida }),
    ...(updates.status !== undefined && { status: updates.status }),
    ...(updates.observacao !== undefined && { observacao: updates.observacao }),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() || !supabase) {
    const pedidos = getLocalPedidos();
    const index = pedidos.findIndex(p => p.id === id);
    if (index === -1) return null;

    pedidos[index] = { ...pedidos[index], ...dadosParaAtualizar };
    setLocalPedidos(pedidos);

    return pedidos[index];
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .single();

  if (error) {
    console.error('Erro ao atualizar pedido:', error);
    return null;
  }

  return data;
};

export const deletePedido = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const pedidos = getLocalPedidos();
    const filtered = pedidos.filter(p => p.id !== id);
    setLocalPedidos(filtered);
    return true;
  }

  // Primeiro, verificar se este pedido veio do Mercado Livre
  // Se sim, resetar o ml_order para poder importar novamente
  await supabase
    .from('ml_orders')
    .update({ imported: false, pedido_id: null })
    .eq('pedido_id', id);

  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar pedido:', error);
    return false;
  }

  return true;
};

// Marcar quantidade como produzida
export const marcarProduzido = async (
  id: string,
  quantidadeProduzida: number
): Promise<Pedido | null> => {
  // Buscar pedido atual
  const pedidos = await getPedidos();
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return null;

  const novaQuantidadeProduzida = (pedido.quantidade_produzida || 0) + quantidadeProduzida;
  const novoStatus = novaQuantidadeProduzida >= pedido.quantidade ? 'concluido' : 'em_producao';

  return updatePedido(id, {
    quantidade_produzida: novaQuantidadeProduzida,
    status: novoStatus,
  });
};

// Concluir pedido diretamente (para pedidos ja atendidos pelo estoque)
export const concluirPedido = async (id: string): Promise<Pedido | null> => {
  return updatePedido(id, {
    status: 'concluido',
  });
};

// Buscar pedidos concluidos (historico)
export const getPedidosConcluidos = async (): Promise<Pedido[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalPedidos().filter(p => p.status === 'concluido');
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .eq('status', 'concluido')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos concluidos:', error);
    return [];
  }

  return data || [];
};

// Reverter pedido para pendente
export const reverterPedido = async (id: string): Promise<Pedido | null> => {
  return updatePedido(id, {
    quantidade_produzida: 0,
    status: 'pendente',
  });
};
