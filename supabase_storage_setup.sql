-- =====================================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE PARA AVATARS
-- =====================================================

-- 1. Criar o bucket 'avatars' para armazenar imagens de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Público para permitir acesso às imagens
  5242880, -- Limite de 5MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir que usuários façam upload de seus próprios avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Política para permitir que usuários atualizem seus próprios avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Política para permitir que usuários deletem seus próprios avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Política para permitir que todos vejam os avatars (para exibição)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- =====================================================
-- VERIFICAÇÕES E TESTES
-- =====================================================

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Verificar as políticas criadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

-- Este SQL configura:
-- 1. Bucket 'avatars' público para armazenar imagens de perfil
-- 2. Limite de 5MB por arquivo
-- 3. Tipos de arquivo permitidos: JPEG, PNG, GIF, WebP
-- 4. Políticas de segurança para upload/update/delete apenas do próprio usuário
-- 5. Política de visualização pública para todos os avatars

-- Estrutura de pastas no bucket:
-- avatars/
--   ├── avatar_[user_id]_[timestamp].jpg
--   ├── avatar_[user_id]_[timestamp].png
--   └── ...

-- URLs públicas geradas automaticamente:
-- https://[project].supabase.co/storage/v1/object/public/avatars/avatar_[user_id]_[timestamp].jpg
