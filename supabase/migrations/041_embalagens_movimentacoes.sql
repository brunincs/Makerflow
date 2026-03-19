-- Migration: Create embalagens_movimentacoes table
-- Histórico de movimentações de estoque de embalagens

CREATE TABLE embalagens_movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  embalagem_id UUID REFERENCES embalagens(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- 'entrada', 'saida', 'ajuste'
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_embalagens_mov_user_id ON embalagens_movimentacoes(user_id);
CREATE INDEX idx_embalagens_mov_embalagem_id ON embalagens_movimentacoes(embalagem_id);
CREATE INDEX idx_embalagens_mov_created_at ON embalagens_movimentacoes(created_at DESC);

-- RLS
ALTER TABLE embalagens_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embalagens_movimentacoes" ON embalagens_movimentacoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embalagens_movimentacoes" ON embalagens_movimentacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embalagens_movimentacoes" ON embalagens_movimentacoes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own embalagens_movimentacoes" ON embalagens_movimentacoes
  FOR DELETE USING (auth.uid() = user_id);
