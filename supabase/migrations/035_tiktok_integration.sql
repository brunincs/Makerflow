-- Migration: Integracao TikTok Shop
-- Seguindo o mesmo padrao do Mercado Livre

-- 1. Tabela para tokens do TikTok Shop
CREATE TABLE IF NOT EXISTS tiktok_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  shop_id TEXT,
  shop_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca por user_id
CREATE INDEX IF NOT EXISTS idx_tiktok_tokens_user_id ON tiktok_tokens(user_id);

-- 2. Tabela para pedidos do TikTok Shop
CREATE TABLE IF NOT EXISTS tiktok_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  tiktok_order_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  variation TEXT,
  seller_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  status TEXT,
  buyer_name TEXT,
  date_created TIMESTAMP WITH TIME ZONE,
  imported BOOLEAN DEFAULT FALSE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tiktok_order_id)
);

-- Indexes para tiktok_orders
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_user_id ON tiktok_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_imported ON tiktok_orders(imported);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_pedido_id ON tiktok_orders(pedido_id);

-- 3. RLS Policies
ALTER TABLE tiktok_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_orders ENABLE ROW LEVEL SECURITY;

-- Policies para tiktok_tokens
DROP POLICY IF EXISTS "Users can view own tiktok tokens" ON tiktok_tokens;
CREATE POLICY "Users can view own tiktok tokens" ON tiktok_tokens
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own tiktok tokens" ON tiktok_tokens;
CREATE POLICY "Users can insert own tiktok tokens" ON tiktok_tokens
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own tiktok tokens" ON tiktok_tokens;
CREATE POLICY "Users can update own tiktok tokens" ON tiktok_tokens
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own tiktok tokens" ON tiktok_tokens;
CREATE POLICY "Users can delete own tiktok tokens" ON tiktok_tokens
  FOR DELETE USING (auth.uid()::text = user_id);

-- Policies para tiktok_orders
DROP POLICY IF EXISTS "Users can view own tiktok orders" ON tiktok_orders;
CREATE POLICY "Users can view own tiktok orders" ON tiktok_orders
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own tiktok orders" ON tiktok_orders;
CREATE POLICY "Users can insert own tiktok orders" ON tiktok_orders
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own tiktok orders" ON tiktok_orders;
CREATE POLICY "Users can update own tiktok orders" ON tiktok_orders
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access tiktok_tokens" ON tiktok_tokens;
CREATE POLICY "Service role full access tiktok_tokens" ON tiktok_tokens
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access tiktok_orders" ON tiktok_orders;
CREATE POLICY "Service role full access tiktok_orders" ON tiktok_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Comentarios
COMMENT ON TABLE tiktok_tokens IS 'Tokens de autenticacao OAuth do TikTok Shop por usuario';
COMMENT ON TABLE tiktok_orders IS 'Pedidos importados do TikTok Shop';
