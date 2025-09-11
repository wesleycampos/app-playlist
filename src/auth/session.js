// src/auth/session.js
import { supabase } from '../../supabase';

/**
 * Obtém o ID do usuário logado (UUID)
 * @returns {Promise<string|null>} UUID do usuário ou null se não estiver logado
 */
export async function getUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;  // UUID
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
}

/**
 * Obtém o usuário completo logado
 * @returns {Promise<object|null>} Objeto do usuário ou null se não estiver logado
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está logado
 * @returns {Promise<boolean>} true se estiver logado, false caso contrário
 */
export async function isUserLoggedIn() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Erro ao verificar login:', error);
    return false;
  }
}

/**
 * Obtém a sessão atual do usuário
 * @returns {Promise<object|null>} Sessão atual ou null se não houver sessão
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session || null;
  } catch (error) {
    console.error('Erro ao obter sessão atual:', error);
    return null;
  }
}

/**
 * Obtém o token de acesso atual
 * @returns {Promise<string|null>} Token de acesso ou null se não houver
 */
export async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    return null;
  }
}

/**
 * Obtém informações básicas do usuário logado
 * @returns {Promise<object|null>} { id, email, created_at, ... } ou null
 */
export async function getUserInfo() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata
    };
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    return null;
  }
}

/**
 * Força a atualização da sessão do usuário
 * @returns {Promise<object|null>} Nova sessão ou null se falhar
 */
export async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      return null;
    }
    return session || null;
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return null;
  }
}

/**
 * Faz logout do usuário atual
 * @returns {Promise<boolean>} true se logout bem-sucedido, false caso contrário
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
}

/**
 * Hook para React Native - monitora mudanças na autenticação
 * @param {function} callback - Função chamada quando o estado de auth muda
 * @returns {function} Função para parar o monitoramento
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  
  return () => subscription.unsubscribe();
}

/**
 * Utilitário para verificar se o usuário tem permissões específicas
 * @param {string} permission - Permissão a ser verificada
 * @returns {Promise<boolean>} true se tiver permissão, false caso contrário
 */
export async function hasPermission(permission) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Verificar permissões no app_metadata
    const permissions = user.app_metadata?.permissions || [];
    return permissions.includes(permission);
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

/**
 * Utilitário para obter o plano do usuário
 * @returns {Promise<string|null>} Nome do plano ou null se não encontrado
 */
export async function getUserPlan() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    return user.app_metadata?.plan || 'free';
  } catch (error) {
    console.error('Erro ao obter plano do usuário:', error);
    return null;
  }
}

/**
 * Utilitário para verificar se o usuário é premium
 * @returns {Promise<boolean>} true se for premium, false caso contrário
 */
export async function isPremiumUser() {
  try {
    const plan = await getUserPlan();
    return plan === 'premium' || plan === 'family';
  } catch (error) {
    console.error('Erro ao verificar se é premium:', error);
    return false;
  }
}

// Exportar função principal como default
export default getUserId;
