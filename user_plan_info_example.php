<?php
// =====================================================
// API: user_plan_info.php
// Busca informações do plano do usuário diretamente do banco
// =====================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configurações do banco
$host = 'localhost';
$dbname = 'sucesso_fm';
$username = 'seu_usuario';
$password = 'sua_senha';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['ok' => false, 'error' => 'Erro de conexão com o banco']);
    exit;
}

// Obter user_id da requisição
$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(['ok' => false, 'error' => 'user_id é obrigatório']);
    exit;
}

try {
    // Query para buscar informações do plano do usuário
    $sql = "
        SELECT 
            sp.name as plan_name,
            sp.id as plan_id,
            sp.features,
            us.status as subscription_status,
            us.end_date,
            COUNT(pt.id) as total_tracks,
            CASE 
                WHEN sp.name = 'Plano Basic' THEN 10
                WHEN sp.name = 'Plano Intermediário' THEN 25
                WHEN sp.name = 'Plano Master' THEN 50
                ELSE 5
            END as limit_tracks
        FROM user_profiles up
        LEFT JOIN user_subscriptions us ON up.id = us.user_id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        LEFT JOIN playlists p ON up.id = p.user_id
        LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
        WHERE up.id = :user_id
        GROUP BY sp.name, sp.id, sp.features, us.status, us.end_date
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result || !$result['plan_name']) {
        // Se não tem plano ativo, usar plano padrão
        $result = [
            'plan_name' => 'Plano Basic',
            'plan_id' => null,
            'features' => '["streaming_basic", "playlists_limit_5", "ads"]',
            'subscription_status' => 'free',
            'end_date' => null,
            'total_tracks' => 0,
            'limit_tracks' => 10
        ];
    }
    
    // Retornar dados formatados
    echo json_encode([
        'ok' => true,
        'plan_name' => $result['plan_name'],
        'plan_id' => $result['plan_id'],
        'limit' => (int)$result['limit_tracks'],
        'total_tracks' => (int)$result['total_tracks'],
        'subscription_status' => $result['subscription_status'],
        'features' => json_decode($result['features'], true),
        'end_date' => $result['end_date']
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['ok' => false, 'error' => 'Erro na consulta: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => 'Erro geral: ' . $e->getMessage()]);
}
?>
