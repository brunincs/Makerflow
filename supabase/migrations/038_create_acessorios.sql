-- Migration: Create acessorios table
-- Sistema de acessórios (LEDs, parafusos, plantas, etc.)

CREATE TABLE acessorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  unidade VARCHAR(50) DEFAULT 'unidade', -- unidade, metro, par, etc.
  custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_acessorios_user_id ON acessorios(user_id);
CREATE INDEX idx_acessorios_ativo ON acessorios(ativo);

-- RLS
ALTER TABLE acessorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acessorios" ON acessorios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acessorios" ON acessorios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own acessorios" ON acessorios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own acessorios" ON acessorios
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_acessorios_updated_at
  BEFORE UPDATE ON acessorios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
