import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, supabase } from './supabase';

export default function ResetPasswordScreen({ navigation, route }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Verificar se há uma sessão válida para reset de senha
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          Alert.alert(
            'Link inválido', 
            'Este link de recuperação de senha é inválido ou expirou. Solicite um novo link.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        navigation.navigate('Login');
      }
    };

    checkSession();
  }, []);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    return null;
  };

  const handleResetPassword = async () => {
    // Limpar mensagens anteriores
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    // Validar senha
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    // Verificar se as senhas coincidem
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 Atualizando senha...');
      
      const result = await auth.updatePassword(newPassword);
      
      if (result.success) {
        console.log('✅ Senha atualizada com sucesso!');
        setSuccessMessage('Senha atualizada com sucesso! Você será redirecionado para o login.');
        setErrorMessage('');
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        console.error('❌ Erro ao atualizar senha:', result.error);
        setErrorMessage('Erro ao atualizar senha. Tente novamente.');
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setErrorMessage('Ocorreu um erro inesperado. Tente novamente.');
      setSuccessMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#87CEEB', '#ffffff']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Área Superior com Imagem */}
          <View style={styles.heroSection}>
            <Image
              source={require('./assets/images/img_capa.png')}
              style={styles.heroImage}
            />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>Nova Senha</Text>
            </View>
          </View>

          {/* Área Branca Curvada */}
          <View style={styles.whiteSection}>
            <View style={styles.content}>
              <Text style={styles.title}>DEFINIR NOVA SENHA</Text>
              <Text style={styles.subtitle}>
                Digite sua nova senha nos campos abaixo
              </Text>

              <View style={styles.form}>
                {/* Mensagem de erro */}
                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={20} color="#e74c3c" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Mensagem de sucesso */}
                {successMessage ? (
                  <View style={styles.successContainer}>
                    <MaterialIcons name="check-circle-outline" size={20} color="#27ae60" />
                    <Text style={styles.successText}>{successMessage}</Text>
                  </View>
                ) : null}

                <TextInput
                  style={[styles.input, errorMessage && styles.inputError]}
                  placeholder="Nova senha"
                  placeholderTextColor="#9aa6b2"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                />

                <TextInput
                  style={[styles.input, errorMessage && styles.inputError]}
                  placeholder="Confirmar nova senha"
                  placeholderTextColor="#9aa6b2"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                />

                <Pressable 
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} 
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryText}>ATUALIZAR SENHA</Text>
                  )}
                </Pressable>

                {/* Botão voltar */}
                <Pressable 
                  style={styles.backBtn}
                  onPress={() => navigation.navigate('Login')}
                >
                  <MaterialIcons name="arrow-back" size={20} color="#0A2A54" />
                  <Text style={styles.backText}>Voltar ao Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1,
    paddingBottom: 28 
  },
  heroSection: {
    flex: 1,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2A54',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  whiteSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingBottom: 40,
    minHeight: 400,
  },
  content: {
    paddingHorizontal: 30,
  },
  title: { 
    textAlign: 'center', 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#0A2A54', 
    letterSpacing: 0.5,
    marginBottom: 8
  },
  subtitle: { 
    textAlign: 'center', 
    color: '#8fa2b5', 
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d7dde6',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: '#0A2A54',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryText: { 
    color: '#fff', 
    fontWeight: '800', 
    letterSpacing: 0.4,
    fontSize: 16
  },
  primaryBtnDisabled: {
    backgroundColor: '#8fa2b5',
    opacity: 0.7,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f2',
    borderColor: '#e74c3c',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    borderColor: '#27ae60',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#27ae60',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  backText: {
    color: '#0A2A54',
    fontSize: 16,
    fontWeight: '600',
  },
});
