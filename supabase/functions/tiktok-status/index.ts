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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const userId = getUserIdFromJWT(authHeader)

    console.log('[TikTok Status] Checking for user:', userId)

    if (!userId) {
      return new Response(
        JSON.stringify({ connected: false, reason: 'no_user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar token do usuario
    const { data: tokenData, error } = await supabase
      .from('tiktok_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !tokenData) {
      console.log('[TikTok Status] No token found for user')
      return new Response(
        JSON.stringify({ connected: false, reason: 'no_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se expirou
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    const isExpired = now >= expiresAt
    const canRefresh = !!tokenData.refresh_token

    console.log('[TikTok Status] Token found, expired:', isExpired, 'can_refresh:', canRefresh)

    return new Response(
      JSON.stringify({
        connected: !isExpired || canRefresh,
        shop_id: tokenData.shop_id,
        shop_name: tokenData.shop_name,
        expires_at: tokenData.expires_at,
        can_refresh: canRefresh,
        is_expired: isExpired,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[TikTok Status] Error:', error)
    return new Response(
      JSON.stringify({ connected: false, reason: 'error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
