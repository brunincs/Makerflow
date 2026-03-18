import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { createPedido } from './pedidosService';
import { getProdutos } from './produtosService';
import { TikTokOrder, TikTokConnectionStatus, TikTokSyncResponse } from '../types';

const STORAGE_KEY = 'makerflow_tiktok_orders';

// URL base das Edge Functions do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

// Local storage fallback
const getLocalTikTokOrders = (): TikTokOrder[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalTikTokOrders = (orders: TikTokOrder[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

// Funcao helper para obter o token JWT do usuario logado
const getAuthToken = async (): Promise<string | null> => {
  if (!supabase) {
    console.log('[TikTok] Supabase not configured');
    return null;
  }

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[TikTok] Error getting session:', error);
    return null;
  }

  if (!session) {
    console.log('[TikTok] No session found, trying to refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      console.error('[TikTok] Could not refresh session:', refreshError);
      return null;
    }
    console.log('[TikTok] Session refreshed successfully');
    return refreshData.session.access_token;
  }

  console.log('[TikTok] Session found, token exists:', !!session.access_token);
  return session.access_token;
};

// Verificar status da conexao com TikTok Shop
export const checkTikTokConnection = async (): Promise<TikTokConnectionStatus> => {
  if (!FUNCTIONS_URL) {
    console.log('[TikTok Status] FUNCTIONS_URL not configured');
    return { connected: false, reason: 'no_supabase' };
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.log('[TikTok Status] No auth token - user not logged in');
      return { connected: false, reason: 'no_user' };
    }

    console.log('[TikTok Status] Checking connection with token');
    const response = await fetch(`${FUNCTIONS_URL}/tiktok-status`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('[TikTok Status] Error response:', response.status);
      return { connected: false };
    }

    const status = await response.json();
    console.log('[TikTok Status] Connection status:', status);
    return status;
  } catch (error) {
    console.error('[TikTok Status] Error:', error);
    return { connected: false };
  }
};

// Sincronizar pedidos do TikTok Shop
export const syncTikTokOrders = async (): Promise<TikTokSyncResponse | null> => {
  if (!FUNCTIONS_URL) {
    console.error('[TikTok Sync] FUNCTIONS_URL not configured');
    return null;
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[TikTok Sync] No auth token available - user may not be logged in');
      throw new Error('Voce precisa estar logado para sincronizar com o TikTok Shop');
    }

    console.log('[TikTok Sync] Calling sync with token');
    const response = await fetch(`${FUNCTIONS_URL}/tiktok-sync`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[TikTok Sync] Error response:', error);
      throw new Error(error.error || 'Erro ao sincronizar');
    }

    return await response.json();
  } catch (error) {
    console.error('[TikTok Sync] Error:', error);
    throw error;
  }
};

// Buscar pedidos TikTok do Supabase
export const getTikTokOrders = async (onlyPending: boolean = true): Promise<TikTokOrder[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const orders = getLocalTikTokOrders();
    return onlyPending ? orders.filter(o => !o.imported) : orders;
  }

  let query = supabase
    .from('tiktok_orders')
    .select('*')
    .order('date_created', { ascending: false });

  if (onlyPending) {
    query = query.eq('imported', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar pedidos TikTok:', error);
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

// Importar pedido TikTok para Fila de Producao
export const importTikTokOrderToPedido = async (order: TikTokOrder, produtoId?: string, variacaoId?: string | null): Promise<boolean> => {
  try {
    let finalProdutoId = produtoId;
    let finalVariacaoId = variacaoId;
    let observacao = `Importado do TikTok Shop - Pedido: ${order.tiktok_order_id}`;

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
        // Marcar pedido TikTok como importado
        if (isSupabaseConfigured() && supabase) {
          await supabase
            .from('tiktok_orders')
            .update({
              imported: true,
              pedido_id: novoPedido.id
            })
            .eq('id', order.id);
        } else {
          const orders = getLocalTikTokOrders();
          const idx = orders.findIndex(o => o.id === order.id);
          if (idx !== -1) {
            orders[idx].imported = true;
            orders[idx].pedido_id = novoPedido.id;
            setLocalTikTokOrders(orders);
          }
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao importar pedido TikTok:', error);
    return false;
  }
};

// Importar multiplos pedidos
export const importMultipleTikTokOrders = async (
  orders: Array<{ order: TikTokOrder; produtoId?: string; variacaoId?: string | null }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const item of orders) {
    const result = await importTikTokOrderToPedido(item.order, item.produtoId, item.variacaoId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};

// Desconectar do TikTok Shop
export const disconnectTikTok = async (): Promise<boolean> => {
  if (!FUNCTIONS_URL) {
    return false;
  }

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[TikTok Disconnect] No auth token');
      return false;
    }

    const response = await fetch(`${FUNCTIONS_URL}/tiktok-disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('[TikTok Disconnect] Error:', error);
    return false;
  }
};

// URL para login do TikTok Shop
export const getTikTokLoginUrl = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  return `${FUNCTIONS_URL}/tiktok-login?state=${userId || ''}`;
};
