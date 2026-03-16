import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface MLOrderItem {
  item: {
    id: string;
    title: string;
    variation_attributes?: Array<{ name: string; value_name: string }>;
  };
  quantity: number;
  unit_price: number;
}

interface MLOrder {
  id: number;
  status: string;
  date_created: string;
  buyer: {
    nickname: string;
  };
  order_items: MLOrderItem[];
}

async function refreshToken(supabase: ReturnType<typeof createClient>, refreshTokenValue: string) {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

  // Atualizar token no banco
  await supabase.from('mercadolivre_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('mercadolivre_tokens').insert({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    ml_user_id: tokenData.user_id?.toString(),
    expires_at: expiresAt.toISOString(),
  });

  return tokenData.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Buscar token
    const { data: tokenData, error: tokenError } = await supabase
      .from('mercadolivre_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Not connected to Mercado Livre' });
    }

    let accessToken = tokenData.access_token;
    const mlUserId = tokenData.ml_user_id;

    // Verificar se token expirou
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      if (tokenData.refresh_token) {
        accessToken = await refreshToken(supabase, tokenData.refresh_token);
      } else {
        return res.status(401).json({ error: 'Token expired and no refresh token' });
      }
    }

    // Buscar pedidos do Mercado Livre
    const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc`;
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('ML API error:', errorText);
      return res.status(500).json({ error: 'Failed to fetch orders from Mercado Livre' });
    }

    const ordersData = await ordersResponse.json();
    const orders: MLOrder[] = ordersData.results || [];

    // Processar cada pedido
    const processedOrders = [];

    for (const order of orders) {
      for (const orderItem of order.order_items) {
        const mlOrderId = `${order.id}-${orderItem.item.id}`;

        // Verificar se ja existe
        const { data: existing } = await supabase
          .from('ml_orders')
          .select('id')
          .eq('ml_order_id', mlOrderId)
          .single();

        if (!existing) {
          // Extrair variacao
          let variation = '';
          if (orderItem.item.variation_attributes && orderItem.item.variation_attributes.length > 0) {
            variation = orderItem.item.variation_attributes
              .map(attr => `${attr.name}: ${attr.value_name}`)
              .join(', ');
          }

          // Inserir novo pedido
          const { data: inserted, error: insertError } = await supabase
            .from('ml_orders')
            .insert({
              ml_order_id: mlOrderId,
              product_title: orderItem.item.title,
              variation: variation || null,
              quantity: orderItem.quantity,
              unit_price: orderItem.unit_price,
              status: order.status,
              buyer_nickname: order.buyer.nickname,
              date_created: order.date_created,
              imported: false,
            })
            .select()
            .single();

          if (!insertError && inserted) {
            processedOrders.push(inserted);
          }
        }
      }
    }

    // Buscar todos os pedidos nao importados
    const { data: pendingOrders } = await supabase
      .from('ml_orders')
      .select('*')
      .eq('imported', false)
      .order('date_created', { ascending: false });

    res.status(200).json({
      synced: processedOrders.length,
      pending: pendingOrders || [],
      total_from_ml: orders.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
}
