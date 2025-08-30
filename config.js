// =====================================================
// CONFIGURAÇÕES CENTRALIZADAS - SUCESSO FM
// =====================================================

// Configurações do Supabase
export const SUPABASE_CONFIG = {
  // Substitua pelas suas credenciais reais
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'SUA_URL_DO_SUPABASE_AQUI',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANONIMA_DO_SUPABASE_AQUI',
};

// Configurações da API externa
export const API_CONFIG = {
  playlistUrl: 'https://musicas.wkdesign.com.br/playlist.php',
  timeout: 10000, // 10 segundos
};

// Configurações do aplicativo
export const APP_CONFIG = {
  name: 'Sucesso FM',
  version: '1.0.0',
  description: 'Aplicativo de streaming de rádio e música',
  
  // URLs dos portais
  portals: {
    sucesso: 'https://radiosucessobrasilia.com.br',
    rcplay: 'https://www.youtube.com/@rcplaytv',
    portalrc: 'https://portalrc.com.br',
  },
  
  // Configurações de reprodução
  player: {
    defaultVolume: 0.8,
    fadeInDuration: 1000, // 1 segundo
    crossfadeDuration: 2000, // 2 segundos
  },
  
  // Configurações de cache
  cache: {
    maxPlaylists: 100,
    maxHistoryItems: 200,
    maxFavoriteTracks: 500,
  },
  
  // Configurações de assinatura
  subscription: {
    plans: {
      free: {
        name: 'Gratuito',
        price: 0,
        features: ['streaming_basic', 'playlists_limit_5', 'ads'],
        playlistLimit: 5,
      },
      premium: {
        name: 'Premium',
        price: 19.90,
        features: ['streaming_hd', 'playlists_unlimited', 'no_ads', 'offline_download'],
        playlistLimit: -1, // ilimitado
      },
      family: {
        name: 'Familiar',
        price: 39.90,
        features: ['streaming_hd', 'playlists_unlimited', 'no_ads', 'offline_download', 'family_accounts'],
        playlistLimit: -1,
        maxUsers: 6,
      },
    },
  },
  
  // Configurações de notificações
  notifications: {
    enabled: true,
    types: {
      newMusic: true,
      playlistUpdates: true,
      subscriptionReminders: true,
      appUpdates: true,
    },
  },
  
  // Configurações de analytics
  analytics: {
    enabled: true,
    trackEvents: [
      'app_open',
      'login',
      'logout',
      'play_track',
      'pause_track',
      'skip_track',
      'create_playlist',
      'add_to_playlist',
      'favorite_track',
      'share_content',
      'upgrade_subscription',
    ],
  },
  
  // Configurações de segurança
  security: {
    passwordMinLength: 8,
    requireSpecialChars: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos
  },
  
  // Configurações de backup
  backup: {
    autoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24 horas
    maxBackups: 7,
    includeData: ['playlists', 'favorites', 'settings', 'history'],
  },
};

// Configurações de desenvolvimento
export const DEV_CONFIG = {
  debug: __DEV__,
  logLevel: __DEV__ ? 'debug' : 'error',
  mockData: __DEV__,
  enableHotReload: __DEV__,
};

// Configurações de produção
export const PROD_CONFIG = {
  debug: false,
  logLevel: 'error',
  mockData: false,
  enableHotReload: false,
  enableAnalytics: true,
  enableCrashReporting: true,
};

// Configurações de teste
export const TEST_CONFIG = {
  mockSupabase: true,
  mockApi: true,
  testUser: {
    email: 'teste@sucessofm.com',
    password: 'teste123',
  },
};

// Função para obter configuração baseada no ambiente
export const getConfig = (environment = 'development') => {
  switch (environment) {
    case 'production':
      return { ...APP_CONFIG, ...PROD_CONFIG };
    case 'test':
      return { ...APP_CONFIG, ...TEST_CONFIG };
    default:
      return { ...APP_CONFIG, ...DEV_CONFIG };
  }
};

// Função para validar configurações
export const validateConfig = () => {
  const errors = [];
  
  if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'SUA_URL_DO_SUPABASE_AQUI') {
    errors.push('URL do Supabase não configurada');
  }
  
  if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'SUA_CHAVE_ANONIMA_DO_SUPABASE_AQUI') {
    errors.push('Chave anônima do Supabase não configurada');
  }
  
  if (errors.length > 0) {
    console.error('❌ Erros de configuração:', errors);
    return false;
  }
  
  console.log('✅ Configurações válidas');
  return true;
};

// Exportar configuração padrão
export default getConfig();
