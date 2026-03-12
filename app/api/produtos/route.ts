import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('produtos')
      .select('*')
      .order('createdAt', { ascending: false })

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    if (status && status !== 'TODOS') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar produtos' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { nome, imagem, linkMakeword, linkShopee, linkMercadoLivre, precoConcorrente, status } = body

    if (!nome || !linkMakeword || precoConcorrente === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, linkMakeword, precoConcorrente' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('produtos')
      .insert({
        id: uuidv4(),
        nome,
        imagem: imagem || null,
        linkMakeword,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoConcorrente: parseFloat(precoConcorrente),
        status: status || 'TESTAR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar produto:', error)
      return NextResponse.json(
        { error: 'Erro ao criar produto' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}
