-- Migration: Isolamento completo multi-tenant por user_id
-- Cada usuario so ve seus proprios dados
-- Nenhum admin pode ver dados de outros usuarios

-- ============================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

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
ALTER TABLE impressoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Tabelas mais recentes (ja devem estar habilitadas mas garantir)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiktok_tokens') THEN
    ALTER TABLE tiktok_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiktok_orders') THEN
    ALTER TABLE tiktok_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopee_tokens') THEN
    ALTER TABLE shopee_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopee_orders') THEN
    ALTER TABLE shopee_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acessorios') THEN
    ALTER TABLE acessorios ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acessorios_movimentacoes') THEN
    ALTER TABLE acessorios_movimentacoes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embalagens_movimentacoes') THEN
    ALTER TABLE embalagens_movimentacoes ENABLE ROW LEVEL SECURITY;
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
-- 2. REMOVER POLICIES DE ADMIN (dados de usuarios)
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all printers" ON impressoras;
DROP POLICY IF EXISTS "Admins can view all integrations" ON integrations;

-- ============================================
-- 3. PRODUTOS_CONCORRENTES - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can create own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can update own products" ON produtos_concorrentes;
DROP POLICY IF EXISTS "Users can delete own products" ON produtos_concorrentes;

CREATE POLICY "Users can view own products"
  ON produtos_concorrentes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products"
  ON produtos_concorrentes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON produtos_concorrentes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON produtos_concorrentes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. VARIACOES_PRODUTO - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can create own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can update own variations" ON variacoes_produto;
DROP POLICY IF EXISTS "Users can delete own variations" ON variacoes_produto;

CREATE POLICY "Users can view own variations"
  ON variacoes_produto FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own variations"
  ON variacoes_produto FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variations"
  ON variacoes_produto FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variations"
  ON variacoes_produto FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. FILAMENTOS - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can create own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can update own filaments" ON filamentos;
DROP POLICY IF EXISTS "Users can delete own filaments" ON filamentos;

CREATE POLICY "Users can view own filaments"
  ON filamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own filaments"
  ON filamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filaments"
  ON filamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own filaments"
  ON filamentos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. EMBALAGENS - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can create own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can update own packages" ON embalagens;
DROP POLICY IF EXISTS "Users can delete own packages" ON embalagens;

CREATE POLICY "Users can view own packages"
  ON embalagens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own packages"
  ON embalagens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages"
  ON embalagens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packages"
  ON embalagens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. IMPRESSOES - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can create own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can update own prints" ON impressoes;
DROP POLICY IF EXISTS "Users can delete own prints" ON impressoes;

CREATE POLICY "Users can view own prints"
  ON impressoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prints"
  ON impressoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prints"
  ON impressoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prints"
  ON impressoes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. ESTOQUE_PRODUTOS - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can create own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can update own stock" ON estoque_produtos;
DROP POLICY IF EXISTS "Users can delete own stock" ON estoque_produtos;

CREATE POLICY "Users can view own stock"
  ON estoque_produtos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stock"
  ON estoque_produtos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock"
  ON estoque_produtos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock"
  ON estoque_produtos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. PRECIFICACOES - Isolamento estrito
-- ============================================

DROP POLICY IF EXISTS "Users can view own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can create own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can update own pricing" ON precificacoes;
DROP POLICY IF EXISTS "Users can delete own pricing" ON precificacoes;

CREATE POLICY "Users can view own pricing"
  ON precificacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pricing"
  ON precificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing"
  ON precificacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing"
  ON precificacoes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 10. IMPRESSORAS - Remover is_active_user() e atualizar
-- ============================================

DROP POLICY IF EXISTS "Users can view own printers" ON impressoras;
DROP POLICY IF EXISTS "Users can create own printers" ON impressoras;
DROP POLICY IF EXISTS "Users can update own printers" ON impressoras;
DROP POLICY IF EXISTS "Users can delete own printers" ON impressoras;

CREATE POLICY "Users can view own printers"
  ON impressoras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own printers"
  ON impressoras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own printers"
  ON impressoras FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own printers"
  ON impressoras FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 11. PEDIDOS - Garantir isolamento
-- ============================================

DROP POLICY IF EXISTS "Users can view own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can create own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can update own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can delete own orders" ON pedidos;

CREATE POLICY "Users can view own orders"
  ON pedidos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON pedidos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON pedidos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 12. ESTOQUE_MOVIMENTACOES - Garantir isolamento
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_movimentacoes') THEN
    DROP POLICY IF EXISTS "Users can view own stock movements" ON estoque_movimentacoes;
    DROP POLICY IF EXISTS "Users can create own stock movements" ON estoque_movimentacoes;
    DROP POLICY IF EXISTS "Users can update own stock movements" ON estoque_movimentacoes;
    DROP POLICY IF EXISTS "Users can delete own stock movements" ON estoque_movimentacoes;

    CREATE POLICY "Users can view own stock movements"
      ON estoque_movimentacoes FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own stock movements"
      ON estoque_movimentacoes FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own stock movements"
      ON estoque_movimentacoes FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own stock movements"
      ON estoque_movimentacoes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 13. VENDAS_MANUAIS - Garantir isolamento
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas_manuais') THEN
    DROP POLICY IF EXISTS "Users can view own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can create own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can update own sales" ON vendas_manuais;
    DROP POLICY IF EXISTS "Users can delete own sales" ON vendas_manuais;

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
  END IF;
END $$;

-- ============================================
-- 14. ML_ORDERS - Garantir isolamento (ja deve estar ok)
-- ============================================

DROP POLICY IF EXISTS "Users can view own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can create own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can update own ml orders" ON ml_orders;
DROP POLICY IF EXISTS "Users can delete own ml orders" ON ml_orders;

CREATE POLICY "Users can view own ml orders"
  ON ml_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ml orders"
  ON ml_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ml orders"
  ON ml_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ml orders"
  ON ml_orders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 15. MERCADOLIVRE_TOKENS - Garantir isolamento
-- ============================================

DROP POLICY IF EXISTS "Users can view own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can create own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can update own ml tokens" ON mercadolivre_tokens;
DROP POLICY IF EXISTS "Users can delete own ml tokens" ON mercadolivre_tokens;

CREATE POLICY "Users can view own ml tokens"
  ON mercadolivre_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ml tokens"
  ON mercadolivre_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ml tokens"
  ON mercadolivre_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ml tokens"
  ON mercadolivre_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RESUMO DO ISOLAMENTO
-- ============================================
-- Apos executar esta migracao:
--
-- TABELAS ISOLADAS POR user_id:
-- - produtos_concorrentes
-- - variacoes_produto
-- - filamentos
-- - embalagens
-- - impressoes
-- - impressoras
-- - pedidos
-- - estoque_produtos
-- - estoque_movimentacoes
-- - precificacoes
-- - vendas_manuais
-- - ml_orders
-- - mercadolivre_tokens
-- - tiktok_tokens
-- - tiktok_orders
-- - shopee_tokens
-- - shopee_orders
-- - acessorios
-- - acessorios_movimentacoes
-- - embalagens_movimentacoes
-- - integrations
--
-- CADA USUARIO:
-- - Ve apenas seus proprios dados
-- - Nao ve dados com user_id NULL (dados antigos)
-- - Nao ve dados de outros usuarios
--
-- ADMIN:
-- - Pode ver/editar profiles (para gerenciar usuarios)
-- - NAO pode ver dados de negocio de outros usuarios
--
-- DADOS ANTIGOS (user_id NULL):
-- Para migrar dados antigos para um usuario especifico:
-- UPDATE nome_tabela SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
