import Link from 'next/link'
import ConcorrentesList from '@/components/concorrentes/ConcorrentesList'

export default function RadarConcorrentesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radar de Concorrentes</h1>
          <p className="text-gray-600 mt-1">Analise produtos da concorrência e identifique oportunidades</p>
        </div>
        <Link
          href="/radar-concorrentes/novo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Produto
        </Link>
      </div>
      <ConcorrentesList />
    </div>
  )
}
