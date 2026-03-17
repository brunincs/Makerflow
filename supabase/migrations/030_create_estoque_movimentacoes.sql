-- Migration: Criar tabela de movimentacoes de estoque
-- Registra entrada e saida de produtos do estoque

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE CASCADE,
  variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  origem VARCHAR(50) NOT NULL CHECK (origem IN ('producao', 'venda', 'manual', 'ajuste')),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_estoque_mov_produto ON estoque_movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_variacao ON estoque_movimentacoes(variacao_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo ON estoque_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created ON estoque_movimentacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_user ON estoque_movimentacoes(user_id);

-- RLS desabilitado temporariamente
ALTER TABLE estoque_movimentacoes DISABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE estoque_movimentacoes IS 'Historico de movimentacoes de estoque de produtos';
COMMENT ON COLUMN estoque_movimentacoes.tipo IS 'entrada = adicao ao estoque, saida = remocao do estoque';
COMMENT ON COLUMN estoque_movimentacoes.origem IS 'producao = veio da producao, venda = saiu por venda, manual = ajuste manual';
