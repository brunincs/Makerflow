-- Adicionar campo SKU na tabela de produtos
ALTER TABLE produtos_concorrentes
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Criar indice unico para SKU (permite null)
CREATE UNIQUE INDEX IF NOT EXISTS unique_product_sku
ON produtos_concorrentes(sku)
WHERE sku IS NOT NULL;

-- Adicionar campo SKU na tabela de variacoes
ALTER TABLE variacoes_produto
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Criar indice unico para SKU de variacoes (permite null)
CREATE UNIQUE INDEX IF NOT EXISTS unique_variation_sku
ON variacoes_produto(sku)
WHERE sku IS NOT NULL;

-- Adicionar campo SKU na tabela de pedidos ML para rastrear o SKU original
ALTER TABLE ml_orders
ADD COLUMN IF NOT EXISTS seller_sku TEXT;

-- Comentarios
COMMENT ON COLUMN produtos_concorrentes.sku IS 'SKU unico do produto para identificacao automatica';
COMMENT ON COLUMN variacoes_produto.sku IS 'SKU unico da variacao para identificacao automatica';
COMMENT ON COLUMN ml_orders.seller_sku IS 'SKU do vendedor extraido do Mercado Livre';
