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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extrair user_id do JWT
    const authHeader = req.headers.get('Authorization')
    const userId = getUserIdFromJWT(authHeader)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deletar tokens deste usuario
    const { error: tokenError } = await supabase
      .from('mercadolivre_tokens')
      .delete()
      .eq('user_id', userId)

    if (tokenError) {
      console.error('Erro ao deletar tokens:', tokenError)
    }

    // Deletar pedidos ML deste usuario (limpa historico de sincronizacao)
    const { error: ordersError } = await supabase
      .from('ml_orders')
      .delete()
      .eq('user_id', userId)

    if (ordersError) {
      console.error('Erro ao deletar ml_orders:', ordersError)
    }

    if (tokenError && ordersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to disconnect' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
