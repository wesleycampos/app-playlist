import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <LinearGradient colors={['#87CEEB', '#ffffff']} style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0A2A54" />
        </Pressable>
        <Text style={styles.headerTitle}>Políticas de Privacidade</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Informações Gerais</Text>
          <Text style={styles.text}>
            Bem-vindo ao Sucesso FM, um aplicativo de streaming de rádio e conteúdo multimídia. 
            Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações 
            pessoais quando você utiliza nosso aplicativo.
          </Text>

          <Text style={styles.sectionTitle}>2. Informações que Coletamos</Text>
          <Text style={styles.subTitle}>2.1 Informações de Cadastro:</Text>
          <Text style={styles.text}>
            • Nome completo{'\n'}
            • Endereço de e-mail{'\n'}
            • Número de telefone{'\n'}
            • Localização (UF e cidade){'\n'}
            • Senha (criptografada)
          </Text>

          <Text style={styles.subTitle}>2.2 Informações de Uso:</Text>
          <Text style={styles.text}>
            • Histórico de reprodução{'\n'}
            • Playlists favoritas{'\n'}
            • Preferências de conteúdo{'\n'}
            • Dados de dispositivo e conexão
          </Text>

          <Text style={styles.sectionTitle}>3. Como Usamos Suas Informações</Text>
          <Text style={styles.text}>
            Utilizamos suas informações para:{'\n'}
            • Fornecer e personalizar nossos serviços{'\n'}
            • Processar pagamentos e assinaturas{'\n'}
            • Enviar notificações importantes{'\n'}
            • Melhorar a experiência do usuário{'\n'}
            • Cumprir obrigações legais
          </Text>

          <Text style={styles.sectionTitle}>4. Compartilhamento de Informações</Text>
          <Text style={styles.text}>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
            exceto quando:{'\n'}
            • Você autoriza expressamente{'\n'}
            • É necessário para prestar nossos serviços{'\n'}
            • Exigido por lei ou ordem judicial{'\n'}
            • Para proteger nossos direitos e segurança
          </Text>

          <Text style={styles.sectionTitle}>5. Segurança dos Dados</Text>
          <Text style={styles.text}>
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas 
            informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
          </Text>

          <Text style={styles.sectionTitle}>6. Retenção de Dados</Text>
          <Text style={styles.text}>
            Mantemos suas informações pessoais pelo tempo necessário para fornecer nossos 
            serviços e cumprir obrigações legais. Você pode solicitar a exclusão de seus 
            dados a qualquer momento.
          </Text>

          <Text style={styles.sectionTitle}>7. Seus Direitos</Text>
          <Text style={styles.text}>
            Você tem o direito de:{'\n'}
            • Acessar suas informações pessoais{'\n'}
            • Corrigir dados incorretos{'\n'}
            • Solicitar exclusão de dados{'\n'}
            • Revogar consentimento{'\n'}
            • Portabilidade de dados
          </Text>

          <Text style={styles.sectionTitle}>8. Cookies e Tecnologias Similares</Text>
          <Text style={styles.text}>
            Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
            analisar o uso do aplicativo e personalizar conteúdo.
          </Text>

          <Text style={styles.sectionTitle}>9. Menores de Idade</Text>
          <Text style={styles.text}>
            Nosso aplicativo não é destinado a menores de 13 anos. Não coletamos 
            intencionalmente informações pessoais de crianças menores de 13 anos.
          </Text>

          <Text style={styles.sectionTitle}>10. Alterações na Política</Text>
          <Text style={styles.text}>
            Podemos atualizar esta Política de Privacidade periodicamente. 
            Notificaremos sobre mudanças significativas através do aplicativo ou e-mail.
          </Text>

          <Text style={styles.sectionTitle}>11. Contato</Text>
          <Text style={styles.text}>
            Para dúvidas sobre esta política ou exercer seus direitos, entre em contato:{'\n'}
            • E-mail: privacidade@sucessofm.com{'\n'}
            • Telefone: (11) 99999-9999{'\n'}
            • Endereço: Rua Exemplo, 123 - São Paulo/SP
          </Text>

          <Text style={styles.lastUpdated}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A2A54',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2A54',
    marginTop: 24,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2A54',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4a5568',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#8fa2b5',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
