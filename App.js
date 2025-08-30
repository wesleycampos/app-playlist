import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import WelcomeScreen from './WelcomeScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';
import SucessoFMWebView from './SucessoFMWebView';
import RCPlayTVWebView from './RCPlayTVWebView';
import PortalRCNewsWebView from './PortalRCNewsWebView';
import MainScreen from './MainScreen';
import PlaylistScreen from './PlaylistScreen';
import MenuScreen from './MenuScreen';

// Importar configurações e testes do Supabase
import { validateConfig } from './config';
import runAllTests from './testConnection';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState('checking');

  // Validar configurações e testar conexão ao iniciar
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Inicializando aplicativo Sucesso FM...');
        
        // Validar configurações
        const configValid = validateConfig();
        if (!configValid) {
          console.error('❌ Configurações inválidas');
          setSupabaseStatus('config_error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Configurações válidas, testando conexão...');
        
        // Testar conexão com Supabase
        const testResults = await runAllTests();
        
        if (testResults.connection.success) {
          console.log('🎉 Supabase conectado com sucesso!');
          setSupabaseStatus('connected');
        } else {
          console.error('❌ Falha na conexão com Supabase');
          setSupabaseStatus('connection_error');
        }
        
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        setSupabaseStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Login real com Supabase
  const handleLogin = async (email, password) => {
    try {
      console.log('🔐 App.js: Tentando login com Supabase');
      
      // Verificar se o usuário existe no Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.log('ℹ️  Nenhum usuário logado ainda');
      } else if (user) {
        console.log('✅ Usuário já logado:', user.email);
        setIsLoggedIn(true);
        return true;
      }
      
      // Se não estiver logado, tentar fazer login
      const result = await auth.signIn(email, password);
      
      if (result.success) {
        console.log('✅ Login realizado com sucesso no App.js');
        setIsLoggedIn(true);
        return true;
      } else {
        console.error('❌ Falha no login:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro no login do App.js:', error);
      return false;
    }
  };

  // Cadastro fictício (mock)
  const handleRegister = (name, email, password) => {
    console.log('Novo usuário:', { name, email, password });
    return true;
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 App.js: Fazendo logout');
      
      const result = await auth.signOut();
      
      if (result.success) {
        console.log('✅ Logout realizado com sucesso');
        setIsLoggedIn(false);
      } else {
        console.error('❌ Erro no logout:', result.error);
        // Mesmo com erro, vamos fazer logout local
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('❌ Erro inesperado no logout:', error);
      // Mesmo com erro, vamos fazer logout local
      setIsLoggedIn(false);
    }
  };

  // Tela de loading e status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A2A54" />
        <Text style={styles.loadingText}>Inicializando Sucesso FM...</Text>
        <Text style={styles.statusText}>
          {supabaseStatus === 'checking' && 'Verificando configurações...'}
          {supabaseStatus === 'config_error' && '❌ Erro nas configurações'}
          {supabaseStatus === 'connection_error' && '❌ Erro na conexão'}
          {supabaseStatus === 'connected' && '✅ Conectando ao banco...'}
          {supabaseStatus === 'error' && '❌ Erro na inicialização'}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
            <Stack.Screen name="Menu">
              {props => <MenuScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="SucessoFMWebView" component={SucessoFMWebView} />
            <Stack.Screen name="RCPlayTVWebView" component={RCPlayTVWebView} />
            <Stack.Screen name="PortalRCNewsWebView" component={PortalRCNewsWebView} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onRegister={handleRegister} />}
            </Stack.Screen>
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Estilos para a tela de loading
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#87CEEB',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2A54',
    marginTop: 20,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});
