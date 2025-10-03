import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { SUPABASE_CONFIG } from './config';

// Configurações do Supabase
const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Criação do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Funções auxiliares para autenticação
export const auth = {
  // Login com email e senha
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro no login:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Cadastro de usuário
  signUp: async (email, password, userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData, // dados adicionais do usuário
        },
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro no cadastro:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Logout
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Obter usuário atual
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { success: true, user };
    } catch (error) {
      console.error('Erro ao obter usuário:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Verificar sessão
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { success: true, session };
    } catch (error) {
      console.error('Erro ao obter sessão:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Reset de senha
  resetPassword: async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'sucesso-fm://reset-password', // URL customizada do app
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao resetar senha:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Atualizar senha (após confirmação por email)
  updatePassword: async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao atualizar senha:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// Funções para gerenciar dados dos usuários
export const users = {
  // Criar perfil do usuário
  createProfile: async (userId, profileData) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: userId,
            ...profileData,
          },
        ])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar perfil:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Atualizar perfil do usuário
  updateProfile: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Obter perfil do usuário
  getProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao obter perfil:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// Funções para gerenciar playlists
export const playlists = {
  // Criar playlist
  create: async (playlistData) => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert([playlistData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar playlist:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Obter playlists do usuário
  getUserPlaylists: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao obter playlists:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Adicionar música à playlist
  addTrack: async (playlistId, trackData) => {
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .insert([
          {
            playlist_id: playlistId,
            ...trackData,
          },
        ])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao adicionar música:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// Funções para gerenciar histórico de reprodução
export const history = {
  // Adicionar música ao histórico
  addTrack: async (userId, trackData) => {
    try {
      const { data, error } = await supabase
        .from('playback_history')
        .insert([
          {
            user_id: userId,
            ...trackData,
            played_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao adicionar ao histórico:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Obter histórico do usuário
  getUserHistory: async (userId, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('playback_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao obter histórico:', error.message);
      return { success: false, error: error.message };
    }
  },
};

export default supabase;
