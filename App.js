import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';

import { PlayerProvider } from './src/context/PlayerContext';

import WelcomeScreen from './WelcomeScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';
import SucessoFMWebView from './SucessoFMWebView';
import RCPlayTVWebView from './RCPlayTVWebView';
import PortalRCNewsWebView from './PortalRCNewsWebView';
import MainScreen from './MainScreen';
import PlaylistScreen from './PlaylistScreen';
import MenuScreen from './MenuScreen';
import ProfileEditScreen from './ProfileEditScreen';

// Importar configurações e testes do Supabase
import { validateConfig } from './config';
import runAllTests from './testConnection';
import { quickTest, testAuth } from './quickTest';
import { supabase } from './supabase';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState('checking');

  // Validar configurações e verificar sessão ativa
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
        
        console.log('✅ Configurações válidas, verificando sessão...');
        
        // Verificar se há uma sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Se o erro for relacionado a refresh token inválido, limpar a sessão
          if (error.message.includes('Invalid Refresh Token') || 
              error.message.includes('Refresh Token Not Found')) {
            console.log('🔄 Token de refresh inválido, limpando sessão...');
            await supabase.auth.signOut();
            console.log('ℹ️  Sessão limpa, usuário precisa fazer login novamente');
          } else {
            console.log('ℹ️  Erro ao verificar sessão:', error.message);
          }
          setSupabaseStatus('connected');
        } else if (session) {
          console.log('✅ Sessão ativa encontrada:', session.user.email);
          setIsLoggedIn(true);
          setSupabaseStatus('connected');
        } else {
          console.log('ℹ️  Nenhuma sessão ativa');
          setSupabaseStatus('connected');
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
      
      // Fazer login diretamente com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Erro no login:', error.message);
        return false;
      }
      
      if (data.user) {
        console.log('✅ Login realizado com sucesso no App.js');
        console.log('👤 Usuário:', data.user.email);
        console.log('🆔 ID:', data.user.id);
        
        // Atualizar estado de login
        setIsLoggedIn(true);
        
        return true;
      } else {
        console.error('❌ Login falhou - usuário não retornado');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Erro inesperado no login do App.js:', error);
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
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erro no logout:', error.message);
      } else {
        console.log('✅ Logout realizado com sucesso');
      }
      
      // Sempre fazer logout local
      setIsLoggedIn(false);
      
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
        
        {/* Botões de teste para debug */}
        <View style={styles.testButtons}>
          <Pressable style={styles.testButton} onPress={quickTest}>
            <Text style={styles.testButtonText}>🧪 Teste Rápido</Text>
          </Pressable>
          <Pressable style={styles.testButton} onPress={testAuth}>
            <Text style={styles.testButtonText}>🔐 Teste Auth</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <PlayerProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="Playlist" component={PlaylistScreen} />
              <Stack.Screen name="Menu">
                {props => <MenuScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
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
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PlayerProvider>
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
  testButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  testButton: {
    backgroundColor: '#0A2A54',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
