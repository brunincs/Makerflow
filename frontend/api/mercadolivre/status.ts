import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ connected: false, reason: 'missing_config' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar token mais recente
    const { data: tokenData, error } = await supabase
      .from('mercadolivre_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !tokenData) {
      return res.status(200).json({ connected: false });
    }

    // Verificar se token expirou
    const isExpired = tokenData.expires_at && new Date(tokenData.expires_at) < new Date();
    const hasRefreshToken = !!tokenData.refresh_token;

    // Se expirou e nao tem refresh token, nao esta conectado
    if (isExpired && !hasRefreshToken) {
      return res.status(200).json({ connected: false, reason: 'expired' });
    }

    res.status(200).json({
      connected: true,
      ml_user_id: tokenData.ml_user_id,
      expires_at: tokenData.expires_at,
      can_refresh: hasRefreshToken,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(200).json({ connected: false, reason: 'error' });
  }
}
