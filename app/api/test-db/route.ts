import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  // Tenta com a URL de ambiente
  const dbUrl = process.env.DATABASE_URL || 'não configurada'

  // Mostra a URL (sem a senha completa)
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':***@')

  try {
    const prisma = new PrismaClient()
    const count = await prisma.concorrente.count()
    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      message: 'Conexão OK!',
      count,
      url: safeUrl
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      url: safeUrl,
      dica: 'Tente usar porta 6543 em vez de 5432'
    }, { status: 500 })
  }
}
