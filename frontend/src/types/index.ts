// ============ AUTH / PROFILE ============

export type TipoDocumento = 'cpf' | 'cnpj';
export type RegimeTributario = 'mei' | 'simples' | 'lucro_presumido' | 'lucro_real';
export type StatusImpressora = 'ativa' | 'manutencao' | 'inativa';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  suspended: boolean;
  // Dados da empresa
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
  documento?: string | null;
  tipo_documento?: TipoDocumento | null;
  regime_tributario?: RegimeTributario | null;
  logo_url?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email_comercial?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Impressora {
  id?: string;
  user_id?: string;
  modelo: string;
  apelido?: string | null;
  marca?: string | null;
  status: StatusImpressora;
  consumo_kwh: number;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Integration {
  id: string;
  user_id: string;
  provider: 'mercadolivre' | 'shopee';
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  provider_user_id?: string;
  created_at: string;
  updated_at: string;
}

// ============ PRODUTOS ============

export interface VariacaoProduto {
  id?: string;
  produto_id?: string;
  user_id?: string;
  nome_variacao: string;
  sku?: string;
  preco_shopee?: number;
  preco_mercado_livre?: number;
  peso_filamento?: number;
  tempo_impressao?: number;
  arquivo_stl?: string;
  created_at?: string;
}

export interface ProdutoConcorrente {
  id?: string;
  user_id?: string;
  imagem_url?: string;
  nome: string;
  sku?: string;
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
  user_id?: string;
  marca: string;
  nome_filamento: string;
  cor: string;
  material: string; // PLA, PETG, ABS, TPU
  preco_pago: number; // Mantido para compatibilidade, mas usamos preco_por_kg
  preco_por_kg: number; // Preco medio ponderado por kg
  quantidade_rolos: number; // Total de rolos adicionados (historico)
  estoque_gramas: number; // Estoque atual em gramas
  created_at?: string;
}

// Entrada de estoque de filamento (legado)
export interface FilamentoEntrada {
  id?: string;
  filamento_id: string;
  quantidade_rolos: number;
  preco_por_rolo: number;
  peso_total_g: number; // = quantidade_rolos * 1000
  created_at?: string;
}

// Movimentação de estoque de filamento
export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';

export interface FilamentoMovimentacao {
  id?: string;
  user_id?: string;
  filamento_id: string;
  tipo: TipoMovimentacao;
  quantidade_g: number;
  preco_por_rolo?: number;
  motivo?: string;
  created_at?: string;
}

// Impressao (registro de impressoes realizadas)
export interface Impressao {
  id?: string;
  user_id?: string;
  produto_id: string; // '__MANUAL__' para impressoes manuais
  variacao_id?: string;
  filamento_id: string;
  quantidade: number;
  peso_peca_g: number;
  peso_total_g: number; // = peso_peca_g * quantidade
  tempo_peca_min?: number; // tempo por peca em minutos
  tempo_total_min?: number; // = tempo_peca_min * quantidade
  impressora?: ImpressoraModelo;
  nome_peca_manual?: string; // nome da peca para impressoes manuais
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
  user_id?: string;
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
  impressora_id?: string; // ID da impressora do usuário
  impressora_modelo?: ImpressoraModelo; // Legado - manter para compatibilidade
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
  filamento_id?: string | null;
  peso_filamento_g?: number;
  preco_filamento_kg?: number;
  consumo_kwh?: number;
  valor_kwh?: number;
  peso_kg?: number;
  imposto_aliquota?: number;
  outros_custos?: number;
  embalagens_ids?: string[];
  impressora_modelo?: string | null;
  frete_gratis?: boolean;
  tipo_anuncio?: string | null;
  categoria_id?: string | null;
  // Campos adicionais para restaurar simulacao
  multiplas_pecas?: boolean;
  quantidade_pecas?: number;

  // Metadata
  nome_produto?: string | null;
  variacao_nome?: string | null;

  // Dados do produto (via join)
  produto?: {
    imagem_url?: string;
  } | null;

  created_at?: string;
}

// ============ FILA DE PRODUCAO ============

// Pedido de venda
export interface Pedido {
  id?: string;
  user_id?: string;
  produto_id: string;
  variacao_id?: string | null;
  quantidade: number;
  quantidade_produzida: number;
  status: 'pendente' | 'em_producao' | 'concluido';
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  // Dados via join
  produto?: {
    nome: string;
    imagem_url?: string;
    peso_filamento?: number;
    tempo_impressao?: number;
  };
  variacao?: {
    nome_variacao: string;
    peso_filamento?: number;
    tempo_impressao?: number;
  };
}

// Estoque de produtos acabados
export interface EstoqueProduto {
  id?: string;
  user_id?: string;
  produto_id: string;
  variacao_id?: string | null;
  quantidade: number;
  created_at?: string;
  updated_at?: string;
  // Dados via join
  produto?: {
    nome: string;
    imagem_url?: string;
  };
  variacao?: {
    nome_variacao: string;
  };
}

// Item da fila de produção (calculado)
export interface ItemFilaProducao {
  produto_id: string;
  variacao_id?: string | null;
  nome_produto: string;
  nome_variacao?: string;
  imagem_url?: string;
  quantidade_pedida: number;
  quantidade_estoque: number;
  quantidade_produzir: number;
  peso_por_peca: number;
  tempo_por_peca: number;
  peso_total: number;
  tempo_total: number;
  pedidos: Pedido[];
}

// ============ MERCADO LIVRE ============

export interface MLOrder {
  id?: string;
  user_id?: string;
  ml_order_id: string;
  product_title: string;
  variation?: string | null;
  seller_sku?: string | null;
  quantity: number;
  unit_price?: number;
  status: string;
  buyer_nickname?: string;
  date_created?: string;
  imported: boolean;
  pedido_id?: string | null;
  created_at?: string;
}

export interface MLConnectionStatus {
  connected: boolean;
  ml_user_id?: string;
  expires_at?: string;
  can_refresh?: boolean;
  reason?: string;
}

export interface MLSyncResponse {
  synced: number;
  pending: MLOrder[];
  total_from_ml: number;
}
