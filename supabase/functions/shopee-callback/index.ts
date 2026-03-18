import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const shopId = url.searchParams.get('shop_id')

    console.log('[Shopee Callback] Received code:', code?.substring(0, 10) + '...', 'shop_id:', shopId)

    if (!code || !shopId) {
      return new Response(
        '<html><body><h1>Erro: Codigo ou shop_id nao recebido</h1></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const SHOPEE_PARTNER_ID = Deno.env.get('SHOPEE_PARTNER_ID')
    const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://makerflow.vercel.app'

    if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY) {
      return new Response(
        '<html><body><h1>Erro: Shopee nao configurado</h1></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Trocar code por access_token
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/api/v2/auth/token/get'
    const sign = await generateSign(SHOPEE_PARTNER_ID, path, timestamp, SHOPEE_PARTNER_KEY)

    const tokenUrl = new URL('https://partner.shopeemobile.com' + path)
    tokenUrl.searchParams.set('partner_id', SHOPEE_PARTNER_ID)
    tokenUrl.searchParams.set('timestamp', timestamp.toString())
    tokenUrl.searchParams.set('sign', sign)

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        shop_id: parseInt(shopId),
        partner_id: parseInt(SHOPEE_PARTNER_ID),
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('[Shopee Callback] Token response:', JSON.stringify(tokenData).substring(0, 200))

    if (tokenData.error || !tokenData.access_token) {
      console.error('[Shopee Callback] Token error:', tokenData)
      return new Response(
        `<html><body><h1>Erro ao obter token: ${tokenData.message || tokenData.error}</h1></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Buscar informacoes da loja
    const shopTimestamp = Math.floor(Date.now() / 1000)
    const shopPath = '/api/v2/shop/get_shop_info'
    const shopSign = await generateSign(
      SHOPEE_PARTNER_ID,
      shopPath,
      shopTimestamp,
      SHOPEE_PARTNER_KEY,
      tokenData.access_token,
      shopId
    )

    const shopUrl = new URL('https://partner.shopeemobile.com' + shopPath)
    shopUrl.searchParams.set('partner_id', SHOPEE_PARTNER_ID)
    shopUrl.searchParams.set('timestamp', shopTimestamp.toString())
    shopUrl.searchParams.set('sign', shopSign)
    shopUrl.searchParams.set('access_token', tokenData.access_token)
    shopUrl.searchParams.set('shop_id', shopId)

    const shopResponse = await fetch(shopUrl.toString())
    const shopData = await shopResponse.json()
    const shopName = shopData.shop_name || shopData.response?.shop_name || 'Loja Shopee'

    console.log('[Shopee Callback] Shop info:', shopName)

    // Para encontrar o user_id, usamos o main_account_id se disponivel
    // ou buscamos pelo shop_id em tokens existentes
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Por enquanto, vamos precisar que o usuario esteja logado
    // e pegamos o user_id de outra forma (state param ou sessao)
    // Como workaround, salvamos com um user_id temporario e atualizamos depois

    // Calcular expiracao
    const expiresAt = new Date(Date.now() + (tokenData.expire_in * 1000))

    // Tentar encontrar usuario existente ou criar entrada temporaria
    // Nota: Em producao, o state parameter deveria conter o user_id
    const { data: existingToken } = await supabase
      .from('shopee_tokens')
      .select('user_id')
      .eq('shop_id', shopId)
      .single()

    let userId = existingToken?.user_id

    if (!userId) {
      // Buscar primeiro usuario como fallback (para testes)
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

      userId = users?.id
    }

    if (!userId) {
      return new Response(
        '<html><body><h1>Erro: Usuario nao encontrado</h1></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Salvar token
    const { error: upsertError } = await supabase
      .from('shopee_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        shop_id: shopId,
        shop_name: shopName,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('[Shopee Callback] Upsert error:', upsertError)
      return new Response(
        `<html><body><h1>Erro ao salvar token: ${upsertError.message}</h1></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    console.log('[Shopee Callback] Token saved successfully')

    // Redirecionar para o frontend
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${FRONTEND_URL}/producao?shopee=connected`,
      },
    })
  } catch (error) {
    console.error('[Shopee Callback] Error:', error)
    return new Response(
      `<html><body><h1>Erro: ${error.message}</h1></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
})
