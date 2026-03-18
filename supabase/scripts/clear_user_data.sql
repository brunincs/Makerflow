-- Script para zerar dados do usuario: 92fce6fb-6dfb-438e-8b40-6d259eb57680
-- Executar no Supabase SQL Editor

DO $$
DECLARE
  target_user_id UUID := '92fce6fb-6dfb-438e-8b40-6d259eb57680';
BEGIN
  -- 1. Deletar movimentacoes de estoque
  DELETE FROM estoque_movimentacoes WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted estoque_movimentacoes';

  -- 2. Deletar estoque de produtos
  DELETE FROM estoque_produtos WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted estoque_produtos';

  -- 3. Deletar impressoes
  DELETE FROM impressoes WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted impressoes';

  -- 4. Deletar pedidos
  DELETE FROM pedidos WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted pedidos';

  -- 5. Deletar ml_orders
  DELETE FROM ml_orders WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted ml_orders';

  -- 6. Deletar precificacoes
  DELETE FROM precificacoes WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted precificacoes';

  -- 7. Deletar movimentacoes de filamento
  DELETE FROM filamento_movimentacoes WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted filamento_movimentacoes';

  -- 8. Deletar filamentos
  DELETE FROM filamentos WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted filamentos';

  -- 9. Deletar embalagens
  DELETE FROM embalagens WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted embalagens';

  -- 10. Deletar variacoes de produto
  DELETE FROM variacoes_produto WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted variacoes_produto';

  -- 11. Deletar produtos
  DELETE FROM produtos_concorrentes WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted produtos_concorrentes';

  -- 12. Deletar impressoras
  DELETE FROM impressoras WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted impressoras';

  -- 13. Deletar integracoes (tokens ML/Shopee)
  DELETE FROM integrations WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted integrations';

  -- 14. Deletar tokens ML antigos (se existir tabela)
  DELETE FROM mercadolivre_tokens WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted mercadolivre_tokens';

  RAISE NOTICE 'Todos os dados do usuario % foram removidos!', target_user_id;
END $$;

-- Verificar se os dados foram removidos
SELECT 'produtos_concorrentes' as tabela, COUNT(*) as registros FROM produtos_concorrentes WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680'
UNION ALL
SELECT 'filamentos', COUNT(*) FROM filamentos WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680'
UNION ALL
SELECT 'embalagens', COUNT(*) FROM embalagens WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680'
UNION ALL
SELECT 'pedidos', COUNT(*) FROM pedidos WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680'
UNION ALL
SELECT 'impressoes', COUNT(*) FROM impressoes WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680'
UNION ALL
SELECT 'estoque_produtos', COUNT(*) FROM estoque_produtos WHERE user_id = '92fce6fb-6dfb-438e-8b40-6d259eb57680';
