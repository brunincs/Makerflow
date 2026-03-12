import { NextRequest, NextResponse } from 'next/server'

interface ScrapedData {
  titulo?: string
  preco?: number
  imagem?: string
  success: boolean
  message?: string
}

async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      return { success: false, message: 'Não foi possível acessar a página' }
    }

    const html = await response.text()

    let titulo: string | undefined
    let preco: number | undefined
    let imagem: string | undefined

    // Tentar extrair título
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      titulo = titleMatch[1]
        .replace(/\s*[-|]\s*Shopee.*$/i, '')
        .replace(/\s*[-|]\s*Mercado Livre.*$/i, '')
        .replace(/\s*\|.*$/, '')
        .trim()
    }

    // Tentar extrair preço - padrões comuns
    const precoPatterns = [
      /R\$\s*([\d.,]+)/,
      /"price":\s*"?([\d.,]+)"?/,
      /class="[^"]*price[^"]*"[^>]*>R?\$?\s*([\d.,]+)/i,
      /data-price="([\d.,]+)"/,
    ]

    for (const pattern of precoPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const precoStr = match[1].replace(/\./g, '').replace(',', '.')
        const precoNum = parseFloat(precoStr)
        if (precoNum > 0 && precoNum < 100000) {
          preco = precoNum
          break
        }
      }
    }

    // Tentar extrair imagem
    const imgPatterns = [
      /og:image"[^>]*content="([^"]+)"/i,
      /"image":\s*"([^"]+)"/,
      /class="[^"]*product[^"]*img[^"]*"[^>]*src="([^"]+)"/i,
    ]

    for (const pattern of imgPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        imagem = match[1]
        break
      }
    }

    if (!titulo && !preco && !imagem) {
      return { success: false, message: 'Não foi possível extrair dados da página' }
    }

    return {
      success: true,
      titulo,
      preco,
      imagem,
    }
  } catch (error) {
    console.error('Erro no scraping:', error)
    return { success: false, message: 'Erro ao processar a página' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL é obrigatória' },
        { status: 400 }
      )
    }

    // Validar URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, message: 'URL inválida' },
        { status: 400 }
      )
    }

    const data = await scrapeUrl(url)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro no scrape:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
