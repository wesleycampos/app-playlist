import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginPress = () => {
    const ok = onLogin(email, password);
    if (ok) {
      Alert.alert('Sucesso', 'Login realizado!');
    } else {
      Alert.alert('Erro', 'E-mail ou senha inválidos.');
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
              <Text style={styles.heroTitle}>Login</Text>
            </View>
          </View>

          {/* Área Branca Curvada */}
          <View style={styles.whiteSection}>
            <View style={styles.content}>
              <Text style={styles.title}>LOGIN</Text>
              <Text style={styles.subtitle}>Digite os seus dados de acesso nos campos abaixo</Text>

              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="telefone ou email"
                  placeholderTextColor="#9aa6b2"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#9aa6b2"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <Pressable style={styles.primaryBtn} onPress={handleLoginPress}>
                  <Text style={styles.primaryText}>ENTRAR</Text>
                </Pressable>

                {/* Políticas de Privacidade */}
                <View style={styles.privacySection}>
                  <View style={styles.checkboxRow}>
                    <MaterialIcons name="check-box" size={20} color="#0A2A54" />
                    <Text style={styles.privacyText}>Politicas de privacidade</Text>
                  </View>
                  <Pressable onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Cadastre-se aqui!</Text>
                  </Pressable>
                </View>
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
    minHeight: 350,
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
  privacySection: {
    alignItems: 'center',
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: { 
    color: '#8fa2b5', 
    fontSize: 14,
  },
  registerLink: { 
    color: '#0A2A54', 
    fontWeight: '800',
    fontSize: 16,
    textDecorationLine: 'underline'
  },
});
