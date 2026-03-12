'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from './ImageUpload'
import { Produto, ProdutoFormData, STATUS_OPTIONS } from '@/lib/types'

interface ProdutoFormProps {
  produto?: Produto
  isEditing?: boolean
}

export default function ProdutoForm({ produto, isEditing = false }: ProdutoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<ProdutoFormData>({
    nome: produto?.nome || '',
    imagem: produto?.imagem || '',
    linkMakeword: produto?.linkMakeword || '',
    linkShopee: produto?.linkShopee || '',
    linkMercadoLivre: produto?.linkMercadoLivre || '',
    precoConcorrente: produto?.precoConcorrente || 0,
    status: produto?.status || 'TESTAR',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isEditing ? `/api/produtos/${produto?.id}` : '/api/produtos'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar produto')
      }

      router.push('/analise-produtos')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precoConcorrente' ? parseFloat(value) || 0 : value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Produto
        </label>
        <ImageUpload
          value={formData.imagem}
          onChange={(path) => setFormData(prev => ({ ...prev, imagem: path }))}
          onError={(err) => setError(err)}
        />
      </div>

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Produto *
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Fone Bluetooth XYZ"
        />
      </div>

      <div>
        <label htmlFor="linkMakeword" className="block text-sm font-medium text-gray-700 mb-1">
          Link do Produto no Makeword *
        </label>
        <input
          type="url"
          id="linkMakeword"
          name="linkMakeword"
          value={formData.linkMakeword}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://makeword.com/..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="linkShopee" className="block text-sm font-medium text-gray-700 mb-1">
            Link da Shopee (opcional)
          </label>
          <input
            type="url"
            id="linkShopee"
            name="linkShopee"
            value={formData.linkShopee}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://shopee.com.br/..."
          />
        </div>

        <div>
          <label htmlFor="linkMercadoLivre" className="block text-sm font-medium text-gray-700 mb-1">
            Link do Mercado Livre (opcional)
          </label>
          <input
            type="url"
            id="linkMercadoLivre"
            name="linkMercadoLivre"
            value={formData.linkMercadoLivre}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://mercadolivre.com.br/..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="precoConcorrente" className="block text-sm font-medium text-gray-700 mb-1">
            Preco do Concorrente (R$) *
          </label>
          <input
            type="number"
            id="precoConcorrente"
            name="precoConcorrente"
            value={formData.precoConcorrente}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="99.90"
          />
        </div>

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
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Cadastrar Produto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
