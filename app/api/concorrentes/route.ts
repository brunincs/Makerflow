import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularPrecoMedio } from '@/lib/concorrentes'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    if (search) {
      where.nomeProduto = {
        contains: search,
      }
    }

    if (status && status !== 'TODOS') {
      where.status = status
    }

    const concorrentes = await prisma.concorrente.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(concorrentes)
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

    const concorrente = await prisma.concorrente.create({
      data: {
        nomeProduto,
        imagemProduto: imagemProduto || null,
        linkMakeworld: linkMakeworld || null,
        linkShopee: linkShopee || null,
        linkMercadoLivre: linkMercadoLivre || null,
        precoShopee: precoShopeeNum,
        precoMercadoLivre: precoMercadoLivreNum,
        precoMedio,
        status: status || 'IDEIA',
      },
    })

    return NextResponse.json(concorrente, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar concorrente:', error)
    return NextResponse.json(
      { error: 'Erro ao criar concorrente' },
      { status: 500 }
    )
  }
}
