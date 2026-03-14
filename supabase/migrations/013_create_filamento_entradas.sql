-- Criar tabela de entradas de estoque de filamentos
CREATE TABLE IF NOT EXISTS filamento_entradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filamento_id UUID REFERENCES filamentos(id) ON DELETE CASCADE NOT NULL,
  quantidade_rolos INTEGER NOT NULL,
  preco_por_rolo NUMERIC(10,2) NOT NULL,
  peso_total_g NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para simplificar
ALTER TABLE filamento_entradas DISABLE ROW LEVEL SECURITY;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_filamento_entradas_filamento_id ON filamento_entradas(filamento_id);
CREATE INDEX IF NOT EXISTS idx_filamento_entradas_created_at ON filamento_entradas(created_at DESC);
