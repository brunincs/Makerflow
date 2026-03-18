-- Migration: Corrigir RLS para ml_orders e mercadolivre_tokens
-- PROBLEMA: Registros com user_id NULL estavam visiveis para todos
-- SOLUCAO: Remover condicao OR user_id IS NULL

-- ============================================
-- ML ORDERS - Remover acesso a dados sem user_id
-- ============================================

DROP POLICY IF EXISTS "Users can view own ml orders" ON ml_orders;
CREATE POLICY "Users can view own ml orders"
  ON ml_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ml orders" ON ml_orders;
CREATE POLICY "Users can update own ml orders"
  ON ml_orders FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ml orders" ON ml_orders;
CREATE POLICY "Users can delete own ml orders"
  ON ml_orders FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own ml orders" ON ml_orders;
CREATE POLICY "Users can create own ml orders"
  ON ml_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- MERCADOLIVRE TOKENS - Remover acesso a dados sem user_id
-- ============================================

DROP POLICY IF EXISTS "Users can view own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can view own ml tokens"
  ON mercadolivre_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can update own ml tokens"
  ON mercadolivre_tokens FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can delete own ml tokens"
  ON mercadolivre_tokens FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own ml tokens" ON mercadolivre_tokens;
CREATE POLICY "Users can create own ml tokens"
  ON mercadolivre_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PEDIDOS - Remover acesso a dados sem user_id
-- ============================================

DROP POLICY IF EXISTS "Users can view own orders" ON pedidos;
CREATE POLICY "Users can view own orders"
  ON pedidos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON pedidos;
CREATE POLICY "Users can update own orders"
  ON pedidos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own orders" ON pedidos;
CREATE POLICY "Users can delete own orders"
  ON pedidos FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON pedidos;
CREATE POLICY "Users can create own orders"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Apos executar esta migration:
-- 1. Registros com user_id NULL nao serao mais visiveis
-- 2. Se houver dados antigos sem user_id, eles precisam ser
--    atribuidos manualmente ao usuario correto:
--
--    UPDATE ml_orders SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
--    UPDATE mercadolivre_tokens SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
--    UPDATE pedidos SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
--
-- 3. Para descobrir o UUID do usuario, consulte a tabela profiles:
--    SELECT id, email FROM profiles;
