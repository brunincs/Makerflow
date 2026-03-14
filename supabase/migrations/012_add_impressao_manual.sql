-- Adicionar campo para nome da peca em impressoes manuais
ALTER TABLE impressoes
ADD COLUMN IF NOT EXISTS nome_peca_manual TEXT;

-- Permitir produto_id ser NULL (para impressoes manuais)
ALTER TABLE impressoes
ALTER COLUMN produto_id DROP NOT NULL;

-- Remover a constraint de foreign key existente e recriar permitindo NULL
ALTER TABLE impressoes
DROP CONSTRAINT IF EXISTS impressoes_produto_id_fkey;

ALTER TABLE impressoes
ADD CONSTRAINT impressoes_produto_id_fkey
FOREIGN KEY (produto_id) REFERENCES produtos_concorrentes(id)
ON DELETE SET NULL;
