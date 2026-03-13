-- Adicionar campo de arquivo STL ao produto
alter table public.produtos_concorrentes
add column if not exists arquivo_stl text;

-- Adicionar campos de producao e arquivo STL as variacoes
alter table public.variacoes_produto
add column if not exists peso_filamento numeric,
add column if not exists tempo_impressao numeric,
add column if not exists arquivo_stl text;

-- Criar bucket para modelos 3D (executar no Supabase Dashboard > Storage)
-- insert into storage.buckets (id, name, public) values ('modelos_3d', 'modelos_3d', true);
