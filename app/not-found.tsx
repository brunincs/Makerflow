import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagina nao encontrada</h2>
      <p className="text-gray-600 mb-6">O recurso que voce procura nao existe.</p>
      <Link
        href="/"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Voltar para o inicio
      </Link>
    </div>
  )
}
