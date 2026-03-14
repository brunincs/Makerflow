-- Criar tabela de filamentos
CREATE TABLE IF NOT EXISTS filamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca TEXT NOT NULL,
  nome_filamento TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT 'PLA',
  preco_pago NUMERIC(10,2) NOT NULL,
  preco_por_kg NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS
ALTER TABLE filamentos DISABLE ROW LEVEL SECURITY;

-- Indice para ordenacao
CREATE INDEX IF NOT EXISTS idx_filamentos_marca ON filamentos(marca);
CREATE INDEX IF NOT EXISTS idx_filamentos_material ON filamentos(material);
