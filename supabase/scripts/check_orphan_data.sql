-- Script: Verificar dados sem user_id (dados orfaos)
-- Execute no Supabase SQL Editor para ver quais tabelas tem dados antigos

SELECT 'produtos_concorrentes' as tabela, COUNT(*) as registros_sem_user_id
FROM produtos_concorrentes WHERE user_id IS NULL
UNION ALL
SELECT 'variacoes_produto', COUNT(*)
FROM variacoes_produto WHERE user_id IS NULL
UNION ALL
SELECT 'filamentos', COUNT(*)
FROM filamentos WHERE user_id IS NULL
UNION ALL
SELECT 'embalagens', COUNT(*)
FROM embalagens WHERE user_id IS NULL
UNION ALL
SELECT 'impressoes', COUNT(*)
FROM impressoes WHERE user_id IS NULL
UNION ALL
SELECT 'impressoras', COUNT(*)
FROM impressoras WHERE user_id IS NULL
UNION ALL
SELECT 'pedidos', COUNT(*)
FROM pedidos WHERE user_id IS NULL
UNION ALL
SELECT 'estoque_produtos', COUNT(*)
FROM estoque_produtos WHERE user_id IS NULL
UNION ALL
SELECT 'precificacoes', COUNT(*)
FROM precificacoes WHERE user_id IS NULL
UNION ALL
SELECT 'ml_orders', COUNT(*)
FROM ml_orders WHERE user_id IS NULL
UNION ALL
SELECT 'mercadolivre_tokens', COUNT(*)
FROM mercadolivre_tokens WHERE user_id IS NULL
UNION ALL
SELECT 'integrations', COUNT(*)
FROM integrations WHERE user_id IS NULL;

-- Tabelas opcionais (podem nao existir)
-- Execute separadamente se der erro

/*
SELECT 'estoque_movimentacoes', COUNT(*)
FROM estoque_movimentacoes WHERE user_id IS NULL
UNION ALL
SELECT 'vendas_manuais', COUNT(*)
FROM vendas_manuais WHERE user_id IS NULL
UNION ALL
SELECT 'acessorios', COUNT(*)
FROM acessorios WHERE user_id IS NULL
UNION ALL
SELECT 'acessorios_movimentacoes', COUNT(*)
FROM acessorios_movimentacoes WHERE user_id IS NULL
UNION ALL
SELECT 'embalagens_movimentacoes', COUNT(*)
FROM embalagens_movimentacoes WHERE user_id IS NULL
UNION ALL
SELECT 'tiktok_orders', COUNT(*)
FROM tiktok_orders WHERE user_id IS NULL
UNION ALL
SELECT 'shopee_orders', COUNT(*)
FROM shopee_orders WHERE user_id IS NULL;
*/

-- ============================================
-- PARA MIGRAR DADOS ORFAOS PARA UM USUARIO
-- ============================================
-- Primeiro, descubra o UUID do usuario:
-- SELECT id, email FROM profiles;
--
-- Depois, atualize cada tabela:
-- UPDATE produtos_concorrentes SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
-- UPDATE variacoes_produto SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
-- ... etc
