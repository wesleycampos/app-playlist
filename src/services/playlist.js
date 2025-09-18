// Serviço para carregar playlist do usuário via API

const API_BASE = 'https://musicas.radiosucessobrasilia.com.br';

const pick = (obj, keys) => keys.find(k => obj && obj[k] != null);

export async function loadUserPlaylist(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/player_playlist.php?user_id=${encodeURIComponent(userId)}`, {
      cache: 'no-store'
    });
    
    if (res.status === 423) {
      return { count: 0, blocked: true };
    }
    
    const data = await res.json();
    if (!data.ok) {
      return { count: 0 };
    }

    const rows = data.items ?? [];
    
    // Mapear campos comuns (id, url, title, artist)
    const tracks = rows.map((r) => {
      const idKey = pick(r, ['id', 'track_id', 'music_id', 'song_id']);
      const urlKey = pick(r, ['audio_url', 'url', 'stream_url', 'file_url']);
      const titleKey = pick(r, ['title', 'name', 'track_title', 'music_title']);
      const artistKey = pick(r, ['artist', 'singer', 'band', 'author']);
      const artKey = pick(r, ['artwork', 'cover', 'image', 'thumb']);
      
      return {
        id: String(r[idKey]),
        url: r[urlKey],
        title: titleKey ? String(r[titleKey]) : 'Faixa',
        artist: artistKey ? String(r[artistKey]) : '',
        artwork: artKey ? r[artKey] : undefined,
      };
    }).filter(t => !!t.url);

    return { count: tracks.length, tracks };
  } catch (error) {
    console.error('Erro ao carregar playlist do usuário:', error);
    return { count: 0 };
  }
}
