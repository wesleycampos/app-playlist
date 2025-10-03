// PlayerService.js
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let sound = null;            // instância única
let configured = false;
let currentUri = null;       // última URI carregada
let requestId = 0;           // token anti-condição de corrida
let lastStatus = null;
let isSeeking = false;       // flag para evitar seeks simultâneos
let seekQueue = null;        // fila de seeks pendentes

async function ensureConfigured() {
  if (configured) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false, // Mudado para false para evitar ducking
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    staysActiveInBackground: true,
  });
  configured = true;
}

async function ensureSound(onStatus) {
  await ensureConfigured();
  if (!sound) {
    sound = new Audio.Sound();
  }
  // Sempre atualiza o callback (ex.: ao trocar de tela)
  sound.setOnPlaybackStatusUpdate((s) => {
    lastStatus = s;
    onStatus && onStatus(s);
  });
  return sound;
}

export async function play(uri, onStatus) {
  if (!uri) return;
  const myId = ++requestId;
  const s = await ensureSound(onStatus);

  try {
    // Mesma faixa: só dar play (mais rápido)
    if (currentUri && currentUri === uri) {
      if (myId !== requestId) return;
      try {
        await s.playAsync();
      } catch (playError) {
        console.log('Erro ao dar play na mesma faixa:', playError.message);
      }
      return;
    }

    // Nova faixa: para e recarrega no MESMO objeto
    try { 
      await s.stopAsync(); 
    } catch (stopError) {
      console.log('Erro ao parar (não crítico):', stopError.message);
    }
    
    try { 
      await s.unloadAsync(); 
    } catch (unloadError) {
      console.log('Erro ao descarregar (não crítico):', unloadError.message);
    }

    currentUri = uri;
    
    // Aguardar um pouco antes de carregar nova faixa
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar se ainda é a requisição atual
    if (myId !== requestId) return;
    
    // downloadFirst = false => começa a tocar assim que bufferiza (mais rápido para streaming)
    // Configurações otimizadas para streaming
    await s.loadAsync({ 
      uri 
    }, { 
      shouldPlay: true, 
      progressUpdateIntervalMillis: 500, // Reduzido para melhor responsividade
      positionMillis: 0,
      volume: 1.0,
      rate: 1.0,
      shouldCorrectPitch: false,
      pitchCorrectionQuality: Audio.PitchCorrectionQuality.Low,
      androidImplementation: 'MediaPlayer'
    }, false);

    // Se outra chamada venceu esta, descarrega silenciosamente
    if (myId !== requestId) {
      try { await s.stopAsync(); } catch {}
      try { await s.unloadAsync(); } catch {}
      return;
    }
  } catch (e) {
    console.warn('PlayerService.play error', e);
    // Reseta estado interno
    currentUri = null;
    try { await s.unloadAsync(); } catch {}
  }
}

export async function pause() {
  try { await sound?.pauseAsync(); } catch {}
}

export async function resume(onStatus) {
  if (!sound) return;
  sound.setOnPlaybackStatusUpdate(onStatus || null);
  try { await sound.playAsync(); } catch {}
}

export async function stop() {
  if (!sound) return;
  try { await sound.stopAsync(); } catch {}
  try { await sound.unloadAsync(); } catch {}
  // mantém instância viva, mas sem mídia carregada
  currentUri = null;
}

export async function seekTo(positionMillis) {
  if (!sound) return;
  
  // Se já está fazendo seek, aguarda ou cancela o anterior
  if (isSeeking) {
    seekQueue = positionMillis;
    return;
  }
  
  isSeeking = true;
  
  try {
    // Verificar se o som está carregado antes de fazer seek
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await sound.setPositionAsync(positionMillis);
    }
    
    // Se há um seek pendente na fila, processa ele
    if (seekQueue !== null) {
      const nextSeek = seekQueue;
      seekQueue = null;
      // Pequeno delay para evitar conflitos
      setTimeout(() => {
        seekTo(nextSeek);
      }, 100); // Aumentado para 100ms
    }
  } catch (seekError) {
    console.log('Erro ao buscar posição:', seekError.message);
  } finally {
    isSeeking = false;
  }
}

export function getLastStatus() {
  return lastStatus || {};
}

export function getCurrentUri() {
  return currentUri;
}
