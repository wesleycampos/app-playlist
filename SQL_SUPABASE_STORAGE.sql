-- =====================================================
-- SQL PARA CONFIGURAR SUPABASE STORAGE - AVATARS
-- =====================================================
-- Execute este SQL no SQL Editor do Supabase

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
-- VERIFICAÇÕES (Execute após criar as políticas)
-- =====================================================

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Verificar as políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================

/*
Este SQL configura:

1. BUCKET 'avatars':
   - Nome: avatars
   - Público: true (permite acesso direto às URLs)
   - Limite: 5MB por arquivo
   - Tipos permitidos: JPEG, PNG, GIF, WebP

2. POLÍTICAS DE SEGURANÇA:
   - Upload: Usuários só podem fazer upload de seus próprios avatars
   - Visualização: Todos podem ver avatars (necessário para o app)
   - Atualização: Usuários só podem atualizar seus próprios avatars
   - Exclusão: Usuários só podem deletar seus próprios avatars

3. ESTRUTURA DE PASTAS:
   avatars/
   ├── avatar_[user_id]_[timestamp].jpg
   ├── avatar_[user_id]_[timestamp].png
   └── ...

4. URLs PÚBLICAS GERADAS:
   https://[projeto].supabase.co/storage/v1/object/public/avatars/avatar_[user_id]_[timestamp].jpg

5. SEGURANÇA:
   - Cada usuário só pode gerenciar seus próprios arquivos
   - Arquivos são organizados por pasta do usuário
   - Limite de tamanho evita abuso
   - Apenas tipos de imagem são permitidos
*/
