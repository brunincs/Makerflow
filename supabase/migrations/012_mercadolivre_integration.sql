-- Migration: Integracao Mercado Livre
-- Criado em: 2024

-- Tokens de autenticacao do Mercado Livre
create table if not exists mercadolivre_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  refresh_token text,
  ml_user_id text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Pedidos importados do Mercado Livre
create table if not exists ml_orders (
  id uuid primary key default gen_random_uuid(),
  ml_order_id text unique not null,
  product_title text,
  variation text,
  quantity integer default 1,
  unit_price numeric(10,2),
  status text,
  buyer_nickname text,
  date_created timestamp with time zone,
  imported boolean default false,
  pedido_id uuid references pedidos(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Indices para performance
create index if not exists idx_ml_orders_ml_order_id on ml_orders(ml_order_id);
create index if not exists idx_ml_orders_imported on ml_orders(imported);
create index if not exists idx_ml_orders_status on ml_orders(status);

-- Habilitar RLS (Row Level Security)
alter table mercadolivre_tokens enable row level security;
alter table ml_orders enable row level security;

-- Politicas de acesso (permitir acesso anonimo para este projeto simples)
create policy "Allow all access to mercadolivre_tokens" on mercadolivre_tokens
  for all using (true) with check (true);

create policy "Allow all access to ml_orders" on ml_orders
  for all using (true) with check (true);
