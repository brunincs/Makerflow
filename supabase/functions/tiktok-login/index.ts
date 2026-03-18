import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const state = url.searchParams.get('state') || ''

    // Credenciais do TikTok Shop (configurar no Supabase Secrets)
    const TIKTOK_APP_KEY = Deno.env.get('TIKTOK_APP_KEY')
    const TIKTOK_REDIRECT_URI = Deno.env.get('TIKTOK_REDIRECT_URI')

    if (!TIKTOK_APP_KEY || !TIKTOK_REDIRECT_URI) {
      console.error('[TikTok Login] Missing credentials')
      return new Response(
        JSON.stringify({ error: 'TikTok credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir URL de autorizacao do TikTok Shop
    // Documentacao: https://partner.tiktokshop.com/doc/page/262720
    const authUrl = new URL('https://auth.tiktok-shops.com/oauth/authorize')
    authUrl.searchParams.set('app_key', TIKTOK_APP_KEY)
    authUrl.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    console.log('[TikTok Login] Redirecting to:', authUrl.toString())

    // Redirecionar para TikTok Shop OAuth
    return Response.redirect(authUrl.toString(), 302)
  } catch (error) {
    console.error('[TikTok Login] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
