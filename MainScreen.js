import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Platform, Image, Alert, ScrollView, Linking, Animated, Easing, useColorScheme
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Player from './PlayerService';
import { supabase, users } from './supabase';

const PLAYLIST_URL = 'https://musicas.wkdesign.com.br/playlist.php';

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
  // Tema: começa no tema do sistema, mas o usuário pode alternar no ícone
  const systemIsDark = useColorScheme() === 'dark';
  const [dark, setDark] = useState(route.params?.dark ?? systemIsDark);

  const [status, setStatus] = useState('idle'); // idle | connecting | playing | paused | error
  const [library, setLibrary] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isCustomQueue, setIsCustomQueue] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const isConnecting = status === 'connecting';
  const isPlaying   = status === 'playing';

  // Função para formatar tempo em MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para lidar com o arrastar do slider
  const handleSliderChange = async (value) => {
    if (duration > 0) {
      const newPosition = (value / 100) * duration;
      setCurrentTime(newPosition);
      await Player.seekTo(newPosition * 1000); // PlayerService espera em millisegundos
    }
  };

  // ---------- buscar nome do usuário ----------
  const fetchUserName = useCallback(async () => {
    // Evitar chamadas duplicadas
    if (isLoadingProfile) {
      console.log('Carregamento de perfil já em andamento, ignorando...');
      return;
    }

    try {
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
    }
  }, [isLoadingProfile]);

  useEffect(() => {
    fetchUserName();
  }, [fetchUserName]);

  // Recarregar nome quando voltar da tela de edição de perfil
  useFocusEffect(
    useCallback(() => {
      fetchUserName();
    }, [fetchUserName])
  );

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

  // ✅ Recebe seleção múltipla vinda da Playlist SEMPRE que o Main ganhar foco
  useFocusEffect(
    useCallback(() => {
      const queue = route?.params?.customQueue;
      const shouldPlayQueue = route?.params?.shouldPlayQueue;

      if (Array.isArray(queue) && queue.length) {
        setIsCustomQueue(true);
        setCurrent(queue[0]);
        setLibrary([{ name: 'Custom', tracks: queue }]);

        (async () => {
          if (shouldPlayQueue) await handlePlay(queue[0]);
        })();

        // limpa params para evitar reaplicar no próximo foco
        navigation.setParams({
          customQueue: undefined,
          shouldPlayQueue: undefined,
          ts: undefined,
        });
      }
    }, [route?.params?.ts]) // depende do 'ts' que vem da Playlist
  );

  // Carrega playlist (não sobrescreve se o usuário montou uma fila custom)
  const fetchPlaylist = useCallback(async () => {
    try {
      if (isCustomQueue) return; // não sobrescrever seleção do usuário
      const r = await fetch(PLAYLIST_URL, { cache: 'no-store' });
      const data = await r.json();
      const lib = Array.isArray(data?.library) ? data.library : [];
      setLibrary(lib);
      const first = lib[0]?.tracks?.[0];
      if (first && !current) setCurrent(first);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar a playlist.');
      console.warn('Playlist load error', e);
    }
  }, [current, isCustomQueue]);
  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  const onPlaybackStatus = (s) => {
    if (!s || !s.isLoaded) return;
    
    // Atualizar tempo atual e duração
    if (s.positionMillis !== undefined && s.durationMillis !== undefined) {
      setCurrentTime(s.positionMillis / 1000);
      setDuration(s.durationMillis / 1000);
    }
    
    // Avança automaticamente quando a faixa termina
    if (s.didJustFinish) {
      go(1);
      return;
    }
    if (s.isBuffering) return setStatus('connecting');
    if (s.isPlaying)   return setStatus('playing');
    setStatus('paused');
  };

  async function handlePlay(track) {
    if (!track || isConnecting) return;
    setStatus('connecting');
    await Player.play(track.url, onPlaybackStatus);
  }
  async function togglePlayPause() {
    if (isPlaying) { await Player.pause(); setStatus('paused'); }
    else if (current) { await handlePlay(current); }
  }

  const flatTracks = () => library.flatMap(g => Array.isArray(g?.tracks) ? g.tracks : []);
  const go = async (delta) => {
    if (isConnecting) return;
    const list = flatTracks();
    if (!list.length || !current) return;
    const idx = list.findIndex(t => (t?.id ?? t?.url) === (current?.id ?? current?.url));
    const next = list[(idx + delta + list.length) % list.length];
    setCurrent(next);
    await handlePlay(next);
  };

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
              <Text style={styles.planBadgeText}>BASIC • 3/10</Text>
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
              <Text style={[styles.playerTitle, { color: C.text }]}>E quando chega a noite - João Gomes</Text>
              <Text style={[styles.playerSubtitle, { color: C.subtext }]}>Forro</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={duration > 0 ? (currentTime / duration) * 100 : 0}
                  onValueChange={handleSliderChange}
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
              <MaterialIcons name="skip-previous" size={24} color={C.text} onPress={() => go(-1)} />
              <Pressable
                style={[styles.mainPlayButton, isConnecting && { opacity: 0.6 }]}
                onPress={togglePlayPause}
                disabled={isConnecting || !current}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={28} color="#fff" />
                )}
              </Pressable>
              <MaterialIcons name="skip-next" size={24} color={C.text} onPress={() => go(1)} />
              <MaterialIcons name="repeat" size={24} color={C.text} />
            </View>

            <Pressable
              style={[styles.secondaryBtn, { borderColor: C.text, backgroundColor: C.card }]}
              onPress={() =>
                navigation.navigate('Playlist', {
                  currentTrack: current,
                  isPlaying,
                  onSelect: async (track) => {
                    setCurrent(track);
                    setStatus('connecting');
                    await Player.play(track.url, onPlaybackStatus);
                    navigation.reset({ index: 0, routes: [{ name: 'Main', params: { dark } }] });
                  },
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
