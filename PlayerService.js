// PlayerService.js
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let sound = null;            // instância única
let configured = false;
let currentUri = null;       // última URI carregada
let requestId = 0;           // token anti-condição de corrida
let lastStatus = null;

async function ensureConfigured() {
  if (configured) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
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
    await s.loadAsync({ uri }, { shouldPlay: true, progressUpdateIntervalMillis: 300 }, false);

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
  try {
    await sound.setPositionAsync(positionMillis);
  } catch (seekError) {
    console.log('Erro ao buscar posição:', seekError.message);
  }
}

export function getLastStatus() {
  return lastStatus || {};
}

export function getCurrentUri() {
  return currentUri;
}
