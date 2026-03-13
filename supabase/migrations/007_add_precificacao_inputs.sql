-- Adicionar campos de entrada na tabela precificacoes
-- para poder restaurar a simulacao completa

ALTER TABLE precificacoes
ADD COLUMN IF NOT EXISTS peso_filamento_g DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_filamento_kg DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS consumo_kwh DECIMAL(6,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_kwh DECIMAL(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS imposto_aliquota DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outros_custos DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS frete_gratis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_anuncio VARCHAR(20),
ADD COLUMN IF NOT EXISTS categoria_id VARCHAR(50);
