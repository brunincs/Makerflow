export interface VariacaoProduto {
  id?: string;
  produto_id?: string;
  nome_variacao: string;
  preco_shopee?: number;
  preco_mercado_livre?: number;
  peso_filamento?: number;
  tempo_impressao?: number;
  arquivo_stl?: string;
  created_at?: string;
}

export interface ProdutoConcorrente {
  id?: string;
  imagem_url?: string;
  nome: string;
  link_modelo?: string;
  link_shopee?: string;
  preco_shopee?: number;
  link_mercado_livre?: string;
  preco_mercado_livre?: number;
  status: 'ideia' | 'testando' | 'validado';
  peso_filamento?: number;
  tempo_impressao?: number;
  arquivo_stl?: string;
  categoria_id?: string;
  created_at?: string;
  updated_at?: string;
  variacoes?: VariacaoProduto[];
}

export type StatusProduto = 'ideia' | 'testando' | 'validado';

// ============ PRECIFICACAO ============

export type MarketplaceType = 'shopee' | 'mercadolivre' | 'venda_direta';

// Shopee
export type ShopeeVendedorType = 'cnpj' | 'cpf';

export interface ShopeeConfig {
  tipo_vendedor: ShopeeVendedorType;
  campanha_destaque: boolean;
  cupom_desconto: boolean;
  valor_cupom?: number;
}

export interface ShopeeComissaoFaixa {
  min: number;
  max: number | null;
  percentual: number;
  taxa_fixa: number;
  label: string;
}

// Mercado Livre
export type MercadoLivreAnuncioType = 'classico' | 'premium';

export interface MercadoLivreCategoria {
  id: string;
  nome: string;
  taxa_classico: number;
  taxa_premium: number;
}

export type ImpressoraModelo = 'a1_mini' | 'a1' | 'p1p' | 'p1s' | 'x1_carbon' | 'h2d' | 'outra';

// Filamento (para futura integracao com biblioteca de filamentos)
export interface Filamento {
  id: string;
  marca: string;
  nome_filamento: string;
  cor: string;
  material: string; // PLA, PETG, ABS, TPU
  preco_pago: number; // Mantido para compatibilidade, mas usamos preco_por_kg
  preco_por_kg: number; // Preço médio ponderado por kg
  quantidade_rolos: number; // Total de rolos adicionados (histórico)
  estoque_gramas: number; // Estoque atual em gramas
  created_at?: string;
}

// Entrada de estoque de filamento
export interface FilamentoEntrada {
  id?: string;
  filamento_id: string;
  quantidade_rolos: number;
  preco_por_rolo: number;
  peso_total_g: number; // = quantidade_rolos * 1000
  created_at?: string;
}

// Impressao (registro de impressões realizadas)
export interface Impressao {
  id?: string;
  produto_id: string; // '__MANUAL__' para impressões manuais
  variacao_id?: string;
  filamento_id: string;
  quantidade: number;
  peso_peca_g: number;
  peso_total_g: number; // = peso_peca_g * quantidade
  tempo_peca_min?: number; // tempo por peça em minutos
  tempo_total_min?: number; // = tempo_peca_min * quantidade
  impressora?: ImpressoraModelo;
  nome_peca_manual?: string; // nome da peça para impressões manuais
  created_at?: string;
  // Dados via join
  produto?: {
    nome: string;
    imagem_url?: string;
  };
  variacao?: {
    nome_variacao: string;
  };
  filamento?: {
    nome_filamento: string;
    cor: string;
    material: string;
  };
}

// Embalagem
export type TipoEmbalagem = 'Envelope' | 'Proteção' | 'Caixa';

export interface Embalagem {
  id: string;
  tipo: TipoEmbalagem;
  nome_embalagem: string;
  preco_unitario: number;
  created_at?: string;
}

export interface MercadoLivreConfig {
  tipo_anuncio: MercadoLivreAnuncioType;
  categoria_id: string;
  peso_kg: number;
  frete_gratis: boolean;
  frete_manual: boolean;
  frete_valor?: number;
  tempo_impressao_horas?: number;
  tempo_impressao_minutos?: number;
  impressora_modelo?: ImpressoraModelo;
  consumo_kwh?: number;
  valor_kwh?: number;
  multiplas_pecas?: boolean;
  quantidade_pecas?: number;
  // Filamento
  filamento_id?: string;
  preco_filamento_kg?: number;
  peso_filamento_g?: number;
  // Demais custos
  imposto_aliquota?: number;
  custo_embalagem?: number;
  outros_custos?: number;
}

// Venda Direta
export interface VendaDiretaConfig {
  taxa_gateway: number;
  taxa_cartao: number;
  taxa_pix: number;
}

// Custos de Producao (compartilhado entre todos os marketplaces)
export interface CustosProducaoConfig {
  // Impressora & Energia
  tempo_impressao_horas?: number;
  tempo_impressao_minutos?: number;
  impressora_modelo?: ImpressoraModelo;
  consumo_kwh?: number;
  valor_kwh?: number;
  multiplas_pecas?: boolean;
  quantidade_pecas?: number;
  // Filamento
  filamento_id?: string;
  preco_filamento_kg?: number;
  peso_filamento_g?: number;
  // Embalagens (múltiplas)
  embalagens_ids?: string[];
  // Demais Custos
  imposto_aliquota?: number;
  outros_custos?: number;
}

// Modo de Precificacao
export type ModoPrecificacao = 'preco_manual' | 'margem';

// Estado completo do Marketplace
export interface MarketplaceState {
  tipo: MarketplaceType;
  shopee: ShopeeConfig;
  mercadolivre: MercadoLivreConfig;
  venda_direta: VendaDiretaConfig;
  produto_selecionado?: ProdutoSelecionado;
  custos_producao: CustosProducaoConfig;
  // Preco & Margem
  modo_precificacao: ModoPrecificacao;
  preco_venda?: number;
  margem_desejada?: number;
}

// Produto selecionado na calculadora
export interface ProdutoSelecionado {
  produto: ProdutoConcorrente;
  variacao?: VariacaoProduto;
}

// Estado da Precificacao
export interface PrecificacaoState {
  marketplace: MarketplaceState;
  produto_selecionado?: ProdutoSelecionado;
  // Futuras etapas...
}

// ============ SIMULACOES (Precificacoes Salvas) ============

export interface PrecificacaoSalva {
  id?: string;
  produto_id?: string | null;
  marketplace: MarketplaceType;
  preco_venda: number;

  // Custos calculados
  custo_filamento: number;
  custo_energia: number;
  custo_embalagem: number;

  // Custos de venda
  taxa_marketplace: number;
  frete_vendedor: number;

  // Resultados
  lucro_liquido: number;
  margem: number;
  lucro_por_hora: number;

  // Tempo
  tempo_impressao: number;

  // Inputs salvos (para restaurar simulacao)
  peso_filamento_g?: number;
  preco_filamento_kg?: number;
  consumo_kwh?: number;
  valor_kwh?: number;
  peso_kg?: number;
  imposto_aliquota?: number;
  outros_custos?: number;
  frete_gratis?: boolean;
  tipo_anuncio?: string | null;
  categoria_id?: string | null;

  // Metadata
  nome_produto?: string | null;
  variacao_nome?: string | null;

  // Dados do produto (via join)
  produto?: {
    imagem_url?: string;
  } | null;

  created_at?: string;
}
