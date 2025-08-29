import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function TermsOfServiceScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>Termos de Serviço</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
          <Text style={styles.text}>
            Ao utilizar o aplicativo Sucesso FM, você concorda em cumprir e estar vinculado 
            a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, 
            não deve usar nosso aplicativo.
          </Text>

          <Text style={styles.sectionTitle}>2. Descrição do Serviço</Text>
          <Text style={styles.text}>
            O Sucesso FM é um aplicativo de streaming de rádio que oferece:{'\n'}
            • Transmissão ao vivo de rádio{'\n'}
            • Conteúdo sob demanda{'\n'}
            • Playlists personalizadas{'\n'}
            • Recursos premium para assinantes
          </Text>

          <Text style={styles.sectionTitle}>3. Conta do Usuário</Text>
          <Text style={styles.subTitle}>3.1 Criação de Conta:</Text>
          <Text style={styles.text}>
            • Você deve fornecer informações precisas e atualizadas{'\n'}
            • É responsável por manter a confidencialidade de sua senha{'\n'}
            • Não deve compartilhar sua conta com terceiros{'\n'}
            • Deve notificar imediatamente sobre uso não autorizado
          </Text>

          <Text style={styles.subTitle}>3.2 Elegibilidade:</Text>
          <Text style={styles.text}>
            • Você deve ter pelo menos 13 anos de idade{'\n'}
            • Deve ter capacidade legal para celebrar contratos{'\n'}
            • Não pode usar o serviço se for proibido por lei
          </Text>

          <Text style={styles.sectionTitle}>4. Uso Aceitável</Text>
          <Text style={styles.text}>
            Você concorda em não:{'\n'}
            • Usar o serviço para fins ilegais ou não autorizados{'\n'}
            • Violar direitos de propriedade intelectual{'\n'}
            • Transmitir conteúdo ofensivo ou inadequado{'\n'}
            • Tentar acessar sistemas não autorizados{'\n'}
            • Interferir no funcionamento do serviço
          </Text>

          <Text style={styles.sectionTitle}>5. Conteúdo e Propriedade Intelectual</Text>
          <Text style={styles.text}>
            • Todo o conteúdo do aplicativo é protegido por direitos autorais{'\n'}
            • Você não pode reproduzir, distribuir ou modificar o conteúdo{'\n'}
            • O uso é permitido apenas para uso pessoal e não comercial{'\n'}
            • Respeitamos os direitos autorais de terceiros
          </Text>

          <Text style={styles.sectionTitle}>6. Assinaturas e Pagamentos</Text>
          <Text style={styles.subTitle}>6.1 Planos de Assinatura:</Text>
          <Text style={styles.text}>
            • Oferecemos planos gratuitos e premium{'\n'}
            • Assinaturas são renovadas automaticamente{'\n'}
            • Você pode cancelar a qualquer momento{'\n'}
            • Reembolsos seguem nossa política específica
          </Text>

          <Text style={styles.subTitle}>6.2 Pagamentos:</Text>
          <Text style={styles.text}>
            • Aceitamos cartões de crédito e débito{'\n'}
            • Preços podem ser alterados com aviso prévio{'\n'}
            • Impostos aplicáveis serão cobrados{'\n'}
            • Falhas no pagamento podem resultar em suspensão
          </Text>

          <Text style={styles.sectionTitle}>7. Limitação de Responsabilidade</Text>
          <Text style={styles.text}>
            • O serviço é fornecido "como está"{'\n'}
            • Não garantimos disponibilidade ininterrupta{'\n'}
            • Não somos responsáveis por danos indiretos{'\n'}
            • Nossa responsabilidade é limitada ao valor pago
          </Text>

          <Text style={styles.sectionTitle}>8. Modificações do Serviço</Text>
          <Text style={styles.text}>
            • Podemos modificar ou descontinuar funcionalidades{'\n'}
            • Notificaremos sobre mudanças significativas{'\n'}
            • Seu uso continuado constitui aceitação das mudanças{'\n'}
            • Você pode cancelar se não concordar com as alterações
          </Text>

          <Text style={styles.sectionTitle}>9. Rescisão</Text>
          <Text style={styles.text}>
            Podemos encerrar ou suspender sua conta:{'\n'}
            • Por violação destes termos{'\n'}
            • Por uso inadequado do serviço{'\n'}
            • Por solicitação sua{'\n'}
            • Por motivos técnicos ou legais
          </Text>

          <Text style={styles.sectionTitle}>10. Lei Aplicável</Text>
          <Text style={styles.text}>
            • Estes termos são regidos pelas leis brasileiras{'\n'}
            • Disputas serão resolvidas em São Paulo/SP{'\n'}
            • Se qualquer cláusula for inválida, as demais permanecem válidas{'\n'}
            • Estes termos constituem o acordo completo entre as partes
          </Text>

          <Text style={styles.sectionTitle}>11. Contato</Text>
          <Text style={styles.text}>
            Para dúvidas sobre estes termos:{'\n'}
            • E-mail: termos@sucessofm.com{'\n'}
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
