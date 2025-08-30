# 🚀 Configuração do Supabase - Sucesso FM

Este guia irá ajudá-lo a configurar o Supabase para o aplicativo Sucesso FM.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Projeto criado no Supabase
- Node.js e npm instalados

## 🔧 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Digite um nome para o projeto (ex: "sucesso-fm")
6. Escolha uma senha forte para o banco
7. Escolha uma região (recomendado: São Paulo)
8. Clique em "Create new project"

### 2. Obter Credenciais

1. No seu projeto, vá para **Settings** > **API**
2. Copie a **Project URL**
3. Copie a **anon public** key
4. Guarde essas informações para usar no próximo passo

### 3. Configurar Variáveis de Ambiente

1. Copie o arquivo `env.example` para `.env`:
   ```bash
   cp env.example .env
   ```

2. Edite o arquivo `.env` e substitua as credenciais:
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anonima-aqui
   ```

3. Atualize também o arquivo `supabase.js` com as mesmas credenciais

### 4. Executar Schema do Banco

1. No Supabase, vá para **SQL Editor**
2. Clique em **New query**
3. Copie todo o conteúdo do arquivo `database_schema.sql`
4. Cole no editor SQL
5. Clique em **Run** para executar

### 5. Verificar Configuração

1. Vá para **Table Editor** no Supabase
2. Verifique se as tabelas foram criadas:
   - `user_profiles`
   - `playlists`
   - `playlist_tracks`
   - `playback_history`
   - `favorite_tracks`
   - `app_settings`
   - `subscription_plans`
   - `user_subscriptions`
   - `app_analytics`

## 🗄️ Estrutura do Banco

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `user_profiles` | Perfis dos usuários |
| `playlists` | Playlists personalizadas |
| `playlist_tracks` | Músicas das playlists |
| `playback_history` | Histórico de reprodução |
| `favorite_tracks` | Músicas favoritas |
| `app_settings` | Configurações do app |
| `subscription_plans` | Planos de assinatura |
| `user_subscriptions` | Assinaturas ativas |
| `app_analytics` | Análises de uso |

### Relacionamentos

- `user_profiles` → `playlists` (1:N)
- `playlists` → `playlist_tracks` (1:N)
- `user_profiles` → `playback_history` (1:N)
- `user_profiles` → `favorite_tracks` (1:N)
- `user_profiles` → `app_settings` (1:1)
- `user_profiles` → `user_subscriptions` (1:N)

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado, garantindo que:
- Usuários só acessem seus próprios dados
- Dados sejam isolados por usuário
- Segurança em nível de linha

### Políticas Implementadas

- **SELECT**: Usuários veem apenas seus dados
- **INSERT**: Usuários criam apenas seus dados
- **UPDATE**: Usuários atualizam apenas seus dados
- **DELETE**: Usuários deletam apenas seus dados

## 🚀 Funcionalidades

### Autenticação
- Login/Logout
- Cadastro de usuários
- Gerenciamento de sessões
- Recuperação de senha

### Perfis de Usuário
- Dados pessoais
- Configurações do app
- Status premium
- Histórico de uso

### Playlists
- Criação personalizada
- Adição/remoção de músicas
- Compartilhamento (opcional)
- Estatísticas de uso

### Assinaturas
- Planos gratuitos e premium
- Gerenciamento de pagamentos
- Renovação automática
- Recursos premium

## 📱 Integração com o App

### Arquivo `supabase.js`

Contém todas as funções necessárias:
- `auth.*` - Funções de autenticação
- `users.*` - Gerenciamento de perfis
- `playlists.*` - Gerenciamento de playlists
- `history.*` - Histórico de reprodução

### Uso no App

```javascript
import { auth, users, playlists } from './supabase';

// Login
const result = await auth.signIn(email, password);

// Criar perfil
const profile = await users.createProfile(userId, userData);

// Criar playlist
const playlist = await playlists.create(playlistData);
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de conexão**
   - Verifique se as credenciais estão corretas
   - Confirme se o projeto está ativo

2. **Tabelas não criadas**
   - Execute o SQL novamente
   - Verifique se há erros no console

3. **Erro de permissão**
   - Verifique se o RLS está configurado
   - Confirme se as políticas estão ativas

### Logs e Debug

- Use o console do navegador para ver erros
- Verifique os logs no Supabase Dashboard
- Use o SQL Editor para consultas de teste

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript)
- [Exemplos de Código](https://supabase.com/docs/guides/examples)

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Consulte a documentação oficial
3. Abra uma issue no repositório
4. Entre em contato com a equipe de desenvolvimento

---

**🎵 Sucesso FM - Sua música, sua experiência!**
