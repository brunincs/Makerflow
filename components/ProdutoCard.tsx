'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Produto, getStatusInfo } from '@/lib/types'

interface ProdutoCardProps {
  produto: Produto
  onDelete: (id: string) => void
}

export default function ProdutoCard({ produto, onDelete }: ProdutoCardProps) {
  const statusInfo = getStatusInfo(produto.status)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      onDelete(produto.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-100">
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt={produto.nome}
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{produto.nome}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <p className="text-2xl font-bold text-green-600 mb-3">
          {formatPrice(produto.precoConcorrente)}
        </p>

        <div className="space-y-1 text-sm text-gray-500 mb-4">
          <p>Criado em: {formatDate(produto.createdAt)}</p>
        </div>

        <div className="flex gap-2 mb-4">
          {produto.linkMakeword && (
            <a
              href={produto.linkMakeword}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
            >
              Makeword
            </a>
          )}
          {produto.linkShopee && (
            <a
              href={produto.linkShopee}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
            >
              Shopee
            </a>
          )}
          {produto.linkMercadoLivre && (
            <a
              href={produto.linkMercadoLivre}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
            >
              ML
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/analise-produtos/${produto.id}/editar`}
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
