-- Criar tabela de impressoes
CREATE TABLE IF NOT EXISTS impressoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE CASCADE,
  variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL,
  filamento_id UUID REFERENCES filamentos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  peso_peca_g NUMERIC(10,2) NOT NULL,
  peso_total_g NUMERIC(10,2) NOT NULL,
  tempo_peca_min NUMERIC(10,2),
  tempo_total_min NUMERIC(10,2),
  impressora TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para simplificar
ALTER TABLE impressoes DISABLE ROW LEVEL SECURITY;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_impressoes_produto_id ON impressoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_impressoes_filamento_id ON impressoes(filamento_id);
CREATE INDEX IF NOT EXISTS idx_impressoes_created_at ON impressoes(created_at DESC);
