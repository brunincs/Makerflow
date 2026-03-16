import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { createPedido } from './pedidosService';
import { getProdutos } from './produtosService';
import { MLOrder, MLConnectionStatus, MLSyncResponse } from '../types';

const STORAGE_KEY = 'makerflow_ml_orders';

// URL base das Edge Functions do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

// Local storage fallback
const getLocalMLOrders = (): MLOrder[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalMLOrders = (orders: MLOrder[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

// Funcao helper para obter o token JWT do usuario logado
const getAuthToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// Verificar status da conexao com Mercado Livre
export const checkMLConnection = async (): Promise<MLConnectionStatus> => {
  if (!FUNCTIONS_URL) {
    return { connected: false, reason: 'no_supabase' };
  }

  try {
    const token = await getAuthToken();
    const response = await fetch(`${FUNCTIONS_URL}/mercadolivre-status`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) {
      return { connected: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar conexao ML:', error);
    return { connected: false };
  }
};

// Sincronizar pedidos do Mercado Livre
export const syncMLOrders = async (): Promise<MLSyncResponse | null> => {
  if (!FUNCTIONS_URL) {
    return null;
  }

  try {
    const token = await getAuthToken();
    const response = await fetch(`${FUNCTIONS_URL}/mercadolivre-sync`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao sincronizar ML:', error);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao sincronizar ML:', error);
    return null;
  }
};

// Buscar pedidos ML do Supabase
export const getMLOrders = async (onlyPending: boolean = true): Promise<MLOrder[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const orders = getLocalMLOrders();
    return onlyPending ? orders.filter(o => !o.imported) : orders;
  }

  let query = supabase
    .from('ml_orders')
    .select('*')
    .order('date_created', { ascending: false });

  if (onlyPending) {
    query = query.eq('imported', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar pedidos ML:', error);
    return [];
  }

  return data || [];
};

// Buscar produto correspondente pelo SKU (prioridade) ou nome
const findMatchingProduct = async (productTitle: string, variation?: string | null, sellerSku?: string | null) => {
  const produtos = await getProdutos();

  // 1. PRIORIDADE: Buscar por SKU se fornecido
  if (sellerSku) {
    const normalizedSku = sellerSku.toUpperCase().trim();

    // Primeiro buscar nas variacoes
    for (const produto of produtos) {
      if (produto.variacoes && produto.variacoes.length > 0) {
        const variacaoMatch = produto.variacoes.find(v =>
          v.sku && v.sku.toUpperCase().trim() === normalizedSku
        );

        if (variacaoMatch) {
          return { produto, variacao: variacaoMatch, matchedBy: 'sku' };
        }
      }
    }

    // Depois buscar no produto principal
    for (const produto of produtos) {
      if (produto.sku && produto.sku.toUpperCase().trim() === normalizedSku) {
        return { produto, variacao: null, matchedBy: 'sku' };
      }
    }
  }

  // 2. FALLBACK: Buscar por nome (comportamento antigo)
  const normalizedTitle = productTitle.toLowerCase().trim();

  for (const produto of produtos) {
    const nomeProduto = produto.nome.toLowerCase().trim();

    // Verificar se o titulo contem o nome do produto ou vice-versa
    if (normalizedTitle.includes(nomeProduto) || nomeProduto.includes(normalizedTitle)) {
      // Se tem variacao, tentar encontrar
      if (variation && produto.variacoes && produto.variacoes.length > 0) {
        const normalizedVariation = variation.toLowerCase();
        const variacaoMatch = produto.variacoes.find(v =>
          normalizedVariation.includes(v.nome_variacao.toLowerCase())
        );

        if (variacaoMatch) {
          return { produto, variacao: variacaoMatch, matchedBy: 'name' };
        }
      }

      return { produto, variacao: null, matchedBy: 'name' };
    }
  }

  return null;
};

// Importar pedido ML para Fila de Producao
export const importMLOrderToPedido = async (order: MLOrder, produtoId?: string, variacaoId?: string | null): Promise<boolean> => {
  try {
    let finalProdutoId = produtoId;
    let finalVariacaoId = variacaoId;
    let observacao = `Importado do Mercado Livre - Pedido: ${order.ml_order_id}`;

    // Se nao foi passado produto, tentar encontrar automaticamente
    if (!finalProdutoId) {
      // Usar SKU como prioridade para encontrar o produto
      const match = await findMatchingProduct(order.product_title, order.variation, order.seller_sku);
      if (match) {
        finalProdutoId = match.produto.id;
        finalVariacaoId = match.variacao?.id || null;

        // Adicionar info de como foi encontrado
        if (match.matchedBy === 'sku') {
          observacao += ` | Encontrado por SKU: ${order.seller_sku}`;
        }
      } else {
        // Nao encontrou produto correspondente
        observacao += ` | Produto original: ${order.product_title}`;
        if (order.variation) {
          observacao += ` | Variacao: ${order.variation}`;
        }
        if (order.seller_sku) {
          observacao += ` | SKU: ${order.seller_sku}`;
        }
      }
    }

    // Criar pedido apenas se encontrou produto
    if (finalProdutoId) {
      const novoPedido = await createPedido({
        produto_id: finalProdutoId,
        variacao_id: finalVariacaoId || undefined,
        quantidade: order.quantity,
        quantidade_produzida: 0,
        status: 'pendente',
        observacao,
      });

      if (novoPedido) {
        // Marcar pedido ML como importado
        if (isSupabaseConfigured() && supabase) {
          await supabase
            .from('ml_orders')
            .update({
              imported: true,
              pedido_id: novoPedido.id
            })
            .eq('id', order.id);
        } else {
          const orders = getLocalMLOrders();
          const idx = orders.findIndex(o => o.id === order.id);
          if (idx !== -1) {
            orders[idx].imported = true;
            orders[idx].pedido_id = novoPedido.id;
            setLocalMLOrders(orders);
          }
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao importar pedido ML:', error);
    return false;
  }
};

// Importar multiplos pedidos
export const importMultipleMLOrders = async (
  orders: Array<{ order: MLOrder; produtoId?: string; variacaoId?: string | null }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const item of orders) {
    const result = await importMLOrderToPedido(item.order, item.produtoId, item.variacaoId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};

// Desconectar do Mercado Livre
export const disconnectML = async (): Promise<boolean> => {
  if (!FUNCTIONS_URL) {
    return false;
  }

  try {
    const token = await getAuthToken();
    const response = await fetch(`${FUNCTIONS_URL}/mercadolivre-disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao desconectar ML:', error);
    return false;
  }
};

// URL para login do Mercado Livre
export const getMLLoginUrl = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  // Incluir user_id como state para o callback
  return `${FUNCTIONS_URL}/mercadolivre-login?state=${userId || ''}`;
};
