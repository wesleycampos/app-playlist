# Configuração do Supabase Storage para Avatars

## 📋 Pré-requisitos

1. **Projeto Supabase criado**
2. **Acesso ao painel administrativo do Supabase**
3. **Permissões de administrador**

## 🚀 Passos para Configuração

### 1. Acessar o SQL Editor

1. Entre no painel do Supabase
2. Vá para **SQL Editor** no menu lateral
3. Clique em **New Query**

### 2. Executar o SQL de Configuração

1. Copie todo o conteúdo do arquivo `supabase_storage_setup.sql`
2. Cole no editor SQL
3. Clique em **Run** para executar

### 3. Verificar a Configuração

Após executar o SQL, você deve ver:

#### Bucket Criado:
- Nome: `avatars`
- Público: `true`
- Limite de arquivo: `5MB`
- Tipos permitidos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

#### Políticas Criadas:
- `Users can upload their own avatars`
- `Users can update their own avatars`
- `Users can delete their own avatars`
- `Anyone can view avatars`

### 4. Verificar no Painel Storage

1. Vá para **Storage** no menu lateral
2. Você deve ver o bucket `avatars` listado
3. Clique no bucket para ver suas configurações

## 🔧 Configurações Adicionais (Opcional)

### Aumentar Limite de Arquivo

Se quiser permitir imagens maiores:

```sql
UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB
WHERE id = 'avatars';
```

### Adicionar Mais Tipos de Arquivo

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
WHERE id = 'avatars';
```

## 🧪 Testando a Configuração

### 1. Teste de Upload

Execute este SQL para testar se um usuário pode fazer upload:

```sql
-- Substitua 'user-uuid' pelo UUID real de um usuário
SELECT auth.uid() as current_user_id;
```

### 2. Teste de Visualização

Acesse uma URL de avatar diretamente:
```
https://[seu-projeto].supabase.co/storage/v1/object/public/avatars/avatar_[user-id]_[timestamp].jpg
```

## 🚨 Solução de Problemas

### Erro: "Bucket already exists"
- Isso é normal se o bucket já existir
- O comando `ON CONFLICT DO NOTHING` evita erros

### Erro: "Policy already exists"
- As políticas podem já existir
- Isso não afeta o funcionamento

### Erro de Permissão
- Verifique se você tem permissões de administrador
- Execute o SQL como superuser se necessário

## 📱 Integração com o App

Após configurar o Storage, o app React Native funcionará automaticamente:

1. **Upload:** Usuários podem selecionar fotos da galeria/câmera
2. **Armazenamento:** Imagens são salvas no bucket `avatars`
3. **URLs:** URLs públicas são geradas automaticamente
4. **Exibição:** Imagens aparecem nas telas do app

## 🔒 Segurança

As políticas garantem que:
- ✅ Usuários só podem fazer upload de seus próprios avatars
- ✅ Usuários só podem atualizar seus próprios avatars
- ✅ Usuários só podem deletar seus próprios avatars
- ✅ Todos podem visualizar avatars (necessário para exibição no app)
- ✅ Arquivos são limitados a 5MB
- ✅ Apenas tipos de imagem são permitidos

## 📊 Monitoramento

Para monitorar o uso do Storage:

1. **Storage Dashboard:** Veja uso de espaço e número de arquivos
2. **Logs:** Monitore uploads e erros
3. **Métricas:** Acompanhe performance e custos

---

**✅ Configuração Completa!**

Após executar o SQL, o sistema de avatars estará totalmente funcional no seu app.
