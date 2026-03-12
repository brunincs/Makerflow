'use client'

import { Concorrente, formatarPreco, getStatusConcorrenteInfo } from '@/lib/concorrentes'
import Image from 'next/image'

interface ConcorrenteAnaliseModalProps {
  concorrente: Concorrente
  onClose: () => void
}

export default function ConcorrenteAnaliseModal({ concorrente, onClose }: ConcorrenteAnaliseModalProps) {
  const statusInfo = getStatusConcorrenteInfo(concorrente.status)

  const diferencaPreco = concorrente.precoShopee && concorrente.precoMercadoLivre
    ? Math.abs(concorrente.precoShopee - concorrente.precoMercadoLivre)
    : null

  const marketplaceMaisBarato = concorrente.precoShopee && concorrente.precoMercadoLivre
    ? concorrente.precoShopee < concorrente.precoMercadoLivre ? 'Shopee' : 'Mercado Livre'
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Análise do Produto</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Produto Info */}
          <div className="flex gap-4 mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {concorrente.imagemProduto ? (
                <Image
                  src={concorrente.imagemProduto}
                  alt={concorrente.nomeProduto}
                  width={96}
                  height={96}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{concorrente.nomeProduto}</h3>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Comparação de Preços */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Comparação de Preços</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-orange-600 font-bold text-sm">S</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">Shopee</p>
                <p className="font-bold text-orange-600">{formatarPreco(concorrente.precoShopee)}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-600 font-bold text-sm">ML</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">Mercado Livre</p>
                <p className="font-bold text-yellow-600">{formatarPreco(concorrente.precoMercadoLivre)}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold text-sm">M</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">Preço Médio</p>
                <p className="font-bold text-green-600 text-lg">{formatarPreco(concorrente.precoMedio)}</p>
              </div>
            </div>

            {diferencaPreco !== null && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Diferença entre marketplaces:</span>
                  <span className="font-medium text-gray-900">{formatarPreco(diferencaPreco)}</span>
                </div>
                {marketplaceMaisBarato && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Mais barato em:</span>
                    <span className="font-medium text-blue-600">{marketplaceMaisBarato}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Estimativa de Demanda */}
          {(concorrente.vendasEstimadas !== null || concorrente.avaliacoes !== null) && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Estimativa de Demanda</h4>
              <div className="grid grid-cols-2 gap-4">
                {concorrente.vendasEstimadas !== null && (
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{concorrente.vendasEstimadas.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-500">Vendas Estimadas</p>
                  </div>
                )}
                {concorrente.avaliacoes !== null && (
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{concorrente.avaliacoes.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-500">Avaliações</p>
                  </div>
                )}
              </div>

              {concorrente.vendasEstimadas !== null && concorrente.vendasEstimadas > 100 && (
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Alta demanda detectada!</span> Este produto tem potencial de vendas significativo.
                  </p>
                </div>
              )}

              {concorrente.vendasEstimadas !== null && concorrente.vendasEstimadas <= 100 && concorrente.vendasEstimadas > 0 && (
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Demanda moderada.</span> Considere testar com baixo volume inicial.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Insights */}
          <div className="bg-purple-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Insights</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {concorrente.precoMedio && concorrente.precoMedio < 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  Produto de baixo ticket - foque em volume de vendas
                </li>
              )}
              {concorrente.precoMedio && concorrente.precoMedio >= 50 && concorrente.precoMedio < 150 && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  Ticket médio - equilibre qualidade e preço
                </li>
              )}
              {concorrente.precoMedio && concorrente.precoMedio >= 150 && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  Produto premium - invista em qualidade e acabamento
                </li>
              )}
              {diferencaPreco && diferencaPreco > 10 && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  Grande variação de preço entre marketplaces - há margem para competir
                </li>
              )}
              {concorrente.linkMakeworld && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  Modelo disponível no Makeworld - verifique licença de uso comercial
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
