import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // user_id enviado como state
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://frontend-lyart-ten-15.vercel.app'

  if (!code) {
    return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=no_code`, 302)
  }

  const clientId = Deno.env.get('ML_CLIENT_ID')
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!clientId || !clientSecret || !redirectUri) {
    return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=missing_config`, 302)
  }

  // Validar que temos o user_id
  if (!state) {
    return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=no_user`, 302)
  }

  const userId = state

  try {
    // Trocar code por access_token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=token_exchange_failed`, 302)
    }

    const tokenData = await tokenResponse.json()

    // Calcular expires_at
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // Salvar no Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Deletar tokens antigos deste usuario
    await supabase
      .from('mercadolivre_tokens')
      .delete()
      .eq('user_id', userId)

    // Inserir novo token com user_id
    const { error: insertError } = await supabase.from('mercadolivre_tokens').insert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      ml_user_id: tokenData.user_id?.toString(),
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=db_error`, 302)
    }

    return Response.redirect(`${frontendUrl}/fila-producao?ml=connected`, 302)
  } catch (error) {
    console.error('Callback error:', error)
    return Response.redirect(`${frontendUrl}/fila-producao?ml=error&reason=unknown`, 302)
  }
})
