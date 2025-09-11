# 🎵 Integração do Cliente de API na PlaylistScreen

## 📱 **O que foi implementado:**

### 1. **Imports Atualizados:**
```javascript
import { saveCurrentUserPlaylist, resolveCurrentUserPlaylist } from './src/api/playlist';
import { getUserId } from './src/auth/session';
```

### 2. **Novos Estados:**
```javascript
const [saving, setSaving] = useState(false);
const [resolving, setResolving] = useState(false);
const [planInfo, setPlanInfo] = useState(null);
```

### 3. **Função `handleConclude` Atualizada:**
- Usa `saveCurrentUserPlaylist()` em vez de Supabase direto
- Mapeia paths das músicas selecionadas
- Tratamento específico de erros (limite do plano, autenticação)
- Estados de loading durante salvamento

### 4. **Nova Função `handleResolvePlaylist`:**
- Resolve playlist para obter URLs assinadas
- Mostra informações do plano e limite
- Log das URLs para integração com player

### 5. **Função `loadPlanInfo`:**
- Carrega informações do plano do usuário
- Atualiza estado `planInfo` com dados do servidor

### 6. **UI Atualizada:**
- **Informações do Plano:** Mostra plano atual e uso
- **Botão Resolver:** Para obter URLs assinadas
- **Estados de Loading:** Botões desabilitados durante operações
- **Avisos de Limite:** Alerta quando limite é atingido

## 🎯 **Como Funciona:**

### Salvamento de Playlist
```javascript
const handleConclude = async () => {
  const queue = buildSelection();
  
  // Mapear paths das músicas
  const paths = queue.map(track => {
    if (track.path) return track.path;
    return `genres/${track.genre || 'Unknown'}/${track.title}.mp3`;
  });

  // Salvar usando API
  const data = await saveCurrentUserPlaylist(paths);
  
  // Mostrar sucesso com informações do plano
  Alert.alert('Sucesso!', `Playlist salva com ${data.saved} músicas!`);
};
```

### Resolução de Playlist
```javascript
const handleResolvePlaylist = async () => {
  // Obter URLs assinadas para reprodução
  const data = await resolveCurrentUserPlaylist(1800);
  
  // data.items contém URLs assinadas
  console.log('URLs para reprodução:', data.items.map(i => i.streamUrl));
  
  // Integrar com player
  // player.loadQueue(data.items.map(i => i.streamUrl))
};
```

## 🛡️ **Tratamento de Erros:**

### Limite do Plano
```javascript
if (error.message.includes('Limite do plano')) {
  Alert.alert(
    'Limite Excedido', 
    error.message + '\n\nConsidere fazer upgrade do seu plano!',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
    ]
  );
}
```

### Usuário Não Autenticado
```javascript
if (error.message.includes('Usuário não autenticado')) {
  Alert.alert('Sessão Expirada', 'Faça login novamente.');
  navigation.navigate('Login');
}
```

## 📊 **Informações do Plano:**

### Exibição na UI
```javascript
{planInfo && (
  <View style={styles.planInfoContainer}>
    <Text style={styles.planInfoText}>
      Plano: {planInfo.plan} | Uso: {planInfo.total}/{planInfo.limit}
    </Text>
    {planInfo.total >= planInfo.limit && (
      <Text style={styles.limitWarning}>
        ⚠️ Limite do plano atingido!
      </Text>
    )}
  </View>
)}
```

### Dados Retornados
```javascript
{
  plan: 'premium',        // Nome do plano
  limit: 100,             // Limite de músicas
  total: 45,              // Músicas atuais
  usage_percentage: 45    // Percentual de uso
}
```

## 🎵 **Mapeamento de Paths:**

### Estratégia de Mapeamento
```javascript
const paths = queue.map(track => {
  // Se o track já tem path, usar ele
  if (track.path) {
    return track.path;
  }
  
  // Construir path baseado no título
  return `genres/${track.genre || 'Unknown'}/${track.title}.mp3`;
});
```

### Exemplos de Paths
- `genres/MPB/Djavan - Flor de Lis.mp3`
- `genres/Rock/Queen - Bohemian Rhapsody.mp3`
- `genres/Pop/Michael Jackson - Billie Jean.mp3`

## 🔄 **Estados de Loading:**

### Botão Concluir
```javascript
<Pressable 
  style={[styles.concludeBtn, saving && styles.disabledButton]} 
  onPress={handleConclude}
  disabled={saving}
>
  <Text style={styles.concludeText}>
    {saving ? 'SALVANDO...' : 'CONCLUIR'}
  </Text>
</Pressable>
```

### Botão Resolver
```javascript
<Pressable 
  style={[styles.resolveBtn, resolving && styles.disabledButton]} 
  onPress={handleResolvePlaylist}
  disabled={resolving}
>
  <Text style={styles.resolveText}>
    {resolving ? 'CARREGANDO...' : 'RESOLVER PLAYLIST'}
  </Text>
</Pressable>
```

## 🎨 **Estilos Adicionados:**

### Informações do Plano
```javascript
planInfoContainer: {
  position: 'absolute',
  bottom: 120,
  left: 0,
  right: 0,
  backgroundColor: '#f8f9fa',
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: '#eef2f7',
},
```

### Botão Resolver
```javascript
resolveBtn: {
  backgroundColor: '#34C759',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 8,
},
```

### Botão Desabilitado
```javascript
disabledButton: {
  backgroundColor: '#cccccc',
  opacity: 0.6,
},
```

## 🚀 **Próximos Passos:**

### 1. **Integração com Player**
```javascript
// Após resolver playlist
if (data.items && data.items.length > 0) {
  // Carregar fila no player
  Player.loadQueue(data.items.map(i => i.streamUrl));
  
  // Ou navegar para player com fila
  navigation.navigate('Player', { 
    queue: data.items,
    currentIndex: 0 
  });
}
```

### 2. **Cache de Informações do Plano**
```javascript
// Salvar limite localmente após primeiro erro
const [localLimit, setLocalLimit] = useState(null);

if (error.message.includes('Limite do plano')) {
  // Extrair limite da mensagem de erro
  const limitMatch = error.message.match(/máx (\d+)/);
  if (limitMatch) {
    setLocalLimit(parseInt(limitMatch[1]));
  }
}
```

### 3. **Validação de Limite Local**
```javascript
// Bloquear botão quando limite é atingido
const isLimitReached = localLimit && selectedKeys.size >= localLimit;

<Pressable 
  style={[styles.concludeBtn, (saving || isLimitReached) && styles.disabledButton]} 
  onPress={handleConclude}
  disabled={saving || isLimitReached}
>
  <Text style={styles.concludeText}>
    {isLimitReached ? 'LIMITE ATINGIDO' : (saving ? 'SALVANDO...' : 'CONCLUIR')}
  </Text>
</Pressable>
```

## ✅ **Benefícios da Integração:**

1. **Centralizado:** Usa cliente de API em vez de Supabase direto
2. **Robusto:** Tratamento específico de erros de limite e autenticação
3. **Informativo:** Mostra informações do plano e uso atual
4. **Responsivo:** Estados de loading e botões desabilitados
5. **Flexível:** Suporte a diferentes estratégias de mapeamento de paths
6. **Escalável:** Fácil adição de novas funcionalidades

A integração está completa e pronta para uso! 🎵🚀✨
