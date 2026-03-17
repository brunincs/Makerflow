-- Migration: Adicionar campo valor_kwh no perfil do usuario
-- Custo da energia eletrica em R$/kWh

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS valor_kwh DECIMAL(5,2) DEFAULT 0.85;

COMMENT ON COLUMN profiles.valor_kwh IS 'Custo da energia eletrica em R$/kWh';
