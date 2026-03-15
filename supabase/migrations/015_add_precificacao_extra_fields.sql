-- Adicionar campos extras na tabela precificacoes
-- para restaurar simulacao completa

ALTER TABLE precificacoes
ADD COLUMN IF NOT EXISTS filamento_id UUID REFERENCES filamentos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS impressora_modelo VARCHAR(50),
ADD COLUMN IF NOT EXISTS embalagens_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS multiplas_pecas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quantidade_pecas INTEGER DEFAULT 1;

-- Index para busca por filamento
CREATE INDEX IF NOT EXISTS idx_precificacoes_filamento_id ON precificacoes(filamento_id);
