import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SHOPEE_PARTNER_ID = Deno.env.get('SHOPEE_PARTNER_ID')
    const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY')
    const SHOPEE_REDIRECT_URI = Deno.env.get('SHOPEE_REDIRECT_URI')

    if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY || !SHOPEE_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: 'Shopee not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pegar state da URL (user_id)
    const url = new URL(req.url)
    const state = url.searchParams.get('state') || ''

    // Gerar timestamp
    const timestamp = Math.floor(Date.now() / 1000)

    // Gerar assinatura para Shopee
    // sign = SHA256(partner_id + path + timestamp + partner_key)
    const path = '/api/v2/shop/auth_partner'
    const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`

    const encoder = new TextEncoder()
    const data = encoder.encode(baseString + SHOPEE_PARTNER_KEY)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // URL de autorizacao da Shopee
    const authUrl = new URL('https://partner.shopeemobile.com/api/v2/shop/auth_partner')
    authUrl.searchParams.set('partner_id', SHOPEE_PARTNER_ID)
    authUrl.searchParams.set('timestamp', timestamp.toString())
    authUrl.searchParams.set('sign', sign)
    authUrl.searchParams.set('redirect', SHOPEE_REDIRECT_URI)

    console.log('[Shopee Login] Redirecting to:', authUrl.toString())

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': authUrl.toString(),
      },
    })
  } catch (error) {
    console.error('[Shopee Login] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Login failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
