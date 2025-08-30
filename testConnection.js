// =====================================================
// TESTE DE CONEXÃO COM SUPABASE - SUCESSO FM
// =====================================================

import { supabase, auth, users } from './supabase';

// Função para testar a conexão
export const testSupabaseConnection = async () => {
  console.log('🔌 Testando conexão com Supabase...');
  
  try {
    // Teste 1: Verificar se o cliente está configurado
    console.log('📍 URL do Supabase:', supabase.supabaseUrl);
    console.log('🔑 Chave configurada:', supabase.supabaseKey ? '✅ Sim' : '❌ Não');
    
    // Teste 2: Verificar se o banco está acessível
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar banco:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Conexão com banco estabelecida!');
    console.log('📊 Dados recebidos:', data);
    
    // Teste 3: Verificar se as tabelas existem
    const tables = ['user_profiles', 'playlists', 'playlist_tracks', 'playback_history'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (tableError) {
          console.log(`⚠️  Tabela ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ Tabela ${table}: Acessível`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: Erro - ${err.message}`);
      }
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Erro geral na conexão:', error.message);
    return { success: false, error: error.message };
  }
};

// Função para testar autenticação
export const testAuthentication = async () => {
  console.log('🔐 Testando autenticação...');
  
  try {
    // Teste 1: Verificar sessão atual
    const { data: session, error: sessionError } = await auth.getSession();
    
    if (sessionError) {
      console.log('ℹ️  Nenhuma sessão ativa:', sessionError.message);
    } else {
      console.log('✅ Sessão ativa encontrada');
    }
    
    // Teste 2: Verificar usuário atual
    const { data: user, error: userError } = await auth.getCurrentUser();
    
    if (userError) {
      console.log('ℹ️  Nenhum usuário logado:', userError.message);
    } else {
      console.log('✅ Usuário logado:', user.email);
    }
    
    return { success: true, session, user };
    
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
    return { success: false, error: error.message };
  }
};

// Função para testar criação de usuário
export const testUserCreation = async () => {
  console.log('👤 Testando criação de usuário...');
  
  try {
    // Dados de teste
    const testUser = {
      email: 'teste@sucessofm.com',
      password: 'Teste123!',
      userData: {
        full_name: 'Usuário Teste',
        phone: '(11) 99999-9999',
        uf: 'SP',
        city: 'São Paulo'
      }
    };
    
    // Teste de cadastro
    const { data, error } = await auth.signUp(
      testUser.email,
      testUser.password,
      testUser.userData
    );
    
    if (error) {
      console.log('ℹ️  Usuário já existe ou erro:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', data.user?.email);
    console.log('🆔 ID:', data.user?.id);
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Erro na criação de usuário:', error.message);
    return { success: false, error: error.message };
  }
};

// Função principal de teste
export const runAllTests = async () => {
  console.log('🚀 INICIANDO TESTES DE CONEXÃO SUPABASE');
  console.log('=====================================');
  
  // Teste 1: Conexão básica
  const connectionTest = await testSupabaseConnection();
  console.log('');
  
  // Teste 2: Autenticação
  const authTest = await testAuthentication();
  console.log('');
  
  // Teste 3: Criação de usuário
  const userTest = await testUserCreation();
  console.log('');
  
  // Resumo dos testes
  console.log('📊 RESUMO DOS TESTES:');
  console.log('====================');
  console.log('🔌 Conexão:', connectionTest.success ? '✅ OK' : '❌ FALHOU');
  console.log('🔐 Autenticação:', authTest.success ? '✅ OK' : '❌ FALHOU');
  console.log('👤 Criação de usuário:', userTest.success ? '✅ OK' : '❌ FALHOU');
  
  if (connectionTest.success && authTest.success) {
    console.log('');
    console.log('🎉 SUPABASE CONECTADO COM SUCESSO!');
    console.log('✅ Seu aplicativo está pronto para usar o banco de dados real!');
  } else {
    console.log('');
    console.log('⚠️  ALGUNS TESTES FALHARAM');
    console.log('🔍 Verifique as mensagens de erro acima');
  }
  
  return {
    connection: connectionTest,
    authentication: authTest,
    userCreation: userTest
  };
};

// Exportar função principal
export default runAllTests;
