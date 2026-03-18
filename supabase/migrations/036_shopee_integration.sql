-- Migration: Integracao Shopee
-- Tabelas para armazenar tokens e pedidos da Shopee

-- Tabela de tokens Shopee
CREATE TABLE IF NOT EXISTS shopee_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  shop_id TEXT,
  shop_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabela de pedidos Shopee
CREATE TABLE IF NOT EXISTS shopee_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopee_order_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  variation TEXT,
  seller_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  status TEXT,
  buyer_name TEXT,
  date_created TIMESTAMPTZ,
  imported BOOLEAN DEFAULT FALSE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shopee_order_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_shopee_tokens_user ON shopee_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_shopee_orders_user ON shopee_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopee_orders_imported ON shopee_orders(user_id, imported);

-- RLS
ALTER TABLE shopee_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_orders ENABLE ROW LEVEL SECURITY;

-- Policies para shopee_tokens
CREATE POLICY "Users can view own shopee tokens"
  ON shopee_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopee tokens"
  ON shopee_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopee tokens"
  ON shopee_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopee tokens"
  ON shopee_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para shopee_orders
CREATE POLICY "Users can view own shopee orders"
  ON shopee_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopee orders"
  ON shopee_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopee orders"
  ON shopee_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopee orders"
  ON shopee_orders FOR DELETE
  USING (auth.uid() = user_id);
