'use client'

import { useState, useEffect, useCallback } from 'react'
import ConcorrenteCard from './ConcorrenteCard'
import { Concorrente, STATUS_CONCORRENTE_OPTIONS } from '@/lib/concorrentes'

export default function ConcorrentesList() {
  const [concorrentes, setConcorrentes] = useState<Concorrente[]>([])
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

  const fetchConcorrentes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter !== 'TODOS') params.set('status', statusFilter)

      const response = await fetch(`/api/concorrentes?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar concorrentes')
      }

      setConcorrentes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao buscar concorrentes:', error)
      setError(error instanceof Error ? error.message : 'Erro ao buscar concorrentes')
      setConcorrentes([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchConcorrentes()
  }, [fetchConcorrentes])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/concorrentes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConcorrentes(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Erro ao deletar concorrente:', error)
    }
  }

  // Estatísticas
  const stats = {
    total: concorrentes.length,
    ideias: concorrentes.filter(c => c.status === 'IDEIA').length,
    testar: concorrentes.filter(c => c.status === 'TESTAR').length,
    producao: concorrentes.filter(c => c.status === 'EM_PRODUCAO').length,
    escalar: concorrentes.filter(c => c.status === 'ESCALAR').length,
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-2xl font-bold text-gray-700">{stats.ideias}</p>
          <p className="text-sm text-gray-500">Ideias</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-700">{stats.testar}</p>
          <p className="text-sm text-yellow-600">Testar</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{stats.producao}</p>
          <p className="text-sm text-blue-600">Em Produção</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-2xl font-bold text-green-700">{stats.escalar}</p>
          <p className="text-sm text-green-600">Escalar</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nome do produto..."
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
            {STATUS_CONCORRENTE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Erro ao carregar</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchConcorrentes}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : concorrentes.length === 0 ? (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum concorrente encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || statusFilter !== 'TODOS'
              ? 'Tente ajustar os filtros'
              : 'Comece adicionando um produto concorrente para análise'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {concorrentes.map(concorrente => (
            <ConcorrenteCard
              key={concorrente.id}
              concorrente={concorrente}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        {concorrentes.length} produto{concorrentes.length !== 1 ? 's' : ''} encontrado{concorrentes.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
