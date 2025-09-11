# 🎵 Exemplos de Uso do Cliente de API

## 🔐 Funções Convenientes (Sem userId)

### 1. Salvar Playlist (Mais Simples)

```javascript
// Antes (com userId manual)
import { savePlaylist } from './src/api/playlist';
import { getUserId } from './src/auth/session';

const handleSave = async () => {
  const userId = await getUserId();
  if (!userId) {
    Alert.alert('Erro', 'Usuário não autenticado');
    return;
  }
  
  const result = await savePlaylist({ userId, paths: selectedTracks });
};

// Depois (função conveniente)
import { saveCurrentUserPlaylist } from './src/api/playlist';

const handleSave = async () => {
  try {
    const result = await saveCurrentUserPlaylist(selectedTracks);
    Alert.alert('Sucesso', `Playlist salva com ${result.saved} músicas!`);
  } catch (error) {
    if (error.message.includes('Usuário não autenticado')) {
      navigation.navigate('Login');
    } else {
      Alert.alert('Erro', error.message);
    }
  }
};
```

### 2. Carregar Playlist do Usuário

```javascript
import { resolveCurrentUserPlaylist } from './src/api/playlist';

const loadUserPlaylist = async () => {
  try {
    const playlist = await resolveCurrentUserPlaylist();
    
    if (playlist.items && playlist.items.length > 0) {
      // Converter para formato local
      const tracks = playlist.items.map((item, index) => ({
        trackKey: `server_${index}`,
        title: item.title,
        path: item.path,
        streamUrl: item.streamUrl,
        duration: '0:00',
        artist: 'Artista Desconhecido'
      }));
      
      setLibrary(prevLibrary => [...prevLibrary, ...tracks]);
      setSelectedKeys(tracks.map(track => track.trackKey));
    }
    
  } catch (error) {
    if (error.message.includes('Usuário não autenticado')) {
      navigation.navigate('Login');
    } else {
      console.error('Erro ao carregar playlist:', error);
    }
  }
};
```

### 3. Criar Nova Playlist

```javascript
import { createCurrentUserPlaylist } from './src/api/playlist';

const createNewPlaylist = async () => {
  try {
    const result = await createCurrentUserPlaylist(
      'Minha Nova Playlist',
      'Uma playlist incrível'
    );
    
    Alert.alert('Sucesso', `Playlist "${result.name}" criada!`);
    return result.playlist_id;
    
  } catch (error) {
    if (error.message.includes('Usuário não autenticado')) {
      navigation.navigate('Login');
    } else {
      Alert.alert('Erro', 'Falha ao criar playlist.');
    }
  }
};
```

### 4. Buscar Todas as Playlists

```javascript
import { getCurrentUserPlaylists } from './src/api/playlist';

const loadAllPlaylists = async () => {
  try {
    const result = await getCurrentUserPlaylists();
    
    console.log('Playlists do usuário:', result.playlists);
    // [
    //   { id: 1, name: 'Minha Playlist', track_count: 5, created_at: '2024-01-01' },
    //   { id: 2, name: 'Rock', track_count: 10, created_at: '2024-01-02' }
    // ]
    
    return result.playlists;
    
  } catch (error) {
    if (error.message.includes('Usuário não autenticado')) {
      navigation.navigate('Login');
    } else {
      console.error('Erro ao carregar playlists:', error);
    }
  }
};
```

### 5. Buscar Estatísticas

```javascript
import { getCurrentUserPlaylistStats } from './src/api/playlist';

const loadStats = async () => {
  try {
    const stats = await getCurrentUserPlaylistStats();
    
    console.log('Estatísticas:', {
      totalPlaylists: stats.total_playlists,
      totalTracks: stats.total_tracks,
      plan: stats.plan,
      limit: stats.limit,
      usagePercentage: stats.usage_percentage
    });
    
    return stats;
    
  } catch (error) {
    if (error.message.includes('Usuário não autenticado')) {
      navigation.navigate('Login');
    } else {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }
};
```

## 🎯 Hook Personalizado Completo

```javascript
// hooks/usePlaylistAPI.js
import { useState, useCallback } from 'react';
import { 
  saveCurrentUserPlaylist,
  resolveCurrentUserPlaylist,
  getCurrentUserPlaylists,
  createCurrentUserPlaylist,
  getCurrentUserPlaylistStats
} from '../src/api/playlist';

export const usePlaylistAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const savePlaylist = useCallback(async (tracks) => {
    setLoading(true);
    setError(null);
    
    try {
      const paths = tracks.map(track => track.path);
      const result = await saveCurrentUserPlaylist(paths);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await resolveCurrentUserPlaylist();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCurrentUserPlaylists();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlaylist = useCallback(async (name, description = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createCurrentUserPlaylist(name, description);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCurrentUserPlaylistStats();
      setStats(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    stats,
    savePlaylist,
    loadPlaylist,
    loadAllPlaylists,
    createPlaylist,
    loadStats
  };
};
```

## 📱 Uso no PlaylistScreen.js

```javascript
// PlaylistScreen.js
import { usePlaylistAPI } from './hooks/usePlaylistAPI';

export default function PlaylistScreen({ navigation, route }) {
  const { loading, error, stats, savePlaylist, loadPlaylist, loadStats } = usePlaylistAPI();
  
  // Carregar estatísticas ao montar o componente
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  
  // Carregar playlist do servidor
  useEffect(() => {
    const loadServerPlaylist = async () => {
      try {
        const playlist = await loadPlaylist();
        
        if (playlist.items && playlist.items.length > 0) {
          const serverTracks = playlist.items.map((item, index) => ({
            trackKey: `server_${index}`,
            title: item.title,
            path: item.path,
            streamUrl: item.streamUrl,
            duration: '0:00',
            artist: 'Artista Desconhecido'
          }));
          
          setLibrary(prevLibrary => [...prevLibrary, ...serverTracks]);
          setSelectedKeys(prevKeys => [...prevKeys, ...serverTracks.map(t => t.trackKey)]);
        }
      } catch (err) {
        if (err.message.includes('Usuário não autenticado')) {
          navigation.navigate('Login');
        }
      }
    };
    
    loadServerPlaylist();
  }, [loadPlaylist]);
  
  const handleConclude = async () => {
    try {
      const queue = library.filter(track => selectedKeys.includes(track.trackKey));
      
      if (queue.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos uma música.');
        return;
      }
      
      const result = await savePlaylist(queue);
      
      Alert.alert(
        'Sucesso!', 
        `Playlist salva com ${result.saved} músicas!\nPlano: ${result.plan}\nLimite: ${result.limit}`
      );
      
      navigation.navigate('Main', { customQueue: queue });
      
    } catch (err) {
      if (err.message.includes('Limite do plano')) {
        Alert.alert('Limite Excedido', err.message);
      } else if (err.message.includes('Usuário não autenticado')) {
        navigation.navigate('Login');
      } else {
        Alert.alert('Erro', 'Falha ao salvar playlist.');
      }
    }
  };
  
  // Mostrar informações do plano
  const renderPlanInfo = () => {
    if (!stats) return null;
    
    return (
      <View style={styles.planInfo}>
        <Text style={styles.planText}>
          Plano: {stats.plan} | Uso: {stats.total_tracks}/{stats.limit}
        </Text>
        {stats.total_tracks >= stats.limit && (
          <Text style={styles.limitWarning}>
            ⚠️ Limite do plano atingido!
          </Text>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderPlanInfo()}
      {/* ... resto do componente */}
    </View>
  );
}
```

## 🛡️ Tratamento de Erros Específicos

```javascript
const handleAPIError = (error) => {
  if (error.message.includes('Usuário não autenticado')) {
    // Redirecionar para login
    navigation.navigate('Login');
  } else if (error.message.includes('Limite do plano')) {
    // Mostrar opção de upgrade
    Alert.alert(
      'Limite Excedido', 
      error.message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
      ]
    );
  } else if (error.message.includes('Playlist não encontrada')) {
    // Playlist foi deletada ou não existe
    Alert.alert('Playlist não encontrada', 'Esta playlist pode ter sido deletada.');
  } else {
    // Erro genérico
    Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
  }
};
```

## ✅ Benefícios das Funções Convenientes

1. **Mais Simples:** Não precisa gerenciar userId manualmente
2. **Menos Código:** Reduz boilerplate em cada chamada
3. **Tratamento Automático:** Erro de autenticação tratado automaticamente
4. **Consistente:** Mesmo padrão em todas as funções
5. **Seguro:** Verificação de autenticação em cada chamada
6. **Flexível:** Ainda pode usar as funções originais se precisar

## 🚀 Próximos Passos

1. **Integrar com PlaylistScreen.js** usando o hook personalizado
2. **Adicionar indicadores de loading** durante as operações
3. **Implementar cache** para melhorar performance
4. **Adicionar retry logic** para requisições falhadas
5. **Criar testes unitários** para as funções
