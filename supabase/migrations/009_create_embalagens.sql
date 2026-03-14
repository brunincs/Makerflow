-- Criar tabela de embalagens
CREATE TABLE IF NOT EXISTS embalagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- Envelope, Proteção, Caixa
  nome_embalagem TEXT NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS
ALTER TABLE embalagens DISABLE ROW LEVEL SECURITY;

-- Indices para ordenacao
CREATE INDEX IF NOT EXISTS idx_embalagens_tipo ON embalagens(tipo);
CREATE INDEX IF NOT EXISTS idx_embalagens_nome ON embalagens(nome_embalagem);
