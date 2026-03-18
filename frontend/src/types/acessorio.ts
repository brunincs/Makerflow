// ============ ACESSORIOS ============

export interface Acessorio {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  unidade: string; // 'unidade', 'metro', 'par', etc.
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AcessorioConfig {
  acessorio_id: string;
  quantidade: number;
  acessorio?: Acessorio; // Para exibição com dados completos
}

export type TipoMovimentacaoAcessorio = 'entrada' | 'saida' | 'ajuste';

export interface AcessorioMovimentacao {
  id: string;
  user_id?: string;
  acessorio_id: string;
  tipo: TipoMovimentacaoAcessorio;
  quantidade: number;
  motivo?: string;
  referencia_id?: string;
  referencia_tipo?: string; // 'pedido', 'impressao', 'manual'
  created_at: string;
  // Dados via join
  acessorio?: {
    nome: string;
    unidade: string;
  };
}

export type UnidadeAcessorio = 'unidade' | 'metro' | 'par' | 'conjunto' | 'pacote';

export const UNIDADES_ACESSORIO: { value: UnidadeAcessorio; label: string }[] = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'metro', label: 'Metro' },
  { value: 'par', label: 'Par' },
  { value: 'conjunto', label: 'Conjunto' },
  { value: 'pacote', label: 'Pacote' },
];
