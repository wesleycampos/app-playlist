# 🔐 Utilitários de Sessão e Autenticação

## 📁 Estrutura

```
src/auth/
├── session.js          # Utilitários de sessão e autenticação
└── README.md          # Este arquivo de documentação
```

## 🚀 Como Usar

### 1. Importar as Funções

```javascript
import { 
  getUserId, 
  getCurrentUser, 
  isUserLoggedIn,
  getCurrentSession,
  getAccessToken,
  getUserInfo,
  refreshSession,
  logout,
  onAuthStateChange,
  hasPermission,
  getUserPlan,
  isPremiumUser
} from './src/auth/session';
```

### 2. Exemplos de Uso

#### Obter ID do Usuário (UUID)
```javascript
import { getUserId } from './src/auth/session';

const handleSavePlaylist = async () => {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    // Usar o userId para salvar playlist
    const result = await savePlaylist({ userId, paths: selectedTracks });
    console.log('Playlist salva para usuário:', userId);
    
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

#### Verificar se Usuário está Logado
```javascript
import { isUserLoggedIn } from './src/auth/session';

const checkAuth = async () => {
  const isLoggedIn = await isUserLoggedIn();
  
  if (!isLoggedIn) {
    // Redirecionar para tela de login
    navigation.navigate('Login');
    return;
  }
  
  // Continuar com a operação
  loadUserData();
};
```

#### Obter Usuário Completo
```javascript
import { getCurrentUser } from './src/auth/session';

const loadUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('Usuário não logado');
      return;
    }
    
    console.log('Usuário logado:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
  }
};
```

#### Obter Token de Acesso
```javascript
import { getAccessToken } from './src/auth/session';

const makeAuthenticatedRequest = async () => {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Token não disponível');
    }
    
    const response = await fetch('https://api.exemplo.com/dados', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
};
```

#### Monitorar Mudanças de Autenticação
```javascript
import { onAuthStateChange } from './src/auth/session';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      console.log('Evento de auth:', event);
      
      if (event === 'SIGNED_IN') {
        console.log('Usuário logado:', session.user);
        // Atualizar estado da aplicação
      } else if (event === 'SIGNED_OUT') {
        console.log('Usuário deslogado');
        // Limpar estado da aplicação
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // ... resto do componente
}
```

#### Verificar Permissões
```javascript
import { hasPermission } from './src/auth/session';

const checkUserPermissions = async () => {
  try {
    const canCreatePlaylist = await hasPermission('create_playlist');
    const canDeletePlaylist = await hasPermission('delete_playlist');
    
    if (!canCreatePlaylist) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para criar playlists.');
      return;
    }
    
    // Continuar com a criação da playlist
    
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
  }
};
```

#### Verificar Plano do Usuário
```javascript
import { getUserPlan, isPremiumUser } from './src/auth/session';

const checkUserPlan = async () => {
  try {
    const plan = await getUserPlan();
    const isPremium = await isPremiumUser();
    
    console.log('Plano do usuário:', plan);
    console.log('É premium:', isPremium);
    
    if (plan === 'free') {
      // Mostrar opções limitadas
      showLimitedFeatures();
    } else if (isPremium) {
      // Mostrar todas as funcionalidades
      showAllFeatures();
    }
    
  } catch (error) {
    console.error('Erro ao verificar plano:', error);
  }
};
```

#### Fazer Logout
```javascript
import { logout } from './src/auth/session';

const handleLogout = async () => {
  try {
    const success = await logout();
    
    if (success) {
      Alert.alert('Sucesso', 'Logout realizado com sucesso!');
      navigation.navigate('Login');
    } else {
      Alert.alert('Erro', 'Falha ao fazer logout.');
    }
    
  } catch (error) {
    console.error('Erro no logout:', error);
  }
};
```

## 🎯 Hook Personalizado para React Native

```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { 
  getCurrentUser, 
  isUserLoggedIn, 
  onAuthStateChange 
} from '../src/auth/session';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Verificar estado inicial
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        const loggedIn = await isUserLoggedIn();
        
        setUser(currentUser);
        setIsLoggedIn(loggedIn);
      } catch (error) {
        console.error('Erro ao verificar auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Monitorar mudanças de auth
    const unsubscribe = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        setIsLoggedIn(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isLoggedIn,
    userId: user?.id || null,
    userEmail: user?.email || null
  };
};
```

## 🔧 Uso do Hook no Componente

```javascript
// PlaylistScreen.js
import { useAuth } from './hooks/useAuth';

export default function PlaylistScreen({ navigation, route }) {
  const { user, loading, isLoggedIn, userId } = useAuth();
  
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigation.navigate('Login');
      return;
    }
    
    if (userId) {
      loadUserPlaylist(userId);
    }
  }, [loading, isLoggedIn, userId]);
  
  const handleSavePlaylist = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    try {
      const result = await savePlaylist({ userId, paths: selectedTracks });
      Alert.alert('Sucesso', 'Playlist salva!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar playlist.');
    }
  };
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isLoggedIn) {
    return null; // Será redirecionado
  }
  
  // ... resto do componente
}
```

## 🛡️ Tratamento de Erros

### Tipos de Erro Comuns
- **Usuário não autenticado:** `getUserId()` retorna `null`
- **Sessão expirada:** `getAccessToken()` retorna `null`
- **Erro de rede:** Exceções capturadas nos try/catch

### Exemplo de Tratamento
```javascript
const handleAuthenticatedAction = async () => {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      Alert.alert('Sessão Expirada', 'Faça login novamente.');
      navigation.navigate('Login');
      return;
    }
    
    // Continuar com a ação autenticada
    await performAction(userId);
    
  } catch (error) {
    console.error('Erro na ação autenticada:', error);
    Alert.alert('Erro', 'Algo deu errado. Tente novamente.');
  }
};
```

## 📊 Funções Disponíveis

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `getUserId()` | `string\|null` | UUID do usuário logado |
| `getCurrentUser()` | `object\|null` | Objeto completo do usuário |
| `isUserLoggedIn()` | `boolean` | Verifica se está logado |
| `getCurrentSession()` | `object\|null` | Sessão atual |
| `getAccessToken()` | `string\|null` | Token de acesso |
| `getUserInfo()` | `object\|null` | Informações básicas |
| `refreshSession()` | `object\|null` | Atualiza sessão |
| `logout()` | `boolean` | Faz logout |
| `onAuthStateChange()` | `function` | Monitora mudanças |
| `hasPermission()` | `boolean` | Verifica permissão |
| `getUserPlan()` | `string\|null` | Plano do usuário |
| `isPremiumUser()` | `boolean` | Verifica se é premium |

## ✅ Benefícios

1. **Centralizado:** Todas as funções de auth em um lugar
2. **Consistente:** Mesmo padrão de tratamento de erros
3. **Flexível:** Suporte a diferentes cenários de uso
4. **Robusto:** Tratamento de erros de rede e sessão
5. **Reutilizável:** Fácil de usar em qualquer componente
6. **TypeScript Ready:** Pronto para tipagem se necessário
