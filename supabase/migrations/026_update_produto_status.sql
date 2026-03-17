-- Migration: Atualizar status de produtos
-- Novos valores: teste, validado, rejeitado

-- 1. Remover constraint antiga se existir
ALTER TABLE produtos_concorrentes
DROP CONSTRAINT IF EXISTS produtos_concorrentes_status_check;

-- 2. Converter valores antigos para novos
UPDATE produtos_concorrentes SET status = 'teste' WHERE status IN ('ideia', 'testando');

-- 3. Adicionar nova constraint
ALTER TABLE produtos_concorrentes
ADD CONSTRAINT produtos_concorrentes_status_check
CHECK (status IN ('teste', 'validado', 'rejeitado'));

-- 4. Definir default
ALTER TABLE produtos_concorrentes
ALTER COLUMN status SET DEFAULT 'teste';
