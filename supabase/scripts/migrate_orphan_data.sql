-- Script: Migrar dados orfaos para um usuario especifico
-- IMPORTANTE: Substitua 'SEU-USER-ID-AQUI' pelo UUID real do usuario

-- ============================================
-- PASSO 1: Descobrir o UUID do usuario
-- ============================================
-- Execute isto primeiro para ver os usuarios disponiveis:

SELECT id, email, name FROM profiles ORDER BY created_at;

-- ============================================
-- PASSO 2: Definir o usuario destino
-- ============================================
-- Copie o UUID do usuario que deve receber os dados orfaos
-- e substitua abaixo:

DO $$
DECLARE
  target_user_id UUID := 'SEU-USER-ID-AQUI'; -- SUBSTITUA AQUI!
  total_migrated INTEGER := 0;
  count_migrated INTEGER;
BEGIN
  -- Verificar se o usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Usuario % nao encontrado! Verifique o UUID.', target_user_id;
  END IF;

  RAISE NOTICE 'Migrando dados orfaos para usuario: %', target_user_id;

  -- Produtos
  UPDATE produtos_concorrentes SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'produtos_concorrentes: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Variacoes
  UPDATE variacoes_produto SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'variacoes_produto: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Filamentos
  UPDATE filamentos SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'filamentos: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Embalagens
  UPDATE embalagens SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'embalagens: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Impressoes
  UPDATE impressoes SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'impressoes: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Impressoras
  UPDATE impressoras SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'impressoras: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Pedidos
  UPDATE pedidos SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'pedidos: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Estoque Produtos
  UPDATE estoque_produtos SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'estoque_produtos: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Precificacoes
  UPDATE precificacoes SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'precificacoes: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- ML Orders
  UPDATE ml_orders SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'ml_orders: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Mercadolivre Tokens
  UPDATE mercadolivre_tokens SET user_id = target_user_id WHERE user_id IS NULL;
  GET DIAGNOSTICS count_migrated = ROW_COUNT;
  IF count_migrated > 0 THEN
    RAISE NOTICE 'mercadolivre_tokens: % registros migrados', count_migrated;
    total_migrated := total_migrated + count_migrated;
  END IF;

  -- Tabelas opcionais (ignora erro se nao existir)
  BEGIN
    UPDATE estoque_movimentacoes SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'estoque_movimentacoes: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- Tabela nao existe, ignora
  END;

  BEGIN
    UPDATE vendas_manuais SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'vendas_manuais: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE acessorios SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'acessorios: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE acessorios_movimentacoes SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'acessorios_movimentacoes: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE embalagens_movimentacoes SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'embalagens_movimentacoes: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE tiktok_orders SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'tiktok_orders: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE shopee_orders SET user_id = target_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS count_migrated = ROW_COUNT;
    IF count_migrated > 0 THEN
      RAISE NOTICE 'shopee_orders: % registros migrados', count_migrated;
      total_migrated := total_migrated + count_migrated;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL DE REGISTROS MIGRADOS: %', total_migrated;
  RAISE NOTICE '========================================';
END $$;
