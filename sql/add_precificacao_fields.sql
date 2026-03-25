-- Adicionar novas colunas na tabela precificacoes para consistencia de dados

-- Variacao ID (para restaurar corretamente a variacao ao editar)
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS variacao_id UUID REFERENCES variacoes_produto(id) ON DELETE SET NULL;

-- Preco de anuncio (para promocoes)
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS preco_anuncio DECIMAL(10,2);

-- Impressora ID (para restaurar a impressora selecionada)
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS impressora_id UUID;

-- Frete manual
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS frete_manual BOOLEAN DEFAULT false;
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS frete_valor DECIMAL(10,2);

-- Embalagens config (formato estruturado com quantidades)
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS embalagens_config JSONB DEFAULT '[]'::jsonb;

-- Promocao
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS promocao_ativa BOOLEAN DEFAULT false;
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS desconto_percentual DECIMAL(5,2);
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS arredondamento VARCHAR(2);

-- Cupom e campanhas
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS cupom_desconto BOOLEAN DEFAULT false;
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS valor_cupom DECIMAL(10,2);
ALTER TABLE precificacoes ADD COLUMN IF NOT EXISTS campanha_destaque BOOLEAN DEFAULT false;

-- Criar indice para variacao_id
CREATE INDEX IF NOT EXISTS idx_precificacoes_variacao_id ON precificacoes(variacao_id);

-- Comentarios para documentacao
COMMENT ON COLUMN precificacoes.variacao_id IS 'ID da variacao do produto (para restaurar ao editar)';
COMMENT ON COLUMN precificacoes.preco_anuncio IS 'Preco de anuncio quando promocao ativa';
COMMENT ON COLUMN precificacoes.impressora_id IS 'ID da impressora selecionada';
COMMENT ON COLUMN precificacoes.embalagens_config IS 'Configuracao de embalagens com quantidades [{embalagem_id, quantidade}]';
COMMENT ON COLUMN precificacoes.promocao_ativa IS 'Se a promocao esta ativa';
COMMENT ON COLUMN precificacoes.desconto_percentual IS 'Percentual de desconto da promocao';
COMMENT ON COLUMN precificacoes.arredondamento IS 'Tipo de arredondamento (90 ou 99)';
COMMENT ON COLUMN precificacoes.cupom_desconto IS 'Se tem cupom de desconto ativo';
COMMENT ON COLUMN precificacoes.valor_cupom IS 'Valor do cupom de desconto';
COMMENT ON COLUMN precificacoes.campanha_destaque IS 'Se participa da campanha de destaque Shopee';
