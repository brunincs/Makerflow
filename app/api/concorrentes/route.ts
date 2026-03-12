import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPrecoMedio } from '@/lib/concorrentes'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('concorrentes')
      .select('*')
      .order('createdAt', { ascending: false })

    if (search) {
      query = query.ilike('nomeProduto', `%${search}%`)
    }

    if (status && status !== 'TODOS') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar concorrentes:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar concorrentes' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao buscar concorrentes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar concorrentes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      nomeProduto,
      imagemProduto,
      linkMakeworld,
      linkShopee,
      linkMercadoLivre,
      precoShopee,
      precoMercadoLivre,
      status,
    } = body

    if (!nomeProduto) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      )
    }

    const precoShopeeNum = precoShopee ? parseFloat(precoShopee) : null
    const precoMercadoLivreNum = precoMercadoLivre ? parseFloat(precoMercadoLivre) : null
    const precoMedio = calcularPrecoMedio(precoShopeeNum, precoMercadoLivreNum)

    const { data, error } = await supabase
      .from('concorrentes')
      .insert({
        id: uuidv4(),
        nomeProduto,
        imagemProduto: imagemProduto || null,
        linkMakeworld: linkMakeworld || null,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoShopee: precoShopeeNum,
        precoMercadoLivre: precoMercadoLivreNum,
        precoMedio,
        status: status || 'IDEIA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar concorrente:', error)
      return NextResponse.json(
        { error: 'Erro ao criar concorrente' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao criar concorrente' },
      { status: 500 }
    )
  }
}
