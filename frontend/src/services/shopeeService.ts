import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { createPedido } from './pedidosService';
import { getProdutos } from './produtosService';
import { ShopeeOrder, ShopeeConnectionStatus, ShopeeSyncResponse } from '../types';

const STORAGE_KEY = 'makerflow_shopee_orders';

// URL base das Edge Functions do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

// Local storage fallback
const getLocalShopeeOrders = (): ShopeeOrder[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalShopeeOrders = (orders: ShopeeOrder[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

// Funcao helper para obter o token JWT do usuario logado
const getAuthToken = async (): Promise<string | null> => {
  if (!supabase) {
    console.log('[Shopee] Supabase not configured');
    return null;
  }

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Shopee] Error getting session:', error);
    return null;
  }

  if (!session) {
    console.log('[Shopee] No session found, trying to refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      console.error('[Shopee] Could not refresh session:', refreshError);
      return null;
    }
    console.log('[Shopee] Session refreshed successfully');
    return refreshData.session.access_token;
  }

  console.log('[Shopee] Session found, token exists:', !!session.access_token);
  return session.access_token;
};

// Verificar status da conexao com Shopee
export const checkShopeeConnection = async (): Promise<ShopeeConnectionStatus> => {
  if (!FUNCTIONS_URL) {
    console.log('[Shopee Status] FUNCTIONS_URL not configured');
    return { connected: false, reason: 'no_supabase' };
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.log('[Shopee Status] No auth token - user not logged in');
      return { connected: false, reason: 'no_user' };
    }

    console.log('[Shopee Status] Checking connection with token');
    const response = await fetch(`${FUNCTIONS_URL}/shopee-status`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('[Shopee Status] Error response:', response.status);
      return { connected: false };
    }

    const status = await response.json();
    console.log('[Shopee Status] Connection status:', status);
    return status;
  } catch (error) {
    console.error('[Shopee Status] Error:', error);
    return { connected: false };
  }
};

// Sincronizar pedidos da Shopee
export const syncShopeeOrders = async (): Promise<ShopeeSyncResponse | null> => {
  if (!FUNCTIONS_URL) {
    console.error('[Shopee Sync] FUNCTIONS_URL not configured');
    return null;
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[Shopee Sync] No auth token available - user may not be logged in');
      throw new Error('Voce precisa estar logado para sincronizar com a Shopee');
    }

    console.log('[Shopee Sync] Calling sync with token');
    const response = await fetch(`${FUNCTIONS_URL}/shopee-sync`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Shopee Sync] Error response:', error);
      throw new Error(error.error || 'Erro ao sincronizar');
    }

    return await response.json();
  } catch (error) {
    console.error('[Shopee Sync] Error:', error);
    throw error;
  }
};

// Buscar pedidos Shopee do Supabase
export const getShopeeOrders = async (onlyPending: boolean = true): Promise<ShopeeOrder[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const orders = getLocalShopeeOrders();
    return onlyPending ? orders.filter(o => !o.imported) : orders;
  }

  let query = supabase
    .from('shopee_orders')
    .select('*')
    .order('date_created', { ascending: false });

  if (onlyPending) {
    query = query.eq('imported', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar pedidos Shopee:', error);
    return [];
  }

  return data || [];
};

// Buscar produto correspondente pelo SKU (prioridade) ou nome
export const findMatchingProduct = async (productTitle: string, variation?: string | null, sellerSku?: string | null) => {
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

// Importar pedido Shopee para Fila de Producao
export const importShopeeOrderToPedido = async (order: ShopeeOrder, produtoId?: string, variacaoId?: string | null): Promise<boolean> => {
  try {
    let finalProdutoId = produtoId;
    let finalVariacaoId = variacaoId;
    let observacao = `Importado da Shopee - Pedido: ${order.shopee_order_id}`;

    // Se nao foi passado produto, tentar encontrar automaticamente
    if (!finalProdutoId) {
      const match = await findMatchingProduct(order.product_title, order.variation, order.seller_sku);
      if (match) {
        finalProdutoId = match.produto.id;
        finalVariacaoId = match.variacao?.id || null;

        if (match.matchedBy === 'sku') {
          observacao += ` | Encontrado por SKU: ${order.seller_sku}`;
        }
      } else {
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
        // Marcar pedido Shopee como importado
        if (isSupabaseConfigured() && supabase) {
          await supabase
            .from('shopee_orders')
            .update({
              imported: true,
              pedido_id: novoPedido.id
            })
            .eq('id', order.id);
        } else {
          const orders = getLocalShopeeOrders();
          const idx = orders.findIndex(o => o.id === order.id);
          if (idx !== -1) {
            orders[idx].imported = true;
            orders[idx].pedido_id = novoPedido.id;
            setLocalShopeeOrders(orders);
          }
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao importar pedido Shopee:', error);
    return false;
  }
};

// Importar multiplos pedidos
export const importMultipleShopeeOrders = async (
  orders: Array<{ order: ShopeeOrder; produtoId?: string; variacaoId?: string | null }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const item of orders) {
    const result = await importShopeeOrderToPedido(item.order, item.produtoId, item.variacaoId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};

// Desconectar da Shopee
export const disconnectShopee = async (): Promise<boolean> => {
  if (!FUNCTIONS_URL) {
    return false;
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[Shopee Disconnect] No auth token');
      return false;
    }

    const response = await fetch(`${FUNCTIONS_URL}/shopee-disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('[Shopee Disconnect] Error:', error);
    return false;
  }
};

// URL para login da Shopee
export const getShopeeLoginUrl = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  return `${FUNCTIONS_URL}/shopee-login?state=${userId || ''}`;
};
