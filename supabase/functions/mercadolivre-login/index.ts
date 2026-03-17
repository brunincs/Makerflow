import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const state = url.searchParams.get('state') // user_id vem como state

  const clientId = Deno.env.get('ML_CLIENT_ID')
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')

  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({ error: 'Missing ML_CLIENT_ID or ML_REDIRECT_URI' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  // Passar user_id como state para o callback
  if (state) {
    authUrl.searchParams.set('state', state)
  }

  // Retornar redirect
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': authUrl.toString(),
    },
  })
})
