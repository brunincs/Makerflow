-- Adicionar campos de estoque na tabela de filamentos
ALTER TABLE filamentos
ADD COLUMN IF NOT EXISTS quantidade_rolos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estoque_gramas NUMERIC(10,2) DEFAULT 0;

-- Atualizar estoque_gramas baseado em quantidade_rolos existente
UPDATE filamentos SET estoque_gramas = quantidade_rolos * 1000 WHERE estoque_gramas = 0;
