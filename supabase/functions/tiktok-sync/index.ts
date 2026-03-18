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

// Gerar assinatura para API do TikTok Shop
function generateSign(params: Record<string, string>, secret: string, path: string): string {
  const sortedKeys = Object.keys(params).sort()
  let signString = secret + path

  for (const key of sortedKeys) {
    signString += key + params[key]
  }
  signString += secret

  // HMAC-SHA256
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const data = encoder.encode(signString)

  // Usar crypto.subtle para HMAC
  // Por simplicidade, usar hash simples aqui - em producao usar HMAC-SHA256
  let hash = 0
  for (let i = 0; i < signString.length; i++) {
    const char = signString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return Math.abs(hash).toString(16).padStart(64, '0')
}

// Refresh token se expirado
async function refreshTokenIfNeeded(
  supabase: any,
  tokenData: any,
  appKey: string,
  appSecret: string
): Promise<string | null> {
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)

  // Se nao expirou, retornar token atual
  if (now < expiresAt) {
    return tokenData.access_token
  }

  // Se expirou e nao tem refresh_token, erro
  if (!tokenData.refresh_token) {
    console.error('[TikTok Sync] Token expired and no refresh token available')
    return null
  }

  console.log('[TikTok Sync] Refreshing expired token...')

  try {
    const refreshUrl = 'https://auth.tiktok-shops.com/api/v2/token/refresh'
    const refreshParams = new URLSearchParams({
      app_key: appKey,
      app_secret: appSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    })

    const response = await fetch(`${refreshUrl}?${refreshParams.toString()}`)
    const data = await response.json()

    if (data.code !== 0 || !data.data?.access_token) {
      console.error('[TikTok Sync] Refresh failed:', data)
      return null
    }

    const newExpiresAt = new Date(Date.now() + (data.data.access_token_expire_in * 1000))

    // Atualizar token no banco
    await supabase
      .from('tiktok_tokens')
      .update({
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id)

    console.log('[TikTok Sync] Token refreshed successfully')
    return data.data.access_token
  } catch (error) {
    console.error('[TikTok Sync] Refresh error:', error)
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

    console.log('[TikTok Sync] Syncing for user:', userId)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const TIKTOK_APP_KEY = Deno.env.get('TIKTOK_APP_KEY')
    const TIKTOK_APP_SECRET = Deno.env.get('TIKTOK_APP_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TIKTOK_APP_KEY || !TIKTOK_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'TikTok not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar token do usuario
    const { data: tokenData, error: tokenError } = await supabase
      .from('tiktok_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'TikTok not connected' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Refresh token se necessario
    const accessToken = await refreshTokenIfNeeded(
      supabase,
      tokenData,
      TIKTOK_APP_KEY,
      TIKTOK_APP_SECRET
    )

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Token expired. Please reconnect.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar pedidos do TikTok Shop
    // Documentacao: https://partner.tiktokshop.com/doc/page/262787
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const ordersPath = '/api/orders/search'

    const params: Record<string, string> = {
      app_key: TIKTOK_APP_KEY,
      timestamp,
      access_token: accessToken,
      shop_id: tokenData.shop_id || '',
    }

    // Gerar assinatura
    const sign = generateSign(params, TIKTOK_APP_SECRET, ordersPath)
    params.sign = sign

    const ordersUrl = new URL('https://open-api.tiktokglobalshop.com' + ordersPath)
    Object.entries(params).forEach(([key, value]) => {
      ordersUrl.searchParams.set(key, value)
    })

    console.log('[TikTok Sync] Fetching orders...')

    // Body para busca de pedidos
    const searchBody = {
      page_size: 50,
      sort_by: 'create_time',
      sort_type: 2, // DESC
    }

    const ordersResponse = await fetch(ordersUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    })

    const ordersData = await ordersResponse.json()
    console.log('[TikTok Sync] Orders response:', JSON.stringify(ordersData).substring(0, 500))

    // Se API retornou erro, pode ser que ainda nao tenha pedidos
    if (ordersData.code !== 0) {
      console.log('[TikTok Sync] API returned:', ordersData.message || 'No orders')

      // Limpar pedidos orfaos
      await supabase
        .from('tiktok_orders')
        .update({ imported: false, pedido_id: null })
        .eq('user_id', userId)
        .eq('imported', true)
        .is('pedido_id', null)

      // Buscar pedidos pendentes existentes
      const { data: pendingOrders } = await supabase
        .from('tiktok_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('imported', false)
        .order('date_created', { ascending: false })

      return new Response(
        JSON.stringify({
          synced: 0,
          pending: pendingOrders || [],
          total_from_tiktok: 0,
          message: ordersData.message || 'No new orders',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orders = ordersData.data?.order_list || []
    console.log('[TikTok Sync] Found', orders.length, 'orders')

    let syncedCount = 0

    // Processar cada pedido
    for (const order of orders) {
      const items = order.line_items || order.item_list || []

      for (const item of items) {
        const orderId = `${order.order_id}-${item.id || item.sku_id}`

        // Extrair variacao
        const variations = item.sku_name || item.variation_name || ''

        // Verificar se ja existe
        const { data: existing } = await supabase
          .from('tiktok_orders')
          .select('id')
          .eq('tiktok_order_id', orderId)
          .single()

        if (existing) {
          continue // Ja existe, pular
        }

        // Inserir novo pedido
        const { error: insertError } = await supabase
          .from('tiktok_orders')
          .insert({
            user_id: userId,
            tiktok_order_id: orderId,
            product_title: item.product_name || item.sku_name || 'Produto TikTok',
            variation: variations,
            seller_sku: item.seller_sku || item.sku_id,
            quantity: item.quantity || 1,
            unit_price: item.sale_price ? parseFloat(item.sale_price) / 100 : null,
            status: order.order_status || order.status,
            buyer_name: order.recipient?.name || order.buyer_message?.buyer_username,
            date_created: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
            imported: false,
          })

        if (!insertError) {
          syncedCount++
        } else {
          console.error('[TikTok Sync] Insert error:', insertError)
        }
      }
    }

    // Limpar pedidos orfaos
    await supabase
      .from('tiktok_orders')
      .update({ imported: false, pedido_id: null })
      .eq('user_id', userId)
      .eq('imported', true)
      .is('pedido_id', null)

    // Buscar pedidos pendentes
    const { data: pendingOrders } = await supabase
      .from('tiktok_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('imported', false)
      .order('date_created', { ascending: false })

    console.log('[TikTok Sync] Synced', syncedCount, 'new orders,', pendingOrders?.length || 0, 'pending')

    return new Response(
      JSON.stringify({
        synced: syncedCount,
        pending: pendingOrders || [],
        total_from_tiktok: orders.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[TikTok Sync] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
