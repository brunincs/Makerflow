-- Criar tabela produtos_concorrentes
create table if not exists public.produtos_concorrentes (
  id uuid default gen_random_uuid() primary key,
  imagem_url text,
  nome text not null,
  link_modelo text,
  link_shopee text,
  preco_shopee decimal(10,2),
  link_mercado_livre text,
  preco_mercado_livre decimal(10,2),
  status text check (status in ('ideia', 'testando', 'validado')) default 'ideia',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS (Row Level Security)
alter table public.produtos_concorrentes enable row level security;

-- Criar policy para permitir todas as operacoes (para desenvolvimento)
create policy "Allow all operations" on public.produtos_concorrentes
  for all
  using (true)
  with check (true);

-- Criar bucket para imagens (se nao existir)
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

-- Policy para permitir upload de imagens
create policy "Allow public uploads" on storage.objects
  for insert
  with check (bucket_id = 'imagens');

-- Policy para permitir leitura publica de imagens
create policy "Allow public read" on storage.objects
  for select
  using (bucket_id = 'imagens');
