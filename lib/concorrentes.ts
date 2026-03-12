export type StatusConcorrente = 'IDEIA' | 'TESTAR' | 'EM_PRODUCAO' | 'ESCALAR' | 'DESCARTADO'

export interface Concorrente {
  id: string
  nomeProduto: string
  imagemProduto: string | null
  linkMakeworld: string | null
  linkShopee: string | null
  linkMercadoLivre: string | null
  precoShopee: number | null
  precoMercadoLivre: number | null
  precoMedio: number | null
  vendasEstimadas: number | null
  avaliacoes: number | null
  status: StatusConcorrente
  createdAt: Date
  updatedAt: Date
}

export interface ConcorrenteFormData {
  nomeProduto: string
  imagemProduto?: string
  linkMakeworld?: string
  linkShopee?: string
  linkMercadoLivre?: string
  precoShopee?: number | null
  precoMercadoLivre?: number | null
  vendasEstimadas?: number | null
  avaliacoes?: number | null
  status: StatusConcorrente
}

export const STATUS_CONCORRENTE_OPTIONS: {
  value: StatusConcorrente
  label: string
  color: string
  bgColor: string
}[] = [
  { value: 'IDEIA', label: 'Ideia', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { value: 'TESTAR', label: 'Testar', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'EM_PRODUCAO', label: 'Em Produção', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'ESCALAR', label: 'Escalar', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'DESCARTADO', label: 'Descartado', color: 'text-red-700', bgColor: 'bg-red-100' },
]

export function getStatusConcorrenteInfo(status: StatusConcorrente) {
  return STATUS_CONCORRENTE_OPTIONS.find(s => s.value === status) || STATUS_CONCORRENTE_OPTIONS[0]
}

export function calcularPrecoMedio(precoShopee?: number | null, precoMercadoLivre?: number | null): number | null {
  const precos = [precoShopee, precoMercadoLivre].filter((p): p is number => p !== null && p !== undefined && p > 0)

  if (precos.length === 0) return null

  const soma = precos.reduce((acc, preco) => acc + preco, 0)
  return Math.round((soma / precos.length) * 100) / 100
}

export function formatarPreco(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(data))
}
