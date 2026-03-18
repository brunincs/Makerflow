-- Migration: Remover acesso admin aos dados de outros usuarios
-- Admin so pode ver estatisticas agregadas e gerenciar usuarios
-- NAO pode ver produtos, pedidos, filamentos, etc. de outros

-- ============================================
-- PRODUTOS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can view all products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Admins can manage all products" ON produtos_concorrentes;

-- ============================================
-- VARIACOES - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all variations" ON variacoes_produto;

-- ============================================
-- FILAMENTOS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all filaments" ON filamentos;

-- ============================================
-- EMBALAGENS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all packages" ON embalagens;

-- ============================================
-- IMPRESSOES - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all prints" ON impressoes;

-- ============================================
-- PEDIDOS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all orders" ON pedidos;

-- ============================================
-- ESTOQUE - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all stock" ON estoque_produtos;

-- ============================================
-- PRECIFICACOES - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all pricing" ON precificacoes;

-- ============================================
-- ML ORDERS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all ml orders" ON ml_orders;

-- ============================================
-- ML TOKENS - Remover acesso admin
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all ml tokens" ON mercadolivre_tokens;

-- ============================================
-- MOVIMENTACOES - Remover acesso admin (se existir)
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    DROP POLICY IF EXISTS "Admins can manage all movements" ON filamento_movimentacoes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    DROP POLICY IF EXISTS "Admins can manage all entries" ON filamento_entradas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_movimentacoes') THEN
    DROP POLICY IF EXISTS "Admins can manage all stock movements" ON estoque_movimentacoes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas_manuais') THEN
    DROP POLICY IF EXISTS "Admins can manage all sales" ON vendas_manuais;
  END IF;
END $$;

-- ============================================
-- NOTA
-- ============================================
-- Apos esta migration:
-- 1. Admin NAO ve produtos, pedidos, filamentos de outros usuarios
-- 2. Admin CONTINUA podendo:
--    - Ver lista de usuarios (profiles)
--    - Suspender/ativar usuarios
--    - Promover/remover admins
--    - Ver estatisticas agregadas (totais)
-- 3. Cada usuario ve APENAS seus proprios dados
