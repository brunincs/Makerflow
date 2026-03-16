import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect('/?ml=error&reason=no_code');
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const redirectUri = process.env.ML_REDIRECT_URI;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect('/?ml=error&reason=missing_config');
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.redirect('/?ml=error&reason=missing_supabase');
  }

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
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect('/?ml=error&reason=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();

    // Calcular expires_at
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Salvar no Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Deletar tokens antigos
    await supabase.from('mercadolivre_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir novo token
    const { error: insertError } = await supabase.from('mercadolivre_tokens').insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      ml_user_id: tokenData.user_id?.toString(),
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.redirect('/?ml=error&reason=db_error');
    }

    // Redirecionar para o frontend com sucesso
    res.redirect('/fila-producao?ml=connected');
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/?ml=error&reason=unknown');
  }
}
