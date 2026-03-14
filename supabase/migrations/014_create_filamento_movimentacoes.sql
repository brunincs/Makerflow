-- Criar tabela de movimentações de estoque de filamentos
CREATE TABLE IF NOT EXISTS filamento_movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filamento_id UUID REFERENCES filamentos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade_g NUMERIC(10,2) NOT NULL,
  preco_por_rolo NUMERIC(10,2),
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para simplificar
ALTER TABLE filamento_movimentacoes DISABLE ROW LEVEL SECURITY;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_filamento_movimentacoes_filamento_id ON filamento_movimentacoes(filamento_id);
CREATE INDEX IF NOT EXISTS idx_filamento_movimentacoes_created_at ON filamento_movimentacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filamento_movimentacoes_tipo ON filamento_movimentacoes(tipo);

-- Migrar dados da tabela antiga (se existir)
INSERT INTO filamento_movimentacoes (filamento_id, tipo, quantidade_g, preco_por_rolo, created_at)
SELECT filamento_id, 'entrada', peso_total_g, preco_por_rolo, created_at
FROM filamento_entradas
ON CONFLICT DO NOTHING;
