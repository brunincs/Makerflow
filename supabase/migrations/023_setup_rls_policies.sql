-- Migration: Configurar RLS policies em todas as tabelas
-- Executar no Supabase SQL Editor

-- ============================================
-- PRODUTOS CONCORRENTES
-- ============================================

-- Habilitar RLS
ALTER TABLE produtos_concorrentes ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Allow all" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can view own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can create own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can update own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can delete own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Admins can view all products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Admins can manage all products" ON produtos_concorrentes;

-- Novas policies
CREATE POLICY "Users can view own products"
  ON produtos_concorrentes FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own products"
  ON produtos_concorrentes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own products"
  ON produtos_concorrentes FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own products"
  ON produtos_concorrentes FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all products"
  ON produtos_concorrentes FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage all products"
  ON produtos_concorrentes FOR ALL
  USING (is_admin());

-- ============================================
-- VARIACOES PRODUTO
-- ============================================

ALTER TABLE variacoes_produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can view own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can create own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can update own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can delete own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Admins can manage all variations" ON variacoes_produto;

CREATE POLICY "Users can view own variations"
  ON variacoes_produto FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own variations"
  ON variacoes_produto FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own variations"
  ON variacoes_produto FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own variations"
  ON variacoes_produto FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all variations"
  ON variacoes_produto FOR ALL
  USING (is_admin());

-- ============================================
-- FILAMENTOS
-- ============================================

ALTER TABLE filamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON filamentos;
DROP POLICY IF EXISTS "Users can view own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can create own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can update own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can delete own filaments" ON filamentos;
DROP POLICY IF EXISTS "Admins can manage all filaments" ON filamentos;

CREATE POLICY "Users can view own filaments"
  ON filamentos FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own filaments"
  ON filamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own filaments"
  ON filamentos FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own filaments"
  ON filamentos FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all filaments"
  ON filamentos FOR ALL
  USING (is_admin());

-- ============================================
-- EMBALAGENS
-- ============================================

ALTER TABLE embalagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON embalagens;
DROP POLICY IF EXISTS "Users can view own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can create own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can update own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can delete own packages" ON embalagens;
DROP POLICY IF EXISTS "Admins can manage all packages" ON embalagens;

CREATE POLICY "Users can view own packages"
  ON embalagens FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own packages"
  ON embalagens FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own packages"
  ON embalagens FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own packages"
  ON embalagens FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all packages"
  ON embalagens FOR ALL
  USING (is_admin());

-- ============================================
-- IMPRESSOES
-- ============================================

ALTER TABLE impressoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON impressoes;
DROP POLICY IF EXISTS "Users can view own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can create own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can update own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can delete own prints" ON impressoes;
DROP POLICY IF EXISTS "Admins can manage all prints" ON impressoes;

CREATE POLICY "Users can view own prints"
  ON impressoes FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own prints"
  ON impressoes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own prints"
  ON impressoes FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own prints"
  ON impressoes FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all prints"
  ON impressoes FOR ALL
  USING (is_admin());

-- ============================================
-- PEDIDOS
-- ============================================

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON pedidos;
DROP POLICY IF EXISTS "Users can view own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can create own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can update own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can delete own orders" ON pedidos;
DROP POLICY IF EXISTS "Admins can manage all orders" ON pedidos;

CREATE POLICY "Users can view own orders"
  ON pedidos FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own orders"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own orders"
  ON pedidos FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own orders"
  ON pedidos FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all orders"
  ON pedidos FOR ALL
  USING (is_admin());

-- ============================================
-- ESTOQUE PRODUTOS
-- ============================================

ALTER TABLE estoque_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can view own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can create own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can update own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can delete own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Admins can manage all stock" ON estoque_produtos;

CREATE POLICY "Users can view own stock"
  ON estoque_produtos FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own stock"
  ON estoque_produtos FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own stock"
  ON estoque_produtos FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own stock"
  ON estoque_produtos FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all stock"
  ON estoque_produtos FOR ALL
  USING (is_admin());

-- ============================================
-- PRECIFICACOES
-- ============================================

ALTER TABLE precificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON precificacoes;
DROP POLICY IF EXISTS "Users can view own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can create own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can update own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can delete own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Admins can manage all pricing" ON precificacoes;

CREATE POLICY "Users can view own pricing"
  ON precificacoes FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own pricing"
  ON precificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own pricing"
  ON precificacoes FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own pricing"
  ON precificacoes FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all pricing"
  ON precificacoes FOR ALL
  USING (is_admin());

-- ============================================
-- ML ORDERS
-- ============================================

ALTER TABLE ml_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON ml_orders;
DROP POLICY IF EXISTS "Users can view own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can create own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can update own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can delete own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Admins can manage all ml orders" ON ml_orders;

CREATE POLICY "Users can view own ml orders"
  ON ml_orders FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own ml orders"
  ON ml_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own ml orders"
  ON ml_orders FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own ml orders"
  ON ml_orders FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all ml orders"
  ON ml_orders FOR ALL
  USING (is_admin());

-- ============================================
-- MERCADOLIVRE TOKENS
-- ============================================

ALTER TABLE mercadolivre_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can view own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can create own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can update own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can delete own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Admins can manage all ml tokens" ON mercadolivre_tokens;

CREATE POLICY "Users can view own ml tokens"
  ON mercadolivre_tokens FOR SELECT
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own ml tokens"
  ON mercadolivre_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own ml tokens"
  ON mercadolivre_tokens FOR UPDATE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own ml tokens"
  ON mercadolivre_tokens FOR DELETE
  USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can manage all ml tokens"
  ON mercadolivre_tokens FOR ALL
  USING (is_admin());

-- ============================================
-- FILAMENTO MOVIMENTACOES (se existir)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    ALTER TABLE filamento_movimentacoes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all" ON filamento_movimentacoes;
    DROP POLICY IF EXISTS "Users can view own movements" ON filamento_movimentacoes;
    DROP POLICY IF EXISTS "Users can create own movements" ON filamento_movimentacoes;
    DROP POLICY IF EXISTS "Admins can manage all movements" ON filamento_movimentacoes;

    CREATE POLICY "Users can view own movements"
      ON filamento_movimentacoes FOR SELECT
      USING (auth.uid() = user_id AND is_active_user());

    CREATE POLICY "Users can create own movements"
      ON filamento_movimentacoes FOR INSERT
      WITH CHECK (auth.uid() = user_id AND is_active_user());

    CREATE POLICY "Admins can manage all movements"
      ON filamento_movimentacoes FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- ============================================
-- FILAMENTO ENTRADAS (se existir)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    ALTER TABLE filamento_entradas ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all" ON filamento_entradas;
    DROP POLICY IF EXISTS "Users can view own entries" ON filamento_entradas;
    DROP POLICY IF EXISTS "Users can create own entries" ON filamento_entradas;
    DROP POLICY IF EXISTS "Admins can manage all entries" ON filamento_entradas;

    CREATE POLICY "Users can view own entries"
      ON filamento_entradas FOR SELECT
      USING (auth.uid() = user_id AND is_active_user());

    CREATE POLICY "Users can create own entries"
      ON filamento_entradas FOR INSERT
      WITH CHECK (auth.uid() = user_id AND is_active_user());

    CREATE POLICY "Admins can manage all entries"
      ON filamento_entradas FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Apos executar esta migration, as Edge Functions precisarao
-- usar o service_role_key para bypassar RLS ou extrair o user_id
-- do JWT e incluir nas queries.
