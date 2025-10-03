import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Platform, Image, Alert, ScrollView, Linking, Animated, Easing, useColorScheme,
  DeviceEventEmitter
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Player from './PlayerService';
import { supabase, users } from './supabase';
import { usePlayer } from './src/context/PlayerContext';
import { resolveCurrentUserPlaylist } from './src/api/playlist';
import { useEffectivePlan } from './src/hooks/useEffectivePlan';

const PLAYLIST_URL = 'https://musicas.radiosucessobrasilia.com.br/playlist.php';

const LINKS = {
  sucesso: 'SucessoFMWebView',
  rcplay: 'RCPlayTVWebView',
  portalrc: 'PortalRCNewsWebView',
};

// ---------- abrir link (in-app + fallback) ----------
const normalizeUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};
// ----------------------------------------------------

export default function MainScreen({ navigation, route }) {
  // Usar o contexto do player
  const { 
    playlist, 
    currentTrack, 
    isPlaying, 
    status, 
    isCustomQueue, 
    isManualSeeking,
    loadPlaylist,
    togglePlayPause, 
    goToNext, 
    goToPrevious,
    setIsManualSeeking
  } = usePlayer();

  // Tema: começa no tema do sistema, mas o usuário pode alternar no ícone
  const systemIsDark = useColorScheme() === 'dark';
  const [dark, setDark] = useState(route.params?.dark ?? systemIsDark);

  const [library, setLibrary] = useState([]);
  const [userName, setUserName] = useState('Carregando...');
  const [userAvatar, setUserAvatar] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasExistingPlaylist, setHasExistingPlaylist] = useState(false);
  const [playlistCheckLoading, setPlaylistCheckLoading] = useState(true);
  const fetchUserNameRef = useRef(null);
  
  // Hook para buscar plano real do usuário
  const { plan: userPlan, loading: planLoading, refreshPlan } = useEffectivePlan();

  const refreshPlanAndPlaylist = useCallback(async () => {
    console.log('🔄 Atualizando plano e playlist...');
    setPlaylistCheckLoading(true);
    await refreshPlan();
    await checkExistingPlaylist(); // Já inclui o carregamento da playlist no contexto
    setPlaylistCheckLoading(false);
  }, [refreshPlan, checkExistingPlaylist]);

  // Carregar playlist salva do usuário para reprodução na MainScreen
  const loadUserPlaylistForMain = useCallback(async () => {
    try {
      console.log('🎵 Carregando playlist do usuário para tela principal...');
      const data = await resolveCurrentUserPlaylist(1800);
      
      if (data.items && data.items.length > 0) {
        const serverTracks = data.items.map((item, index) => ({
          trackKey: `server_${index}`,
          id: `server_${index}`,
          title: item.title,
          path: item.path,
          streamUrl: item.streamUrl,
          duration: '0:00',
          artist: 'Artista Desconhecido',
          album: 'Álbum Desconhecido',
          url: item.streamUrl, // Usar streamUrl diretamente
          cover_image_url: null
        }));
        
        console.log('🎵 Playlist carregada para MainScreen:', serverTracks.length, 'músicas');
        console.log('🔍 Primeira música:', {
          title: serverTracks[0]?.title,
          url: serverTracks[0]?.url,
          streamUrl: serverTracks[0]?.streamUrl
        });
        
        // Usar o contexto para carregar a playlist
        loadPlaylist(serverTracks);
      } else {
        console.log('📭 Nenhuma playlist encontrada para tela principal');
        // Limpar playlist se não há nada salvo
        loadPlaylist([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar playlist para MainScreen:', error);
      loadPlaylist([]);
    }
  }, [loadPlaylist]);
  const fetchTimeoutRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const lastSeekPositionRef = useRef(0);

  const isConnecting = status === 'connecting';

  // Função para formatar tempo em MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para lidar com o início do arraste do slider
  const handleSliderStart = () => {
    setIsManualSeeking(true);
  };

  // Função para lidar com o arrastar do slider (apenas UI)
  const handleSliderChange = (value) => {
    if (duration > 0) {
      const newPosition = (value / 100) * duration;
      setCurrentTime(newPosition);
      // Não faz seek aqui, apenas atualiza a UI
    }
  };

  // Função para lidar com o fim do arraste do slider
  const handleSliderComplete = async (value) => {
    if (duration > 0) {
      const newPosition = (value / 100) * duration;
      
      // Limpar timeout anterior se existir
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      
      // Fazer seek apenas quando o usuário soltar o slider
      seekTimeoutRef.current = setTimeout(async () => {
        try {
          await Player.seekTo(newPosition * 1000); // PlayerService espera em millisegundos
          lastSeekPositionRef.current = newPosition;
        } catch (error) {
          console.log('Erro ao fazer seek:', error.message);
        } finally {
          // Reativar atualizações automáticas após o seek
          setTimeout(() => {
            setIsManualSeeking(false);
          }, 200); // Aguarda 200ms para estabilizar
        }
      }, 100); // Pequeno delay para evitar conflitos
    }
  };

  // ---------- buscar nome do usuário ----------
  const fetchUserNameInternal = useCallback(async () => {
    // Evitar chamadas duplicadas usando ref
    if (fetchUserNameRef.current) {
      console.log('Carregamento de perfil já em andamento, ignorando...');
      return;
    }

    try {
      fetchUserNameRef.current = true;
      setIsLoadingProfile(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('Usuário não encontrado:', userError?.message);
        setUserName('Usuário');
        setUserAvatar('');
        return;
      }

      // Definir nome padrão baseado no email
      const defaultName = user.email?.split('@')[0] || 'Usuário';
      setUserName(defaultName);
      setUserAvatar('');

      // Tentar buscar perfil apenas se o usuário estiver autenticado
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileError && profileData && profileData.full_name) {
          setUserName(profileData.full_name);
          if (profileData.avatar_url) {
            setUserAvatar(profileData.avatar_url);
          }
        }
      } catch (profileError) {
        console.log('Erro ao buscar perfil (não crítico):', profileError.message);
        // Não é crítico, mantém o nome padrão
      }
    } catch (error) {
      console.error('Erro geral ao buscar dados do usuário:', error);
      setUserName('Usuário');
      setUserAvatar('');
    } finally {
      setIsLoadingProfile(false);
      fetchUserNameRef.current = null;
    }
  }, []);

  // Função com debounce para evitar chamadas muito rápidas
  const fetchUserName = useCallback(() => {
    // Limpar timeout anterior se existir
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Definir novo timeout
    fetchTimeoutRef.current = setTimeout(() => {
      fetchUserNameInternal();
    }, 100); // 100ms de debounce
  }, [fetchUserNameInternal]);

  // Função para verificar se o usuário tem playlist existente
  const checkExistingPlaylist = useCallback(async () => {
    try {
      setPlaylistCheckLoading(true);
      console.log('🔍 Iniciando verificação de playlist existente...');
      const data = await resolveCurrentUserPlaylist(1800);
      
      console.log('📊 Dados completos da API:', data);
      
      // Verificação mais rigorosa
      const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
      const hasValidTracks = data.items?.every(item => item.title && item.path) || false;
      const hasPlaylist = hasItems && hasValidTracks;
      
      console.log('🔍 Análise detalhada:', {
        hasItems,
        hasValidTracks,
        hasPlaylist,
        itemsCount: data.items?.length || 0,
        items: data.items
      });
      
      setHasExistingPlaylist(hasPlaylist);
      
      if (hasPlaylist) {
        console.log('✅ Playlist encontrada - botão será "ALTERAR"');
        // Carregar a playlist para a tela principal
        loadUserPlaylistForMain();
      } else {
        console.log('❌ Nenhuma playlist válida - botão será "MONTAR"');
        // Limpar playlist da tela principal
        loadPlaylist([]);
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar playlist:', error.message);
      setHasExistingPlaylist(false);
      console.log('❌ Erro na verificação - botão será "MONTAR"');
    } finally {
      setPlaylistCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserName();
    checkExistingPlaylist();
  }, [fetchUserName, checkExistingPlaylist]);

  // Recarregar dados quando voltar para a tela principal
  useFocusEffect(
    useCallback(() => {
      // Só recarrega se o nome ainda está no estado inicial
      if (userName === 'Carregando...') {
        fetchUserName();
      }
      // Sempre recarrega o plano e playlist quando volta para a tela principal
      console.log('🔄 useFocusEffect: verificando plano e playlist ao voltar para MainScreen');
      refreshPlanAndPlaylist();
    }, [fetchUserName, userName, refreshPlanAndPlaylist])
  );

  // Cleanup dos timeouts quando o componente desmontar
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  // ---------- animação do disco ----------
  const spin = useRef(new Animated.Value(0)).current;
  const spinAnimRef = useRef(null);
  const startSpin = () => {
    spin.setValue(0);
    spinAnimRef.current = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    );
    spinAnimRef.current.start();
  };
  const stopSpin = () => { spinAnimRef.current?.stop(); spinAnimRef.current = null; };
  useEffect(() => { isPlaying ? startSpin() : stopSpin(); return () => stopSpin(); }, [isPlaying]);
  const rotateDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Removido: useFocusEffect não é mais necessário, o estado vem do contexto

  // Carrega playlist (não sobrescreve se o usuário montou uma fila custom)
  const fetchPlaylist = useCallback(async () => {
    try {
      if (isCustomQueue) {
        console.log('📱 Fila custom ativa, não carregando playlist externa');
        return; // não sobrescrever seleção do usuário
      }
      
      console.log('🎵 Carregando playlist externa...');
      const r = await fetch(PLAYLIST_URL, { cache: 'no-store' });
      const data = await r.json();
      console.log('📊 Dados da playlist recebidos:', data);
      
      const lib = Array.isArray(data?.library) ? data.library : [];
      
      // Processar categorias para usar o genre como nome
      const processedLibrary = lib.map(category => {
        const categoryName = category.genre || 'Categoria';
        
        // Criar nome mais amigável substituindo hífens e dividindo palavras
        const friendlyName = categoryName
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        return {
          ...category,
          name: friendlyName,
          originalGenre: categoryName
        };
      });
      
      console.log('📚 Biblioteca processada:', processedLibrary.length, 'categorias');
      
      setLibrary(processedLibrary);
    } catch (e) {
      console.error('❌ Erro ao carregar playlist:', e);
      Alert.alert('Erro', 'Não foi possível carregar a playlist.');
    }
  }, [isCustomQueue]);
  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  // Escutar eventos de atualização do tempo vindos do contexto
  useEffect(() => {
    const handlePlaybackStatusUpdate = (data) => {
      const { currentTime, duration } = data;
      setCurrentTime(currentTime);
      setDuration(duration);
    };

    // Adicionar listener para eventos do contexto
    const subscription = DeviceEventEmitter.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);

    return () => {
      subscription.remove();
    };
  }, []);

  // Escutar eventos de playlist salva para atualizar estado
  useEffect(() => {
    const handlePlaylistSaved = (data) => {
      console.log('📥 MainScreen recebeu evento playlistSaved:', data);
      if (data.success) {
        // Recarregar plano e playlist após salvar
        setTimeout(() => {
          refreshPlanAndPlaylist();
        }, 500); // Pequeno delay para garantir que foi salvo
        
        // Também recarregar a playlist para reprodução
        setTimeout(() => {
          loadUserPlaylistForMain();
        }, 800); // Delay adicional para garantir que a API seja atualizada
      }
    };

    const subscription = DeviceEventEmitter.addListener('playlistSaved', handlePlaylistSaved);

    return () => {
      subscription.remove();
    };
  }, [refreshPlanAndPlaylist, loadUserPlaylistForMain]);

  useEffect(() => () => { Player.stop(); }, []);

  // Função para abrir links (portais internos ou externos)
  const openLink = async (url) => {
    console.log('🔗 Tentando abrir link:', url);
    
    // Se for um portal interno, navega para a tela correspondente
    if (url === 'SucessoFMWebView' || url === 'RCPlayTVWebView' || url === 'PortalRCNewsWebView') {
      console.log('📍 Navegando para portal interno:', url);
      navigation.navigate(url);
      return;
    }
    
    // Para links externos, usa o comportamento padrão
    console.log('🌐 Abrindo link externo:', url);
    const safe = normalizeUrl(url);
    try {
      await WebBrowser.openBrowserAsync(safe, {
        enableBarCollapsing: true,
        showTitle: true,
        dismissButtonStyle: 'done',
        presentationStyle: 'automatic',
      });
      return;
    } catch {}
    try { await Linking.openURL(safe); }
    catch { Alert.alert('Atenção', 'Não foi possível abrir este link no dispositivo.'); }
  };

  // Paleta por tema
  const C = {
    gradient: dark ? ['#0b1220', '#0f172a', '#0b1220'] : ['#ffffff', '#f2f5fb', '#e9edf4'],
    text:      dark ? '#E6ECF5' : '#0A2A54',
    subtext:   dark ? '#9FB2C7' : '#8fa2b5',
    card:      dark ? '#111827' : '#ffffff',
    portalTxt: dark ? '#d5e2f2' : '#29415c',
    shadow:    dark ? 0 : 3,
  };

  const PortalButton = ({ label, image, url }) => (
    <Pressable
      onPress={() => {
        console.log('🖱️ PortalButton clicado:', label, 'URL:', url);
        openLink(url);
      }}
      style={({ pressed }) => [styles.portalItem, { backgroundColor: C.card, elevation: C.shadow }, pressed && { transform: [{ scale: 0.98 }] }]}
      android_ripple={{ color: dark ? '#1f2937' : '#e6eef8' }}
    >
      <Image source={image} style={styles.portalLogo} />
      <Text style={[styles.portalText, { color: C.portalTxt }]}>{label}</Text>
    </Pressable>
  );

  return (
    <LinearGradient colors={C.gradient} style={{ flex: 1 }}>
      {/* SafeAreaView sem padding manual: evita “descer demais” */}
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style={dark ? 'light' : 'dark'} />

        {/* Topbar */}
        <View style={styles.topBar}>
          <MaterialIcons name="menu" size={24} color={C.text} onPress={() => navigation.navigate('Menu')} />
          <Text style={[styles.topTitle, { color: C.text }]}>RC PLAY</Text>
          <View style={styles.topIcons}>
            <MaterialIcons
              name="refresh"
              size={24}
              color={C.text}
              onPress={refreshPlanAndPlaylist} 
            />
            <Ionicons
              name={dark ? 'moon' : 'sunny-outline'}
              size={22}
              color={C.text}
              onPress={() => setDark((v) => !v)} // alterna tema
            />
            <Ionicons name="person-circle" size={24} color={C.text} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Boas-vindas */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeLeft}>
              <View style={[styles.logoCircle, { backgroundColor: '#FFD700' }]}>
                <Image 
                  source={require('./assets/images/ico_user.png')} 
                  style={[styles.heroLogo, { tintColor: '#0A2A54' }]} 
                />
              </View>
              <View style={styles.welcomeText}>
                <Text style={[styles.welcomeTitle, { color: C.text }]}>BEM-VINDO</Text>
                <Text style={[styles.welcomeSubtitle, { color: C.subtext }]}>{userName}</Text>
              </View>
            </View>
            <View style={[styles.planBadge, { backgroundColor: '#0A2A54' }]}>
              <Text style={styles.planBadgeText}>
                {userPlan.planName || 'BASIC'}
              </Text>
            </View>
          </View>

          {/* Card do Player */}
          <View style={[styles.playerCard, { backgroundColor: C.card, elevation: C.shadow }]}>
            <View style={styles.coverContainer}>
              <Animated.Image
                source={require('./assets/images/disc.png')}
                style={[styles.coverImage, { transform: [{ rotate: rotateDeg }] }]}
              />
            </View>

            <View style={styles.playerInfo}>
              <Text style={[styles.playerTitle, { color: C.text }]}>
                {currentTrack?.name || currentTrack?.title || 'Nenhuma música selecionada'}
              </Text>
              <Text style={[styles.playerSubtitle, { color: C.subtext }]}>
                {currentTrack?.artist || currentTrack?.genre || 'Artista desconhecido'}
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={duration > 0 ? (currentTime / duration) * 100 : 0}
                  onValueChange={handleSliderChange}
                  onSlidingStart={handleSliderStart}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#0A2A54"
                  maximumTrackTintColor={dark ? '#1f2937' : '#eef2f7'}
                  thumbStyle={{ backgroundColor: '#0A2A54', width: 16, height: 16 }}
                />
              </View>
              <View style={styles.progressTime}>
                <Text style={[styles.timeText, { color: C.subtext }]}>{formatTime(currentTime)}</Text>
                <Text style={[styles.timeText, { color: C.subtext }]}>{formatTime(duration)}</Text>
              </View>
            </View>

            {/* Controles de navegação */}
            <View style={styles.navigationControls}>
              <MaterialIcons name="shuffle" size={24} color={C.text} />
              <MaterialIcons name="skip-previous" size={24} color={C.text} onPress={goToPrevious} />
              <Pressable
                style={[styles.mainPlayButton, isConnecting && { opacity: 0.6 }]}
                onPress={togglePlayPause}
                disabled={isConnecting || !currentTrack}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={28} color="#fff" />
                )}
              </Pressable>
              <MaterialIcons name="skip-next" size={24} color={C.text} onPress={goToNext} />
              <MaterialIcons name="repeat" size={24} color={C.text} />
            </View>

            <Pressable
              style={[styles.secondaryBtn, { borderColor: C.text, backgroundColor: C.card }]}
              onPress={() =>
                navigation.navigate('Playlist', {
                  currentTrack: currentTrack,
                  isPlaying,
                  customPlaylistTracks: hasExistingPlaylist ? playlist : [], // Só passa playlist se realmente tem algo montado
                })
              }
            >
              <Text style={[styles.secondaryBtnText, { color: C.text }]}>
                {playlistCheckLoading 
                  ? 'VERIFICANDO...' 
                  : hasExistingPlaylist 
                    ? 'ALTERAR MINHA PLAYLIST' 
                    : 'MONTAR MINHA PLAYLIST'
                }
              </Text>
            </Pressable>
          </View>

          {/* Portais */}
          <Text style={[styles.sectionTitle, { color: C.subtext }]}>PORTAIS</Text>
          <View style={styles.portalsRow}>
            <PortalButton label="Sucesso 100.5" url={LINKS.sucesso} image={require('./assets/images/ico_sucesso.png')} />
            <PortalButton label="RC Play TV"   url={LINKS.rcplay}   image={require('./assets/images/ico_rcplaytv.png')} />
            <PortalButton label="Portal RC News" url={LINKS.portalrc} image={require('./assets/images/ico_portalrc.png')} />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { fontSize: 13, fontWeight: '800' },
  topIcons: { flexDirection: 'row', gap: 10 },

  content: { paddingHorizontal: 18, paddingBottom: 8, flexGrow: 1 },

  // Boas-vindas
  welcomeSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 4, 
    marginBottom: 16 
  },
  welcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  logoCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  heroLogo: { width: 40, height: 40 },
  heroLogoAvatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 30,
    resizeMode: 'cover'
  },
  welcomeText: {
    flex: 1
  },
  welcomeTitle: { fontSize: 18, fontWeight: '800' },
  welcomeSubtitle: { fontSize: 14 },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },

  // Card Player
  playerCard: {
    borderRadius: 18, padding: 20, marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  coverContainer: { alignItems: 'center', marginBottom: 16 },
  coverImage: { width: 140, height: 140, borderRadius: 70 },
  playerInfo: { alignItems: 'center', marginBottom: 16 },
  playerTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  playerSubtitle: { fontSize: 14, marginBottom: 10 },
  sliderContainer: { width: '100%', marginBottom: 8 },
  slider: { width: '100%', height: 40 },
  progressTime: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%' 
  },
  timeText: { fontSize: 12 },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20
  },
  mainPlayButton: {
    backgroundColor: '#0A2A54',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },

  playButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0A2A54', borderRadius: 14, paddingVertical: 12, gap: 6,
  },
  playButtonText: { color: '#fff', fontWeight: '800' },

  secondaryBtn: {
    marginTop: 8, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '800' },

  // Portais
  sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 10, paddingLeft: 2 },
  portalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  portalItem: {
    width: '31%', borderRadius: 14, padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  portalLogo: { width: 64, height: 64, borderRadius: 12, marginBottom: 10 },
  portalText: { fontSize: 12, textAlign: 'center', fontWeight: '700' },

});
