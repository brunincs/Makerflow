-- Migration: Reabilitar RLS e configurar isolamento multi-tenant
-- Executar no Supabase SQL Editor

-- ============================================
-- REABILITAR RLS EM TODAS AS TABELAS
-- ============================================

-- Tabelas principais
ALTER TABLE produtos_concorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variacoes_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE filamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE embalagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE impressoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE precificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mercadolivre_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tabelas opcionais
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    ALTER TABLE filamento_movimentacoes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    ALTER TABLE filamento_entradas ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_movimentacoes') THEN
    ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas_manuais') THEN
    ALTER TABLE vendas_manuais ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- POLICIES PARA ESTOQUE_MOVIMENTACOES
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_movimentacoes') THEN
    -- Remover policies antigas
    DROP POLICY IF EXISTS "Users can view own stock movements" ON estoque_movimentacoes;
    DROP POLICY IF EXISTS "Users can create own stock movements" ON estoque_movimentacoes;
    DROP POLICY IF EXISTS "Admins can manage all stock movements" ON estoque_movimentacoes;

    -- Criar policies
    CREATE POLICY "Users can view own stock movements"
      ON estoque_movimentacoes FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own stock movements"
      ON estoque_movimentacoes FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all stock movements"
      ON estoque_movimentacoes FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- ============================================
-- POLICIES PARA VENDAS_MANUAIS
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas_manuais') THEN
    -- Remover policies antigas
    DROP POLICY IF EXISTS "Users can view own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can create own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can update own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can delete own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Admins can manage all sales" ON vendas_manuais;

    -- Criar policies
    CREATE POLICY "Users can view own sales"
      ON vendas_manuais FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own sales"
      ON vendas_manuais FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own sales"
      ON vendas_manuais FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own sales"
      ON vendas_manuais FOR DELETE
      USING (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all sales"
      ON vendas_manuais FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- ============================================
-- VERIFICAR E ATUALIZAR POLICIES EXISTENTES
-- (removendo is_active_user() para simplificar)
-- ============================================

-- Atualizar policies para permitir user_id NULL nos dados antigos
-- mas exigir user_id = auth.uid() para novos dados

-- Produtos
DROP POLICY IF EXISTS "Users can view own products" ON produtos_concorrentes;
CREATE POLICY "Users can view own products"
  ON produtos_concorrentes FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own products" ON produtos_concorrentes;
CREATE POLICY "Users can update own products"
  ON produtos_concorrentes FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own products" ON produtos_concorrentes;
CREATE POLICY "Users can delete own products"
  ON produtos_concorrentes FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own products" ON produtos_concorrentes;
CREATE POLICY "Users can create own products"
  ON produtos_concorrentes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Variacoes
DROP POLICY IF EXISTS "Users can view own variations" ON variacoes_produto;
CREATE POLICY "Users can view own variations"
  ON variacoes_produto FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own variations" ON variacoes_produto;
CREATE POLICY "Users can update own variations"
  ON variacoes_produto FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own variations" ON variacoes_produto;
CREATE POLICY "Users can delete own variations"
  ON variacoes_produto FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own variations" ON variacoes_produto;
CREATE POLICY "Users can create own variations"
  ON variacoes_produto FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Filamentos
DROP POLICY IF EXISTS "Users can view own filaments" ON filamentos;
CREATE POLICY "Users can view own filaments"
  ON filamentos FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own filaments" ON filamentos;
CREATE POLICY "Users can update own filaments"
  ON filamentos FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own filaments" ON filamentos;
CREATE POLICY "Users can delete own filaments"
  ON filamentos FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own filaments" ON filamentos;
CREATE POLICY "Users can create own filaments"
  ON filamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Embalagens
DROP POLICY IF EXISTS "Users can view own packages" ON embalagens;
CREATE POLICY "Users can view own packages"
  ON embalagens FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own packages" ON embalagens;
CREATE POLICY "Users can update own packages"
  ON embalagens FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own packages" ON embalagens;
CREATE POLICY "Users can delete own packages"
  ON embalagens FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own packages" ON embalagens;
CREATE POLICY "Users can create own packages"
  ON embalagens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Impressoes
DROP POLICY IF EXISTS "Users can view own prints" ON impressoes;
CREATE POLICY "Users can view own prints"
  ON impressoes FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own prints" ON impressoes;
CREATE POLICY "Users can update own prints"
  ON impressoes FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own prints" ON impressoes;
CREATE POLICY "Users can delete own prints"
  ON impressoes FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own prints" ON impressoes;
CREATE POLICY "Users can create own prints"
  ON impressoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Pedidos
DROP POLICY IF EXISTS "Users can view own orders" ON pedidos;
CREATE POLICY "Users can view own orders"
  ON pedidos FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own orders" ON pedidos;
CREATE POLICY "Users can update own orders"
  ON pedidos FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own orders" ON pedidos;
CREATE POLICY "Users can delete own orders"
  ON pedidos FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own orders" ON pedidos;
CREATE POLICY "Users can create own orders"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Estoque Produtos
DROP POLICY IF EXISTS "Users can view own stock" ON estoque_produtos;
CREATE POLICY "Users can view own stock"
  ON estoque_produtos FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own stock" ON estoque_produtos;
CREATE POLICY "Users can update own stock"
  ON estoque_produtos FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own stock" ON estoque_produtos;
CREATE POLICY "Users can delete own stock"
  ON estoque_produtos FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own stock" ON estoque_produtos;
CREATE POLICY "Users can create own stock"
  ON estoque_produtos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Precificacoes
DROP POLICY IF EXISTS "Users can view own pricing" ON precificacoes;
CREATE POLICY "Users can view own pricing"
  ON precificacoes FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own pricing" ON precificacoes;
CREATE POLICY "Users can update own pricing"
  ON precificacoes FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own pricing" ON precificacoes;
CREATE POLICY "Users can delete own pricing"
  ON precificacoes FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own pricing" ON precificacoes;
CREATE POLICY "Users can create own pricing"
  ON precificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ML Orders
DROP POLICY IF EXISTS "Users can view own ml orders" ON ml_orders;
CREATE POLICY "Users can view own ml orders"
  ON ml_orders FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own ml orders" ON ml_orders;
CREATE POLICY "Users can update own ml orders"
  ON ml_orders FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own ml orders" ON ml_orders;
CREATE POLICY "Users can delete own ml orders"
  ON ml_orders FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own ml orders" ON ml_orders;
CREATE POLICY "Users can create own ml orders"
  ON ml_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Mercadolivre Tokens
DROP POLICY IF EXISTS "Users can view own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can view own ml tokens"
  ON mercadolivre_tokens FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can update own ml tokens"
  ON mercadolivre_tokens FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can delete own ml tokens"
  ON mercadolivre_tokens FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can create own ml tokens"
  ON mercadolivre_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NOTA
-- ============================================
-- Apos executar esta migration:
-- 1. Cada usuario vera apenas seus proprios dados
-- 2. Dados antigos (user_id NULL) serao visiveis para todos temporariamente
-- 3. Para atribuir dados antigos a um usuario, execute:
--    UPDATE tabela SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
