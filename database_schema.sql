-- =====================================================
-- SCHEMA DO BANCO DE DADOS - SUCESSO FM
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: user_profiles (Perfis dos usuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    uf TEXT(2),
    city TEXT,
    avatar_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: playlists (Playlists dos usuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    cover_image_url TEXT,
    track_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- em segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: playlist_tracks (Músicas das playlists)
-- =====================================================
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id TEXT NOT NULL, -- ID da música (pode ser do sistema externo)
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER, -- em segundos
    url TEXT NOT NULL,
    cover_image_url TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    position INTEGER DEFAULT 0 -- posição na playlist
);

-- =====================================================
-- TABELA: playback_history (Histórico de reprodução)
-- =====================================================
CREATE TABLE IF NOT EXISTS playback_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER,
    url TEXT NOT NULL,
    cover_image_url TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    play_duration INTEGER DEFAULT 0 -- quanto tempo foi reproduzido
);

-- =====================================================
-- TABELA: favorite_tracks (Músicas favoritas)
-- =====================================================
CREATE TABLE IF NOT EXISTS favorite_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER,
    url TEXT NOT NULL,
    cover_image_url TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, track_id)
);

-- =====================================================
-- TABELA: app_settings (Configurações do aplicativo)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    auto_play BOOLEAN DEFAULT TRUE,
    crossfade_duration INTEGER DEFAULT 0, -- em segundos
    audio_quality TEXT DEFAULT 'high', -- 'low', 'medium', 'high'
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- TABELA: subscription_plans (Planos de assinatura)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    duration_days INTEGER NOT NULL,
    features JSONB, -- recursos incluídos no plano
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: user_subscriptions (Assinaturas dos usuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    status TEXT NOT NULL, -- 'active', 'cancelled', 'expired', 'pending'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: app_analytics (Análises de uso)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'login', 'play', 'pause', 'skip', 'search'
    event_data JSONB, -- dados específicos do evento
    device_info JSONB, -- informações do dispositivo
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES para melhorar performance
-- =====================================================

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium ON user_profiles(is_premium);

-- Índices para playlists
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at);

-- Índices para playlist_tracks
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);

-- Índices para playback_history
CREATE INDEX IF NOT EXISTS idx_playback_history_user_id ON playback_history(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_history_played_at ON playback_history(played_at);

-- Índices para favorite_tracks
CREATE INDEX IF NOT EXISTS idx_favorite_tracks_user_id ON favorite_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_tracks_added_at ON favorite_tracks(added_at);

-- Índices para user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);

-- Índices para app_analytics
CREATE INDEX IF NOT EXISTS idx_app_analytics_user_id ON app_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_app_analytics_event_type ON app_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_created_at ON app_analytics(created_at);

-- =====================================================
-- FUNÇÕES auxiliares
-- =====================================================

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contador de músicas na playlist
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists SET track_count = track_count + 1 WHERE id = NEW.playlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists SET track_count = track_count - 1 WHERE id = OLD.playlist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers para atualizar contador de músicas
CREATE TRIGGER update_playlist_track_count_insert AFTER INSERT ON playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

CREATE TRIGGER update_playlist_track_count_delete AFTER DELETE ON playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para playlists
CREATE POLICY "Users can view own playlists" ON playlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own playlists" ON playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists" ON playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists" ON playlists
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para playlist_tracks
CREATE POLICY "Users can view tracks from own playlists" ON playlist_tracks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add tracks to own playlists" ON playlist_tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tracks from own playlists" ON playlist_tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tracks from own playlists" ON playlist_tracks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

-- Políticas para outras tabelas seguem o mesmo padrão
-- (usuários só podem acessar seus próprios dados)

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir planos de assinatura padrão
INSERT INTO subscription_plans (name, description, price, duration_days, features) VALUES
('Gratuito', 'Acesso básico ao aplicativo', 0.00, 0, '["streaming_basic", "playlists_limit_5", "ads"]'),
('Premium', 'Acesso completo sem anúncios', 19.90, 30, '["streaming_hd", "playlists_unlimited", "no_ads", "offline_download", "priority_support"]'),
('Familiar', 'Até 6 contas premium', 39.90, 30, '["streaming_hd", "playlists_unlimited", "no_ads", "offline_download", "priority_support", "family_accounts"]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS das tabelas
-- =====================================================

COMMENT ON TABLE user_profiles IS 'Perfis dos usuários do aplicativo';
COMMENT ON TABLE playlists IS 'Playlists personalizadas dos usuários';
COMMENT ON TABLE playlist_tracks IS 'Músicas das playlists';
COMMENT ON TABLE playback_history IS 'Histórico de reprodução dos usuários';
COMMENT ON TABLE favorite_tracks IS 'Músicas favoritas dos usuários';
COMMENT ON TABLE app_settings IS 'Configurações do aplicativo por usuário';
COMMENT ON TABLE subscription_plans IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE user_subscriptions IS 'Assinaturas ativas dos usuários';
COMMENT ON TABLE app_analytics IS 'Análises de uso do aplicativo';
