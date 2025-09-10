import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, Platform,
  ScrollView, Image, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export default function ProfileEditScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarImage, setAvatarImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados do usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Erro', 'Não foi possível carregar os dados do usuário');
        navigation.goBack();
        return;
      }

      setEmail(user.email || '');

      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, phone, city, uf, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log('Erro ao buscar perfil:', profileError.message);
      } else if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setCity(profile.city || '');
        setUf(profile.uf || '');
        setAvatarUrl(profile.avatar_url || '');
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para selecionar imagem do avatar
  const selectAvatarImage = async () => {
    try {
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      // Mostrar opções de seleção
      Alert.alert(
        'Selecionar Foto',
        'Escolha uma opção',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Galeria', onPress: () => pickImage('gallery') },
          { text: 'Câmera', onPress: () => pickImage('camera') }
        ]
      );
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      Alert.alert('Erro', 'Não foi possível acessar as fotos');
    }
  };

  const pickImage = async (source) => {
    try {
      setIsUploadingImage(true);

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para usar a câmera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAvatarImage(imageUri);
        
        // Upload da imagem para o Supabase Storage
        await uploadImageToSupabase(imageUri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Função para fazer upload da imagem para o Supabase Storage
  const uploadImageToSupabase = async (imageUri) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Erro', 'Usuário não encontrado');
        return;
      }

      // Por enquanto, vamos usar a URI local como avatar_url
      // Quando o Supabase Storage estiver configurado, podemos implementar o upload real
      setAvatarUrl(imageUri);
      Alert.alert('Sucesso', 'Foto atualizada com sucesso!');

      // TODO: Implementar upload real para Supabase Storage quando configurado
      /*
      // Converter URI para blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Nome único para o arquivo
      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Erro no upload:', error);
        Alert.alert('Erro', 'Não foi possível fazer upload da imagem');
        return;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      */

    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      Alert.alert('Erro', 'Não foi possível fazer upload da imagem');
    }
  };

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Atenção', 'Por favor, informe seu nome completo');
      return;
    }

    try {
      setIsSaving(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Erro', 'Usuário não encontrado');
        return;
      }

      // Verificar se já existe perfil
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const profileData = {
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        uf: uf.trim() || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingProfile) {
        // Atualizar perfil existente
        result = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', user.id)
          .select();
      } else {
        // Criar novo perfil
        result = await supabase
          .from('user_profiles')
          .insert([profileData])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#ffffff', '#f2f5fb', '#e9edf4']} style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A2A54" />
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#ffffff', '#f2f5fb', '#e9edf4']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Topbar */}
        <View style={styles.topBar}>
          <MaterialIcons 
            name="arrow-back" 
            size={24} 
            color="#0A2A54" 
            onPress={() => navigation.goBack()} 
          />
          <Text style={styles.topTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatarImage ? (
                  <Image 
                    source={{ uri: avatarImage }} 
                    style={styles.avatar} 
                  />
                ) : avatarUrl ? (
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <Image 
                    source={require('./assets/images/ico_user.png')} 
                    style={[styles.avatar, { tintColor: '#fff' }]} 
                  />
                )}
                <Pressable 
                  style={[styles.editAvatarButton, isUploadingImage && styles.disabledButton]} 
                  onPress={selectAvatarImage}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="camera-alt" size={20} color="#fff" />
                  )}
                </Pressable>
              </View>
              <Text style={styles.avatarText}>
                {isUploadingImage ? 'Enviando foto...' : 'Toque para alterar foto'}
              </Text>
            </View>

            {/* Formulário */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Digite seu nome completo"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={email}
                  editable={false}
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.helpText}>O e-mail não pode ser alterado</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.label}>Cidade</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Sua cidade"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>UF</Text>
                  <TextInput
                    style={styles.input}
                    value={uf}
                    onChangeText={setUf}
                    placeholder="SP"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </View>

            {/* Botões */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={saveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="save" size={20} color="#fff" />
                )}
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  topBar: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2A54',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0A2A54',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0A2A54',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  avatarText: {
    fontSize: 14,
    color: '#6b7280',
  },
  formContainer: {
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonContainer: {
    marginHorizontal: 18,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#0A2A54',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
