-- Migration: Desabilitar RLS temporariamente
-- Enquanto o sistema de autenticacao esta desabilitado, precisamos permitir
-- acesso sem restricoes para o sistema funcionar

-- IMPORTANTE: Reativar RLS quando a autenticacao for implementada corretamente

-- Desabilitar RLS em todas as tabelas
ALTER TABLE produtos_concorrentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE variacoes_produto DISABLE ROW LEVEL SECURITY;
ALTER TABLE filamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE embalagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE impressoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE precificacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE mercadolivre_tokens DISABLE ROW LEVEL SECURITY;

-- Tabelas opcionais (podem nao existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    ALTER TABLE filamento_movimentacoes DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    ALTER TABLE filamento_entradas DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'impressoras') THEN
    ALTER TABLE impressoras DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
