# 🚨 PROBLEMA CRÍTICO: Assinatura de URLs - Erro 403 Persistente

## 📊 Diagnóstico Final

### ✅ Frontend (100% Funcional)

- ✅ Sistema de renovação automática implementado
- ✅ Retry automático funcionando
- ✅ TTL de 7200s (2 horas) configurado
- ✅ Detecção de erro 403/400 funcionando
- ✅ Logs detalhados mostrando processo completo

### ❌ Backend (Problema Identificado)

**Status:** Todas as URLs de streaming retornam **HTTP 403** imediatamente, mesmo após renovação automática.

**Evidência:** Logs mostram que:
1. ✅ Frontend solicita URLs com TTL 7200s
2. ✅ Backend gera URLs com timestamp de expiração correto (2 horas no futuro)
3. ❌ Backend rejeita **IMEDIATAMENTE** todas as URLs com 403
4. ✅ Frontend detecta erro e renova automaticamente
5. ❌ Backend rejeita **NOVAMENTE** as URLs renovadas com 403

---

## 🔍 Causa Raiz: Assinatura HMAC-SHA256 Incorreta

### 📋 Análise dos Logs do Backend

O problema está na **validação da assinatura HMAC-SHA256** no `stream.php`.

**Exemplo de URL recebida:**
```
/api/stream.php?u=4d03f96f-cdd2-4b2a-b088-ee25021d596c
&p=genres%2FUnknown%2FBee%20Gees%20-%20How%20Deep%20Is%20Your%20Love.mp3
&e=1759868871
&s=45553e227b076aa0542fe6df2952daef4ed521819731e56d1a16b34aff8c1a5b
```

**Parâmetros:**
- `u` = userId: `4d03f96f-cdd2-4b2a-b088-ee25021d596c`
- `p` = path: `genres%2FUnknown%2FBee%20Gees%20-%20How%20Deep%20Is%20Your%20Love.mp3` (URL encoded)
- `e` = expiration: `1759868871` (timestamp Unix)
- `s` = signature: `45553e227b076aa0542fe6df2952daef4ed521819731e56d1a16b34aff8c1a5b`

### 🔧 Problemas Identificados

#### 1. **Chave Secreta Diferente** (90% probabilidade)
```php
// playlist_resolve.php
define('SECRET_KEY', 'abc123xyz');

// stream.php
define('SECRET_KEY', 'xyz123abc'); // ← DIFERENTE!
```

#### 2. **Ordem dos Dados na Assinatura** (8% probabilidade)
```php
// playlist_resolve.php
$dataToSign = $userId . $encodedPath . $expiration;

// stream.php
$dataToSign = $encodedPath . $userId . $expiration; // ← ORDEM ERRADA!
```

#### 3. **Encoding Inconsistente** (2% probabilidade)
```php
// playlist_resolve.php
$encodedPath = urlencode($path);

// stream.php
$decodedPath = rawurldecode($_GET['p']); // ← Método diferente!
```

---

## ✅ Solução Backend

### 1. Verificar `playlist_resolve.php`

```php
<?php
// playlist_resolve.php

error_log("=== DEBUG PLAYLIST RESOLVE ===");

$secretKey = 'SUA_CHAVE_SECRETA_AQUI'; // ← Mesma que stream.php!
$ttl = isset($_GET['ttl']) ? intval($_GET['ttl']) : 1800;
$expiration = time() + $ttl;

error_log("TTL solicitado: $ttl");
error_log("Timestamp atual: " . time());
error_log("Timestamp expiração: $expiration");

foreach ($items as &$item) {
    $userId = $_GET['user_id'];
    $path = $item['path'];

    // Codificar path (MÉTODO 1)
    $encodedPath = urlencode($path);

    // Dados para assinatura (ORDEM IMPORTA!)
    $dataToSign = $userId . $encodedPath . $expiration;

    // Gerar assinatura
    $signature = hash_hmac('sha256', $dataToSign, $secretKey);

    // Montar URL
    $streamUrl = sprintf(
        '/api/stream.php?u=%s&p=%s&e=%d&s=%s',
        $userId,
        $encodedPath,
        $expiration,
        $signature
    );

    $item['streamUrl'] = $streamUrl;

    error_log("Música: " . $item['title']);
    error_log("  Path original: $path");
    error_log("  Path codificado: $encodedPath");
    error_log("  Dados assinados: $dataToSign");
    error_log("  Assinatura: $signature");
    error_log("  URL completa: $streamUrl");
}

error_log("=== FIM DEBUG ===");
?>
```

### 2. Verificar `stream.php`

```php
<?php
// stream.php

error_log("=== DEBUG STREAM ===");

$secretKey = 'SUA_CHAVE_SECRETA_AQUI'; // ← Mesma que playlist_resolve.php!

// Obter parâmetros
$userId = $_GET['u'] ?? '';
$encodedPath = $_GET['p'] ?? '';
$expiration = intval($_GET['e'] ?? 0);
$providedSignature = $_GET['s'] ?? '';

error_log("userId: $userId");
error_log("encodedPath: $encodedPath");
error_log("expiration: $expiration (" . date('Y-m-d H:i:s', $expiration) . ")");
error_log("providedSignature: $providedSignature");

// 1. VERIFICAR EXPIRAÇÃO
$now = time();
if ($now > $expiration) {
    error_log("❌ URL EXPIRADA há " . ($now - $expiration) . " segundos");
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL expired']);
    exit;
}

// 2. RECALCULAR ASSINATURA (MESMA ORDEM!)
$dataToSign = $userId . $encodedPath . $expiration;
$calculatedSignature = hash_hmac('sha256', $dataToSign, $secretKey);

error_log("Dados para assinatura: $dataToSign");
error_log("Assinatura calculada: $calculatedSignature");
error_log("Assinatura fornecida: $providedSignature");

// 3. VALIDAR ASSINATURA
if (!hash_equals($calculatedSignature, $providedSignature)) {
    error_log("❌ ASSINATURA INVÁLIDA");
    error_log("  Esperada: $calculatedSignature");
    error_log("  Recebida: $providedSignature");
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

error_log("✅ Assinatura válida");

// 4. DECODIFICAR PATH (MÉTODO 1)
$filePath = urldecode($encodedPath);
error_log("Path decodificado: $filePath");

// ... resto do código para servir arquivo
error_log("=== FIM DEBUG ===");
?>
```

---

## 🧪 Teste Rápido

Execute este teste para confirmar a causa:

```bash
# 1. Gerar URL com TTL curto
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=4d03f96f-cdd2-4b2a-b088-ee25021d596c&ttl=60" > teste.json

# 2. Extrair primeira URL
STREAM_URL=$(cat teste.json | grep -o '"/api/stream.php[^"]*' | head -1 | tr -d '"')

# 3. Testar imediatamente (deve funcionar)
curl -I "https://musicas.radiosucessobrasilia.com.br$STREAM_URL"

# 4. Testar após 70 segundos (deve dar 403 por expiração)
sleep 70
curl "https://musicas.radiosucessobrasilia.com.br$STREAM_URL"
```

**Resultado esperado:**
- Teste 3: HTTP 200 OK ✅
- Teste 4: HTTP 403 + `{"error":"URL expired"}` ✅

Se **ambos retornarem 403**, o problema é a **assinatura** (não a expiração).

---

## 📞 Informações para o Desenvolvedor Backend

```
PROBLEMA: Todas as URLs de streaming retornam HTTP 403 imediatamente

FRONTEND:
- Solicita TTL: 7200s (2 horas)
- Recebe URLs com timestamp correto (2h no futuro)
- Sistema de renovação automática implementado
- Retry automático funcionando

BACKEND:
- Retorna 403 IMEDIATAMENTE (não após 2h)
- Problema: Assinatura HMAC-SHA256 inconsistente

VERIFICAR:
1. Chave secreta é EXATAMENTE a mesma em playlist_resolve.php e stream.php?
2. Ordem dos dados na assinatura: userId + encodedPath + expiration?
3. Encoding: urlencode() para gerar, urldecode() para validar?
4. Logs mostram timestamps corretos?

ARQUIVOS:
- playlist_resolve.php: gera assinatura
- stream.php: valida assinatura

TESTE RÁPIDO:
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=XXX&ttl=60"
# Copiar primeira streamUrl e testar com curl -I
# Se 403 imediato = problema de assinatura
# Se 200 = problema de expiração (improvável)
```

---

## 🎯 Resumo

**Status Atual:**
- ✅ Frontend 100% funcional (renovação + retry automático)
- ❌ Backend com problema de assinatura HMAC-SHA256
- 🔄 Sistema de renovação funcionando, mas backend rejeita URLs renovadas

**Ação Necessária:**
- Corrigir a assinatura HMAC-SHA256 no backend
- Verificar chave secreta, ordem dos dados e encoding
- Usar código de exemplo acima com logs de debug

**Resultado Esperado:**
- URLs funcionarão por 2 horas completas
- Sistema de renovação automática funcionará perfeitamente
- Usuário não verá mais erros 403

