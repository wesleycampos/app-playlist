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
    togglePlayPause, 
    goToNext, 
    goToPrevious,
    setIsManualSeeking
  } = usePlayer();

  const { plan: userPlan, loading: isLoadingPlan, refreshPlan } = useEffectivePlan();

  // Debug: Log do plano do usuário
  useEffect(() => {
    console.log('🏠 MainScreen - Plano do usuário:', {
      userPlan,
      isLoadingPlan,
      planName: userPlan?.planName,
      planCode: userPlan?.planCode,
      songLimit: userPlan?.songLimit
    });
  }, [userPlan, isLoadingPlan]);

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
  const fetchUserNameRef = useRef(null);
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

  useEffect(() => {
    fetchUserName();
  }, [fetchUserName]);

  // Recarregar nome quando voltar da tela de edição de perfil
  useFocusEffect(
    useCallback(() => {
      // Só recarrega se o nome ainda está no estado inicial
      if (userName === 'Carregando...') {
        fetchUserName();
      }
      // Recarregar plano quando volta para a tela principal
      console.log('🔄 MainScreen: Recarregando plano ao ganhar foco');
      refreshPlan();
    }, [fetchUserName, userName, refreshPlan])
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
      console.log('📚 Biblioteca processada:', lib.length, 'categorias');
      
      setLibrary(lib);
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
                  {isLoadingPlan ? 'CARREGANDO...' : (userPlan.planName || 'BASIC')}
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
                  customPlaylistTracks: playlist, // Passa as músicas já selecionadas
                })
              }
            >
              <Text style={[styles.secondaryBtnText, { color: C.text }]}>MONTAR MINHA PLAYLIST</Text>
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
