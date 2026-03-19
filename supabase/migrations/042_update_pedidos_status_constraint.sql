-- Atualizar CHECK constraint da tabela pedidos para incluir status cancelado e devolvido
-- Isso permite manter pedidos no sistema em vez de deletá-los

-- Remover constraint antiga
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Adicionar nova constraint com todos os status
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('pendente', 'em_producao', 'concluido', 'cancelado', 'devolvido'));

-- Criar índice para consultas de pedidos ativos (não cancelados/devolvidos)
CREATE INDEX IF NOT EXISTS idx_pedidos_status_ativo
  ON pedidos(status)
  WHERE status NOT IN ('cancelado', 'devolvido');
