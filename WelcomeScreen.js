import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={['#87CEEB', '#ffffff']} style={{ flex: 1 }}>
      {/* Área Superior com Imagem */}
      <View style={styles.heroSection}>
        <Image
          source={require('./assets/images/img_capa.png')}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>TELA INICIO</Text>
        </View>
      </View>

      {/* Área Branca Curvada */}
      <View style={styles.whiteSection}>
        <View style={styles.content}>
          <Text style={styles.welcomeTitle}>BEM-VINDO</Text>
          
          {/* Botões */}
          <View style={styles.buttonContainer}>
            <Pressable 
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <MaterialIcons name="person" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>

            <Pressable 
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
            >
              <MaterialIcons name="add" size={20} color="#0A2A54" />
              <Text style={styles.registerButtonText}>Cadastre-se</Text>
            </Pressable>
          </View>

          {/* Políticas de Privacidade */}
          <Text style={styles.privacyText}>Politicas e Privacidade</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 300,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A2A54',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#0A2A54',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0A2A54',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  registerButtonText: {
    color: '#0A2A54',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyText: {
    color: '#8fa2b5',
    fontSize: 14,
    textAlign: 'center',
  },
});
