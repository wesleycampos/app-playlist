import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PLAYLIST_URL = 'https://musicas.wkdesign.com.br/playlist.php';

export default function PlaylistScreen({ navigation, route }) {
  const [library, setLibrary] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(route.params?.currentTrack || null);
  const [isPlaying, setIsPlaying] = useState(route.params?.isPlaying || false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [genreIndex, setGenreIndex] = useState(0);
  const chipsRef = useRef(null);

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(PLAYLIST_URL, { cache: 'no-store' });
      const data = await response.json();
      const lib = Array.isArray(data?.library) ? data.library : [];
      setLibrary(lib);
      if (lib.length && genreIndex >= lib.length) setGenreIndex(0);
    } catch (error) {
      console.warn('Erro ao carregar playlist:', error);
    }
  };

  // chave estável para itens (id || url)
  const trackKey = (t, idx) => String(t?.id ?? t?.url ?? `track-${idx}`);

  const toggleSelect = (track, idxInSection) => {
    const key = trackKey(track, idxInSection);
    const copy = new Set(selectedKeys);
    if (copy.has(key)) copy.delete(key); else copy.add(key);
    setSelectedKeys(copy);
  };

  const selectedCount = selectedKeys.size;

  const allTracksInOrder = useMemo(
    () => library.flatMap(pl => Array.isArray(pl?.tracks) ? pl.tracks : []),
    [library]
  );

  const buildSelection = () => {
    const queue = [];
    allTracksInOrder.forEach((t, idx) => {
      const key = trackKey(t, idx);
      if (selectedKeys.has(key)) queue.push(t);
    });
    return queue;
  };

  const handleConclude = () => {
    const queue = buildSelection();
    if (!queue.length) {
      Alert.alert('Seleção vazia', 'Escolha ao menos uma música para continuar.');
      return;
    }
    navigation.navigate({
      name: 'Main',
      params: { customQueue: queue, shouldPlayQueue: true },
      merge: true,
    });
  };

  const renderTrackItem = ({ item, index }) => {
    const key = trackKey(item, index);
    const selected = selectedKeys.has(key);
    const isCurrentTrack = currentTrack?.id === item?.id || currentTrack?.url === item?.url;

    return (
      <Pressable
        style={[styles.trackItem, selected && styles.selectedTrackItem]}
        onPress={() => toggleSelect(item, index)}
      >
        <View style={styles.trackInfo}>
          <View style={[styles.checkCircle, selected && styles.checkCircleOn]}>
            {selected && <MaterialIcons name="check" size={16} color="#fff" />}
          </View>

          <View style={styles.trackDetails}>
            <Text style={[styles.trackTitle, selected && styles.selectedTrackText]} numberOfLines={1}>
              {item?.title || 'Sem título'}
            </Text>
            <Text style={[styles.trackArtist, selected && styles.selectedTrackSubText]} numberOfLines={1}>
              {item?.artist || 'Desconhecido'}
            </Text>
          </View>
        </View>

        <View style={styles.trackActions}>
          {isCurrentTrack && isPlaying && (
            <View style={styles.playingIndicator}>
              <MaterialIcons name="volume-up" size={16} color="#0A2A54" />
            </View>
          )}
          <MaterialIcons
            name={selected ? 'check-circle' : 'radio-button-unchecked'}
            size={22}
            color={selected ? '#0A2A54' : '#8fa2b5'}
          />
        </View>
      </Pressable>
    );
  };

  const currentPlaylist = library[genreIndex] || { name: '...', tracks: [] };
  const currentTracks = Array.isArray(currentPlaylist.tracks) ? currentPlaylist.tracks : [];

  const scrollChipTo = (nextIdx) => {
    setGenreIndex(nextIdx);
    try {
      chipsRef.current?.scrollTo({ x: Math.max(0, (nextIdx - 1) * 120), animated: true });
    } catch {}
  };



  return (
    <LinearGradient colors={['#ffffff', '#f2f5fb', '#e9edf4']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0A2A54" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Montar playlist</Text>
            <Text style={styles.headerSubtitle}>
              {selectedCount > 0 ? `${selectedCount} selecionada(s)` : 'Escolha as músicas que deseja ouvir'}
            </Text>
          </View>

          <View style={styles.menuButton}>
            <MaterialIcons name="more-vert" size={24} color="#0A2A54" />
          </View>
        </View>

        {/* Player Card */}
        {currentTrack && (
          <View style={styles.playerCard}>
            <View style={styles.coverContainer}>
              <Image source={require('./assets/images/disc.png')} style={styles.coverImage} />
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() =>
                navigation.navigate('Main', {
                  selectedTrack: currentTrack,
                  shouldPlay: !isPlaying,
                })
              }
            >
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* GÊNERO */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>GENERO</Text>
          <View style={styles.headerRule} />
        </View>

        <View style={styles.chipsWrap}>
          <Pressable
            disabled={genreIndex <= 0}
            onPress={() => scrollChipTo(Math.max(0, genreIndex - 1))}
            style={styles.navBtn}
          >
            <MaterialIcons name="chevron-left" size={22} color={genreIndex <= 0 ? '#cfd8e3' : '#0A2A54'} />
          </Pressable>

          <ScrollView
            ref={chipsRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {library.map((pl, i) => (
              <Pressable
                key={`${pl?.name ?? 'pl'}-${i}`}
                onPress={() => scrollChipTo(i)}
                style={[styles.chip, i === genreIndex && styles.chipActive]}
              >
                              <Text style={[styles.chipText, i === genreIndex && styles.chipTextActive]}>
                {pl?.name || `Categoria ${i + 1}`}
              </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            disabled={genreIndex >= library.length - 1}
            onPress={() => scrollChipTo(Math.min(library.length - 1, genreIndex + 1))}
            style={styles.navBtn}
          >
            <MaterialIcons name="chevron-right" size={22} color={genreIndex >= library.length - 1 ? '#cfd8e3' : '#0A2A54'} />
          </Pressable>
        </View>

        {/* MÚSICAS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>MÚSICAS</Text>
          <View style={styles.headerRule} />
        </View>

        {/* Lista de músicas da categoria ativa */}
        <FlatList
          data={currentTracks}
          renderItem={renderTrackItem}
          keyExtractor={(it, idx) => trackKey(it, idx)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.playlistContainer}
          removeClippedSubviews
          initialNumToRender={12}
          ListFooterComponent={
            <View style={styles.footerBox}>
              <Pressable style={styles.concludeBtn} onPress={handleConclude}>
                <Text style={styles.concludeText}>CONCLUIR</Text>
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  backButton: { padding: 8, marginRight: 12 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0A2A54' },
  headerSubtitle: { fontSize: 12, color: '#8fa2b5', marginTop: 2 },
  menuButton: { padding: 8, marginLeft: 12 },

  playerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 18,
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  coverContainer: { marginRight: 16 },
  coverImage: { width: 60, height: 60, borderRadius: 30 },
  playerInfo: { flex: 1 },
  nowPlayingTitle: { fontSize: 16, fontWeight: '800', color: '#0A2A54', marginBottom: 4 },
  nowPlayingArtist: { fontSize: 14, color: '#8fa2b5' },
  playButton: {
    backgroundColor: '#0A2A54',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Seções
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: 4 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#8fa2b5', marginRight: 10 },
  headerRule: { flex: 1, height: 2, backgroundColor: '#e6ecf4', borderRadius: 2 },

  // Chips de gêneros
  chipsWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 10 },
  navBtn: { padding: 6 },
  chipsRow: { paddingHorizontal: 6, gap: 10 },
  chip: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } })
  },
  chipActive: { backgroundColor: '#0A2A54' },
  chipText: { color: '#29415c', fontWeight: '700' },
  chipTextActive: { color: '#fff', fontWeight: '800' },

  // Lista
  playlistContainer: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 12 },

  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  selectedTrackItem: { backgroundColor: '#eef6ff' },
  trackInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#8fa2b5',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  checkCircleOn: { backgroundColor: '#0A2A54', borderColor: '#0A2A54' },
  trackDetails: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: '600', color: '#0A2A54', marginBottom: 4 },
  trackArtist: { fontSize: 14, color: '#8fa2b5' },
  selectedTrackText: { color: '#0A2A54' },
  selectedTrackSubText: { color: '#5e6c7b' },
  trackActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playingIndicator: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#e8f4fd',
    alignItems: 'center', justifyContent: 'center',
  },

  footerBox: { paddingTop: 6, paddingBottom: 20 },
  concludeBtn: {
    marginHorizontal: 18,
    backgroundColor: '#0A2A54',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }),
  },
  concludeText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
});
