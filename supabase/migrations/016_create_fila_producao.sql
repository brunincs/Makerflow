-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE CASCADE NOT NULL,
  variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  quantidade_produzida INTEGER DEFAULT 0 CHECK (quantidade_produzida >= 0),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'concluido')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estoque de produtos acabados
CREATE TABLE IF NOT EXISTS estoque_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos_concorrentes(id) ON DELETE CASCADE NOT NULL,
  variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL,
  quantidade INTEGER DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint para evitar duplicatas
  UNIQUE(produto_id, variacao_id)
);

-- Desabilitar RLS para simplificar
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_produtos DISABLE ROW LEVEL SECURITY;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_produto_id ON pedidos(produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_produtos_produto_id ON estoque_produtos(produto_id);
