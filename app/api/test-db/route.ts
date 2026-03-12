import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Tenta conectar e contar registros
    const count = await prisma.concorrente.count()
    return NextResponse.json({
      success: true,
      message: 'Conexão OK',
      count
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}
