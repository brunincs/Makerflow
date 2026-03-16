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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: tokenData, error } = await supabase
      .from('mercadolivre_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !tokenData) {
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isExpired = tokenData.expires_at && new Date(tokenData.expires_at) < new Date()
    const hasRefreshToken = !!tokenData.refresh_token

    if (isExpired && !hasRefreshToken) {
      return new Response(
        JSON.stringify({ connected: false, reason: 'expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        connected: true,
        ml_user_id: tokenData.ml_user_id,
        expires_at: tokenData.expires_at,
        can_refresh: hasRefreshToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ connected: false, reason: 'error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
