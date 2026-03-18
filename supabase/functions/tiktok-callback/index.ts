import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // user_id

    console.log('[TikTok Callback] Received code:', code ? 'yes' : 'no', 'state:', state)

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code not received' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Credenciais
    const TIKTOK_APP_KEY = Deno.env.get('TIKTOK_APP_KEY')
    const TIKTOK_APP_SECRET = Deno.env.get('TIKTOK_APP_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://makerflow.vercel.app'

    if (!TIKTOK_APP_KEY || !TIKTOK_APP_SECRET) {
      console.error('[TikTok Callback] Missing TikTok credentials')
      return Response.redirect(`${FRONTEND_URL}/fila-producao?tiktok=error&reason=config`, 302)
    }

    // Trocar code por access_token
    // Documentacao: https://partner.tiktokshop.com/doc/page/262721
    const tokenUrl = 'https://auth.tiktok-shops.com/api/v2/token/get'

    const tokenParams = new URLSearchParams({
      app_key: TIKTOK_APP_KEY,
      app_secret: TIKTOK_APP_SECRET,
      auth_code: code,
      grant_type: 'authorized_code',
    })

    console.log('[TikTok Callback] Exchanging code for token...')

    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
      method: 'GET',
    })

    const tokenData = await tokenResponse.json()
    console.log('[TikTok Callback] Token response:', JSON.stringify(tokenData))

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      console.error('[TikTok Callback] Token exchange failed:', tokenData)
      return Response.redirect(`${FRONTEND_URL}/fila-producao?tiktok=error&reason=token`, 302)
    }

    const { access_token, refresh_token, access_token_expire_in, open_id } = tokenData.data

    // Calcular data de expiracao
    const expiresAt = new Date(Date.now() + (access_token_expire_in * 1000))

    // Salvar no Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Remover tokens antigos do usuario
    if (state) {
      await supabase
        .from('tiktok_tokens')
        .delete()
        .eq('user_id', state)
    }

    // Inserir novo token
    const { error: insertError } = await supabase
      .from('tiktok_tokens')
      .insert({
        user_id: state || 'anonymous',
        access_token,
        refresh_token,
        shop_id: open_id,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('[TikTok Callback] Error saving token:', insertError)
      return Response.redirect(`${FRONTEND_URL}/fila-producao?tiktok=error&reason=save`, 302)
    }

    console.log('[TikTok Callback] Token saved successfully for user:', state)

    // Redirecionar para frontend com sucesso
    return Response.redirect(`${FRONTEND_URL}/fila-producao?tiktok=connected`, 302)
  } catch (error) {
    console.error('[TikTok Callback] Error:', error)
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://makerflow.vercel.app'
    return Response.redirect(`${FRONTEND_URL}/fila-producao?tiktok=error`, 302)
  }
})
