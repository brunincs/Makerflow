import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    if (search) {
      where.nome = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (status && status !== 'TODOS') {
      where.status = status
    }

    const produtos = await prisma.produto.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(produtos)
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

    const produto = await prisma.produto.create({
      data: {
        nome,
        imagem: imagem || null,
        linkMakeword,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoConcorrente: parseFloat(precoConcorrente),
        status: status || 'TESTAR',
      },
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}
