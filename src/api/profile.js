// src/api/profile.js
import { API_CONFIG } from '../../config';
import { getUserId } from '../auth/session';

const API_BASE = API_CONFIG.baseUrl;

// Salva o perfil do usuário no servidor
export async function saveUserProfile({ userId, profileData }) {
  const resp = await fetch(`${API_BASE}/profile_save.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      profile: profileData 
    })
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao salvar perfil');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao salvar perfil');
  }

  return data; // { ok: true, profile_id, updated_at }
}

// Busca o perfil do usuário
export async function getUserProfile({ userId }) {
  const url = `${API_BASE}/profile_get.php?user_id=${encodeURIComponent(userId)}`;
  const resp = await fetch(url);

  let data;
  try {
    data = await resp.json();
  } catch {
    const txt = await resp.text();
    throw new Error(txt || 'Falha ao buscar perfil');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Falha ao buscar perfil');
  }

  return data; // { ok: true, profile: { full_name, phone, city, uf, avatar_url } }
}

// =====================================================
// FUNÇÕES CONVENIENTES (não precisam do userId como parâmetro)
// =====================================================

// Salva o perfil do usuário logado
export async function saveCurrentUserProfile(profileData) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return saveUserProfile({ userId, profileData });
}

// Busca o perfil do usuário logado
export async function getCurrentUserProfile() {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return getUserProfile({ userId });
}
