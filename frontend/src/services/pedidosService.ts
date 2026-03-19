import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Pedido, PrioridadePedido } from '../types';
import { getEstoquePorProduto, removerEstoqueComMovimentacao, adicionarEstoqueComMovimentacao } from './estoqueProdutosService';

// Calcular prioridade automatica baseada na data de entrega
export const calcularPrioridade = (dataEntrega?: string): PrioridadePedido => {
  if (!dataEntrega) return 'normal';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const entrega = new Date(dataEntrega);
  entrega.setHours(0, 0, 0, 0);

  const diffDias = Math.ceil((entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias <= 1) return 'urgente';
  if (diffDias <= 3) return 'alta';
  return 'normal';
};

// Obter valor numerico da prioridade para ordenacao
export const getPrioridadeValor = (prioridade?: PrioridadePedido): number => {
  switch (prioridade) {
    case 'urgente': return 0;
    case 'alta': return 1;
    case 'normal': return 2;
    default: return 2;
  }
};

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
    // Filtrar apenas pedidos ativos (pendentes ou em produção)
    return getLocalPedidos().filter(p =>
      p.status === 'pendente' || p.status === 'em_producao'
    );
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .in('status', ['pendente', 'em_producao'])
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

  // Calcular prioridade automatica se nao for informada
  const prioridadeCalculada = pedido.prioridade || calcularPrioridade(pedido.data_entrega);

  const dadosParaSalvar = {
    produto_id: pedido.produto_id,
    variacao_id: pedido.variacao_id || null,
    quantidade: pedido.quantidade,
    quantidade_produzida: quantidadeDoEstoque, // Ja contabiliza o que veio do estoque
    status: statusInicial,
    prioridade: prioridadeCalculada,
    data_entrega: pedido.data_entrega || null,
    observacao: pedido.observacao || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Pedido = {
      produto_id: dadosParaSalvar.produto_id,
      variacao_id: dadosParaSalvar.variacao_id,
      quantidade: dadosParaSalvar.quantidade,
      quantidade_produzida: dadosParaSalvar.quantidade_produzida,
      status: dadosParaSalvar.status as Pedido['status'],
      prioridade: dadosParaSalvar.prioridade,
      data_entrega: dadosParaSalvar.data_entrega || undefined,
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
    ...(updates.prioridade !== undefined && { prioridade: updates.prioridade }),
    ...(updates.data_entrega !== undefined && { data_entrega: updates.data_entrega }),
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
  // Buscar pedido para restaurar estoque se necessario
  const pedidos = await getPedidos();
  const pedido = pedidos.find(p => p.id === id);

  // Restaurar estoque se havia quantidade produzida/entregue
  if (pedido && pedido.quantidade_produzida && pedido.quantidade_produzida > 0) {
    await adicionarEstoqueComMovimentacao(
      pedido.produto_id,
      pedido.variacao_id || null,
      pedido.quantidade_produzida,
      'ajuste',
      `Pedido excluido - ${pedido.quantidade_produzida} unidade(s) retornaram ao estoque`
    );
  }

  if (!isSupabaseConfigured() || !supabase) {
    const localPedidos = getLocalPedidos();
    const filtered = localPedidos.filter(p => p.id !== id);
    setLocalPedidos(filtered);
    return true;
  }

  // IMPORTANTE: NÃO resetar ml_orders.imported quando pedido é deletado
  // Isso evita que pedidos do Mercado Livre sejam reimportados
  // Para pedidos de marketplace, use cancelarPedido() ou devolverPedido() em vez de deletePedido()

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

// Buscar pedidos concluidos (historico) - inclui concluidos, cancelados e devolvidos
export const getPedidosConcluidos = async (): Promise<Pedido[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalPedidos().filter(p =>
      p.status === 'concluido' || p.status === 'cancelado' || p.status === 'devolvido'
    );
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      produto:produtos_concorrentes(nome, imagem_url, peso_filamento, tempo_impressao),
      variacao:variacoes_produto(nome_variacao, peso_filamento, tempo_impressao)
    `)
    .in('status', ['concluido', 'cancelado', 'devolvido'])
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos concluidos:', error);
    return [];
  }

  return data || [];
};

// Reverter pedido para pendente (restaura estoque se houver quantidade produzida)
export const reverterPedido = async (id: string): Promise<Pedido | null> => {
  // Buscar pedido atual para saber quantidade que foi entregue/consumida
  const pedidos = await getPedidos();
  const pedido = pedidos.find(p => p.id === id);

  if (!pedido) return null;

  // Se havia quantidade produzida/entregue, restaurar ao estoque
  const qtdParaRestaurar = pedido.quantidade_produzida || 0;
  if (qtdParaRestaurar > 0) {
    await adicionarEstoqueComMovimentacao(
      pedido.produto_id,
      pedido.variacao_id || null,
      qtdParaRestaurar,
      'ajuste',
      `Pedido revertido - ${qtdParaRestaurar} unidade(s) retornaram ao estoque`
    );
  }

  return updatePedido(id, {
    quantidade_produzida: 0,
    status: 'pendente',
  });
};

// Cancelar pedido (produto não foi entregue, volta ao estoque)
export const cancelarPedido = async (id: string): Promise<Pedido | null> => {
  const pedidos = await getPedidos();
  const pedido = pedidos.find(p => p.id === id);

  if (!pedido) return null;

  // Restaurar estoque (produto foi produzido mas não entregue)
  const qtdParaRestaurar = pedido.quantidade_produzida || 0;
  if (qtdParaRestaurar > 0) {
    await adicionarEstoqueComMovimentacao(
      pedido.produto_id,
      pedido.variacao_id || null,
      qtdParaRestaurar,
      'ajuste',
      `Pedido cancelado - ${qtdParaRestaurar} unidade(s) retornaram ao estoque`
    );
  }

  return updatePedido(id, {
    status: 'cancelado',
  });
};

// Devolver pedido (produto foi entregue e devolvido, volta ao estoque)
export const devolverPedido = async (id: string): Promise<Pedido | null> => {
  const pedidos = await getPedidos();
  const pedido = pedidos.find(p => p.id === id);

  if (!pedido) return null;

  // Restaurar estoque (produto foi devolvido)
  const qtdParaRestaurar = pedido.quantidade_produzida || pedido.quantidade;
  if (qtdParaRestaurar > 0) {
    await adicionarEstoqueComMovimentacao(
      pedido.produto_id,
      pedido.variacao_id || null,
      qtdParaRestaurar,
      'ajuste',
      `Pedido devolvido - ${qtdParaRestaurar} unidade(s) retornaram ao estoque`
    );
  }

  return updatePedido(id, {
    status: 'devolvido',
  });
};
