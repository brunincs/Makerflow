import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPrecoMedio } from '@/lib/concorrentes'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('concorrentes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar concorrente' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: existing } = await supabase
      .from('concorrentes')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    const precoShopeeNum = precoShopee ? parseFloat(precoShopee) : null
    const precoMercadoLivreNum = precoMercadoLivre ? parseFloat(precoMercadoLivre) : null
    const precoMedio = calcularPrecoMedio(precoShopeeNum, precoMercadoLivreNum)

    const { data, error } = await supabase
      .from('concorrentes')
      .update({
        nomeProduto,
        imagemProduto: imagemProduto || null,
        linkMakeworld: linkMakeworld || null,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoShopee: precoShopeeNum,
        precoMercadoLivre: precoMercadoLivreNum,
        precoMedio,
        status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar concorrente:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar concorrente' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar concorrente' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: existing } = await supabase
      .from('concorrentes')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('concorrentes')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erro ao deletar concorrente:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar concorrente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Concorrente deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar concorrente' },
      { status: 500 }
    )
  }
}
