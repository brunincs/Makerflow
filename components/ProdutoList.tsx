'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProdutoCard from './ProdutoCard'
import { Produto, STATUS_OPTIONS } from '@/lib/types'

export default function ProdutoList() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchProdutos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter !== 'TODOS') params.set('status', statusFilter)

      const response = await fetch(`/api/produtos?${params}`)
      const data = await response.json()

      // Verifica se a resposta foi bem-sucedida e se data é um array
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar produtos')
      }

      // Garante que sempre será um array
      setProdutos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      setError(error instanceof Error ? error.message : 'Erro ao buscar produtos')
      setProdutos([]) // Garante array vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/produtos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProdutos(prev => prev.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Erro ao deletar produto:', error)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Erro ao carregar produtos</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchProdutos}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || statusFilter !== 'TODOS'
              ? 'Tente ajustar os filtros'
              : 'Comece cadastrando um novo produto'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produtos.map(produto => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500 text-center">
        {produtos.length} produto{produtos.length !== 1 ? 's' : ''} encontrado{produtos.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
