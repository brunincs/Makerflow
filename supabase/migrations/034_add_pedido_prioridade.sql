-- Migration: Adicionar prioridade e data de entrega em pedidos
-- Campos para sistema de prioridade automatica

-- 1. Adicionar coluna prioridade
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'normal';

-- 2. Adicionar coluna data_entrega
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_entrega DATE;

-- 3. Criar index para ordenacao por prioridade
CREATE INDEX IF NOT EXISTS idx_pedidos_prioridade ON pedidos(prioridade);

-- 4. Criar index para data de entrega
CREATE INDEX IF NOT EXISTS idx_pedidos_data_entrega ON pedidos(data_entrega);

-- 5. Comentarios
COMMENT ON COLUMN pedidos.prioridade IS 'Prioridade do pedido: urgente, alta, normal';
COMMENT ON COLUMN pedidos.data_entrega IS 'Data prevista de entrega ao cliente';
