# Verificação de URLs Expiradas no Backend (Erro 403)

## 🎯 Problema
As URLs de streaming estão expirando rapidamente (causando erro 403), mesmo após configurarmos um TTL de 7200 segundos (2 horas).

## ✅ Correções Aplicadas no Frontend

### 1. MainScreen.js
- ✅ **TTL aumentado** de 1800 para **7200 segundos** (2 horas)
- ✅ **Logs completos** das URLs geradas
- ✅ **Validação** de URLs antes de carregar no player

### 2. PlayerService.js
- ✅ **Detecção de erro 403** específica
- ✅ **Exceção personalizada** `URL_EXPIRED` quando detecta 403
- ✅ **Limpeza automática** do player após erro

### 3. PlayerContext.js
- ✅ **Função `renewPlaylistUrls()`** preparada para renovação automática
- ✅ **Retry logic** implementado (máximo 1 tentativa)
- ✅ **Alerta ao usuário** quando URL expira

---

## 🔧 VERIFICAÇÕES NECESSÁRIAS NO BACKEND

### 📄 Arquivo: `playlist_resolve.php`

#### 1. Verificar Geração de URLs Assinadas

```php
// Verifique se o TTL está sendo respeitado
$ttl = isset($_GET['ttl']) ? intval($_GET['ttl']) : 3600;
$expiration = time() + $ttl; // Deve usar o TTL passado pelo frontend

// Certifique-se que a assinatura está correta
$signature = hash_hmac('sha256', $dataToSign, $secretKey);
```

**Pontos críticos:**
- [ ] O parâmetro `ttl` está sendo lido corretamente da requisição?
- [ ] O `$expiration` está usando o TTL correto ou está fixo em 1800?
- [ ] A chave secreta (`$secretKey`) está configurada corretamente?

#### 2. Verificar Validação de Assinatura

```php
// Exemplo de validação no stream.php
$providedSignature = $_GET['s'] ?? '';
$calculatedSignature = hash_hmac('sha256', $dataToSign, $secretKey);

if (!hash_equals($calculatedSignature, $providedSignature)) {
    http_response_code(403);
    die('Invalid signature');
}

// Verificar expiração
if (time() > $expiration) {
    http_response_code(403);
    die('URL expired');
}
```

**Pontos críticos:**
- [ ] A validação de assinatura está usando `hash_equals()` (proteção contra timing attacks)?
- [ ] O timestamp de expiração (`e`) está sendo validado corretamente?
- [ ] Os dados usados para calcular a assinatura são **exatamente** os mesmos na geração e validação?

#### 3. Verificar Formato da URL Gerada

A URL deve seguir este formato:
```
/api/stream.php?u={userId}&p={encodedPath}&e={expiration}&s={signature}
```

**Pontos críticos:**
- [ ] O `path` está sendo codificado com `urlencode()` ou `rawurlencode()`?
- [ ] A ordem dos parâmetros na URL é consistente?
- [ ] O timestamp de expiração está sendo adicionado corretamente?

#### 4. Exemplo de Código Correto

```php
// playlist_resolve.php

function generateStreamUrl($userId, $path, $ttl = 7200) {
    $secretKey = 'YOUR_SECRET_KEY_HERE'; // Deve ser a mesma em stream.php
    
    // Timestamp de expiração
    $expiration = time() + $ttl;
    
    // Codificar o path
    $encodedPath = urlencode($path);
    
    // Dados para assinatura (ordem importa!)
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
    
    return $streamUrl;
}

// Usar a função
$ttl = isset($_GET['ttl']) ? intval($_GET['ttl']) : 7200;
foreach ($playlistItems as &$item) {
    $item['streamUrl'] = generateStreamUrl($userId, $item['path'], $ttl);
}
```

```php
// stream.php (validação)

$secretKey = 'YOUR_SECRET_KEY_HERE'; // Mesma chave!

// Obter parâmetros
$userId = $_GET['u'] ?? '';
$encodedPath = $_GET['p'] ?? '';
$expiration = intval($_GET['e'] ?? 0);
$providedSignature = $_GET['s'] ?? '';

// Verificar expiração PRIMEIRO
if (time() > $expiration) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'URL expired',
        'timestamp' => time(),
        'expiration' => $expiration,
        'expired_seconds_ago' => time() - $expiration
    ]);
    exit;
}

// Recalcular assinatura (mesma ordem!)
$dataToSign = $userId . $encodedPath . $expiration;
$calculatedSignature = hash_hmac('sha256', $dataToSign, $secretKey);

// Validar assinatura
if (!hash_equals($calculatedSignature, $providedSignature)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Invalid signature',
        'expected' => $calculatedSignature,
        'provided' => $providedSignature
    ]);
    exit;
}

// URL válida - prosseguir com streaming
$filePath = urldecode($encodedPath);
// ... resto do código de streaming
```

---

## 🧪 Testes Recomendados

### 1. Teste de Expiração
```bash
# Gerar URL com TTL de 10 segundos
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=XXX&ttl=10"

# Esperar 15 segundos e tentar acessar a URL retornada
# Deve retornar 403 com mensagem "URL expired"
```

### 2. Teste de Assinatura Inválida
```bash
# Alterar manualmente o parâmetro 's' na URL
# Deve retornar 403 com mensagem "Invalid signature"
```

### 3. Teste de TTL Longo
```bash
# Gerar URL com TTL de 7200 segundos
curl "https://musicas.radiosucessobrasilia.com.br/api/playlist_resolve.php?user_id=XXX&ttl=7200"

# Tentar acessar após 30 minutos - deve funcionar
# Tentar acessar após 3 horas - deve retornar 403
```

---

## 📊 Logs para Adicionar no Backend

Para facilitar o debug, adicione logs em `playlist_resolve.php` e `stream.php`:

```php
// playlist_resolve.php
error_log(sprintf(
    '[playlist_resolve] TTL solicitado: %d, Expiração: %s (%d)',
    $ttl,
    date('Y-m-d H:i:s', time() + $ttl),
    time() + $ttl
));

// stream.php
error_log(sprintf(
    '[stream] Validando URL - Agora: %d, Expiração: %d, Diferença: %d segundos',
    time(),
    $expiration,
    $expiration - time()
));
```

---

## ✅ Checklist de Verificação

- [ ] O TTL de 7200 segundos está sendo respeitado?
- [ ] A chave secreta é a mesma em `playlist_resolve.php` e `stream.php`?
- [ ] A ordem dos parâmetros na assinatura é consistente?
- [ ] O encoding do `path` é consistente (urlencode/urldecode)?
- [ ] A validação de expiração acontece ANTES da validação de assinatura?
- [ ] Os logs mostram timestamps corretos?
- [ ] Testei com TTL de 10 segundos para confirmar que a expiração funciona?
- [ ] Testei com TTL de 7200 segundos para confirmar que dura 2 horas?

---

## 🔗 Recursos Úteis

- [PHP hash_hmac()](https://www.php.net/manual/en/function.hash-hmac.php)
- [PHP hash_equals()](https://www.php.net/manual/en/function.hash-equals.php)
- [PHP urlencode()](https://www.php.net/manual/en/function.urlencode.php)
- [Signed URLs Best Practices](https://cloud.google.com/storage/docs/access-control/signed-urls)

