-- Migration: Adicionar controle de estoque em embalagens
-- Adiciona campos de tamanho e quantidade para controle de estoque

-- 1. Adicionar coluna tamanho
ALTER TABLE embalagens ADD COLUMN IF NOT EXISTS tamanho VARCHAR(50);

-- 2. Adicionar coluna quantidade (estoque)
ALTER TABLE embalagens ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 0;

-- 3. Comentarios
COMMENT ON COLUMN embalagens.tamanho IS 'Tamanho da embalagem (P, M, G ou personalizado)';
COMMENT ON COLUMN embalagens.quantidade IS 'Quantidade em estoque';
