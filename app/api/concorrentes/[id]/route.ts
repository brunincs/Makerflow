import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularPrecoMedio } from '@/lib/concorrentes'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const concorrente = await prisma.concorrente.findUnique({
      where: { id: params.id },
    })

    if (!concorrente) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(concorrente)
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
      vendasEstimadas,
      avaliacoes,
      status,
    } = body

    if (!nomeProduto) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      )
    }

    const existingConcorrente = await prisma.concorrente.findUnique({
      where: { id: params.id },
    })

    if (!existingConcorrente) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    const precoShopeeNum = precoShopee ? parseFloat(precoShopee) : null
    const precoMercadoLivreNum = precoMercadoLivre ? parseFloat(precoMercadoLivre) : null
    const precoMedio = calcularPrecoMedio(precoShopeeNum, precoMercadoLivreNum)

    const concorrente = await prisma.concorrente.update({
      where: { id: params.id },
      data: {
        nomeProduto,
        imagemProduto: imagemProduto || null,
        linkMakeworld: linkMakeworld || null,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoShopee: precoShopeeNum,
        precoMercadoLivre: precoMercadoLivreNum,
        precoMedio,
        vendasEstimadas: vendasEstimadas ? parseInt(vendasEstimadas) : null,
        avaliacoes: avaliacoes ? parseInt(avaliacoes) : null,
        status,
      },
    })

    return NextResponse.json(concorrente)
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
    const concorrente = await prisma.concorrente.findUnique({
      where: { id: params.id },
    })

    if (!concorrente) {
      return NextResponse.json(
        { error: 'Concorrente não encontrado' },
        { status: 404 }
      )
    }

    await prisma.concorrente.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Concorrente deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar concorrente' },
      { status: 500 }
    )
  }
}
