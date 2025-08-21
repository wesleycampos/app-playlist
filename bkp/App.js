import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  SafeAreaView, View, Text, Pressable, StyleSheet,
  ActivityIndicator, FlatList, RefreshControl, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// SUA playlist
const PLAYLIST_URL = "https://musicas.wkdesign.com.br/playlist.php";

export default function App() {
  const soundRef = useRef(null);

  const [status, setStatus]       = useState("idle");   // idle | connecting | playing | paused | error
  const [msg, setMsg]             = useState("Pronto");
  const [library, setLibrary]     = useState([]);       // [{genre, tracks:[{id,title,artist,url}]}]
  const [current, setCurrent]     = useState(null);     // track atual
  const [refreshing, setRefreshing] = useState(false);

  const isConnecting = status === "connecting";
  const isPlaying    = status === "playing";

  // Configurações de áudio
  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        staysActiveInBackground: true,
      });
    })();
    return () => { (async () => {
      if (soundRef.current) { try { await soundRef.current.unloadAsync(); } catch {} soundRef.current = null; }
    })(); };
  }, []);

  // Carregar playlist
  const fetchPlaylist = useCallback(async () => {
    try {
      const r = await fetch(PLAYLIST_URL, { cache: "no-store" });
      const data = await r.json();
      setLibrary(data.library || []);
      const first = data.library?.[0]?.tracks?.[0];
      if (first) setCurrent(first);
      setMsg("Pronto");
    } catch (e) {
      console.warn("Playlist load error", e);
      setMsg("Erro ao carregar playlist");
    }
  }, []);

  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlaylist();
    setRefreshing(false);
  }, [fetchPlaylist]);

  const onPlaybackStatusUpdate = (s) => {
    if (!s || !s.isLoaded) return;
    if (s.isBuffering) { setStatus("connecting"); setMsg("Carregando…"); return; }
    if (s.isPlaying)   { setStatus("playing");    setMsg("Tocando");     return; }
    setStatus("paused"); setMsg("Pausado");
  };

  async function playTrack(track) {
    if (!track) return;
    setCurrent(track);
    setStatus("connecting"); setMsg("Conectando…");
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (e) {
      setStatus("error"); setMsg("Falha ao conectar"); console.warn(e);
    }
  }

  async function togglePlayPause() {
    try {
      if (isPlaying) {
        await soundRef.current?.pauseAsync();
        setStatus("paused"); setMsg("Pausado");
      } else {
        await playTrack(current);
      }
    } catch (e) { console.warn(e); }
  }

  // próxima / anterior (na lista achatada)
  function flatTracks() { return library.flatMap(g => g.tracks); }
  function go(delta) {
    const list = flatTracks();
    if (!list.length || !current) return;
    const i = list.findIndex(t => t.id === current.id);
    const next = list[(i + delta + list.length) % list.length];
    playTrack(next);
  }

  return (
    <LinearGradient colors={["#0b1017", "#0f1b2a", "#121c26"]} style={{flex:1}}>
      <SafeAreaView style={styles.safe}>

        {/* topo */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Sucesso FM — Biblioteca</Text>
          <Ionicons name="musical-notes" size={18} color="#a7b1be" />
        </View>

        {/* player card */}
        <View style={styles.playerCard}>
          <Text style={styles.nowPlaying} numberOfLines={1}>
            {current ? current.title : "Selecione uma música"}
          </Text>
          <Text style={styles.artist}>{current?.artist || ""}</Text>

          <View style={styles.controlsRow}>
            <MaterialIcons name="skip-previous" size={30} color="#a7b1be" onPress={() => go(-1)} />
            <Pressable
              onPress={togglePlayPause}
              disabled={isConnecting || !current}
              style={[styles.mainBtn, isPlaying ? styles.btnPause : styles.btnPlay,
                (isConnecting || !current) && {opacity:0.6}]}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isPlaying ? (
                <MaterialIcons name="pause" size={28} color="#fff" />
              ) : (
                <MaterialIcons name="play-arrow" size={30} color="#fff" />
              )}
            </Pressable>
            <MaterialIcons name="skip-next" size={30} color="#a7b1be" onPress={() => go(1)} />
          </View>

          <Text style={styles.statusTxt}>{msg}</Text>
        </View>

        {/* lista por gêneros */}
        <FlatList
          data={library}
          keyExtractor={(g) => g.genre}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View style={styles.genreBlock}>
              <Text style={styles.genreTitle}>{item.genre}</Text>
              {item.tracks.map((t) => {
                const active = current?.id === t.id;
                return (
                  <Pressable key={t.id} style={[styles.trackRow, active && styles.trackActive]} onPress={() => playTrack(t)}>
                    <MaterialIcons
                      name={active && isPlaying ? "equalizer" : "music-note"}
                      size={18}
                      color={active ? "#ff5c7a" : "#a7b1be"}
                    />
                    <Text numberOfLines={1} style={styles.trackName}>
                      {t.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, paddingHorizontal: 16, paddingTop: 8 },
  topBar: { height:36, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  topTitle: { color:"#a7b1be", fontSize:14 },

  playerCard: {
    backgroundColor:"#121826", borderRadius:16, padding:16, marginVertical:8, alignItems:"center"
  },
  nowPlaying: { color:"#fff", fontSize:16, fontWeight:"700" },
  artist: { color:"#a7b1be", fontSize:12, marginTop:2 },

  controlsRow: { flexDirection:"row", alignItems:"center", gap:24, marginTop:12 },
  mainBtn: {
    width:64, height:64, borderRadius:64, alignItems:"center", justifyContent:"center",
    shadowColor:"#000", shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:8}, elevation:10
  },
  btnPlay: { backgroundColor:"#1db954" },
  btnPause:{ backgroundColor:"#e63946" },
  statusTxt:{ color:"#a7b1be", fontSize:12, marginTop:8 },

  genreBlock:{ marginTop:12 },
  genreTitle:{ color:"#fff", fontSize:14, fontWeight:"700", marginBottom:6 },
  trackRow:{
    flexDirection:"row", alignItems:"center", gap:8,
    paddingVertical:8, paddingHorizontal:10, borderRadius:10,
    backgroundColor:"rgba(255,255,255,0.06)", marginBottom:6
  },
  trackActive:{ backgroundColor:"rgba(255,92,122,0.14)" },
  trackName:{ color:"#e7edf5", fontSize:13, flex:1 },
});
