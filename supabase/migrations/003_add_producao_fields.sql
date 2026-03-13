-- Adicionar campos de producao na tabela produtos_concorrentes
alter table public.produtos_concorrentes
add column if not exists peso_filamento numeric,
add column if not exists tempo_impressao numeric;

-- Comentarios para documentacao
comment on column public.produtos_concorrentes.peso_filamento is 'Peso do filamento em gramas';
comment on column public.produtos_concorrentes.tempo_impressao is 'Tempo de impressao em horas decimais (ex: 2.5 = 2h30min)';
