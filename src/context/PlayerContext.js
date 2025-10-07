// src/context/PlayerContext.js
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { DeviceEventEmitter, Alert } from 'react-native';
import * as Player from '../../PlayerService';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer deve ser usado dentro de um PlayerProvider');
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('idle');
  const [isManualSeeking, setIsManualSeeking] = useState(false);
  
  const [selectedTrackKeys, setSelectedTrackKeys] = useState(new Set());
  const [isCustomQueue, setIsCustomQueue] = useState(false);

  const goToNextRef = useRef();

  // A FONTE DA VERDADE: Esta função é a única que atualiza o estado da UI
  const onPlaybackStatus = useCallback((playbackStatus) => {
    if (!playbackStatus) return;

    // Se o som foi descarregado ou deu erro, reseta o estado
    if (!playbackStatus.isLoaded) {
      if (playbackStatus.error) {
        console.error(`[Context] Erro no Player: ${playbackStatus.error}`);
        setStatus('error');
        setIsPlaying(false);
      }
      return;
    }

    // Atualiza o estado da UI com base no que o player informa
    setIsPlaying(playbackStatus.isPlaying);

    if (playbackStatus.isBuffering) setStatus('connecting');
    else if (playbackStatus.isPlaying) setStatus('playing');
    else setStatus('paused');

    // Envia atualização de tempo para a MainScreen
    if (!isManualSeeking) {
      DeviceEventEmitter.emit('playbackStatusUpdate', {
        currentTime: playbackStatus.positionMillis / 1000,
        duration: playbackStatus.durationMillis / 1000,
      });
    }

    // Passa para a próxima música quando a atual termina
    if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
      goToNextRef.current?.();
    }
  }, [isManualSeeking]);

  const [isLoading, setIsLoading] = useState(false);

  // Função para renovar URLs da playlist
  const renewPlaylistUrls = useCallback(async () => {
    try {
      console.log('[Context] 🔄 Renovando URLs da playlist via API (TTL 7200)...');
      // Pede para a API gerar novas URLs assinadas com TTL maior
      const { resolveCurrentUserPlaylist } = await import('../api/playlist');
      const data = await resolveCurrentUserPlaylist(7200);

      if (!data?.items || data.items.length === 0) {
        console.warn('[Context] ⚠️ Nenhuma música retornada ao renovar URLs');
        return false;
      }

      // Monta nova playlist com URLs atualizadas
      const refreshed = data.items.map((item, index) => {
        const url = item.streamUrl || item.url || item.audio_url || item.path;
        return {
          trackKey: `server_${index}`,
          id: `server_${index}`,
          title: item.title || 'Música',
          path: item.path,
          streamUrl: url,
          duration: '0:00',
          artist: 'Artista Desconhecido',
          album: 'Álbum Desconhecido',
          url,
          cover_image_url: null,
        };
      }).filter(t => !!t.url);

      if (refreshed.length === 0) {
        console.warn('[Context] ⚠️ Nenhuma URL válida após renovação');
        return false;
      }

      console.log('[Context] ✅ URLs renovadas. Músicas:', refreshed.length);
      setPlaylist(refreshed);
      return true;
    } catch (error) {
      console.error('[Context] ❌ Erro ao renovar URLs:', error);
      return false;
    }
  }, []);

  const playTrack = useCallback(async (track, retryCount = 0) => {
    // Validação robusta
    if (!track) {
      console.error('[Context] ❌ Track inválido (null ou undefined)');
      Alert.alert('Erro', 'Música inválida');
      return;
    }

    if (!track.url && !track.path) {
      console.error('[Context] ❌ Track sem URL ou path:', {
        title: track.title,
        id: track.id,
        streamUrl: track.streamUrl,
        path: track.path
      });
      Alert.alert('Erro', 'Música sem URL de reprodução');
      return;
    }

    // Evita chamadas simultâneas
    if (isLoading && retryCount === 0) {
      console.log('[Context] ⏳ Carregamento já em andamento, ignorando nova chamada');
      return;
    }

    console.log('[Context] 🎵 Iniciando reprodução:', {
      title: track.title || track.name,
      url: track.url ? track.url.substring(0, 100) + '...' : 'sem URL',
      path: track.path,
      tentativa: retryCount + 1
    });

    setIsLoading(true);
    setCurrentTrack(track);
    setStatus('connecting');
    
    // Se for a primeira tentativa E tiver path, busca URL fresca do servidor
    let urlToPlay = track.url;
    if (retryCount === 0 && track.path) {
      console.log('[Context] 🔄 Buscando URL fresca do servidor antes de tocar...');
      try {
        const { resolveCurrentUserPlaylist } = await import('../api/playlist');
        const data = await resolveCurrentUserPlaylist(7200);
        
        if (data?.items && data.items.length > 0) {
          // Encontra a música pelo path
          const freshTrack = data.items.find(item => item.path === track.path);
          if (freshTrack) {
            urlToPlay = freshTrack.streamUrl || freshTrack.url || freshTrack.audio_url || freshTrack.path;
            console.log('[Context] ✅ URL fresca obtida:', urlToPlay.substring(0, 100) + '...');
            
            // Atualiza a playlist inteira com URLs frescas
            const refreshed = data.items.map((item, index) => {
              const url = item.streamUrl || item.url || item.audio_url || item.path;
              return {
                trackKey: `server_${index}`,
                id: `server_${index}`,
                title: item.title || 'Música',
                path: item.path,
                streamUrl: url,
                duration: '0:00',
                artist: 'Artista Desconhecido',
                album: 'Álbum Desconhecido',
                url,
                cover_image_url: null,
              };
            }).filter(t => !!t.url);
            
            if (refreshed.length > 0) {
              setPlaylist(refreshed);
              console.log('[Context] ✅ Playlist atualizada com URLs frescas');
            }
          }
        }
      } catch (e) {
        console.warn('[Context] ⚠️ Não foi possível buscar URL fresca, usando URL existente:', e.message);
      }
    }
    
    if (!urlToPlay) {
      setIsLoading(false);
      setStatus('error');
      setIsPlaying(false);
      Alert.alert('Erro', 'Não foi possível obter URL válida para reprodução');
      return;
    }
    
    try {
      await Player.play(urlToPlay, onPlaybackStatus);
      console.log('[Context] ✅ Reprodução iniciada com sucesso');
      setIsLoading(false);
    } catch (error) {
      console.error('[Context] ❌ Erro ao reproduzir música:', error);
      
      // Se for erro de URL expirada e ainda não tentou renovar
      if (error.message === 'URL_EXPIRED' && retryCount === 0) {
        console.log('[Context] 🔄 URL expirada - tentando renovar URLs automaticamente...');
        setIsLoading(false);
        
        // Tenta novamente com retry
        if (track.path) {
          console.log('[Context] 🔁 Tentando novamente com URL renovada...');
          await playTrack(track, 1);
          return;
        }
        
        console.log('[Context] ❌ Não é possível renovar - música sem path.');
        setStatus('error');
        setIsPlaying(false);
        Alert.alert('URL Expirada', 'Não foi possível renovar a URL. Recarregue a playlist.');
      } else {
        setIsLoading(false);
        setStatus('error');
        setIsPlaying(false);
        Alert.alert('Erro de Reprodução', 'Não foi possível reproduzir esta música. Tente novamente.');
      }
    }
  }, [onPlaybackStatus, isLoading, renewPlaylistUrls]);

  const togglePlayPause = useCallback(async () => {
    console.log('[Context] 🎮 togglePlayPause chamado:', {
      isPlaying,
      hasCurrentTrack: !!currentTrack,
      status
    });

    try {
      if (!currentTrack) {
        // Se não há música atual, toca a primeira da playlist
        if (playlist.length > 0) {
          console.log('[Context] ▶️ Nenhuma música tocando, iniciando a primeira da playlist');
          await playTrack(playlist[0]);
        } else {
          console.warn('[Context] ⚠️ Nenhuma música na playlist para tocar');
        }
      } else if (isPlaying) {
        console.log('[Context] ⏸️ Pausando música...');
        await Player.pause();
      } else {
        // Validar se a música atual tem URL antes de resumir
        if (!currentTrack.url) {
          console.error('[Context] ❌ Música atual sem URL, não pode resumir');
          Alert.alert('Erro', 'Música atual não possui URL válida');
          return;
        }
        console.log('[Context] ▶️ Resumindo música:', currentTrack.title);
        await Player.resume();
      }
    } catch (error) {
      console.error('[Context] ❌ Erro em togglePlayPause:', error);
      Alert.alert('Erro', 'Não foi possível executar a operação');
    }
  }, [isPlaying, currentTrack, playlist, playTrack]);

  const goToNext = useCallback(async () => {
    if (playlist.length === 0 || isLoading) return;
    const currentIndex = currentTrack ? playlist.findIndex(t => t.url === currentTrack.url) : -1;
    const nextIndex = (currentIndex + 1) % playlist.length;
    await playTrack(playlist[nextIndex]);
  }, [playlist, currentTrack, playTrack, isLoading]);
  
  // Atualiza a ref para o callback
  useEffect(() => { goToNextRef.current = goToNext; }, [goToNext]);

  const goToPrevious = useCallback(async () => {
    if (playlist.length === 0 || isLoading) return;
    const currentIndex = currentTrack ? playlist.findIndex(t => t.url === currentTrack.url) : -1;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    await playTrack(playlist[prevIndex]);
  }, [playlist, currentTrack, playTrack, isLoading]);

  // --- Funções auxiliares (sem alterações na lógica principal) ---
  const loadPlaylist = useCallback((newPlaylist) => {
    const key = (track, index) => String(track?.id ?? track?.url ?? `track-${index}`);
    if (Array.isArray(newPlaylist) && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
      setIsCustomQueue(true);
      const newSelectedKeys = new Set(newPlaylist.map((track, index) => key(track, index)));
      setSelectedTrackKeys(newSelectedKeys);
    } else {
      setPlaylist([]); setCurrentTrack(null); setIsCustomQueue(false); setSelectedTrackKeys(new Set());
    }
  }, []);
  
  const trackKey = useCallback((track, index) => String(track?.id ?? track?.url ?? `track-${index}`), []);
  const updateSelectedKeys = useCallback((newKeys) => setSelectedTrackKeys(newKeys), []);
  const toggleTrackSelection = useCallback((key) => {
    setSelectedTrackKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);
  
  const clearCustomPlaylist = useCallback(() => {
    setPlaylist([]);
    setCurrentTrack(null);
    setIsCustomQueue(false);
    setIsPlaying(false);
    setStatus('idle');
    setSelectedTrackKeys(new Set());
  }, []);

  const value = {
    playlist, currentTrack, isPlaying, status, isCustomQueue, selectedTrackKeys, isManualSeeking, isLoading,
    loadPlaylist, playTrack, togglePlayPause, goToNext, goToPrevious,
    trackKey, updateSelectedKeys, toggleTrackSelection, setIsManualSeeking,
    // Adicionando funções que faltavam
    pauseTrack: Player.pause,
    resumeTrack: Player.resume,
    clearCustomPlaylist,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};