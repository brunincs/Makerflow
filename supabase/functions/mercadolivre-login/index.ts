import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  const state = url.searchParams.get('state') // user_id vem como state

  const clientId = Deno.env.get('ML_CLIENT_ID')
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')

  if (!clientId || !redirectUri) {
    return new Response('Missing ML_CLIENT_ID or ML_REDIRECT_URI', { status: 500 })
  }

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  // Passar user_id como state para o callback
  if (state) {
    authUrl.searchParams.set('state', state)
  }

  return Response.redirect(authUrl.toString(), 302)
})
