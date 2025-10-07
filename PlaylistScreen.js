import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { API_CONFIG } from './config';
import { saveCurrentUserPlaylist, resolveCurrentUserPlaylist } from './src/api/playlist';
import { getUserId } from './src/auth/session';
import { usePlayer } from './src/context/PlayerContext';
import { useEffectivePlan } from './src/hooks/useEffectivePlan';

const PLAYLIST_URL = API_CONFIG.playlistUrl;

export default function PlaylistScreen({ navigation, route }) {
  // Usar o contexto do player
  const { 
    currentTrack, 
    isPlaying, 
    status, 
    playTrack, 
    togglePlayPause, 
    loadPlaylist,
    selectedTrackKeys,
    trackKey,
    updateSelectedKeys,
    toggleTrackSelection
  } = usePlayer();
  
  const [library, setLibrary] = useState([]);
  const [genreIndex, setGenreIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPlaylist, setUserPlaylist] = useState([]); // Playlist personalizada do usuário
  const [isLoadingUserPlaylist, setIsLoadingUserPlaylist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planInfo, setPlanInfo] = useState(null);
  const [localLimit, setLocalLimit] = useState(null);
  const chipsRef = useRef(null);
  
  // Hook para buscar plano real do usuário
  const { plan: userPlan, loading: planLoading, refreshPlan } = useEffectivePlan();

  useEffect(() => {
    fetchPlaylist();
    loadServerPlaylist(); // Carregar playlist do servidor usando API
  }, []);

  // Processar músicas customizadas vindas do MainScreen
  useEffect(() => {
    const customTracks = route.params?.customPlaylistTracks;
    if (customTracks && Array.isArray(customTracks) && customTracks.length > 0) {
      console.log('🎵 Processando músicas customizadas do MainScreen:', customTracks.length);
      // Marcar essas músicas como selecionadas quando a biblioteca estiver carregada
      if (library.length > 0) {
        markCustomPlaylistTracks(customTracks);
      }
    }
  }, [route.params?.customPlaylistTracks, library, markCustomPlaylistTracks]);

  // Marcar músicas da playlist do usuário quando ambos os dados estiverem carregados
  // Mas apenas se não há músicas customizadas vindas do MainScreen (evita conflito)
  useEffect(() => {
    const customTracks = route.params?.customPlaylistTracks;
    const hasCustomTracks = customTracks && Array.isArray(customTracks) && customTracks.length > 0;
    
    if (library.length > 0 && userPlaylist.length > 0 && !isLoadingUserPlaylist && !hasCustomTracks) {
      markUserPlaylistTracks(userPlaylist);
    }
  }, [library, userPlaylist, isLoadingUserPlaylist, route.params?.customPlaylistTracks, markUserPlaylistTracks]);

  // Removido: estado agora vem do contexto

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

  // Carregar playlist do servidor usando API
  const loadServerPlaylist = async () => {
    try {
      setIsLoadingUserPlaylist(true);
      
      const data = await resolveCurrentUserPlaylist(1800);
      
      if (data.items && data.items.length > 0) {
        // Converter dados do servidor para formato local
        const serverTracks = data.items.map((item, index) => ({
          trackKey: `server_${index}`,
          id: `server_${index}`,
          title: item.title,
          path: item.path,
          streamUrl: item.streamUrl,
          duration: '0:00',
          artist: 'Artista Desconhecido',
          album: 'Álbum Desconhecido',
          url: item.streamUrl,
          cover_image_url: null
        }));
        
        setUserPlaylist(serverTracks);
      }
    } catch (error) {
      if (error.message.includes('Usuário não autenticado')) {
        navigation.navigate('Login');
      } else {
        console.error('Erro ao carregar playlist do servidor:', error);
      }
    } finally {
      setIsLoadingUserPlaylist(false);
    }
  };

  // Marcar automaticamente as músicas que já estão na playlist do usuário
  const markUserPlaylistTracks = useCallback((userTracks) => {
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
        console.log(`✅ Marcada música do servidor: ${userTrack.title} (key: ${key}, index: ${trackIndex})`);
      }
    });
    
    updateSelectedKeys(newSelectedKeys);
  }, [library, trackKey, updateSelectedKeys]);

  // Marcar músicas da playlist customizada vindas do MainScreen
  const markCustomPlaylistTracks = useCallback((customTracks) => {
    const allTracks = library.flatMap(pl => Array.isArray(pl?.tracks) ? pl.tracks : []);
    const newSelectedKeys = new Set();
    
    console.log('🔍 Iniciando marcação de músicas customizadas:', {
      customTracksCount: customTracks.length,
      libraryTracksCount: allTracks.length,
      currentSelected: selectedTrackKeys.size
    });
    
    customTracks.forEach((customTrack, idx) => {
      console.log(`🔍 Música ${idx + 1}:`, {
        title: customTrack.title,
        id: customTrack.id,
        url: customTrack.url
      });
      
      // Encontrar a música correspondente na biblioteca geral
      const matchingTrack = allTracks.find(track => 
        track.id === customTrack.id || track.url === customTrack.url || track.title === customTrack.title
      );
      
      if (matchingTrack) {
        // Usar o índice direto da função findIndex para manter consistência
        const trackIndex = allTracks.findIndex(track => 
          track.id === matchingTrack.id || track.url === matchingTrack.url || track.title === matchingTrack.title
        );
        const key = trackKey(matchingTrack, trackIndex);
        newSelectedKeys.add(key);
        console.log(`✅ Encontrada e marcada: ${customTrack.title} (key: ${key}, index: ${trackIndex})`);
      } else {
        console.log(`❌ Música não encontrada na biblioteca: ${customTrack.title}`);
      }
    });
    
    updateSelectedKeys(newSelectedKeys);
    console.log('✅ Finalizada marcação:', newSelectedKeys.size, 'músicas da playlist customizada');
  }, [library, trackKey, updateSelectedKeys]);

  const toggleSelect = async (track, idxInSection) => {
    // Verificar se o plano está bloqueado
    if (isBlockedPlan) {
      Alert.alert(
        'Plano Bloqueado',
        'Seu plano atual está bloqueado. Entre em contato conosco para ativá-lo.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    const key = trackKey(track, idxInSection);
    
    // Se está tentando adicionar uma música e já atingiu o limite
    if (!selectedTrackKeys.has(key) && localLimit && selectedTrackKeys.size >= localLimit) {
      Alert.alert(
        'Limite Atingido',
        `Você já selecionou ${localLimit} músicas. Este é o limite do seu plano atual.\n\nPara adicionar mais músicas, entre em contato conosco para fazer upgrade do seu plano.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Usar a função do contexto para alternar seleção
    toggleTrackSelection(key);
    
    // Se a música foi selecionada e não é a atual, reproduz automaticamente
    if (!selectedTrackKeys.has(key) && (!currentTrack || currentTrack.id !== track.id)) {
      playTrack(track);
    }
    
    // Resolver automaticamente quando há músicas selecionadas
    if (selectedTrackKeys.size > 0) {
      try {
        const data = await resolveCurrentUserPlaylist(1800);
        console.log('Playlist resolvida automaticamente:', data.items?.length || 0, 'músicas');
      } catch (error) {
        console.log('Erro ao resolver playlist automaticamente:', error.message);
      }
    }
  };

  // Funções de reprodução agora vêm do contexto

  const selectedCount = selectedTrackKeys.size;

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
    console.log('🔧 Construindo seleção:', {
      totalTracksInOrder: allTracksInOrder.length,
      selectedKeysCount: selectedTrackKeys.size,
      selectedKeys: Array.from(selectedTrackKeys)
    });
    
    allTracksInOrder.forEach((t, idx) => {
      const key = trackKey(t, idx);
      if (selectedTrackKeys.has(key)) {
        queue.push(t);
        console.log(`✅ Música incluída na seleção: ${t.title} (key: ${key})`);
      }
    });
    
    console.log('🎵 Seleção final:', queue.length, 'músicas');
    return queue;
  };

  const handleConclude = async () => {
    const queue = buildSelection();
    if (!queue.length) {
      Alert.alert('Seleção vazia', 'Escolha ao menos uma música para continuar.');
      return;
    }

    // Salvar playlist usando o cliente de API
    try {
      setSaving(true);
      
      // Mapear paths das músicas selecionadas
      const paths = queue.map(track => {
        // Se o track já tem path, usar ele; senão construir a partir do título
        if (track.path) {
          return track.path;
        }
        // Construir path baseado no título (assumindo formato padrão)
        return `genres/${track.genre || 'Unknown'}/${track.title}.mp3`;
      });

      const data = await saveCurrentUserPlaylist(paths);

      // Usar o contexto para carregar a playlist
      loadPlaylist(queue);

      Alert.alert(
        'Sucesso!', 
        `Playlist salva com ${data.saved} músicas!\nPlano: ${data.plan}\nLimite: ${data.limit}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main')
          }
        ]
      );

    } catch (error) {
      console.error('Erro ao salvar playlist:', error);
      
      // Tratamento específico de erros
      if (error.message.includes('Limite do plano')) {
        // Extrair limite da mensagem de erro
        const limitMatch = error.message.match(/máx (\d+)/);
        if (limitMatch) {
          setLocalLimit(parseInt(limitMatch[1]));
        }
        
        Alert.alert(
          'Limite Excedido', 
          error.message + '\n\nPara adicionar mais músicas, entre em contato conosco para fazer upgrade do seu plano.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (error.message.includes('Usuário não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Erro', 'Falha ao salvar playlist. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Função para carregar informações do plano
  const loadPlanInfo = async () => {
    try {
      const data = await resolveCurrentUserPlaylist(1800);
      setPlanInfo({
        plan: data.plan || 'free',
        limit: data.limit || 10,
        total: data.total || 0
      });
      
      // Definir limite local se não estiver definido
      if (!localLimit && data.limit) {
        setLocalLimit(data.limit);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do plano:', error);
      // Definir valores padrão em caso de erro
      setPlanInfo({
        plan: 'free',
        limit: 10,
        total: 0
      });
    }
  };

  // Carregar informações do plano ao montar o componente
  useEffect(() => {
    loadPlanInfo();
  }, []);

  // Função para formatar nome da categoria (pasta)
  const formatCategoryName = (genre) => {
    if (!genre) return 'Categoria';
    
    // Converter hífens em espaços e capitalizar
    return genre
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Verificar se o limite foi atingido
  const currentLimit = userPlan?.songLimit || planInfo?.limit || localLimit || 0;
  const isLimitReached = currentLimit && selectedTrackKeys.size >= currentLimit;
  
  // Verificar se o plano é bloqueado
  const isBlockedPlan = userPlan?.planCode === 'BLOCKED' || userPlan?.planName?.toUpperCase().includes('BLOQUEADO');

  const renderTrackItem = ({ item, index }) => {
    // Sempre usar o índice fornecido pelo FlatList, que já está correto para a lista filtrada
    const key = trackKey(item, index);
    const selected = selectedTrackKeys.has(key);
    const isCurrentTrack = currentTrack?.id === item?.id || currentTrack?.url === item?.url;
    
    // Log de debug para renderização da música
    if (selected) {
      console.log(`🎵 Renderizando música selecionada: ${item.title} (key: ${key})`);
    }

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
              // Verificar se o plano está bloqueado
              if (isBlockedPlan) {
                Alert.alert(
                  'Plano Bloqueado',
                  'Seu plano atual está bloqueado. Entre em contato conosco para ativá-lo.',
                  [{ text: 'OK', style: 'default' }]
                );
                return;
              }
              
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

  const currentPlaylist = library[genreIndex] || { genre: '...', tracks: [] };
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
              {selectedCount > 0 
                ? `${selectedCount}${localLimit ? `/${localLimit}` : ''} selecionada(s)` 
                : 'Escolha as músicas que deseja ouvir'
              }
            </Text>
          </View>

          <View style={styles.menuButton}>
            <MaterialIcons name="more-vert" size={24} color="#0A2A54" />
          </View>
        </View>

        {/* Informações do Plano - Header */}
        {planInfo && (
          <View style={styles.planHeaderContainer}>
            <View style={styles.planHeaderContent}>
               <View style={[styles.planBadge, isBlockedPlan && styles.blockedPlanBadge]}>
                 <Text style={styles.planBadgeText}>{(userPlan?.planName || planInfo?.plan || 'FREE').toUpperCase()}</Text>
               </View>
              <View style={styles.usageContainer}>
                <Text style={styles.usageText}>
                  {isBlockedPlan ? '0/0 músicas' : `${selectedTrackKeys.size}/${userPlan?.songLimit || planInfo?.limit || localLimit || 0} músicas`}
                </Text>
                <View style={styles.usageBar}>
                  <View 
                    style={[
                      styles.usageProgress, 
                      { 
                        width: `${Math.min((selectedTrackKeys.size / (userPlan?.songLimit || planInfo?.limit || localLimit || 1)) * 100, 100)}%`,
                        backgroundColor: isLimitReached ? '#ff6b6b' : '#34C759'
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
            {isLimitReached && (
              <View style={styles.limitAlertContainer}>
                <MaterialIcons name="warning" size={16} color="#ff6b6b" />
                <Text style={styles.limitAlertText}>Limite do plano atingido</Text>
              </View>
            )}
          </View>
        )}

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
                    key={`${pl?.genre ?? 'pl'}-${i}`}
                    onPress={() => scrollChipTo(i)}
                    style={[styles.chip, i === genreIndex && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, i === genreIndex && styles.chipTextActive]}>
                      {formatCategoryName(pl?.genre) || `Categoria ${i + 1}`}
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
          <Pressable 
            style={[styles.concludeBtn, (saving || isLimitReached || isBlockedPlan) && styles.disabledButton]} 
            onPress={handleConclude}
            disabled={saving || isLimitReached || isBlockedPlan}
          >
            <Text style={styles.concludeText}>
              {isBlockedPlan ? 'PLANO BLOQUEADO' : (isLimitReached ? 'LIMITE ATINGIDO' : (saving ? 'SALVANDO...' : 'CONCLUIR'))}
            </Text>
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

  // Informações do Plano - Header
  planHeaderContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  blockedPlanBadge: {
    backgroundColor: '#dc3545', // Vermelho para plano bloqueado
  },
  usageContainer: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
  usageText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  usageBar: {
    width: 120,
    height: 4,
    backgroundColor: '#eef2f7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 2,
  },
  limitAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffe6e6',
  },
  limitAlertText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },


  // Botão Desabilitado
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
});
