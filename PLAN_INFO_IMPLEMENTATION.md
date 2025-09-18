# 📊 Implementação da Busca de Informações do Plano

## 🎯 **Objetivo**
Buscar informações do plano do usuário diretamente do banco de dados, mostrando os nomes corretos: "Plano Basic", "Plano Intermediário", "Plano Master".

## 🗄️ **Estrutura do Banco**

### Tabelas Envolvidas:
- `user_profiles` - Perfis dos usuários
- `user_subscriptions` - Assinaturas ativas
- `subscription_plans` - Planos disponíveis
- `playlists` - Playlists do usuário
- `playlist_tracks` - Músicas das playlists

### Planos Disponíveis:
```sql
-- Conforme mostrado na imagem do banco
INSERT INTO subscription_plans (name, description, price, duration_days, features) VALUES
('Plano Basic', 'Acesso básico', 0.00, 0, '["streaming_basic", "playlists_limit_5", "ads"]'),
('Plano Intermediário', 'Acesso intermediário', 19.90, 30, '["streaming_hd", "playlists_limit_25", "no_ads"]'),
('Plano Master', 'Acesso completo', 39.90, 30, '["streaming_hd", "playlists_unlimited", "no_ads", "offline_download"]');
```

## 🔧 **Implementação**

### 1. Arquivo PHP: `user_plan_info.php`
```php
<?php
// Busca informações do plano diretamente do banco
$sql = "
    SELECT 
        sp.name as plan_name,
        sp.id as plan_id,
        sp.features,
        us.status as subscription_status,
        us.end_date,
        COUNT(pt.id) as total_tracks,
        CASE 
            WHEN sp.name = 'Plano Basic' THEN 10
            WHEN sp.name = 'Plano Intermediário' THEN 25
            WHEN sp.name = 'Plano Master' THEN 50
            ELSE 5
        END as limit_tracks
    FROM user_profiles up
    LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    LEFT JOIN playlists p ON up.id = p.user_id
    LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
    WHERE up.id = :user_id
    GROUP BY sp.name, sp.id, sp.features, us.status, us.end_date
";
```

### 2. API JavaScript: `src/api/profile.js`
```javascript
// Busca informações do plano do usuário diretamente do banco
export async function getUserPlanInfo({ userId }) {
  const url = `${API_BASE}/user_plan_info.php?user_id=${encodeURIComponent(userId)}`;
  const resp = await fetch(url);
  
  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao buscar informações do plano');
  }
  
  if (!data.ok) {
    throw new Error(data.error || 'Falha ao buscar informações do plano');
  }
  
  return data; // { ok:true, plan_name, plan_id, limit, total_tracks, subscription_status }
}
```

### 3. Componente React: `PlaylistScreen.js`
```javascript
// Função para carregar informações do plano
const loadPlanInfo = async () => {
  try {
    // Primeiro tenta buscar informações diretas do banco
    try {
      const planData = await getCurrentUserPlanInfo();
      console.log('📊 Dados do plano do banco:', planData);
      
      setPlanInfo({
        plan: planData.plan_name || 'Basic',
        limit: planData.limit || 10,
        total: planData.total_tracks || 0
      });
      
      if (planData.limit) {
        setLocalLimit(planData.limit);
      }
      return;
    } catch (planError) {
      console.log('⚠️ Erro ao buscar plano do banco, tentando API de playlist:', planError.message);
    }
    
    // Fallback: usar dados da API de playlist
    const data = await resolveCurrentUserPlaylist(1800);
    // ... resto da implementação
  } catch (error) {
    console.error('❌ Erro ao carregar informações do plano:', error);
    // Valores padrão
  }
};
```

## 📱 **Exibição na Interface**

### Mapeamento de Nomes:
```javascript
const getPlanDisplayName = (planName) => {
  // Se o nome já vem formatado do banco, usar diretamente
  if (planName && typeof planName === 'string') {
    // Remove "Plano " do início se existir
    const cleanName = planName.replace(/^Plano\s+/i, '');
    return cleanName;
  }
  
  // Fallback para casos onde o nome não vem do banco
  const planMap = {
    'basic': 'Basic',
    'intermediario': 'Intermediário', 
    'master': 'Master',
    'free': 'Gratuito',
    'premium': 'Premium',
    'family': 'Familiar'
  };
  return planMap[planName?.toLowerCase()] || planName || 'Basic';
};
```

### Interface Atualizada:
- **Badge**: Mostra "BASIC", "INTERMEDIÁRIO", "MASTER"
- **Contador**: "X/Y músicas selecionadas" com Y sendo o limite real
- **Subtítulo**: "Escolha as músicas que deseja ouvir • Plano Basic"

## 🔄 **Fluxo de Dados**

1. **Usuário abre PlaylistScreen**
2. **loadPlanInfo()** é chamada
3. **getCurrentUserPlanInfo()** busca do banco via `user_plan_info.php`
4. **Query SQL** retorna nome real do plano + limite + total de músicas
5. **Interface** atualiza com dados corretos do banco
6. **Fallback** para API de playlist se houver erro

## 🎯 **Resultado Final**

✅ **Antes**: "FREE" hardcoded  
✅ **Depois**: "BASIC", "INTERMEDIÁRIO", "MASTER" do banco

✅ **Antes**: Limite fixo  
✅ **Depois**: Limite real do plano (10, 25, 50 músicas)

✅ **Antes**: Sem informações do banco  
✅ **Depois**: Dados diretos das tabelas `subscription_plans` e `user_subscriptions`
