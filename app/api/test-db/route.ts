import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'não configurada'

  try {
    const { count, error } = await supabase
      .from('concorrentes')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        url: supabaseUrl,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão OK!',
      count: count || 0,
      url: supabaseUrl
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      url: supabaseUrl,
    }, { status: 500 })
  }
}
