import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, users } from './supabase';

export default function RegisterScreen({ navigation, onRegister }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [uf, setUf] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterPress = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Ops', 'Preencha os campos obrigatórios.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ops', 'As senhas não coincidem.');
      return;
    }
    if (!acceptedPrivacyPolicy) {
      Alert.alert('Atenção', 'Você deve aceitar as Políticas de Privacidade para continuar.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('👤 Tentando criar usuário:', email);
      
      // Criar usuário no Supabase
      const result = await auth.signUp(email, password, {
        full_name: name,
        phone: phone,
        uf: uf.toUpperCase(),
        city: city
      });
      
      if (result.success) {
        console.log('✅ Usuário criado com sucesso!');
        Alert.alert(
          'Sucesso!', 
          'Cadastro criado com sucesso! Verifique seu email para confirmar a conta.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        console.error('❌ Erro no cadastro:', result.error);
        Alert.alert('Erro', result.error || 'Não foi possível cadastrar agora.');
      }
    } catch (error) {
      console.error('❌ Erro inesperado no cadastro:', error);
      Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#87CEEB', '#ffffff']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Cadastre-se</Text>
            <Text style={styles.headerSubtitle}>Crie sua conta e aproveite todos os recursos.</Text>
          </View>

          {/* Formulário */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              <TextInput 
                style={styles.input} 
                placeholder="Nome completo" 
                value={name} 
                onChangeText={setName} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Email" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Telefone" 
                value={phone} 
                onChangeText={setPhone} 
                keyboardType="phone-pad" 
              />

              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.uf]} 
                  placeholder="UF" 
                  maxLength={2} 
                  value={uf} 
                  onChangeText={setUf} 
                  autoCapitalize="characters" 
                />
                <TextInput 
                  style={[styles.input, styles.city]} 
                  placeholder="Cidade" 
                  value={city} 
                  onChangeText={setCity} 
                />
              </View>

              <TextInput 
                style={styles.input} 
                placeholder="Senha" 
                secureTextEntry 
                value={password} 
                onChangeText={setPassword} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Confirmação de senha" 
                secureTextEntry 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
              />

              <Pressable 
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} 
                onPress={handleRegisterPress}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryText}>CADASTRAR</Text>
                )}
              </Pressable>

              {/* Termos e Política */}
              <View style={styles.termsSection}>
                <View style={styles.checkboxRow}>
                  <Pressable 
                    onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
                    style={styles.checkboxContainer}
                  >
                    <MaterialIcons 
                      name={acceptedPrivacyPolicy ? "check-box" : "check-box-outline-blank"} 
                      size={24} 
                      color={acceptedPrivacyPolicy ? "#0A2A54" : "#8fa2b5"} 
                    />
                  </Pressable>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>
                      Ao marcar esta opção, você confirma que aceita nossos{' '}
                      <Text 
                        style={styles.underlinedText}
                        onPress={() => navigation.navigate('TermsOfService')}
                      >
                        Termos de Serviço
                      </Text>
                      {' '}e{' '}
                      <Text 
                        style={styles.underlinedText}
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                      >
                        Política de Privacidade
                      </Text>
                      .
                    </Text>
                  </View>
                </View>
              </View>

              {/* Link para Login */}
              <View style={styles.loginSection}>
                <Text style={styles.haveAccount}>
                  Já tem cadastro?{' '}
                  <Text onPress={() => navigation.goBack()} style={styles.loginLink}>
                    Faça seu login aqui!
                  </Text>
                </Text>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0A2A54', 
    textAlign: 'center',
    marginBottom: 8
  },
  headerSubtitle: { 
    textAlign: 'center', 
    color: '#8fa2b5', 
    fontSize: 16,
    lineHeight: 22
  },
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  form: { 
    width: '100%' 
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
  row: { 
    flexDirection: 'row', 
    gap: 12 
  },
  uf: { 
    flexBasis: 90, 
    flexGrow: 0 
  },
  city: { 
    flex: 1 
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
  termsSection: {
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxContainer: {
    padding: 4,
    marginTop: 2,
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: { 
    color: '#8fa2b5', 
    fontSize: 14,
    lineHeight: 20,
  },
  underlinedText: { 
    textDecorationLine: 'underline',
    color: '#0A2A54',
    fontWeight: '600'
  },
  loginSection: {
    alignItems: 'center',
  },
  haveAccount: { 
    textAlign: 'center',
    fontSize: 14,
    color: '#8fa2b5'
  },
  loginLink: { 
    color: '#0A2A54', 
    fontWeight: '800',
    textDecorationLine: 'underline'
  },
});
