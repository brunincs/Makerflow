import ConcorrenteForm from '@/components/concorrentes/ConcorrenteForm'

export default function NovoConcorrentePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto Concorrente</h1>
        <p className="text-gray-600 mt-1">Adicione um produto da concorrência para análise de mercado</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ConcorrenteForm />
      </div>
    </div>
  )
}
