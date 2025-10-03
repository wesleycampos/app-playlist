import React, { createContext, useContext, useState, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as Player from '../../PlayerService';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer deve ser usado dentro de um PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  // Estados do player
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | connecting | playing | paused | error
  const [isCustomQueue, setIsCustomQueue] = useState(false);
  const [isManualSeeking, setIsManualSeeking] = useState(false);
  
  // Estado para manter a seleção persistente da playlist
  const [selectedTrackKeys, setSelectedTrackKeys] = useState(new Set());

  // Callback para status de reprodução
  const onPlaybackStatus = useCallback((playbackStatus) => {
    if (!playbackStatus || !playbackStatus.isLoaded) return;
    
    // Não atualizar tempo durante seek manual para evitar conflitos
    if (!isManualSeeking && playbackStatus.positionMillis !== undefined && playbackStatus.durationMillis !== undefined) {
      // Disparar evento para atualizar o tempo na MainScreen
      DeviceEventEmitter.emit('playbackStatusUpdate', {
        currentTime: playbackStatus.positionMillis / 1000,
        duration: playbackStatus.durationMillis / 1000
      });
    }
    
    if (playbackStatus.didJustFinish) {
      // Avança para próxima música automaticamente
      goToNext();
      return;
    }
    
    if (playbackStatus.isBuffering) {
      setStatus('connecting');
      return;
    }
    
    // Atualizar estado de reprodução apenas se mudou
    const wasPlaying = playbackStatus.isPlaying;
    if (wasPlaying && !isPlaying) {
      setStatus('playing');
      setIsPlaying(true);
    } else if (!wasPlaying && isPlaying) {
      setStatus('paused');
      setIsPlaying(false);
    }
  }, [goToNext, isPlaying, isManualSeeking]);

  // Carregar nova playlist
  const loadPlaylist = useCallback((newPlaylist) => {
    if (Array.isArray(newPlaylist) && newPlaylist.length > 0) {
      console.log('🎵 Carregando nova playlist no contexto:', newPlaylist.length, 'músicas');
      setPlaylist(newPlaylist);
      // Não definir currentTrack automaticamente - deixar usuário escolher
      // setCurrentTrack(newPlaylist[0]);
      setIsCustomQueue(true);
      
      // Gerar chaves para as músicas da nova playlist
      const newSelectedKeys = new Set();
      newPlaylist.forEach((track, index) => {
        const key = trackKey(track, index);
        newSelectedKeys.add(key);
      });
      setSelectedTrackKeys(newSelectedKeys);
    } else {
      // Se playlist vazia, limpar tudo
      setPlaylist([]);
      setCurrentTrack(null);
      setIsCustomQueue(false);
      setSelectedTrackKeys(new Set());
    }
  }, []);

  // Reproduzir uma música específica
  const playTrack = useCallback(async (track) => {
    if (!track) {
      console.log('⚠️ playTrack: track inválida');
      return;
    }
    
    console.log('🎵 Reproduzindo música:', track.title || track.name);
    setCurrentTrack(track);
    setStatus('connecting');
    
    try {
      await Player.play(track.url, onPlaybackStatus);
    } catch (error) {
      console.error('❌ Erro ao reproduzir música:', error);
      setStatus('error');
      setIsPlaying(false);
    }
  }, [onPlaybackStatus]);

  // Pausar reprodução
  const pauseTrack = useCallback(async () => {
    if (isPlaying) {
      try {
        await Player.pause();
        setStatus('paused');
        setIsPlaying(false);
      } catch (error) {
        console.error('❌ Erro ao pausar música:', error);
      }
    }
  }, [isPlaying]);

  // Retomar reprodução
  const resumeTrack = useCallback(async () => {
    if (!isPlaying && currentTrack) {
      try {
        await Player.resume(onPlaybackStatus);
      } catch (error) {
        console.error('❌ Erro ao retomar música:', error);
        setStatus('error');
      }
    }
  }, [isPlaying, currentTrack, onPlaybackStatus]);

  // Alternar play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pauseTrack();
    } else if (currentTrack) {
      await playTrack(currentTrack);
    } else if (playlist.length > 0) {
      // Se não há música atual mas há playlist, reproduzir a primeira
      console.log('🎵 Nenhuma música atual, reproduzindo primeira da playlist');
      await playTrack(playlist[0]);
    }
  }, [isPlaying, currentTrack, playlist, pauseTrack, playTrack]);

  // Ir para próxima música
  const goToNext = useCallback(async () => {
    if (!playlist.length || !currentTrack) {
      console.log('⚠️ goToNext: playlist vazia ou currentTrack inválido');
      return;
    }
    
    const currentIndex = playlist.findIndex(track => 
      (track?.id ?? track?.url) === (currentTrack?.id ?? currentTrack?.url)
    );
    
    if (currentIndex === -1) {
      console.log('⚠️ goToNext: música atual não encontrada na playlist');
      return;
    }
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextTrack = playlist[nextIndex];
    
    console.log('⏭️ Avançando para próxima música:', nextTrack.title || nextTrack.name);
    await playTrack(nextTrack);
  }, [playlist, currentTrack, playTrack]);

  // Ir para música anterior
  const goToPrevious = useCallback(async () => {
    if (!playlist.length || !currentTrack) {
      console.log('⚠️ goToPrevious: playlist vazia ou currentTrack inválido');
      return;
    }
    
    const currentIndex = playlist.findIndex(track => 
      (track?.id ?? track?.url) === (currentTrack?.id ?? currentTrack?.url)
    );
    
    if (currentIndex === -1) {
      console.log('⚠️ goToPrevious: música atual não encontrada na playlist');
      return;
    }
    
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    const prevTrack = playlist[prevIndex];
    
    console.log('⏮️ Voltando para música anterior:', prevTrack.title || prevTrack.name);
    await playTrack(prevTrack);
  }, [playlist, currentTrack, playTrack]);

  // Limpar playlist customizada
  const clearCustomPlaylist = useCallback(() => {
    console.log('🧹 Limpando playlist customizada');
    setPlaylist([]);
    setCurrentTrack(null);
    setIsCustomQueue(false);
    setIsPlaying(false);
    setStatus('idle');
    setSelectedTrackKeys(new Set());
  }, []);

  // Função auxiliar para gerar chave única da música
  const trackKey = useCallback((track, index) => {
    return String(track?.id ?? track?.url ?? `track-${index}`);
  }, []);

  // Funções para gerenciar seleção
  const updateSelectedKeys = useCallback((newKeys) => {
    setSelectedTrackKeys(newKeys);
  }, []);

  const toggleTrackSelection = useCallback((trackKey) => {
    setSelectedTrackKeys(prevKeys => {
      const newKeys = new Set(prevKeys);
      if (newKeys.has(trackKey)) {
        newKeys.delete(trackKey);
      } else {
        newKeys.add(trackKey);
      }
      return newKeys;
    });
  }, []);

  const value = {
    // Estados
    playlist,
    currentTrack,
    isPlaying,
    status,
    isCustomQueue,
    selectedTrackKeys,
    isManualSeeking,
    
    // Funções
    loadPlaylist,
    playTrack,
    pauseTrack,
    resumeTrack,
    togglePlayPause,
    goToNext,
    goToPrevious,
    clearCustomPlaylist,
    trackKey,
    updateSelectedKeys,
    toggleTrackSelection,
    setIsManualSeeking,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

