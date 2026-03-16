import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MLOrderItem {
  item: {
    id: string
    title: string
    seller_custom_field?: string
    seller_sku?: string
    variation_attributes?: Array<{ name: string; value_name: string }>
  }
  quantity: number
  unit_price: number
}

interface MLOrder {
  id: number
  status: string
  date_created: string
  buyer: {
    nickname: string
  }
  order_items: MLOrderItem[]
}

// Extrair user_id do JWT
function getUserIdFromJWT(authHeader: string | null): string | null {
  if (!authHeader) return null

  try {
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    return payload.sub || null
  } catch {
    return null
  }
}

async function refreshToken(supabase: any, userId: string, refreshTokenValue: string) {
  const clientId = Deno.env.get('ML_CLIENT_ID')
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')

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
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const tokenData = await response.json()

  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

  // Atualizar token do usuario especifico
  await supabase
    .from('mercadolivre_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      ml_user_id: tokenData.user_id?.toString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', userId)

  return tokenData.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extrair user_id do JWT
    const authHeader = req.headers.get('Authorization')
    const userId = getUserIdFromJWT(authHeader)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar token do usuario especifico
    const { data: tokenData, error: tokenError } = await supabase
      .from('mercadolivre_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Not connected to Mercado Livre' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let accessToken = tokenData.access_token
    const mlUserId = tokenData.ml_user_id

    // Verificar se token expirou
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      if (tokenData.refresh_token) {
        accessToken = await refreshToken(supabase, userId, tokenData.refresh_token)
      } else {
        return new Response(
          JSON.stringify({ error: 'Token expired and no refresh token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Buscar pedidos do Mercado Livre
    const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc`
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!ordersResponse.ok) {
      console.error('ML API error:', await ordersResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders from Mercado Livre' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ordersData = await ordersResponse.json()
    const orders: MLOrder[] = ordersData.results || []

    // Processar cada pedido
    const processedOrders = []

    for (const order of orders) {
      for (const orderItem of order.order_items) {
        const mlOrderId = `${order.id}-${orderItem.item.id}`

        // Verificar se ja existe para este usuario
        const { data: existing } = await supabase
          .from('ml_orders')
          .select('id')
          .eq('ml_order_id', mlOrderId)
          .eq('user_id', userId)
          .single()

        if (!existing) {
          let variation = ''
          if (orderItem.item.variation_attributes && orderItem.item.variation_attributes.length > 0) {
            variation = orderItem.item.variation_attributes
              .map(attr => `${attr.name}: ${attr.value_name}`)
              .join(', ')
          }

          // Extrair SKU do vendedor
          const sellerSku = orderItem.item.seller_sku || orderItem.item.seller_custom_field || null

          const { data: inserted, error: insertError } = await supabase
            .from('ml_orders')
            .insert({
              ml_order_id: mlOrderId,
              product_title: orderItem.item.title,
              variation: variation || null,
              seller_sku: sellerSku,
              quantity: orderItem.quantity,
              unit_price: orderItem.unit_price,
              status: order.status,
              buyer_nickname: order.buyer.nickname,
              date_created: order.date_created,
              imported: false,
              user_id: userId, // Associar ao usuario
            })
            .select()
            .single()

          if (!insertError && inserted) {
            processedOrders.push(inserted)
          }
        }
      }
    }

    // Limpar ml_orders orfaos deste usuario
    // 1. Resetar ml_orders que estao imported=true mas pedido_id=null
    await supabase
      .from('ml_orders')
      .update({ imported: false })
      .eq('imported', true)
      .eq('user_id', userId)
      .is('pedido_id', null)

    // 2. Buscar ml_orders marcados como imported mas cujo pedido nao existe mais
    const { data: orphanedOrders } = await supabase
      .from('ml_orders')
      .select('id, pedido_id')
      .eq('imported', true)
      .eq('user_id', userId)
      .not('pedido_id', 'is', null)

    if (orphanedOrders && orphanedOrders.length > 0) {
      // Verificar quais pedidos ainda existem
      const pedidoIds = orphanedOrders.map(o => o.pedido_id)
      const { data: existingPedidos } = await supabase
        .from('pedidos')
        .select('id')
        .in('id', pedidoIds)
        .eq('user_id', userId)

      const existingIds = new Set(existingPedidos?.map(p => p.id) || [])

      // Resetar os que nao tem mais pedido
      const orphanedIds = orphanedOrders
        .filter(o => !existingIds.has(o.pedido_id))
        .map(o => o.id)

      if (orphanedIds.length > 0) {
        await supabase
          .from('ml_orders')
          .update({ imported: false, pedido_id: null })
          .in('id', orphanedIds)
      }
    }

    // Buscar todos os pedidos nao importados deste usuario
    const { data: pendingOrders } = await supabase
      .from('ml_orders')
      .select('*')
      .eq('imported', false)
      .eq('user_id', userId)
      .order('date_created', { ascending: false })

    return new Response(
      JSON.stringify({
        synced: processedOrders.length,
        pending: pendingOrders || [],
        total_from_ml: orders.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to sync orders' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
