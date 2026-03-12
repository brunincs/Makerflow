export type StatusProduto = 'TESTAR' | 'OBSERVANDO' | 'DESCARTADO' | 'ESCALANDO'

export interface Produto {
  id: string
  nome: string
  imagem: string | null
  linkMakeword: string
  linkShopee: string | null
  linkMercadoLivre: string | null
  precoConcorrente: number
  status: StatusProduto
  createdAt: Date
  updatedAt: Date
}

export interface ProdutoFormData {
  nome: string
  imagem?: string
  linkMakeword: string
  linkShopee?: string
  linkMercadoLivre?: string
  precoConcorrente: number
  status: StatusProduto
}

export const STATUS_OPTIONS: { value: StatusProduto; label: string; color: string }[] = [
  { value: 'TESTAR', label: 'Testar', color: 'bg-blue-100 text-blue-800' },
  { value: 'OBSERVANDO', label: 'Observando', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DESCARTADO', label: 'Descartado', color: 'bg-red-100 text-red-800' },
  { value: 'ESCALANDO', label: 'Escalando', color: 'bg-green-100 text-green-800' },
]

export function getStatusInfo(status: StatusProduto) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}
