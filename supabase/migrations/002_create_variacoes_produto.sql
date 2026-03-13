-- Criar tabela variacoes_produto
create table if not exists public.variacoes_produto (
  id uuid default gen_random_uuid() primary key,
  produto_id uuid not null references public.produtos_concorrentes(id) on delete cascade,
  nome_variacao text not null,
  preco_shopee decimal(10,2),
  preco_mercado_livre decimal(10,2),
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.variacoes_produto enable row level security;

-- Policy para permitir todas as operacoes
create policy "Allow all operations on variacoes" on public.variacoes_produto
  for all using (true) with check (true);

-- Criar indice para busca por produto_id
create index if not exists idx_variacoes_produto_id on public.variacoes_produto(produto_id);
