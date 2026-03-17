-- Migration: Criar tabela vendas_manuais para vendas diretas
-- Registra vendas feitas fora dos marketplaces (site proprio, redes sociais, etc)

CREATE TABLE IF NOT EXISTS vendas_manuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE SET NULL,
  variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL DEFAULT 'pix',
  observacao TEXT,
  enviado_producao BOOLEAN DEFAULT false,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_vendas_manuais_produto ON vendas_manuais(produto_id);
CREATE INDEX IF NOT EXISTS idx_vendas_manuais_user ON vendas_manuais(user_id);
CREATE INDEX IF NOT EXISTS idx_vendas_manuais_created ON vendas_manuais(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_manuais_forma_pagamento ON vendas_manuais(forma_pagamento);

-- RLS desabilitado temporariamente
ALTER TABLE vendas_manuais DISABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE vendas_manuais IS 'Vendas diretas feitas fora dos marketplaces';
COMMENT ON COLUMN vendas_manuais.forma_pagamento IS 'dinheiro, pix, cartao_credito, cartao_debito, outro';
COMMENT ON COLUMN vendas_manuais.enviado_producao IS 'Se ja foi enviado para a fila de producao';
