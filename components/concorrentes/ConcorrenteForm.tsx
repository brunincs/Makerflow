'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Concorrente, ConcorrenteFormData, STATUS_CONCORRENTE_OPTIONS } from '@/lib/concorrentes'

interface ConcorrenteFormProps {
  concorrente?: Concorrente
  isEditing?: boolean
}

export default function ConcorrenteForm({ concorrente, isEditing = false }: ConcorrenteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload')
      }

      setFormData(prev => ({ ...prev, imagemProduto: data.path }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
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

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imagemProduto: '' }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload de Imagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Produto
        </label>

        {formData.imagemProduto ? (
          <div className="relative">
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={formData.imagemProduto}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} disabled={uploading} />
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {uploading ? (
              <p className="mt-2 text-sm text-gray-600">Enviando...</p>
            ) : isDragActive ? (
              <p className="mt-2 text-sm text-blue-600">Solte a imagem aqui</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WEBP ou GIF (max. 5MB)
                </p>
              </>
            )}
          </div>
        )}
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
          Link do Modelo (Makerworld, Thingiverse, etc)
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
          disabled={loading || uploading}
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
