-- Criar VIEW user_effective_plan para simplificar a busca do plano efetivo do usuário
-- Esta VIEW combina dados de user_subscriptions, subscription_plans e user_profiles

CREATE OR REPLACE VIEW user_effective_plan AS
WITH user_subscriptions_with_plans AS (
  -- Busca assinaturas ativas do usuário com dados do plano
  SELECT 
    us.user_id,
    us.plan_id,
    us.status,
    us.created_at,
    sp.name as plan_name,
    sp.code as plan_code,
    sp.song_limit,
    ROW_NUMBER() OVER (
      PARTITION BY us.user_id 
      ORDER BY 
        CASE WHEN us.status = 'active' THEN 1 ELSE 2 END,
        us.created_at DESC
    ) as rn
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status IN ('active', 'trialing')
),
user_profiles_with_plans AS (
  -- Busca dados do perfil do usuário (fallback)
  SELECT 
    up.user_id,
    up.plan_name,
    up.song_limit,
    CASE 
      WHEN LOWER(up.plan_name) LIKE '%basic%' OR LOWER(up.plan_name) LIKE '%básico%' THEN 'BASIC'
      WHEN LOWER(up.plan_name) LIKE '%intermediario%' OR LOWER(up.plan_name) LIKE '%intermediário%' THEN 'INTERMEDIARIO'
      WHEN LOWER(up.plan_name) LIKE '%master%' OR LOWER(up.plan_name) LIKE '%premium%' THEN 'MASTER'
      ELSE 'BASIC'
    END as plan_code
  FROM user_profiles up
  WHERE up.plan_name IS NOT NULL AND up.song_limit IS NOT NULL
)
SELECT 
  COALESCE(usp.user_id, up.user_id) as user_id,
  COALESCE(usp.plan_code, up.plan_code, 'BASIC') as plan_code,
  COALESCE(usp.plan_name, up.plan_name, 'Basic') as plan_name,
  COALESCE(usp.song_limit, up.song_limit, 10) as song_limit
FROM user_subscriptions_with_plans usp
FULL OUTER JOIN user_profiles_with_plans up ON usp.user_id = up.user_id
WHERE (usp.rn = 1 OR usp.rn IS NULL) -- Pega apenas a assinatura mais recente/ativa
  AND (usp.user_id IS NOT NULL OR up.user_id IS NOT NULL);

-- Adicionar comentários para documentação
COMMENT ON VIEW user_effective_plan IS 'VIEW que retorna o plano efetivo de cada usuário, priorizando assinaturas ativas sobre dados do perfil';

-- Exemplo de uso:
-- SELECT * FROM user_effective_plan WHERE user_id = 'seu-user-id-aqui';
