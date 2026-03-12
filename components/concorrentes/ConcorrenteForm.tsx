'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '../ImageUpload'
import { Concorrente, ConcorrenteFormData, STATUS_CONCORRENTE_OPTIONS } from '@/lib/concorrentes'

interface ConcorrenteFormProps {
  concorrente?: Concorrente
  isEditing?: boolean
}

export default function ConcorrenteForm({ concorrente, isEditing = false }: ConcorrenteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState('')
  const [scrapeMessage, setScrapeMessage] = useState('')

  const [formData, setFormData] = useState<ConcorrenteFormData>({
    nomeProduto: concorrente?.nomeProduto || '',
    imagemProduto: concorrente?.imagemProduto || '',
    linkMakeworld: concorrente?.linkMakeworld || '',
    linkShopee: concorrente?.linkShopee || '',
    linkMercadoLivre: concorrente?.linkMercadoLivre || '',
    precoShopee: concorrente?.precoShopee || null,
    precoMercadoLivre: concorrente?.precoMercadoLivre || null,
    vendasEstimadas: concorrente?.vendasEstimadas || null,
    avaliacoes: concorrente?.avaliacoes || null,
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

  const handleScrape = async (url: string, marketplace: 'shopee' | 'mercadolivre') => {
    if (!url) return

    setScraping(true)
    setScrapeMessage('')

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          nomeProduto: prev.nomeProduto || data.titulo || '',
          imagemProduto: prev.imagemProduto || data.imagem || '',
          [marketplace === 'shopee' ? 'precoShopee' : 'precoMercadoLivre']: data.preco || null,
        }))
        setScrapeMessage('Dados importados com sucesso!')
      } else {
        setScrapeMessage(data.message || 'Não foi possível importar dados. Preencha manualmente.')
      }
    } catch {
      setScrapeMessage('Erro ao importar. Preencha manualmente.')
    } finally {
      setScraping(false)
      setTimeout(() => setScrapeMessage(''), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {scrapeMessage && (
        <div className={`px-4 py-3 rounded-lg ${scrapeMessage.includes('sucesso') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
          {scrapeMessage}
        </div>
      )}

      {/* Imagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Produto
        </label>
        <ImageUpload
          value={formData.imagemProduto}
          onChange={(path) => setFormData(prev => ({ ...prev, imagemProduto: path }))}
          onError={(err) => setError(err)}
        />
        <p className="mt-1 text-xs text-gray-500">Ou cole uma URL de imagem diretamente</p>
        <input
          type="url"
          value={formData.imagemProduto || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, imagemProduto: e.target.value }))}
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://exemplo.com/imagem.jpg"
        />
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
          placeholder="https://makeworld.com/..."
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
            <div className="flex gap-2">
              <input
                type="url"
                id="linkShopee"
                name="linkShopee"
                value={formData.linkShopee || ''}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://shopee.com.br/..."
              />
              <button
                type="button"
                onClick={() => handleScrape(formData.linkShopee || '', 'shopee')}
                disabled={scraping || !formData.linkShopee}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {scraping ? 'Importando...' : 'Importar'}
              </button>
            </div>
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
            <div className="flex gap-2">
              <input
                type="url"
                id="linkMercadoLivre"
                name="linkMercadoLivre"
                value={formData.linkMercadoLivre || ''}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://mercadolivre.com.br/..."
              />
              <button
                type="button"
                onClick={() => handleScrape(formData.linkMercadoLivre || '', 'mercadolivre')}
                disabled={scraping || !formData.linkMercadoLivre}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {scraping ? 'Importando...' : 'Importar'}
              </button>
            </div>
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

      {/* Dados de Mercado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vendasEstimadas" className="block text-sm font-medium text-gray-700 mb-1">
            Vendas Estimadas
          </label>
          <input
            type="number"
            id="vendasEstimadas"
            name="vendasEstimadas"
            value={formData.vendasEstimadas ?? ''}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: 500"
          />
        </div>
        <div>
          <label htmlFor="avaliacoes" className="block text-sm font-medium text-gray-700 mb-1">
            Avaliações
          </label>
          <input
            type="number"
            id="avaliacoes"
            name="avaliacoes"
            value={formData.avaliacoes ?? ''}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: 150"
          />
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
