// =====================================================
// TESTE RÁPIDO DE CONEXÃO SUPABASE
// =====================================================

import { supabase } from './supabase';

// Teste simples de conexão
export const quickTest = async () => {
  console.log('🧪 TESTE RÁPIDO SUPABASE');
  console.log('========================');
  
  try {
    // 1. Verificar configuração
    console.log('📍 URL:', supabase.supabaseUrl);
    console.log('🔑 Chave configurada:', !!supabase.supabaseKey);
    
    // 2. Testar conexão básica
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão OK! Dados recebidos:', data);
    
    // 3. Testar inserção na tabela user_profiles
    const testProfile = {
      id: '00000000-0000-0000-0000-000000000000', // ID de teste
      email: 'teste@teste.com',
      full_name: 'Usuário Teste',
      phone: '(11) 99999-9999',
      uf: 'SP',
      city: 'São Paulo'
    };
    
    console.log('👤 Tentando inserir perfil de teste...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .insert([testProfile])
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', insertError.message);
      console.log('💡 Dica: Verifique se as políticas RLS estão configuradas');
      return false;
    }
    
    console.log('✅ Inserção OK! Perfil criado:', insertData);
    
    // 4. Limpar dados de teste
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('email', 'teste@teste.com');
    
    if (deleteError) {
      console.log('⚠️  Não foi possível limpar dados de teste:', deleteError.message);
    } else {
      console.log('🧹 Dados de teste removidos');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
};

// Função para testar autenticação
export const testAuth = async () => {
  console.log('🔐 TESTE DE AUTENTICAÇÃO');
  console.log('========================');
  
  try {
    // Tentar criar usuário de teste
    const { data, error } = await supabase.auth.signUp({
      email: 'teste@sucessofm.com',
      password: 'Teste123!',
      options: {
        data: {
          full_name: 'Usuário Teste',
          phone: '(11) 99999-9999',
          uf: 'SP',
          city: 'São Paulo'
        }
      }
    });
    
    if (error) {
      console.error('❌ Erro na criação:', error.message);
      return false;
    }
    
    console.log('✅ Usuário criado:', data.user?.email);
    console.log('🆔 ID:', data.user?.id);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
};

export default { quickTest, testAuth };
