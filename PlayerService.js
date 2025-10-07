// PlayerService.js
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let sound = null;
let currentStatusCallback = null;

const audioMode = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  staysActiveInBackground: true,
};

// Garante que a instância de som exista e o modo de áudio esteja configurado
const getSound = async () => {
  if (sound) {
    return sound;
  }
  console.log('[PlayerService] Configurando modo de áudio e criando instância de som.');
  await Audio.setAudioModeAsync(audioMode);
  sound = new Audio.Sound();
  
  // Define o callback de atualização de status UMA VEZ
  sound.setOnPlaybackStatusUpdate(status => {
    if (currentStatusCallback) {
      currentStatusCallback(status);
    }
  });
  return sound;
};

export async function play(uri, onStatus) {
  // Validar URI antes de processar
  if (!uri) {
    console.error('[PlayerService] ❌ URI inválida (null ou undefined)');
    throw new Error('URI inválida');
  }

  console.log('[PlayerService] 🎵 play() chamado com URI:', uri.substring(0, 100) + '...');
  
  currentStatusCallback = onStatus;
  
  try {
    const soundObject = await getSound();
    console.log('[PlayerService] ✅ Sound object obtido');
    
    const status = await soundObject.getStatusAsync();
    console.log('[PlayerService] 📊 Status atual:', {
      isLoaded: status.isLoaded,
      isPlaying: status.isPlaying,
      uri: status.uri ? status.uri.substring(0, 80) + '...' : 'sem URI'
    });

    // Garante que a URI seja completa
    const fullUri = uri.startsWith('http') ? uri : `https://musicas.radiosucessobrasilia.com.br${uri.startsWith('/') ? '' : '/'}${uri}`;
    console.log('[PlayerService] 🔗 URI final para reprodução:', fullUri.substring(0, 100) + '...');
    
    // Se a mesma música já está carregada, apenas toca
    if (status.isLoaded && status.uri === fullUri) {
      console.log('[PlayerService] ▶️ Mesma faixa já carregada. Tocando...');
      await soundObject.playAsync();
      console.log('[PlayerService] ✅ Play executado');
      return;
    }

    console.log('[PlayerService] 🔄 Carregando nova faixa...');
    
    // Sempre descarrega a faixa anterior
    if (status.isLoaded) {
      console.log('[PlayerService] 🗑️ Descarregando faixa anterior...');
      await soundObject.unloadAsync();
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[PlayerService] ✅ Faixa anterior descarregada');
    }
    
    // Carrega a nova faixa
    console.log('[PlayerService] ⬇️ Iniciando loadAsync...');
    await soundObject.loadAsync(
      { 
        uri: fullUri,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/*,*/*',
          'Accept-Encoding': 'identity',
          'Range': 'bytes=0-'
        }
      },
      { shouldPlay: true, progressUpdateIntervalMillis: 500 }
    );
    
    console.log('[PlayerService] ✅ Faixa carregada e reproduzindo');
    
  } catch (error) {
    console.error('[PlayerService] ❌ Erro ao reproduzir música:', error.message);
    console.error('[PlayerService] 📋 Detalhes do erro:', error);
    
    // Se for erro 403 OU 400, lança exceção específica para URL expirada/ inválida
    if (error.message.includes('403') || error.message.includes('400')) {
      console.error('[PlayerService] 🚫 Erro 4xx: URL expirada/assinatura inválida');
      
      // Limpa o som
      if (sound) {
        try {
          await sound.unloadAsync();
          sound = null;
          console.log('[PlayerService] 🗑️ Som limpo após erro 4xx');
        } catch (cleanupError) {
          console.error('[PlayerService] ❌ Erro na limpeza:', cleanupError);
        }
      }
      
      // Lança erro personalizado para indicar URL expirada
      const urlExpiredError = new Error('URL_EXPIRED');
      urlExpiredError.originalError = error;
      urlExpiredError.uri = uri;
      throw urlExpiredError;
    }
    
    // Para outros erros, limpa o som e lança o erro original
    if (sound) {
      try {
        await sound.unloadAsync();
        sound = null;
        console.log('[PlayerService] 🗑️ Som limpo após erro');
      } catch (cleanupError) {
        console.error('[PlayerService] ❌ Erro na limpeza:', cleanupError);
      }
    }
    
    throw error;
  }
}

export async function pause() {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.isPlaying) {
      await sound.pauseAsync().catch(e => console.error('[PlayerService] Erro ao pausar:', e));
    }
  }
}

export async function resume() {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded && !status.isPlaying) {
      await sound.playAsync().catch(e => {
        console.error('[PlayerService] Erro ao resumir:', e);
        throw e;
      });
    }
  }
}

export async function seekTo(positionMillis) {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await sound.setPositionAsync(positionMillis).catch(e => console.error('[PlayerService] Erro no seek:', e));
    }
  }
}

export async function stop() {
  if (sound) {
    await sound.unloadAsync().catch(() => {});
    sound = null;
  }
}