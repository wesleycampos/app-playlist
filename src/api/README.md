# 🎵 Cliente de API para Playlists

## 📁 Estrutura

```
src/api/
├── playlist.js          # Cliente principal para playlists
└── README.md           # Este arquivo de documentação
```

## 🚀 Como Usar

### 1. Importar as Funções

```javascript
import { 
  savePlaylist, 
  resolvePlaylist, 
  getUserPlaylists,
  createPlaylist,
  addTracksToPlaylist,
  removeTracksFromPlaylist,
  deletePlaylist,
  renamePlaylist,
  getPlaylistDetails,
  duplicatePlaylist,
  exportPlaylist,
  getPlaylistStats
} from './src/api/playlist';
```

### 2. Exemplos de Uso

#### Salvar Playlist
```javascript
try {
  const result = await savePlaylist({
    userId: 'user123',
    paths: ['track1.mp3', 'track2.mp3', 'track3.mp3']
  });
  
  console.log('Playlist salva:', result);
  // { ok: true, saved: 3, plan: 'premium', limit: 100, file: 'playlist.json' }
} catch (error) {
  console.error('Erro ao salvar:', error.message);
  // "Limite do plano excedido (máx 10, você enviou 12)"
}
```

#### Resolver Playlist para Reprodução
```javascript
try {
  const playlist = await resolvePlaylist({
    userId: 'user123',
    ttlSec: 1800 // 30 minutos
  });
  
  console.log('Playlist resolvida:', playlist);
  // { 
  //   items: [
  //     { title: 'Música 1', path: 'track1.mp3', streamUrl: 'https://...' },
  //     { title: 'Música 2', path: 'track2.mp3', streamUrl: 'https://...' }
  //   ],
  //   total: 2,
  //   plan: 'premium',
  //   limit: 100
  // }
} catch (error) {
  console.error('Erro ao resolver playlist:', error.message);
}
```

#### Buscar Todas as Playlists
```javascript
try {
  const playlists = await getUserPlaylists({ userId: 'user123' });
  
  console.log('Playlists do usuário:', playlists);
  // {
  //   ok: true,
  //   playlists: [
  //     { id: 1, name: 'Minha Playlist', track_count: 5, created_at: '2024-01-01' },
  //     { id: 2, name: 'Rock', track_count: 10, created_at: '2024-01-02' }
  //   ],
  //   total: 2
  // }
} catch (error) {
  console.error('Erro ao buscar playlists:', error.message);
}
```

#### Criar Nova Playlist
```javascript
try {
  const newPlaylist = await createPlaylist({
    userId: 'user123',
    name: 'Minha Nova Playlist',
    description: 'Uma playlist incrível'
  });
  
  console.log('Playlist criada:', newPlaylist);
  // { ok: true, playlist_id: 3, name: 'Minha Nova Playlist', created_at: '2024-01-03' }
} catch (error) {
  console.error('Erro ao criar playlist:', error.message);
}
```

#### Adicionar Músicas à Playlist
```javascript
try {
  const result = await addTracksToPlaylist({
    userId: 'user123',
    playlistId: 3,
    paths: ['new_track1.mp3', 'new_track2.mp3']
  });
  
  console.log('Músicas adicionadas:', result);
  // { ok: true, added: 2, total_tracks: 7, plan: 'premium', limit: 100 }
} catch (error) {
  console.error('Erro ao adicionar músicas:', error.message);
}
```

#### Remover Músicas da Playlist
```javascript
try {
  const result = await removeTracksFromPlaylist({
    userId: 'user123',
    playlistId: 3,
    paths: ['track_to_remove.mp3']
  });
  
  console.log('Músicas removidas:', result);
  // { ok: true, removed: 1, total_tracks: 6 }
} catch (error) {
  console.error('Erro ao remover músicas:', error.message);
}
```

#### Deletar Playlist
```javascript
try {
  const result = await deletePlaylist({
    userId: 'user123',
    playlistId: 3
  });
  
  console.log('Playlist deletada:', result);
  // { ok: true, deleted: true }
} catch (error) {
  console.error('Erro ao deletar playlist:', error.message);
}
```

#### Renomear Playlist
```javascript
try {
  const result = await renamePlaylist({
    userId: 'user123',
    playlistId: 1,
    newName: 'Novo Nome da Playlist'
  });
  
  console.log('Playlist renomeada:', result);
  // { ok: true, playlist_id: 1, name: 'Novo Nome da Playlist', updated_at: '2024-01-03' }
} catch (error) {
  console.error('Erro ao renomear playlist:', error.message);
}
```

#### Buscar Detalhes da Playlist
```javascript
try {
  const details = await getPlaylistDetails({
    userId: 'user123',
    playlistId: 1
  });
  
  console.log('Detalhes da playlist:', details);
  // {
  //   ok: true,
  //   playlist: {
  //     id: 1,
  //     name: 'Minha Playlist',
  //     description: 'Uma playlist incrível',
  //     track_count: 5,
  //     created_at: '2024-01-01',
  //     tracks: [
  //       { title: 'Música 1', path: 'track1.mp3', streamUrl: 'https://...' },
  //       { title: 'Música 2', path: 'track2.mp3', streamUrl: 'https://...' }
  //     ]
  //   }
  // }
} catch (error) {
  console.error('Erro ao buscar detalhes:', error.message);
}
```

#### Duplicar Playlist
```javascript
try {
  const duplicate = await duplicatePlaylist({
    userId: 'user123',
    playlistId: 1,
    newName: 'Cópia da Minha Playlist'
  });
  
  console.log('Playlist duplicada:', duplicate);
  // { ok: true, new_playlist_id: 4, name: 'Cópia da Minha Playlist', created_at: '2024-01-03' }
} catch (error) {
  console.error('Erro ao duplicar playlist:', error.message);
}
```

#### Exportar Playlist
```javascript
try {
  const exportData = await exportPlaylist({
    userId: 'user123',
    playlistId: 1,
    format: 'm3u' // ou 'json'
  });
  
  console.log('Playlist exportada:', exportData);
  // { ok: true, format: 'm3u', content: '#EXTM3U\n...', filename: 'playlist.m3u' }
} catch (error) {
  console.error('Erro ao exportar playlist:', error.message);
}
```

#### Buscar Estatísticas
```javascript
try {
  const stats = await getPlaylistStats({ userId: 'user123' });
  
  console.log('Estatísticas:', stats);
  // {
  //   ok: true,
  //   total_playlists: 5,
  //   total_tracks: 50,
  //   plan: 'premium',
  //   limit: 100,
  //   usage_percentage: 50
  // }
} catch (error) {
  console.error('Erro ao buscar estatísticas:', error.message);
}
```

## 🔧 Integração com React Native

### Hook Personalizado
```javascript
// hooks/usePlaylist.js
import { useState, useCallback } from 'react';
import { savePlaylist, resolvePlaylist, getUserPlaylists } from '../api/playlist';

export const usePlaylist = (userId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveUserPlaylist = useCallback(async (paths) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await savePlaylist({ userId, paths });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadUserPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await resolvePlaylist({ userId });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadAllPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserPlaylists({ userId });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    saveUserPlaylist,
    loadUserPlaylist,
    loadAllPlaylists
  };
};
```

### Uso no Componente
```javascript
// PlaylistScreen.js
import { usePlaylist } from '../hooks/usePlaylist';

export default function PlaylistScreen({ navigation, route }) {
  const { currentUser } = route.params;
  const { loading, error, saveUserPlaylist, loadUserPlaylist } = usePlaylist(currentUser.id);

  const handleSavePlaylist = async () => {
    try {
      const selectedPaths = selectedTracks.map(track => track.path);
      const result = await saveUserPlaylist(selectedPaths);
      
      Alert.alert('Sucesso', `Playlist salva com ${result.saved} músicas!`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  // ... resto do componente
}
```

## 🛡️ Tratamento de Erros

### Tipos de Erro Comuns
- **Limite do plano excedido:** `"Limite do plano excedido (máx 10, você enviou 12)"`
- **Playlist não encontrada:** `"Playlist não encontrada"`
- **Usuário não autorizado:** `"Usuário não autorizado"`
- **Erro de rede:** `"Falha ao salvar playlist"`

### Exemplo de Tratamento
```javascript
try {
  const result = await savePlaylist({ userId, paths });
  // Sucesso
} catch (error) {
  if (error.message.includes('Limite do plano')) {
    // Mostrar opção de upgrade
    Alert.alert('Limite Excedido', 'Upgrade seu plano para adicionar mais músicas!');
  } else if (error.message.includes('não autorizado')) {
    // Redirecionar para login
    navigation.navigate('Login');
  } else {
    // Erro genérico
    Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
  }
}
```

## 📊 Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/playlist_save.php` | POST | Salva playlist no servidor |
| `/playlist_resolve.php` | GET | Resolve playlist com URLs assinadas |
| `/playlists.php` | GET | Lista todas as playlists do usuário |
| `/playlist_create.php` | POST | Cria nova playlist |
| `/playlist_add_tracks.php` | POST | Adiciona músicas à playlist |
| `/playlist_remove_tracks.php` | POST | Remove músicas da playlist |
| `/playlist_delete.php` | POST | Deleta playlist |
| `/playlist_rename.php` | POST | Renomeia playlist |
| `/playlist_details.php` | GET | Busca detalhes da playlist |
| `/playlist_duplicate.php` | POST | Duplica playlist |
| `/playlist_export.php` | GET | Exporta playlist |
| `/playlist_stats.php` | GET | Busca estatísticas |

## ✅ Benefícios

1. **Centralizado:** Todas as operações de playlist em um lugar
2. **Consistente:** Mesmo padrão de tratamento de erros
3. **Flexível:** Suporte a diferentes formatos e operações
4. **Robusto:** Tratamento de erros de rede e API
5. **Escalável:** Fácil adição de novas funcionalidades
