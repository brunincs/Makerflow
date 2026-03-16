-- Migration: Criar tabela integrations para tokens de marketplaces por usuario
-- Executar no Supabase SQL Editor

-- 1. Criar tabela integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadolivre', 'shopee')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cada usuario pode ter apenas uma integracao por provider
  UNIQUE(user_id, provider)
);

-- 2. Habilitar RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- 3. Policies RLS

-- Usuario pode ver suas proprias integracoes
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Usuario pode criar suas proprias integracoes
CREATE POLICY "Users can create own integrations"
  ON integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuario pode atualizar suas proprias integracoes
CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuario pode deletar suas proprias integracoes
CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Admin pode ver todas as integracoes
CREATE POLICY "Admins can view all integrations"
  ON integrations FOR SELECT
  USING (is_admin());

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider);

-- 5. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
