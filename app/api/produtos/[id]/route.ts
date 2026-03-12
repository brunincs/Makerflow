import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: params.id },
    })

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(produto)
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

    const existingProduto = await prisma.produto.findUnique({
      where: { id: params.id },
    })

    if (!existingProduto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    const produto = await prisma.produto.update({
      where: { id: params.id },
      data: {
        nome,
        imagem: imagem || null,
        linkMakeword,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoConcorrente: parseFloat(precoConcorrente),
        status,
      },
    })

    return NextResponse.json(produto)
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
    const produto = await prisma.produto.findUnique({
      where: { id: params.id },
    })

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    await prisma.produto.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Produto deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar produto' },
      { status: 500 }
    )
  }
}
