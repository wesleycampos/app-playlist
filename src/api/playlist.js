// src/api/playlist.js
import { API_CONFIG } from '../../config';
import { getUserId } from '../auth/session';

const API_BASE = API_CONFIG.baseUrl;

// Salva a playlist no servidor (aplica o limite do plano)
export async function savePlaylist({ userId, paths }) {
  const resp = await fetch(`${API_BASE}/playlist_save.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, tracks: paths })
  });

  // a API pode devolver JSON ou texto em caso de erro de proxy; trate os dois
  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao salvar playlist');
  }

  if (!data.ok) {
    // Ex.: { ok:false, error:"Limite do plano excedido", max:10, incoming:12 }
    const msg = data.error || 'Falha ao salvar playlist';
    const extra = data.max ? ` (máx ${data.max}, você enviou ${data.incoming})` : '';
    throw new Error(msg + extra);
  }
  return data; // { ok:true, saved, plan, limit, file, ... }
}

// Resolve playlist com URLs assinadas para tocar
export async function resolvePlaylist({ userId, ttlSec = 1800 }) {
  const url = `${API_BASE}/playlist_resolve.php?user_id=${encodeURIComponent(userId)}&ttl=${ttlSec}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao resolver playlist');
  }

  // data: { items:[{title, path, streamUrl}], total, plan, limit }
  return data;
}

// Busca todas as playlists do usuário
export async function getUserPlaylists({ userId }) {
  const url = `${API_BASE}/playlists.php?user_id=${encodeURIComponent(userId)}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao buscar playlists');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao buscar playlists');
  }

  return data; // { ok:true, playlists:[{id, name, track_count, created_at}], total }
}

// Cria uma nova playlist
export async function createPlaylist({ userId, name, description = '' }) {
  const resp = await fetch(`${API_BASE}/playlist_create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      name: name,
      description: description 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao criar playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao criar playlist');
  }

  return data; // { ok:true, playlist_id, name, created_at }
}

// Adiciona músicas a uma playlist existente
export async function addTracksToPlaylist({ userId, playlistId, paths }) {
  const resp = await fetch(`${API_BASE}/playlist_add_tracks.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      playlist_id: playlistId,
      tracks: paths 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao adicionar músicas');
  }

  if (!data.ok) {
    const msg = data.error || 'Falha ao adicionar músicas';
    const extra = data.max ? ` (máx ${data.max}, você enviou ${data.incoming})` : '';
    throw new Error(msg + extra);
  }

  return data; // { ok:true, added, total_tracks, plan, limit }
}

// Remove músicas de uma playlist
export async function removeTracksFromPlaylist({ userId, playlistId, paths }) {
  const resp = await fetch(`${API_BASE}/playlist_remove_tracks.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      playlist_id: playlistId,
      tracks: paths 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao remover músicas');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao remover músicas');
  }

  return data; // { ok:true, removed, total_tracks }
}

// Deleta uma playlist
export async function deletePlaylist({ userId, playlistId }) {
  const resp = await fetch(`${API_BASE}/playlist_delete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      playlist_id: playlistId 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao deletar playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao deletar playlist');
  }

  return data; // { ok:true, deleted }
}

// Renomeia uma playlist
export async function renamePlaylist({ userId, playlistId, newName }) {
  const resp = await fetch(`${API_BASE}/playlist_rename.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      playlist_id: playlistId,
      name: newName 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao renomear playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao renomear playlist');
  }

  return data; // { ok:true, playlist_id, name, updated_at }
}

// Busca informações de uma playlist específica
export async function getPlaylistDetails({ userId, playlistId }) {
  const url = `${API_BASE}/playlist_details.php?user_id=${encodeURIComponent(userId)}&playlist_id=${encodeURIComponent(playlistId)}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao buscar detalhes da playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao buscar detalhes da playlist');
  }

  return data; // { ok:true, playlist:{id, name, description, track_count, created_at, tracks:[{title, path, streamUrl}]} }
}

// Duplica uma playlist
export async function duplicatePlaylist({ userId, playlistId, newName }) {
  const resp = await fetch(`${API_BASE}/playlist_duplicate.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      playlist_id: playlistId,
      name: newName 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao duplicar playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao duplicar playlist');
  }

  return data; // { ok:true, new_playlist_id, name, created_at }
}

// Exporta playlist para formato específico (JSON, M3U, etc.)
export async function exportPlaylist({ userId, playlistId, format = 'json' }) {
  const url = `${API_BASE}/playlist_export.php?user_id=${encodeURIComponent(userId)}&playlist_id=${encodeURIComponent(playlistId)}&format=${format}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao exportar playlist');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao exportar playlist');
  }

  return data; // { ok:true, format, content, filename }
}

// Busca estatísticas das playlists do usuário
export async function getPlaylistStats({ userId }) {
  const url = `${API_BASE}/playlist_stats.php?user_id=${encodeURIComponent(userId)}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao buscar estatísticas');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao buscar estatísticas');
  }

  return data; // { ok:true, total_playlists, total_tracks, plan, limit, usage_percentage }
}

// =====================================================
// FUNÇÕES CONVENIENTES (não precisam do userId como parâmetro)
// =====================================================

// Salva a playlist do usuário logado
export async function saveCurrentUserPlaylist(paths) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return savePlaylist({ userId, paths });
}

// Resolve playlist do usuário logado
export async function resolveCurrentUserPlaylist(ttlSec = 1800) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return resolvePlaylist({ userId, ttlSec });
}

// Busca todas as playlists do usuário logado
export async function getCurrentUserPlaylists() {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return getUserPlaylists({ userId });
}

// Cria uma nova playlist para o usuário logado
export async function createCurrentUserPlaylist(name, description = '') {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return createPlaylist({ userId, name, description });
}

// Adiciona músicas à playlist do usuário logado
export async function addTracksToCurrentUserPlaylist(playlistId, paths) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return addTracksToPlaylist({ userId, playlistId, paths });
}

// Remove músicas da playlist do usuário logado
export async function removeTracksFromCurrentUserPlaylist(playlistId, paths) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return removeTracksFromPlaylist({ userId, playlistId, paths });
}

// Deleta playlist do usuário logado
export async function deleteCurrentUserPlaylist(playlistId) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return deletePlaylist({ userId, playlistId });
}

// Renomeia playlist do usuário logado
export async function renameCurrentUserPlaylist(playlistId, newName) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return renamePlaylist({ userId, playlistId, newName });
}

// Busca detalhes da playlist do usuário logado
export async function getCurrentUserPlaylistDetails(playlistId) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return getPlaylistDetails({ userId, playlistId });
}

// Duplica playlist do usuário logado
export async function duplicateCurrentUserPlaylist(playlistId, newName) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return duplicatePlaylist({ userId, playlistId, newName });
}

// Exporta playlist do usuário logado
export async function exportCurrentUserPlaylist(playlistId, format = 'json') {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return exportPlaylist({ userId, playlistId, format });
}

// Busca estatísticas das playlists do usuário logado
export async function getCurrentUserPlaylistStats() {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return getPlaylistStats({ userId });
}
