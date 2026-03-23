-- Migration: Adicionar acesso service_role para operacoes internas
-- Isso permite que o sistema funcione quando necessario
-- Mantendo a seguranca para usuarios normais

-- ============================================
-- OPCAO 1: ADICIONAR SERVICE ROLE ACCESS
-- (Permite que Edge Functions e backend acessem)
-- ============================================

-- Produtos
DROP POLICY IF EXISTS "Service role full access produtos" ON produtos_concorrentes;
CREATE POLICY "Service role full access produtos"
  ON produtos_concorrentes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Variacoes
DROP POLICY IF EXISTS "Service role full access variacoes" ON variacoes_produto;
CREATE POLICY "Service role full access variacoes"
  ON variacoes_produto FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Filamentos
DROP POLICY IF EXISTS "Service role full access filamentos" ON filamentos;
CREATE POLICY "Service role full access filamentos"
  ON filamentos FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Embalagens
DROP POLICY IF EXISTS "Service role full access embalagens" ON embalagens;
CREATE POLICY "Service role full access embalagens"
  ON embalagens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Impressoes
DROP POLICY IF EXISTS "Service role full access impressoes" ON impressoes;
CREATE POLICY "Service role full access impressoes"
  ON impressoes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Impressoras
DROP POLICY IF EXISTS "Service role full access impressoras" ON impressoras;
CREATE POLICY "Service role full access impressoras"
  ON impressoras FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Pedidos
DROP POLICY IF EXISTS "Service role full access pedidos" ON pedidos;
CREATE POLICY "Service role full access pedidos"
  ON pedidos FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Estoque Produtos
DROP POLICY IF EXISTS "Service role full access estoque_produtos" ON estoque_produtos;
CREATE POLICY "Service role full access estoque_produtos"
  ON estoque_produtos FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Precificacoes
DROP POLICY IF EXISTS "Service role full access precificacoes" ON precificacoes;
CREATE POLICY "Service role full access precificacoes"
  ON precificacoes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ML Orders
DROP POLICY IF EXISTS "Service role full access ml_orders" ON ml_orders;
CREATE POLICY "Service role full access ml_orders"
  ON ml_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Mercadolivre Tokens
DROP POLICY IF EXISTS "Service role full access mercadolivre_tokens" ON mercadolivre_tokens;
CREATE POLICY "Service role full access mercadolivre_tokens"
  ON mercadolivre_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Integrations
DROP POLICY IF EXISTS "Service role full access integrations" ON integrations;
CREATE POLICY "Service role full access integrations"
  ON integrations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Tabelas opcionais
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_movimentacoes') THEN
    DROP POLICY IF EXISTS "Service role full access estoque_movimentacoes" ON estoque_movimentacoes;
    CREATE POLICY "Service role full access estoque_movimentacoes"
      ON estoque_movimentacoes FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas_manuais') THEN
    DROP POLICY IF EXISTS "Service role full access vendas_manuais" ON vendas_manuais;
    CREATE POLICY "Service role full access vendas_manuais"
      ON vendas_manuais FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acessorios') THEN
    DROP POLICY IF EXISTS "Service role full access acessorios" ON acessorios;
    CREATE POLICY "Service role full access acessorios"
      ON acessorios FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acessorios_movimentacoes') THEN
    DROP POLICY IF EXISTS "Service role full access acessorios_movimentacoes" ON acessorios_movimentacoes;
    CREATE POLICY "Service role full access acessorios_movimentacoes"
      ON acessorios_movimentacoes FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embalagens_movimentacoes') THEN
    DROP POLICY IF EXISTS "Service role full access embalagens_movimentacoes" ON embalagens_movimentacoes;
    CREATE POLICY "Service role full access embalagens_movimentacoes"
      ON embalagens_movimentacoes FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Estas policies permitem que:
-- 1. Usuarios autenticados acessem SEUS dados (via auth.uid() = user_id)
-- 2. Service role (backend/edge functions) acesse TODOS os dados
--
-- O frontend usa a chave ANON_KEY, que tem role = 'anon' ou 'authenticated'
-- Para o frontend funcionar, o usuario PRECISA estar logado
--
-- Se precisar que o sistema funcione SEM login (desenvolvimento),
-- execute a query abaixo para cada tabela:
--
-- CREATE POLICY "Allow anon insert" ON nome_tabela
--   FOR INSERT WITH CHECK (true);
