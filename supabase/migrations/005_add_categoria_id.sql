-- Adicionar coluna categoria_id na tabela produtos_concorrentes
-- para integrar com a calculadora de precificacao do Mercado Livre

ALTER TABLE public.produtos_concorrentes
ADD COLUMN categoria_id TEXT;

-- Comentario para documentacao
COMMENT ON COLUMN public.produtos_concorrentes.categoria_id IS 'ID da categoria do Mercado Livre para calculo de taxas na calculadora de precificacao';
