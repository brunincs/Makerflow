import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Gerar assinatura Shopee
async function generateSign(partnerId: string, path: string, timestamp: number, partnerKey: string, accessToken?: string, shopId?: string): Promise<string> {
  let baseString = `${partnerId}${path}${timestamp}`
  if (accessToken && shopId) {
    baseString += `${accessToken}${shopId}`
  }
  baseString += partnerKey

  const encoder = new TextEncoder()
  const data = encoder.encode(baseString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Refresh token se expirado
async function refreshTokenIfNeeded(
  supabase: any,
  tokenData: any,
  partnerId: string,
  partnerKey: string
): Promise<string | null> {
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)

  // Se nao expirou, retornar token atual
  if (now < expiresAt) {
    return tokenData.access_token
  }

  // Se expirou e nao tem refresh_token, erro
  if (!tokenData.refresh_token) {
    console.error('[Shopee Sync] Token expired and no refresh token available')
    return null
  }

  console.log('[Shopee Sync] Refreshing expired token...')

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/api/v2/auth/access_token/get'
    const sign = await generateSign(partnerId, path, timestamp, partnerKey)

    const refreshUrl = new URL('https://partner.shopeemobile.com' + path)
    refreshUrl.searchParams.set('partner_id', partnerId)
    refreshUrl.searchParams.set('timestamp', timestamp.toString())
    refreshUrl.searchParams.set('sign', sign)

    const response = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokenData.refresh_token,
        shop_id: parseInt(tokenData.shop_id),
        partner_id: parseInt(partnerId),
      }),
    })

    const data = await response.json()

    if (data.error || !data.access_token) {
      console.error('[Shopee Sync] Refresh failed:', data)
      return null
    }

    const newExpiresAt = new Date(Date.now() + (data.expire_in * 1000))

    // Atualizar token no banco
    await supabase
      .from('shopee_tokens')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id)

    console.log('[Shopee Sync] Token refreshed successfully')
    return data.access_token
  } catch (error) {
    console.error('[Shopee Sync] Refresh error:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const userId = getUserIdFromJWT(authHeader)

    console.log('[Shopee Sync] Syncing for user:', userId)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SHOPEE_PARTNER_ID = Deno.env.get('SHOPEE_PARTNER_ID')
    const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY) {
      return new Response(
        JSON.stringify({ error: 'Shopee not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar token do usuario
    const { data: tokenData, error: tokenError } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Shopee not connected' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Refresh token se necessario
    const accessToken = await refreshTokenIfNeeded(
      supabase,
      tokenData,
      SHOPEE_PARTNER_ID,
      SHOPEE_PARTNER_KEY
    )

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Token expired. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar pedidos da Shopee
    const timestamp = Math.floor(Date.now() / 1000)
    const ordersPath = '/api/v2/order/get_order_list'
    const sign = await generateSign(
      SHOPEE_PARTNER_ID,
      ordersPath,
      timestamp,
      SHOPEE_PARTNER_KEY,
      accessToken,
      tokenData.shop_id
    )

    // Buscar pedidos dos ultimos 15 dias
    const timeFrom = Math.floor((Date.now() - 15 * 24 * 60 * 60 * 1000) / 1000)
    const timeTo = Math.floor(Date.now() / 1000)

    const ordersUrl = new URL('https://partner.shopeemobile.com' + ordersPath)
    ordersUrl.searchParams.set('partner_id', SHOPEE_PARTNER_ID)
    ordersUrl.searchParams.set('timestamp', timestamp.toString())
    ordersUrl.searchParams.set('sign', sign)
    ordersUrl.searchParams.set('access_token', accessToken)
    ordersUrl.searchParams.set('shop_id', tokenData.shop_id)
    ordersUrl.searchParams.set('time_range_field', 'create_time')
    ordersUrl.searchParams.set('time_from', timeFrom.toString())
    ordersUrl.searchParams.set('time_to', timeTo.toString())
    ordersUrl.searchParams.set('page_size', '50')
    ordersUrl.searchParams.set('order_status', 'READY_TO_SHIP')

    console.log('[Shopee Sync] Fetching orders...')

    const ordersResponse = await fetch(ordersUrl.toString())
    const ordersData = await ordersResponse.json()

    console.log('[Shopee Sync] Orders response:', JSON.stringify(ordersData).substring(0, 500))

    // Se API retornou erro
    if (ordersData.error) {
      console.log('[Shopee Sync] API returned error:', ordersData.message)

      // Limpar pedidos orfaos
      await supabase
        .from('shopee_orders')
        .update({ imported: false, pedido_id: null })
        .eq('user_id', userId)
        .eq('imported', true)
        .is('pedido_id', null)

      // Buscar pedidos pendentes existentes
      const { data: pendingOrders } = await supabase
        .from('shopee_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('imported', false)
        .order('date_created', { ascending: false })

      return new Response(
        JSON.stringify({
          synced: 0,
          pending: pendingOrders || [],
          total_from_shopee: 0,
          message: ordersData.message || 'No new orders',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderList = ordersData.response?.order_list || []
    console.log('[Shopee Sync] Found', orderList.length, 'orders')

    let syncedCount = 0

    // Para cada pedido, buscar detalhes
    for (const order of orderList) {
      const orderId = order.order_sn

      // Buscar detalhes do pedido
      const detailTimestamp = Math.floor(Date.now() / 1000)
      const detailPath = '/api/v2/order/get_order_detail'
      const detailSign = await generateSign(
        SHOPEE_PARTNER_ID,
        detailPath,
        detailTimestamp,
        SHOPEE_PARTNER_KEY,
        accessToken,
        tokenData.shop_id
      )

      const detailUrl = new URL('https://partner.shopeemobile.com' + detailPath)
      detailUrl.searchParams.set('partner_id', SHOPEE_PARTNER_ID)
      detailUrl.searchParams.set('timestamp', detailTimestamp.toString())
      detailUrl.searchParams.set('sign', detailSign)
      detailUrl.searchParams.set('access_token', accessToken)
      detailUrl.searchParams.set('shop_id', tokenData.shop_id)
      detailUrl.searchParams.set('order_sn_list', orderId)
      detailUrl.searchParams.set('response_optional_fields', 'item_list,buyer_username')

      const detailResponse = await fetch(detailUrl.toString())
      const detailData = await detailResponse.json()
      const orderDetail = detailData.response?.order_list?.[0]

      if (!orderDetail) continue

      const items = orderDetail.item_list || []

      for (const item of items) {
        const itemOrderId = `${orderId}-${item.item_id}`

        // Verificar se ja existe
        const { data: existing } = await supabase
          .from('shopee_orders')
          .select('id')
          .eq('shopee_order_id', itemOrderId)
          .single()

        if (existing) {
          continue // Ja existe, pular
        }

        // Inserir novo pedido
        const { error: insertError } = await supabase
          .from('shopee_orders')
          .insert({
            user_id: userId,
            shopee_order_id: itemOrderId,
            product_title: item.item_name || 'Produto Shopee',
            variation: item.model_name || null,
            seller_sku: item.model_sku || item.item_sku || null,
            quantity: item.model_quantity_purchased || item.quantity || 1,
            unit_price: item.model_discounted_price || item.item_price || null,
            status: orderDetail.order_status,
            buyer_name: orderDetail.buyer_username || null,
            date_created: orderDetail.create_time ? new Date(orderDetail.create_time * 1000).toISOString() : new Date().toISOString(),
            imported: false,
          })

        if (!insertError) {
          syncedCount++
        } else {
          console.error('[Shopee Sync] Insert error:', insertError)
        }
      }
    }

    // Limpar pedidos orfaos
    await supabase
      .from('shopee_orders')
      .update({ imported: false, pedido_id: null })
      .eq('user_id', userId)
      .eq('imported', true)
      .is('pedido_id', null)

    // Buscar pedidos pendentes
    const { data: pendingOrders } = await supabase
      .from('shopee_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('imported', false)
      .order('date_created', { ascending: false })

    console.log('[Shopee Sync] Synced', syncedCount, 'new orders,', pendingOrders?.length || 0, 'pending')

    return new Response(
      JSON.stringify({
        synced: syncedCount,
        pending: pendingOrders || [],
        total_from_shopee: orderList.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Shopee Sync] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
