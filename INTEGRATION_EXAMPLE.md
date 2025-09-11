# 🔗 Exemplo de Integração do Cliente de API

## 📱 Integração com PlaylistScreen.js

### 1. Atualizar Imports

```javascript
// PlaylistScreen.js
import { savePlaylist, resolvePlaylist } from './src/api/playlist';
```

### 2. Substituir Função handleConclude

```javascript
// Substituir a função handleConclude existente
const handleConclude = async () => {
  try {
    setLoading(true);
    
    // Construir queue com as músicas selecionadas
    const queue = library.filter(track => selectedKeys.includes(track.trackKey));
    
    if (queue.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma música para criar a playlist.');
      return;
    }

    // Obter ID do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    // Salvar playlist usando o cliente de API
    const result = await savePlaylist({
      userId: user.id,
      paths: queue.map(track => track.path)
    });

    // Mostrar sucesso
    Alert.alert(
      'Sucesso!', 
      `Playlist salva com ${result.saved} músicas!\nPlano: ${result.plan}\nLimite: ${result.limit}`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Main', { customQueue: queue })
        }
      ]
    );

  } catch (error) {
    console.error('Erro ao salvar playlist:', error);
    
    // Tratamento específico de erros
    if (error.message.includes('Limite do plano')) {
      Alert.alert(
        'Limite Excedido', 
        error.message + '\n\nConsidere fazer upgrade do seu plano!',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
    } else {
      Alert.alert('Erro', 'Falha ao salvar playlist. Tente novamente.');
    }
  } finally {
    setLoading(false);
  }
};
```

### 3. Adicionar Função para Carregar Playlist do Servidor

```javascript
// Adicionar nova função para carregar playlist do servidor
const loadServerPlaylist = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const playlistData = await resolvePlaylist({
      userId: user.id,
      ttlSec: 1800 // 30 minutos
    });

    if (playlistData.items && playlistData.items.length > 0) {
      // Converter dados do servidor para formato local
      const serverTracks = playlistData.items.map((item, index) => ({
        trackKey: `server_${index}`,
        title: item.title,
        path: item.path,
        streamUrl: item.streamUrl,
        duration: '0:00', // Duração não disponível no servidor
        artist: 'Artista Desconhecido'
      }));

      // Adicionar tracks do servidor à library
      setLibrary(prevLibrary => [...prevLibrary, ...serverTracks]);
      
      // Marcar tracks do servidor como selecionadas
      const serverTrackKeys = serverTracks.map(track => track.trackKey);
      setSelectedKeys(prevKeys => [...prevKeys, ...serverTrackKeys]);
    }

  } catch (error) {
    console.error('Erro ao carregar playlist do servidor:', error);
    // Não mostrar erro para o usuário, apenas log
  }
};
```

### 4. Atualizar useEffect

```javascript
// Atualizar o useEffect existente
useEffect(() => {
  const initializePlaylist = async () => {
    try {
      await fetchPlaylist();
      await loadUserPlaylist();
      await loadServerPlaylist(); // Nova função
    } catch (error) {
      console.error('Erro ao inicializar playlist:', error);
    }
  };

  initializePlaylist();
}, []);
```

### 5. Adicionar Indicador de Plano

```javascript
// Adicionar estado para informações do plano
const [planInfo, setPlanInfo] = useState(null);

// Função para buscar informações do plano
const loadPlanInfo = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const playlistData = await resolvePlaylist({ userId: user.id });
    setPlanInfo({
      plan: playlistData.plan,
      limit: playlistData.limit,
      total: playlistData.total
    });
  } catch (error) {
    console.error('Erro ao carregar informações do plano:', error);
  }
};

// Chamar no useEffect
useEffect(() => {
  loadPlanInfo();
}, []);
```

### 6. Atualizar UI com Informações do Plano

```javascript
// Adicionar na renderização, antes do botão "Concluir"
{planInfo && (
  <View style={styles.planInfo}>
    <Text style={styles.planText}>
      Plano: {planInfo.plan} | Limite: {planInfo.total}/{planInfo.limit}
    </Text>
    {planInfo.total >= planInfo.limit && (
      <Text style={styles.limitWarning}>
        ⚠️ Limite do plano atingido!
      </Text>
    )}
  </View>
)}

// Adicionar estilos
const styles = StyleSheet.create({
  // ... estilos existentes
  planInfo: {
    padding: 16,
    backgroundColor: dark ? '#1a1a1a' : '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  planText: {
    color: dark ? '#fff' : '#333',
    fontSize: 14,
    textAlign: 'center',
  },
  limitWarning: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: 'bold',
  },
});
```

## 🎯 Exemplo Completo de Hook Personalizado

```javascript
// hooks/usePlaylistAPI.js
import { useState, useCallback } from 'react';
import { savePlaylist, resolvePlaylist, getUserPlaylists } from '../api/playlist';
import { supabase } from '../supabase';

export const usePlaylistAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    return user;
  }, []);

  const saveUserPlaylist = useCallback(async (tracks) => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      const paths = tracks.map(track => track.path);
      
      const result = await savePlaylist({
        userId: user.id,
        paths: paths
      });
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser]);

  const loadUserPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      const result = await resolvePlaylist({
        userId: user.id,
        ttlSec: 1800
      });
      
      setPlanInfo({
        plan: result.plan,
        limit: result.limit,
        total: result.total
      });
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser]);

  const loadAllPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      const result = await getUserPlaylists({ userId: user.id });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser]);

  return {
    loading,
    error,
    planInfo,
    saveUserPlaylist,
    loadUserPlaylist,
    loadAllPlaylists
  };
};
```

## 🚀 Uso do Hook no Componente

```javascript
// PlaylistScreen.js
import { usePlaylistAPI } from './hooks/usePlaylistAPI';

export default function PlaylistScreen({ navigation, route }) {
  const { loading, error, planInfo, saveUserPlaylist, loadUserPlaylist } = usePlaylistAPI();
  
  // ... resto do componente
  
  const handleConclude = async () => {
    try {
      const queue = library.filter(track => selectedKeys.includes(track.trackKey));
      
      if (queue.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos uma música.');
        return;
      }

      const result = await saveUserPlaylist(queue);
      
      Alert.alert('Sucesso!', `Playlist salva com ${result.saved} músicas!`);
      navigation.navigate('Main', { customQueue: queue });
      
    } catch (err) {
      if (err.message.includes('Limite do plano')) {
        Alert.alert('Limite Excedido', err.message);
      } else {
        Alert.alert('Erro', 'Falha ao salvar playlist.');
      }
    }
  };

  // ... resto do componente
}
```

## ✅ Benefícios da Integração

1. **Código Limpo:** Separação de responsabilidades
2. **Reutilização:** Hook pode ser usado em outros componentes
3. **Tratamento de Erros:** Centralizado e consistente
4. **Performance:** Estados otimizados com useCallback
5. **Manutenibilidade:** Fácil de atualizar e debugar
