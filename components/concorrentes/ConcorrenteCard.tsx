'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Concorrente, getStatusConcorrenteInfo, formatarPreco, formatarData } from '@/lib/concorrentes'
import ConcorrenteAnaliseModal from './ConcorrenteAnaliseModal'

interface ConcorrenteCardProps {
  concorrente: Concorrente
  onDelete: (id: string) => void
}

export default function ConcorrenteCard({ concorrente, onDelete }: ConcorrenteCardProps) {
  const [showAnalise, setShowAnalise] = useState(false)
  const statusInfo = getStatusConcorrenteInfo(concorrente.status)

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este concorrente?')) {
      onDelete(concorrente.id)
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        {/* Imagem */}
        <div className="relative h-48 bg-gray-100">
          {concorrente.imagemProduto ? (
            <Image
              src={concorrente.imagemProduto}
              alt={concorrente.nomeProduto}
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Status Badge */}
          <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="p-4">
          {/* Nome */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 min-h-[48px]">
            {concorrente.nomeProduto}
          </h3>

          {/* Preços */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Shopee:</span>
              <span className="font-medium text-orange-600">
                {formatarPreco(concorrente.precoShopee)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Mercado Livre:</span>
              <span className="font-medium text-yellow-600">
                {formatarPreco(concorrente.precoMercadoLivre)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <span className="text-gray-700 font-medium">Preço Médio:</span>
              <span className="font-bold text-green-600 text-lg">
                {formatarPreco(concorrente.precoMedio)}
              </span>
            </div>
          </div>

          {/* Marketplace Badges */}
          <div className="flex flex-wrap gap-1 mb-3">
            {concorrente.linkMakeworld && (
              <a
                href={concorrente.linkMakeworld}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
              >
                Makeworld
              </a>
            )}
            {concorrente.linkShopee && (
              <a
                href={concorrente.linkShopee}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
              >
                Shopee
              </a>
            )}
            {concorrente.linkMercadoLivre && (
              <a
                href={concorrente.linkMercadoLivre}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors"
              >
                Mercado Livre
              </a>
            )}
          </div>

          {/* Data */}
          <p className="text-xs text-gray-400 mb-4">
            Criado em {formatarData(concorrente.createdAt)}
          </p>

          {/* Botões */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalise(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              Análise
            </button>
            <Link
              href={`/radar-concorrentes/${concorrente.id}/editar`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              Editar
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Análise */}
      {showAnalise && (
        <ConcorrenteAnaliseModal
          concorrente={concorrente}
          onClose={() => setShowAnalise(false)}
        />
      )}
    </>
  )
}
