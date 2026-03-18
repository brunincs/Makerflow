-- Migration: Add acessorios_config to precificacoes
-- Permite associar acessórios a uma precificação

ALTER TABLE precificacoes
ADD COLUMN acessorios_config JSONB DEFAULT '[]';

-- Formato esperado: [{ "acessorio_id": "uuid", "quantidade": 2 }]

COMMENT ON COLUMN precificacoes.acessorios_config IS 'Lista de acessórios com quantidades para este produto. Formato: [{ "acessorio_id": "uuid", "quantidade": number }]';
