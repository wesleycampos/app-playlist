# 📡 Como Usar a Configuração da API

## 🔧 Configuração Adicionada

```javascript
// config.js
export const API_CONFIG = {
  baseUrl: 'https://musicas.radiosucessobrasilia.com.br/api',
  playlistUrl: 'https://musicas.wkdesign.com.br/playlist.php',
  timeout: 10000, // 10 segundos
};
```

## 📱 Como Usar nos Componentes

### 1. Importar a Configuração

```javascript
import { API_CONFIG } from './config';
```

### 2. Exemplos de Uso

#### Buscar Playlist
```javascript
const fetchPlaylist = async () => {
  try {
    const response = await fetch(API_CONFIG.playlistUrl, { 
      cache: 'no-store',
      timeout: API_CONFIG.timeout 
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar playlist:', error);
  }
};
```

#### Buscar Dados da API Principal
```javascript
const fetchFromAPI = async (endpoint) => {
  try {
    const url = `${API_CONFIG.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro na API:', error);
  }
};
```

#### Exemplo Completo - Serviço de API
```javascript
// services/ApiService.js
import { API_CONFIG } from '../config';

class ApiService {
  static async get(endpoint, options = {}) {
    const url = `${API_CONFIG.baseUrl}/${endpoint}`;
    const config = {
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Erro na API ${endpoint}:`, error);
      throw error;
    }
  }
  
  static async post(endpoint, data, options = {}) {
    return this.get(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }
}

export default ApiService;
```

## 🎯 Endpoints Sugeridos

Com a base URL `https://musicas.radiosucessobrasilia.com.br/api`, você pode criar:

- `GET /playlists` - Listar playlists
- `GET /playlists/{id}` - Buscar playlist específica
- `POST /playlists` - Criar nova playlist
- `PUT /playlists/{id}` - Atualizar playlist
- `DELETE /playlists/{id}` - Deletar playlist
- `GET /tracks` - Listar músicas
- `GET /tracks/{id}` - Buscar música específica
- `POST /tracks/favorite` - Adicionar aos favoritos
- `GET /user/profile` - Buscar perfil do usuário
- `PUT /user/profile` - Atualizar perfil

## 🔄 Migração Gradual

### Antes (Hardcoded)
```javascript
const PLAYLIST_URL = 'https://musicas.wkdesign.com.br/playlist.php';
```

### Depois (Configurável)
```javascript
import { API_CONFIG } from './config';
const PLAYLIST_URL = API_CONFIG.playlistUrl;
```

## ✅ Benefícios

1. **Centralização:** Todas as URLs em um lugar
2. **Flexibilidade:** Fácil mudança entre ambientes
3. **Manutenção:** Atualizações em um só lugar
4. **Consistência:** Mesmo timeout e configurações
5. **Escalabilidade:** Fácil adição de novos endpoints

## 🚀 Próximos Passos

1. **Criar ApiService:** Classe para centralizar chamadas
2. **Adicionar Interceptors:** Para logs e tratamento de erros
3. **Implementar Cache:** Para otimizar performance
4. **Adicionar Retry Logic:** Para requisições falhadas
5. **Configurar Ambientes:** Dev, Staging, Production
