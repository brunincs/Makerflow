-- Migration: Adicionar campos de empresa no perfil e criar tabela de impressoras
-- Executar no Supabase SQL Editor

-- 1. Adicionar campos de empresa na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nome_empresa TEXT,
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
ADD COLUMN IF NOT EXISTS documento TEXT, -- CNPJ ou CPF
ADD COLUMN IF NOT EXISTS tipo_documento TEXT CHECK (tipo_documento IN ('cpf', 'cnpj')),
ADD COLUMN IF NOT EXISTS regime_tributario TEXT CHECK (regime_tributario IN ('mei', 'simples', 'lucro_presumido', 'lucro_real')),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS email_comercial TEXT;

-- 2. Criar tabela de impressoras do usuario
CREATE TABLE IF NOT EXISTS impressoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modelo TEXT NOT NULL,
  apelido TEXT, -- Nome personalizado da impressora
  marca TEXT,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'manutencao', 'inativa')),
  consumo_kwh DECIMAL(5,2) DEFAULT 0.12,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS na tabela impressoras
ALTER TABLE impressoras ENABLE ROW LEVEL SECURITY;

-- 4. Policies para impressoras
CREATE POLICY "Users can view own printers"
  ON impressoras FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own printers"
  ON impressoras FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own printers"
  ON impressoras FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own printers"
  ON impressoras FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all printers"
  ON impressoras FOR ALL
  USING (is_admin());

-- 5. Indices
CREATE INDEX IF NOT EXISTS idx_impressoras_user_id ON impressoras(user_id);
CREATE INDEX IF NOT EXISTS idx_impressoras_status ON impressoras(status);

-- 6. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_impressoras_updated_at ON impressoras;
CREATE TRIGGER update_impressoras_updated_at
  BEFORE UPDATE ON impressoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
