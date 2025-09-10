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
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Player from './PlayerService';
import { supabase } from './supabase';

const PLAYLIST_URL = 'https://musicas.wkdesign.com.br/playlist.php';

export default function PlaylistScreen({ navigation, route }) {
  const [library, setLibrary] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(route.params?.currentTrack || null);
  const [isPlaying, setIsPlaying] = useState(route.params?.isPlaying || false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [genreIndex, setGenreIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | connecting | playing | paused | error
  const [searchQuery, setSearchQuery] = useState('');
  const [userPlaylist, setUserPlaylist] = useState([]); // Playlist personalizada do usuário
  const [isLoadingUserPlaylist, setIsLoadingUserPlaylist] = useState(true);
  const chipsRef = useRef(null);

  // Callback para reproduzir música selecionada
  const onSelect = route.params?.onSelect;

  useEffect(() => {
    fetchPlaylist();
    loadUserPlaylist();
  }, []);

  // Marcar músicas da playlist do usuário quando ambos os dados estiverem carregados
  useEffect(() => {
    if (library.length > 0 && userPlaylist.length > 0 && !isLoadingUserPlaylist) {
      markUserPlaylistTracks(userPlaylist);
    }
  }, [library, userPlaylist, isLoadingUserPlaylist]);

  // Atualiza o estado quando os parâmetros da rota mudam
  useEffect(() => {
    if (route.params?.currentTrack) {
      setCurrentTrack(route.params.currentTrack);
    }
    if (route.params?.isPlaying !== undefined) {
      setIsPlaying(route.params.isPlaying);
    }
  }, [route.params?.currentTrack, route.params?.isPlaying]);

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

  // Carregar playlist personalizada do usuário
  const loadUserPlaylist = async () => {
    try {
      setIsLoadingUserPlaylist(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('Usuário não encontrado para carregar playlist');
        setIsLoadingUserPlaylist(false);
        return;
      }

      // Buscar playlist personalizada do usuário
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          playlist_tracks (
            id,
            track_id,
            title,
            artist,
            album,
            duration,
            url,
            cover_image_url,
            position
          )
        `)
        .eq('user_id', user.id)
        .eq('name', 'Minha Playlist')
        .maybeSingle();

      if (playlistError) {
        console.log('Erro ao buscar playlist do usuário:', playlistError.message);
      } else if (playlist && playlist.playlist_tracks) {
        // Ordenar por posição e converter para formato compatível
        const tracks = playlist.playlist_tracks
          .sort((a, b) => a.position - b.position)
          .map(track => ({
            id: track.track_id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            url: track.url,
            cover_image_url: track.cover_image_url
          }));
        
        setUserPlaylist(tracks);
      }

    } catch (error) {
      console.error('Erro ao carregar playlist do usuário:', error);
    } finally {
      setIsLoadingUserPlaylist(false);
    }
  };

  // Marcar automaticamente as músicas que já estão na playlist do usuário
  const markUserPlaylistTracks = (userTracks) => {
    const allTracks = library.flatMap(pl => Array.isArray(pl?.tracks) ? pl.tracks : []);
    const newSelectedKeys = new Set();
    
    userTracks.forEach(userTrack => {
      // Encontrar a música correspondente na biblioteca geral
      const matchingTrack = allTracks.find(track => 
        track.id === userTrack.id || track.url === userTrack.url
      );
      
      if (matchingTrack) {
        const trackIndex = allTracks.findIndex(track => 
          track.id === matchingTrack.id || track.url === matchingTrack.url
        );
        const key = trackKey(matchingTrack, trackIndex);
        newSelectedKeys.add(key);
      }
    });
    
    setSelectedKeys(newSelectedKeys);
  };

  // chave estável para itens (id || url)
  const trackKey = (t, idx) => String(t?.id ?? t?.url ?? `track-${idx}`);

  const toggleSelect = (track, idxInSection) => {
    const key = trackKey(track, idxInSection);
    const copy = new Set(selectedKeys);
    if (copy.has(key)) copy.delete(key); else copy.add(key);
    setSelectedKeys(copy);
    
    // Se a música foi selecionada e não é a atual, reproduz automaticamente
    if (copy.has(key) && (!currentTrack || currentTrack.id !== track.id)) {
      playTrack(track);
    }
  };

  // Função para reproduzir uma música individual
  const playTrack = async (track) => {
    if (!track) return;
    
    setCurrentTrack(track);
    setIsPlaying(true);
    setStatus('connecting');
    
    try {
      await Player.play(track.url, (playbackStatus) => {
        if (!playbackStatus || !playbackStatus.isLoaded) return;
        
        if (playbackStatus.didJustFinish) {
          setIsPlaying(false);
          setStatus('idle');
          return;
        }
        
        if (playbackStatus.isBuffering) {
          setStatus('connecting');
          return;
        }
        
        if (playbackStatus.isPlaying) {
          setStatus('playing');
          setIsPlaying(true);
        } else {
          setStatus('paused');
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.warn('Erro ao reproduzir música:', error);
      setStatus('error');
      setIsPlaying(false);
    }
  };

  // Função para pausar/retomar reprodução
  const togglePlayPause = async () => {
    if (!currentTrack) return;
    
    if (isPlaying) {
      await Player.pause();
      setIsPlaying(false);
      setStatus('paused');
    } else {
      await Player.resume((playbackStatus) => {
        if (!playbackStatus || !playbackStatus.isLoaded) return;
        
        if (playbackStatus.isPlaying) {
          setStatus('playing');
          setIsPlaying(true);
        } else {
          setStatus('paused');
          setIsPlaying(false);
        }
      });
    }
  };

  const selectedCount = selectedKeys.size;

  const allTracksInOrder = useMemo(
    () => library.flatMap(pl => Array.isArray(pl?.tracks) ? pl.tracks : []),
    [library]
  );

  // Filtrar músicas baseado na pesquisa
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) {
      // Sem pesquisa: mostra músicas da categoria atual
      const currentPlaylist = library[genreIndex] || { tracks: [] };
      return Array.isArray(currentPlaylist.tracks) ? currentPlaylist.tracks : [];
    }
    
    // Com pesquisa: busca em todas as músicas
    const query = searchQuery.toLowerCase().trim();
    return allTracksInOrder.filter(track => 
      (track?.title?.toLowerCase().includes(query)) ||
      (track?.artist?.toLowerCase().includes(query))
    );
  }, [allTracksInOrder, searchQuery, library, genreIndex]);

  const buildSelection = () => {
    const queue = [];
    allTracksInOrder.forEach((t, idx) => {
      const key = trackKey(t, idx);
      if (selectedKeys.has(key)) queue.push(t);
    });
    return queue;
  };

  const handleConclude = async () => {
    const queue = buildSelection();
    if (!queue.length) {
      Alert.alert('Seleção vazia', 'Escolha ao menos uma música para continuar.');
      return;
    }

    // Salvar playlist personalizada no banco de dados
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Erro', 'Usuário não encontrado');
        return;
      }

      // Verificar se já existe uma playlist personalizada
      const { data: existingPlaylist } = await supabase
        .from('playlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Minha Playlist')
        .maybeSingle();

      let playlistId;
      if (existingPlaylist) {
        // Atualizar playlist existente
        playlistId = existingPlaylist.id;
        
        // Remover todas as músicas existentes
        await supabase
          .from('playlist_tracks')
          .delete()
          .eq('playlist_id', playlistId);
      } else {
        // Criar nova playlist
        const { data: newPlaylist, error: createError } = await supabase
          .from('playlists')
          .insert([{
            user_id: user.id,
            name: 'Minha Playlist',
            description: 'Playlist personalizada do usuário',
            is_public: false,
            track_count: queue.length
          }])
          .select()
          .single();

        if (createError) throw createError;
        playlistId = newPlaylist.id;
      }

      // Adicionar as músicas selecionadas
      const tracksToInsert = queue.map((track, index) => ({
        playlist_id: playlistId,
        track_id: track.id || track.url,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        url: track.url,
        cover_image_url: track.cover_image_url,
        position: index
      }));

      const { error: insertError } = await supabase
        .from('playlist_tracks')
        .insert(tracksToInsert);

      if (insertError) throw insertError;

      // Atualizar contador de músicas na playlist
      await supabase
        .from('playlists')
        .update({ track_count: queue.length })
        .eq('id', playlistId);

      console.log('Playlist personalizada salva com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar playlist:', error);
      Alert.alert('Erro', 'Não foi possível salvar a playlist. Tente novamente.');
      return;
    }

    // Navegar para a tela principal com a playlist
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
        onLongPress={() => playTrack(item)} // Reproduz ao pressionar longo
      >
        <View style={styles.trackInfo}>
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
          {isCurrentTrack && (
            <View style={[styles.playingIndicator, isPlaying && styles.playingIndicatorActive]}>
              <MaterialIcons 
                name={isPlaying ? 'volume-up' : 'volume-off'} 
                size={16} 
                color={isPlaying ? '#0A2A54' : '#8fa2b5'} 
              />
            </View>
          )}
          
          {/* Botão de play/pause rápido */}
          <TouchableOpacity
            style={styles.quickPlayButton}
            onPress={() => {
              if (isCurrentTrack) {
                togglePlayPause();
              } else {
                playTrack(item);
              }
            }}
            disabled={status === 'connecting'}
          >
            <MaterialIcons 
              name={isCurrentTrack && isPlaying ? 'pause' : 'play-arrow'} 
              size={18} 
              color={isCurrentTrack && isPlaying ? '#0A2A54' : '#8fa2b5'} 
            />
          </TouchableOpacity>
          
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

  // Limpa o player quando a tela é desmontada
  useEffect(() => {
    return () => {
      // Não para o player se estiver reproduzindo, apenas limpa o callback
    };
  }, []);


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


        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#8fa2b5" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar músicas..."
              placeholderTextColor="#8fa2b5"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="close" size={20} color="#8fa2b5" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* GÊNERO - só mostra quando não há pesquisa */}
        {!searchQuery.trim() && (
          <>
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
          </>
        )}

        {/* MÚSICAS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>
            {searchQuery.trim() ? 'RESULTADOS DA PESQUISA' : 'MÚSICAS'}
          </Text>
          <View style={styles.headerRule} />
        </View>

        {/* Lista de músicas filtradas */}
        <FlatList
          data={filteredTracks}
          renderItem={renderTrackItem}
          keyExtractor={(it, idx) => trackKey(it, idx)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.playlistContainer}
          removeClippedSubviews
          initialNumToRender={12}
        />
      </SafeAreaView>

      {/* Botão Concluir Fixo */}
      <View style={styles.fixedConcludeContainer}>
        <Pressable style={styles.concludeBtn} onPress={handleConclude}>
          <Text style={styles.concludeText}>CONCLUIR</Text>
        </Pressable>
      </View>
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

  // Barra de pesquisa
  searchContainer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0A2A54',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
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
  playlistContainer: { paddingHorizontal: 18, paddingBottom: 100, paddingTop: 12 },

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
  playingIndicatorActive: {
    backgroundColor: '#d4edda',
  },
  quickPlayButton: {
    padding: 4,
    marginRight: 8,
  },

  // Botão Concluir Fixo
  fixedConcludeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area para iOS
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    ...Platform.select({ 
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } }, 
      android: { elevation: 8 } 
    }),
  },
  concludeBtn: {
    backgroundColor: '#0A2A54',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }),
  },
  concludeText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
});
