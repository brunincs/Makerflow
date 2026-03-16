-- Migration: Adicionar user_id em todas as tabelas existentes
-- Executar no Supabase SQL Editor

-- IMPORTANTE: Esta migration assume que voce ja tem dados no banco.
-- Se for uma instalacao nova, nao havera problemas.
-- Se ja tiver dados, sera necessario atribuir um user_id aos registros existentes.

-- 1. Adicionar user_id em produtos_concorrentes
ALTER TABLE produtos_concorrentes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Adicionar user_id em variacoes_produto
ALTER TABLE variacoes_produto
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Adicionar user_id em filamentos
ALTER TABLE filamentos
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Adicionar user_id em embalagens
ALTER TABLE embalagens
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Adicionar user_id em impressoes
ALTER TABLE impressoes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Adicionar user_id em pedidos
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Adicionar user_id em estoque_produtos
ALTER TABLE estoque_produtos
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Adicionar user_id em precificacoes
ALTER TABLE precificacoes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. Adicionar user_id em filamento_movimentacoes (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_movimentacoes') THEN
    ALTER TABLE filamento_movimentacoes
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. Adicionar user_id em filamento_entradas (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filamento_entradas') THEN
    ALTER TABLE filamento_entradas
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 11. Adicionar user_id em ml_orders
ALTER TABLE ml_orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 12. Adicionar user_id em mercadolivre_tokens
ALTER TABLE mercadolivre_tokens
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 13. Criar indices para user_id em todas as tabelas
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON produtos_concorrentes(user_id);
CREATE INDEX IF NOT EXISTS idx_variacoes_user_id ON variacoes_produto(user_id);
CREATE INDEX IF NOT EXISTS idx_filamentos_user_id ON filamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_embalagens_user_id ON embalagens(user_id);
CREATE INDEX IF NOT EXISTS idx_impressoes_user_id ON impressoes(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_estoque_user_id ON estoque_produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_precificacoes_user_id ON precificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_orders_user_id ON ml_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_tokens_user_id ON mercadolivre_tokens(user_id);

-- NOTA: Apos criar o primeiro usuario admin, execute este comando para
-- atribuir todos os dados existentes a ele:
--
-- UPDATE produtos_concorrentes SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE variacoes_produto SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE filamentos SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE embalagens SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE impressoes SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE pedidos SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE estoque_produtos SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE precificacoes SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE ml_orders SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
-- UPDATE mercadolivre_tokens SET user_id = '<UUID_DO_ADMIN>' WHERE user_id IS NULL;
