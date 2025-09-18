-- Adicionar coluna song_limit na tabela subscription_plans
-- Execute este SQL no seu Supabase para adicionar a coluna de limite de músicas

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS song_limit INTEGER DEFAULT 10;

-- Atualizar os planos existentes com limites apropriados
-- Ajuste os valores conforme seus planos

UPDATE subscription_plans 
SET song_limit = CASE 
  WHEN LOWER(name) LIKE '%basic%' OR LOWER(name) LIKE '%básico%' THEN 10
  WHEN LOWER(name) LIKE '%intermediario%' OR LOWER(name) LIKE '%intermediário%' THEN 25
  WHEN LOWER(name) LIKE '%master%' OR LOWER(name) LIKE '%premium%' THEN 50
  ELSE 10
END
WHERE song_limit IS NULL OR song_limit = 10;

-- Adicionar também uma coluna code para facilitar a identificação
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Atualizar códigos baseados nos nomes
UPDATE subscription_plans 
SET code = CASE 
  WHEN LOWER(name) LIKE '%basic%' OR LOWER(name) LIKE '%básico%' THEN 'BASIC'
  WHEN LOWER(name) LIKE '%intermediario%' OR LOWER(name) LIKE '%intermediário%' THEN 'INTERMEDIARIO'
  WHEN LOWER(name) LIKE '%master%' OR LOWER(name) LIKE '%premium%' THEN 'MASTER'
  ELSE UPPER(REPLACE(name, ' ', '_'))
END
WHERE code IS NULL OR code = '';

-- Verificar os resultados
SELECT id, name, code, song_limit FROM subscription_plans ORDER BY song_limit;
