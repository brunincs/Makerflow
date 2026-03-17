-- Migration: Permitir user_id NULL temporariamente
-- Isso permite o sistema funcionar sem autenticacao enquanto ela esta desabilitada

-- Remover as foreign keys que exigem user_id valido
-- e permitir NULL nas colunas user_id

-- Nota: Quando a autenticacao for reativada, sera necessario:
-- 1. Atribuir user_id aos registros NULL
-- 2. Adicionar NOT NULL constraint novamente

-- As colunas ja permitem NULL por padrao quando criadas sem NOT NULL
-- O problema e a foreign key que nao permite valores que nao existem em auth.users

-- Solucao: Dropar e recriar as foreign keys com ON DELETE SET NULL
-- Isso permite inserts mesmo sem user_id valido

-- 1. impressoes
ALTER TABLE impressoes DROP CONSTRAINT IF EXISTS impressoes_user_id_fkey;
ALTER TABLE impressoes ADD CONSTRAINT impressoes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. pedidos
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_user_id_fkey;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. filamentos
ALTER TABLE filamentos DROP CONSTRAINT IF EXISTS filamentos_user_id_fkey;
ALTER TABLE filamentos ADD CONSTRAINT filamentos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. produtos_concorrentes
ALTER TABLE produtos_concorrentes DROP CONSTRAINT IF EXISTS produtos_concorrentes_user_id_fkey;
ALTER TABLE produtos_concorrentes ADD CONSTRAINT produtos_concorrentes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. variacoes_produto
ALTER TABLE variacoes_produto DROP CONSTRAINT IF EXISTS variacoes_produto_user_id_fkey;
ALTER TABLE variacoes_produto ADD CONSTRAINT variacoes_produto_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. embalagens
ALTER TABLE embalagens DROP CONSTRAINT IF EXISTS embalagens_user_id_fkey;
ALTER TABLE embalagens ADD CONSTRAINT embalagens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. estoque_produtos
ALTER TABLE estoque_produtos DROP CONSTRAINT IF EXISTS estoque_produtos_user_id_fkey;
ALTER TABLE estoque_produtos ADD CONSTRAINT estoque_produtos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. precificacoes
ALTER TABLE precificacoes DROP CONSTRAINT IF EXISTS precificacoes_user_id_fkey;
ALTER TABLE precificacoes ADD CONSTRAINT precificacoes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. ml_orders
ALTER TABLE ml_orders DROP CONSTRAINT IF EXISTS ml_orders_user_id_fkey;
ALTER TABLE ml_orders ADD CONSTRAINT ml_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 10. mercadolivre_tokens
ALTER TABLE mercadolivre_tokens DROP CONSTRAINT IF EXISTS mercadolivre_tokens_user_id_fkey;
ALTER TABLE mercadolivre_tokens ADD CONSTRAINT mercadolivre_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 11. filamento_movimentacoes (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    ALTER TABLE filamento_movimentacoes DROP CONSTRAINT IF EXISTS filamento_movimentacoes_user_id_fkey;
    ALTER TABLE filamento_movimentacoes ADD CONSTRAINT filamento_movimentacoes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 12. filamento_entradas (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    ALTER TABLE filamento_entradas DROP CONSTRAINT IF EXISTS filamento_entradas_user_id_fkey;
    ALTER TABLE filamento_entradas ADD CONSTRAINT filamento_entradas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
