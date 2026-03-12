'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Concorrente, ConcorrenteFormData, STATUS_CONCORRENTE_OPTIONS } from '@/lib/concorrentes'

interface ConcorrenteFormProps {
  concorrente?: Concorrente
  isEditing?: boolean
}

export default function ConcorrenteForm({ concorrente, isEditing = false }: ConcorrenteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<ConcorrenteFormData>({
    nomeProduto: concorrente?.nomeProduto || '',
    imagemProduto: concorrente?.imagemProduto || '',
    linkMakeworld: concorrente?.linkMakeworld || '',
    linkShopee: concorrente?.linkShopee || '',
    linkMercadoLivre: concorrente?.linkMercadoLivre || '',
    precoShopee: concorrente?.precoShopee || null,
    precoMercadoLivre: concorrente?.precoMercadoLivre || null,
    status: concorrente?.status || 'IDEIA',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isEditing ? `/api/concorrentes/${concorrente?.id}` : '/api/concorrentes'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar')
      }

      router.push('/radar-concorrentes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number'
        ? (value === '' ? null : parseFloat(value))
        : value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Imagem URL */}
      <div>
        <label htmlFor="imagemProduto" className="block text-sm font-medium text-gray-700 mb-1">
          URL da Imagem do Produto
        </label>
        <input
          type="url"
          id="imagemProduto"
          name="imagemProduto"
          value={formData.imagemProduto || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://exemplo.com/imagem.jpg"
        />
        <p className="mt-1 text-xs text-gray-500">Cole o link da imagem do produto</p>
      </div>

      {/* Nome */}
      <div>
        <label htmlFor="nomeProduto" className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Produto *
        </label>
        <input
          type="text"
          id="nomeProduto"
          name="nomeProduto"
          value={formData.nomeProduto}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Suporte de Celular Articulado"
        />
      </div>

      {/* Link Makeworld */}
      <div>
        <label htmlFor="linkMakeworld" className="block text-sm font-medium text-gray-700 mb-1">
          Link do Modelo (Makeworld, Thingiverse, etc)
        </label>
        <input
          type="url"
          id="linkMakeworld"
          name="linkMakeworld"
          value={formData.linkMakeworld || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://makerworld.com/..."
        />
      </div>

      {/* Shopee */}
      <div className="bg-orange-50 rounded-lg p-4">
        <h3 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-500 text-white rounded flex items-center justify-center text-xs font-bold">S</span>
          Shopee
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="linkShopee" className="block text-sm font-medium text-gray-700 mb-1">
              Link do Produto
            </label>
            <input
              type="url"
              id="linkShopee"
              name="linkShopee"
              value={formData.linkShopee || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://shopee.com.br/..."
            />
          </div>
          <div>
            <label htmlFor="precoShopee" className="block text-sm font-medium text-gray-700 mb-1">
              Preço (R$)
            </label>
            <input
              type="number"
              id="precoShopee"
              name="precoShopee"
              value={formData.precoShopee ?? ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Mercado Livre */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-yellow-500 text-white rounded flex items-center justify-center text-xs font-bold">ML</span>
          Mercado Livre
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="linkMercadoLivre" className="block text-sm font-medium text-gray-700 mb-1">
              Link do Produto
            </label>
            <input
              type="url"
              id="linkMercadoLivre"
              name="linkMercadoLivre"
              value={formData.linkMercadoLivre || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://mercadolivre.com.br/..."
            />
          </div>
          <div>
            <label htmlFor="precoMercadoLivre" className="block text-sm font-medium text-gray-700 mb-1">
              Preço (R$)
            </label>
            <input
              type="number"
              id="precoMercadoLivre"
              name="precoMercadoLivre"
              value={formData.precoMercadoLivre ?? ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status *
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_CONCORRENTE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Botões */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
