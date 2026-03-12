import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
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

    const { nome, imagem, linkMakeword, linkShopee, linkMercadoLivre, precoConcorrente, status } = body

    if (!nome || !linkMakeword || precoConcorrente === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, linkMakeword, precoConcorrente' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('produtos')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('produtos')
      .update({
        nome,
        imagem: imagem || null,
        linkMakeword,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoConcorrente: parseFloat(precoConcorrente),
        status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar produto:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar produto' },
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
      .from('produtos')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erro ao deletar produto:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar produto' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Produto deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar produto' },
      { status: 500 }
    )
  }
}
