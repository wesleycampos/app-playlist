# 🚨 CONFIGURAR SUPABASE STORAGE - URGENTE

## ❌ Problema Atual
O erro `Network request failed` indica que o **Supabase Storage não está configurado**.

## ✅ Solução Rápida

### 1. Acesse o Supabase Dashboard
- Entre no seu projeto Supabase
- Vá para **Storage** no menu lateral

### 2. Criar Bucket Manualmente
1. Clique em **"New bucket"**
2. **Nome:** `avatars`
3. **Public:** ✅ Marque como público
4. Clique em **"Create bucket"**

### 3. Configurar Políticas
1. Clique no bucket `avatars`
2. Vá para **"Policies"**
3. Clique em **"New Policy"**

#### Política 1: Upload
- **Name:** `Users can upload avatars`
- **Operation:** `INSERT`
- **Target roles:** `authenticated`
- **Policy definition:**
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Política 2: Visualização
- **Name:** `Anyone can view avatars`
- **Operation:** `SELECT`
- **Target roles:** `public`
- **Policy definition:**
```sql
bucket_id = 'avatars'
```

#### Política 3: Atualização
- **Name:** `Users can update avatars`
- **Operation:** `UPDATE`
- **Target roles:** `authenticated`
- **Policy definition:**
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Política 4: Exclusão
- **Name:** `Users can delete avatars`
- **Operation:** `DELETE`
- **Target roles:** `authenticated`
- **Policy definition:**
```sql
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

## 🔧 Alternativa: SQL Automático

Se preferir, execute este SQL no **SQL Editor**:

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🧪 Testar Configuração

Após configurar:

1. **Reinicie o app**
2. **Vá para "Meu perfil"**
3. **Toque no botão de câmera**
4. **Selecione uma foto**
5. **Deve funcionar sem erro!**

## 📱 Status Atual

- ✅ **Seleção de imagem:** Funcionando
- ✅ **Preview local:** Funcionando  
- ❌ **Upload para Supabase:** Falhando (Storage não configurado)
- ✅ **Salvamento local:** Funcionando (URI local)

## 🎯 Após Configurar Storage

Quando o Supabase Storage estiver configurado, descomente o código no arquivo `ProfileEditScreen.js` (linhas 147-176) para ativar o upload real.

---

**⚡ AÇÃO NECESSÁRIA:** Configure o Supabase Storage para resolver o erro!
