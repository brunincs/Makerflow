-- Migration: Adicionar impressora_id na tabela impressoes
-- Para vincular cada impressao a uma impressora especifica

-- 1. Adicionar coluna impressora_id
ALTER TABLE impressoes ADD COLUMN IF NOT EXISTS impressora_id UUID REFERENCES impressoras(id) ON DELETE SET NULL;

-- 2. Criar indice
CREATE INDEX IF NOT EXISTS idx_impressoes_impressora ON impressoes(impressora_id);

-- 3. Comentario
COMMENT ON COLUMN impressoes.impressora_id IS 'Impressora utilizada para esta impressao';
