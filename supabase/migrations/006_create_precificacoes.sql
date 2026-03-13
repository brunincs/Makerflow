-- Tabela de precificacoes salvas
CREATE TABLE IF NOT EXISTS precificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE SET NULL,
  marketplace VARCHAR(50) NOT NULL,
  preco_venda DECIMAL(10,2) NOT NULL,

  -- Custos de producao
  custo_filamento DECIMAL(10,2) DEFAULT 0,
  custo_energia DECIMAL(10,2) DEFAULT 0,
  custo_embalagem DECIMAL(10,2) DEFAULT 0,

  -- Custos de venda
  taxa_marketplace DECIMAL(10,2) DEFAULT 0,
  frete_vendedor DECIMAL(10,2) DEFAULT 0,

  -- Resultados
  lucro_liquido DECIMAL(10,2) NOT NULL,
  margem DECIMAL(5,2) NOT NULL,
  lucro_por_hora DECIMAL(10,2) DEFAULT 0,

  -- Tempo
  tempo_impressao DECIMAL(6,2) DEFAULT 0,

  -- Metadata
  nome_produto VARCHAR(255),
  variacao_nome VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index para busca por produto
CREATE INDEX IF NOT EXISTS idx_precificacoes_produto_id ON precificacoes(produto_id);

-- Index para ordenacao por data
CREATE INDEX IF NOT EXISTS idx_precificacoes_created_at ON precificacoes(created_at DESC);

-- Habilitar RLS
ALTER TABLE precificacoes ENABLE ROW LEVEL SECURITY;

-- Politica permissiva para desenvolvimento
CREATE POLICY "Permitir tudo em precificacoes" ON precificacoes
  FOR ALL
  USING (true)
  WITH CHECK (true);
