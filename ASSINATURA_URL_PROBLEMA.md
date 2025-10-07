# 🚨 PROBLEMA CRÍTICO: Assinatura de URLs - Erro 403

## 📊 Diagnóstico Completo

### ✅ Frontend está CORRETO

Verificado que o frontend está:
1. ✅ Solicitando TTL de **7200 segundos** (2 horas)
2. ✅ Enviando corretamente: `playlist_resolve.php?user_id=XXX&ttl=7200`
3. ✅ Recebendo URLs assinadas do backend
4. ✅ Convertendo URLs relativas para absolutas antes de reproduzir

**Exemplo de URL recebida:**
```
/api/stream.php?u=4d03f96f-cdd2-4b2a-b088-ee25021d596c
&p=genres%2FUnknown%2FRoupa%20Nova%20%E2%80%93%20Linda%20Demais.mp3
&e=1759864632
&s=2c28a35b52d055c54e51774659cda1b54112d2cf73bf6dfa88ca3dd10622abd3
```

Onde:
- `u` = userId
- `p` = path (URL encoded)
- `e` = expiration timestamp (1759864632)
- `s` = signature (HMAC-SHA256)

---

## 🔴 PROBLEMA: Backend está rejeitando TODAS as URLs (403)

### Análise do Timestamp de Expiração

**Timestamp recebido:** `1759864632`  
**Data/Hora:** `2025-10-07 21:37:12` (aproximadamente)  
**Hora atual (aprox):** `2025-10-07 19:40:00` (aproximadamente)  
**Diferença:** ~2 horas (CORRETO!)

**Conclusão:** O timestamp de expiração está CORRETO (2 horas no futuro).

---

## 🔍 Possíveis Causas do Erro 403

### 1. ❌ Assinatura (Signature) Incorreta

A assinatura HMAC-SHA256 está sendo calculada incorretamente em `playlist_resolve.php` ou `stream.php`.

**Problema comum:**
```php
// ❌ ERRADO - Ordem incorreta
$dataToSign = $path . $userId . $expiration;

// ✅ CORRETO - Ordem consistente
$dataToSign = $userId . $path . $expiration;
```

### 2. ❌ Chave Secreta Diferente

A chave secreta usada para **gerar** a assinatura (`playlist_resolve.php`) é **diferente** da usada para **validar** (`stream.php`).

**Verificar:**
```php
// playlist_resolve.php
define('SECRET_KEY', 'abc123xyz'); // ← Mesma chave?

// stream.php
define('SECRET_KEY', 'abc123xyz'); // ← Mesma chave?
```

### 3. ❌ Validação de Expiração Incorreta

O `stream.php` pode estar validando o timestamp incorretamente.

**Problema comum:**
```php
// ❌ ERRADO - Comparando string com int
if ($_GET['e'] > time()) { ... }

// ✅ CORRETO - Convertendo para int
if (intval($_GET['e']) > time()) { ... }
```

### 4. ❌ Path Encoding Inconsistente

O path pode estar sendo codificado de forma diferente na geração e validação.

**Problema comum:**
```php
// playlist_resolve.php
$encodedPath = urlencode($path);

// stream.php
$decodedPath = rawurldecode($_GET['p']); // ← Diferente!
```

### 5. ❌ TTL não está sendo usado

O backend pode estar **ignorando** o parâmetro `ttl` e usando um valor fixo.

**Verificar em `playlist_resolve.php`:**
```php
// ❌ ERRADO - Ignorando TTL
$expiration = time() + 1800; // Sempre 30 minutos

// ✅ CORRETO - Usando TTL
$ttl = isset($_GET['ttl']) ? intval($_GET['ttl']) : 1800;
$expiration = time() + $ttl;
```

---

## 🔧 SOLUÇÃO DEFINITIVA

### Passo 1: Verificar `playlist_resolve.php`

Adicione logs detalhados para debug:

```php
<?php
// playlist_resolve.php

error_log("=== PLAYLIST RESOLVE DEBUG ===");
error_log("TTL solicitado: " . ($_GET['ttl'] ?? 'não enviado'));

$ttl = isset($_GET['ttl']) ? intval($_GET['ttl']) : 1800;
$expiration = time() + $ttl;

error_log("TTL usado: $ttl");
error_log("Timestamp atual: " . time());
error_log("Timestamp expiração: $expiration");
error_log("Data expiração: " . date('Y-m-d H:i:s', $expiration));

$secretKey = 'SUA_CHAVE_SECRETA_AQUI'; // ← MESMA que stream.php!

foreach ($items as &$item) {
    $userId = $_GET['user_id'];
    $path = $item['path'];
    
    // Codificar path
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

### Passo 2: Verificar `stream.php`

Adicione validação e logs detalhados:

```php
<?php
// stream.php

error_log("=== STREAM DEBUG ===");

$secretKey = 'SUA_CHAVE_SECRETA_AQUI'; // ← MESMA que playlist_resolve.php!

// Obter parâmetros
$userId = $_GET['u'] ?? '';
$encodedPath = $_GET['p'] ?? '';
$expiration = intval($_GET['e'] ?? 0);
$providedSignature = $_GET['s'] ?? '';

error_log("userId: $userId");
error_log("encodedPath: $encodedPath");
error_log("expiration: $expiration (" . date('Y-m-d H:i:s', $expiration) . ")");
error_log("providedSignature: $providedSignature");

// 1. VERIFICAR EXPIRAÇÃO PRIMEIRO
$now = time();
error_log("Timestamp atual: $now (" . date('Y-m-d H:i:s', $now) . ")");

if ($now > $expiration) {
    $secondsExpired = $now - $expiration;
    error_log("❌ URL EXPIRADA há $secondsExpired segundos");
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'URL expired',
        'now' => $now,
        'expiration' => $expiration,
        'expired_seconds_ago' => $secondsExpired,
        'now_readable' => date('Y-m-d H:i:s', $now),
        'expiration_readable' => date('Y-m-d H:i:s', $expiration)
    ]);
    exit;
}

error_log("✅ URL ainda válida (expira em " . ($expiration - $now) . " segundos)");

// 2. VERIFICAR ASSINATURA (MESMA ORDEM que playlist_resolve.php!)
$dataToSign = $userId . $encodedPath . $expiration;
$calculatedSignature = hash_hmac('sha256', $dataToSign, $secretKey);

error_log("Dados para assinatura: $dataToSign");
error_log("Assinatura calculada: $calculatedSignature");
error_log("Assinatura fornecida: $providedSignature");

if (!hash_equals($calculatedSignature, $providedSignature)) {
    error_log("❌ ASSINATURA INVÁLIDA");
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Invalid signature',
        'expected' => $calculatedSignature,
        'provided' => $providedSignature,
        'data_signed' => $dataToSign
    ]);
    exit;
}

error_log("✅ Assinatura válida");

// 3. DECODIFICAR PATH E SERVIR ARQUIVO
$filePath = urldecode($encodedPath); // ← Usar urldecode() (mesmo que urlencode())
error_log("Path decodificado: $filePath");

// ... resto do código para servir o arquivo
error_log("=== FIM DEBUG ===");
?>
```

### Passo 3: Testar Manualmente

1. **Gerar uma URL com TTL curto para testar:**
```bash
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=4d03f96f-cdd2-4b2a-b088-ee25021d596c&ttl=60"
```

2. **Copiar a primeira `streamUrl` retornada**

3. **Testar imediatamente (deve funcionar):**
```bash
curl "https://musicas.radiosucessobrasilia.com.br/STREAM_URL_AQUI"
```

4. **Aguardar 70 segundos e testar novamente (deve dar 403):**
```bash
# Esperar 70 segundos...
curl "https://musicas.radiosucessobrasilia.com.br/STREAM_URL_AQUI"
# Deve retornar: {"error":"URL expired",...}
```

---

## 📋 Checklist de Verificação

- [ ] A chave secreta é **EXATAMENTE** a mesma em `playlist_resolve.php` e `stream.php`?
- [ ] A **ordem dos dados** na assinatura é a mesma nos dois arquivos?
- [ ] O **encoding do path** é consistente (urlencode/urldecode)?
- [ ] O TTL está sendo **lido e usado** corretamente?
- [ ] A validação de expiração está usando `intval()` para converter?
- [ ] Os **logs do servidor** mostram o que está acontecendo?

---

## 🎯 Teste Rápido

Execute este teste para identificar o problema:

```bash
# 1. Gerar URL com TTL de 10 segundos
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=4d03f96f-cdd2-4b2a-b088-ee25021d596c&ttl=10" > urls.json

# 2. Extrair primeira URL
STREAM_URL=$(cat urls.json | grep -o '"/api/stream.php[^"]*' | head -1 | tr -d '"')

# 3. Testar imediatamente
echo "Testando imediatamente:"
curl -I "https://musicas.radiosucessobrasilia.com.br$STREAM_URL"

# 4. Esperar 15 segundos
echo "Aguardando 15 segundos..."
sleep 15

# 5. Testar após expiração
echo "Testando após expiração:"
curl "https://musicas.radiosucessobrasilia.com.br$STREAM_URL"
```

**Resultado esperado:**
- Primeiro teste: HTTP 200 OK (ou streaming iniciado)
- Segundo teste: HTTP 403 com `{"error":"URL expired"}`

Se **ambos retornarem 403**, o problema está na **assinatura**, não na expiração.

---

## 🚨 Provável Causa do Problema Atual

Baseado nos logs, **todas as URLs retornam 403 imediatamente**, mesmo com TTL de 2 horas.

**Isso indica que o problema é a ASSINATURA**, não a expiração.

**Causas mais prováveis (em ordem):**
1. ⚠️ **Chave secreta diferente** entre os dois arquivos
2. ⚠️ **Ordem dos dados** diferente na geração e validação
3. ⚠️ **Encoding inconsistente** (urlencode vs rawurlencode)

---

## ✅ Próximos Passos

1. **Verificar arquivos PHP:**
   - `playlist_resolve.php` - Como gera a assinatura?
   - `stream.php` - Como valida a assinatura?

2. **Adicionar logs detalhados** (códigos acima)

3. **Executar teste rápido** para identificar se é assinatura ou expiração

4. **Ajustar o código** com base nos logs

---

## 📞 Informações para Suporte

Se precisar de ajuda do backend:

```
PROBLEMA: Todas as URLs de streaming retornam HTTP 403 imediatamente

FRONTEND:
- Solicitando TTL: 7200 segundos
- Timestamp expiração recebido: 1759864632 (2 horas no futuro) ✅
- Exemplo de URL: /api/stream.php?u=4d03f96f...&p=genres%2F...&e=1759864632&s=2c28a35...

SINTOMA:
- Erro 403 acontece IMEDIATAMENTE (não após 2 horas)
- Isso indica problema na ASSINATURA, não na EXPIRAÇÃO

NECESSÁRIO VERIFICAR:
1. Chave secreta é a mesma em playlist_resolve.php e stream.php?
2. Ordem dos dados na assinatura: userId + encodedPath + expiration
3. Encoding: urlencode() para gerar, urldecode() para validar
4. Conversão de timestamp: intval($_GET['e'])
```

