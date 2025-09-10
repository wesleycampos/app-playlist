import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function MenuScreen({ navigation, onLogout }) {
	const [userName, setUserName] = useState('');
	const [userAvatar, setUserAvatar] = useState('');

	// Carregar nome do usuário
	useEffect(() => {
		loadUserName();
	}, []);

	const loadUserName = async () => {
		try {
			const { data: { user }, error: userError } = await supabase.auth.getUser();
			if (userError || !user) {
				console.log('Usuário não encontrado no menu');
				setUserName('Usuário');
				return;
			}

			// Buscar perfil do usuário
			const { data: profile, error: profileError } = await supabase
				.from('user_profiles')
				.select('full_name, avatar_url')
				.eq('id', user.id)
				.maybeSingle();

			if (profileError) {
				console.log('Erro ao buscar perfil no menu:', profileError.message);
				setUserName(user.email?.split('@')[0] || 'Usuário');
			} else if (profile && profile.full_name) {
				setUserName(profile.full_name);
			} else {
				setUserName(user.email?.split('@')[0] || 'Usuário');
			}

			// Definir avatar do usuário
			setUserAvatar(profile?.avatar_url || '');
		} catch (error) {
			console.error('Erro ao carregar nome do usuário no menu:', error);
			setUserName('Usuário');
		}
	};

	const handlePress = (key) => {
		switch (key) {
			case 'perfil':
				navigation.navigate('ProfileEdit');
				break;
			case 'conectar':
				Alert.alert('Conectar', 'Procura de dispositivos em breve.');
				break;
			case 'config':
				Alert.alert('Configurações', 'Em breve.');
				break;
			case 'conta':
				Alert.alert('Conta', 'Em breve.');
				break;
			case 'ajuda':
				Alert.alert('Ajuda e Privacidade', 'Políticas e ajuda em breve.');
				break;
			case 'sair':
				onLogout?.();
				break;
			default:
				break;
		}
	};

	const Row = ({ icon, label, onPress }) => (
		<Pressable onPress={onPress} android_ripple={{ color: '#eef2f7' }} style={styles.row}>
			<View style={styles.rowLeft}>
				<Image source={icon} style={styles.rowIcon} />
				<Text style={styles.rowLabel}>{label}</Text>
			</View>
			<MaterialIcons name="chevron-right" size={22} color="#77839a" />
		</Pressable>
	);

	return (
		<LinearGradient colors={["#ffffff", "#f2f5fb", "#e9edf4"]} style={{ flex: 1 }}>
			<SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
				{/* Topbar */}
				<View style={styles.topBar}>
					<MaterialIcons name="arrow-back" size={24} color="#0A2A54" onPress={() => navigation.goBack()} />
					<Text style={styles.topTitle}>RC PLAY</Text>
					<View style={{ width: 24 }} />
				</View>

				{/* Avatar/Logo e título */}
				<View style={styles.header}>
					<View style={styles.logoCircle}>
						{userAvatar ? (
							<Image source={{ uri: userAvatar }} style={styles.logoAvatar} />
						) : (
							<Image source={require('./assets/images/ico_user.png')} style={styles.logo} />
						)}
					</View>
					<View style={{ alignItems: 'center' }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
							<Text style={styles.brand}>{userName}</Text>
							<Image source={require('./assets/images/ico_premium.png')} style={styles.crown} />
						</View>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
							<Text style={styles.manage}>Gerenciar perfil</Text>
							<Image source={require('./assets/images/ico_edit.png')} style={styles.edit} />
						</View>
					</View>
				</View>

				{/* Menu */}
				<View style={styles.menuBox}>
					<Row icon={require('./assets/images/ico_perfil.png')} label="Meu perfil" onPress={() => handlePress('perfil')} />
					<View style={styles.divider} />
					<Row icon={require('./assets/images/ico_conectar.png')} label="Conectar a um dispositivo" onPress={() => handlePress('conectar')} />
					<View style={styles.divider} />
					<Row icon={require('./assets/images/ico_config.png')} label="Configurações" onPress={() => handlePress('config')} />
					<View style={styles.divider} />
					<Row icon={require('./assets/images/ico_conta.png')} label="Conta" onPress={() => handlePress('conta')} />
					<View style={styles.divider} />
					<Row icon={require('./assets/images/ico_ajuda.png')} label="Ajuda e Privacidade" onPress={() => handlePress('ajuda')} />
					<View style={styles.divider} />
					<Row icon={require('./assets/images/ico_sair.png')} label="Sair" onPress={() => handlePress('sair')} />
				</View>
			</SafeAreaView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	topBar: {
		height: 52,
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	topTitle: { fontSize: 13, fontWeight: '800', color: '#0A2A54' },
	header: { alignItems: 'center', marginTop: 12, marginBottom: 18 },
	logoCircle: {
		width: 150,
		height: 150,
		borderRadius: 75,
		backgroundColor: '#0A2A54',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
		...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }),
	},
	logo: { width: 90, height: 90, tintColor: '#fff' },
	logoAvatar: { 
		width: 150, 
		height: 150, 
		borderRadius: 75,
		resizeMode: 'cover'
	},
	brand: { fontSize: 16, fontWeight: '800', color: '#0A2A54' },
	crown: { width: 16, height: 16, resizeMode: 'contain' },
	manage: { fontSize: 16, color: '#6d7a8b', marginVertical: 2 },
	edit: { width: 16, height: 16, tintColor: '#6d7a8b' },
	menuBox: { marginTop: 10, marginHorizontal: 18, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
	row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 14 },
	rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowIcon: { width: 22, height: 22, resizeMode: 'contain' },
	rowLabel: { fontSize: 15, color: '#1f2d3d' },
	divider: { height: 1, backgroundColor: '#e6ebf2', marginHorizontal: 14 },
});
