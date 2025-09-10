import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Platform, Image, Alert, ScrollView, Linking, Animated, Easing, useColorScheme
} from 'react-native';
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

  const isConnecting = status === 'connecting';
  const isPlaying   = status === 'playing';

  // ---------- buscar nome do usuário ----------
  const fetchUserName = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('Usuário não encontrado:', userError?.message);
        setUserName('Usuário');
        return;
      }

      // Buscar perfil diretamente com Supabase para evitar erro do .single()
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle(); // Usa maybeSingle() em vez de single()

      if (profileError) {
        console.log('Erro ao buscar perfil:', profileError.message);
        // Se não encontrar perfil, usar o email como fallback
        setUserName(user.email?.split('@')[0] || 'Usuário');
        return;
      }

      // Se encontrou perfil e tem nome completo, usar ele
      if (profile && profile.full_name) {
        setUserName(profile.full_name);
      } else {
        // Senão, usar email como fallback
        setUserName(user.email?.split('@')[0] || 'Usuário');
      }

      // Definir avatar do usuário
      setUserAvatar(profile?.avatar_url || '');
    } catch (error) {
      console.error('Erro ao buscar nome do usuário:', error);
      setUserName('Usuário');
    }
  }, []);

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
            <View style={[styles.logoCircle, { backgroundColor: C.text }]}>
              {userAvatar ? (
                <Image 
                  source={{ uri: userAvatar }} 
                  style={styles.heroLogoAvatar} 
                />
              ) : (
                <Image 
                  source={require('./assets/images/ico_user.png')} 
                  style={[styles.heroLogo, { tintColor: dark ? '#0b1220' : '#fff' }]} 
                />
              )}
            </View>
            <Text style={[styles.welcomeTitle, { color: C.text }]}>BEM-VINDO</Text>
            <Text style={[styles.welcomeSubtitle, { color: C.subtext }]}>{userName}</Text>
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
              <Text style={[styles.playerTitle, { color: C.text }]}>Reproduzir playlist</Text>
              <Text style={[styles.playerSubtitle, { color: C.subtext }]}>{flatTracks().length || 200} músicas</Text>
              <View style={[styles.progressTrack, { backgroundColor: dark ? '#1f2937' : '#eef2f7' }]} />
            </View>

            <Pressable
              style={[styles.playButton, isConnecting && { opacity: 0.6 }]}
              onPress={() => (current ? handlePlay(current) : fetchPlaylist())}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="play-arrow" size={22} color="#fff" />
              )}
              <Text style={styles.playButtonText}>
                {isPlaying ? 'Reproduzindo' : 'Reproduzir playlist'}
              </Text>
            </Pressable>

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

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Mini player */}
        <View style={[styles.miniPlayer, { backgroundColor: C.card, elevation: C.shadow }]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.nowTitle, { color: C.text }]} numberOfLines={1}>{current?.title || 'Nome da música'}</Text>
            <Text style={[styles.nowArtist, { color: C.subtext }]} numberOfLines={1}>{current?.artist || 'Artista'}</Text>
          </View>
          <View style={styles.controls}>
            <MaterialIcons name="skip-previous" size={24} color={C.text} onPress={() => go(-1)} />
            <Pressable onPress={togglePlayPause} disabled={isConnecting || !current} style={styles.playFab}>
              {isPlaying ? (
                <MaterialIcons name="pause" size={26} color="#fff" />
              ) : (
                <MaterialIcons name="play-arrow" size={26} color="#fff" />
              )}
            </Pressable>
            <MaterialIcons name="skip-next" size={24} color={C.text} onPress={() => go(1)} />
          </View>
        </View>
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

  content: { paddingHorizontal: 18, paddingBottom: 8 },

  // Boas-vindas
  welcomeSection: { alignItems: 'center', marginTop: 8, marginBottom: 22 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroLogo: { width: 80, height: 80 },
  heroLogoAvatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    resizeMode: 'cover'
  },
  welcomeTitle: { fontSize: 24, fontWeight: '800' },
  welcomeSubtitle: { fontSize: 14 },

  // Card Player
  playerCard: {
    borderRadius: 18, padding: 18, marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  coverContainer: { alignItems: 'center', marginBottom: 12 },
  coverImage: { width: 120, height: 120, borderRadius: 60 },
  playerInfo: { alignItems: 'center', marginBottom: 12 },
  playerTitle: { fontSize: 16, fontWeight: '800' },
  playerSubtitle: { fontSize: 14, marginBottom: 10 },
  progressTrack: { height: 6, borderRadius: 8, width: '100%' },

  playButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0A2A54', borderRadius: 14, paddingVertical: 12, gap: 6,
  },
  playButtonText: { color: '#fff', fontWeight: '800' },

  secondaryBtn: {
    marginTop: 10, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '800' },

  // Portais
  sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 10, paddingLeft: 2 },
  portalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  portalItem: {
    width: '31%', borderRadius: 14, padding: 12, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  portalLogo: { width: 56, height: 56, borderRadius: 12, marginBottom: 8 },
  portalText: { fontSize: 12, textAlign: 'center', fontWeight: '700' },

  // Mini Player
  miniPlayer: {
    position: 'absolute', left: 18, right: 18, bottom: 20,
    borderRadius: 16, padding: 12, paddingRight: 50,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
  nowTitle: { fontSize: 14, fontWeight: '800' },
  nowArtist: { fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playFab: { backgroundColor: '#0A2A54', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
