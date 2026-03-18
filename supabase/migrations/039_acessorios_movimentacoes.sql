-- Migration: Create acessorios_movimentacoes table
-- Histórico de movimentações de estoque de acessórios

CREATE TABLE acessorios_movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  acessorio_id UUID REFERENCES acessorios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- 'entrada', 'saida', 'ajuste'
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  referencia_id UUID, -- pedido_id ou impressao_id
  referencia_tipo VARCHAR(50), -- 'pedido', 'impressao', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_acessorios_mov_user_id ON acessorios_movimentacoes(user_id);
CREATE INDEX idx_acessorios_mov_acessorio_id ON acessorios_movimentacoes(acessorio_id);
CREATE INDEX idx_acessorios_mov_created_at ON acessorios_movimentacoes(created_at DESC);

-- RLS
ALTER TABLE acessorios_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own movimentacoes" ON acessorios_movimentacoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own movimentacoes" ON acessorios_movimentacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own movimentacoes" ON acessorios_movimentacoes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own movimentacoes" ON acessorios_movimentacoes
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION atualizar_estoque_acessorio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE acessorios SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.acessorio_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE acessorios SET estoque_atual = estoque_atual - ABS(NEW.quantidade) WHERE id = NEW.acessorio_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    -- Para ajuste, a quantidade pode ser positiva ou negativa
    UPDATE acessorios SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.acessorio_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_atualizar_estoque_acessorio
AFTER INSERT ON acessorios_movimentacoes
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_acessorio();
