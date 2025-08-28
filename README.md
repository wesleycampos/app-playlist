# 📰 Telejornal Automatizado com IA

## Descrição
Sistema automatizado para geração de telejornais diários utilizando inteligência artificial. O projeto combina a API do GNews para buscar notícias em tempo real e a API da OpenAI para gerar conteúdo jornalístico estruturado.

## 🚀 Funcionalidades

- **Busca Automática de Notícias**: Utiliza a API do GNews para buscar notícias atualizadas
- **Geração de Conteúdo com IA**: OpenAI GPT-4 para criar roteiros de telejornal
- **Geração de Capas**: Cria imagens de capa no formato 16:9 (1920x1080) automaticamente
- **Envio por E-mail**: Distribui o telejornal por e-mail para destinatários configurados
- **Publicação no WordPress**: Publica automaticamente no WordPress com imagem destacada

## 📋 Pré-requisitos

- Python 3.7+
- Conta na OpenAI com API key
- Conta no GNews com API key
- Conta Gmail com senha de aplicativo
- Acesso ao WordPress com credenciais

## 📦 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_SEU_REPOSITORIO]
cd sucesso-fm
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Configure as variáveis de ambiente (veja seção de configuração)

## ⚙️ Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` com as seguintes variáveis:

```env
OPENAI_API_KEY=sua_chave_openai
GNEWS_API_KEY=sua_chave_gnews
EMAIL_REMETENTE=seu_email@gmail.com
EMAIL_APP_PASSWORD=sua_senha_app_gmail
EMAIL_DESTINATARIO=destinatario@email.com
EMAIL_COPIA=copia@email.com
WP_BASE_URL=https://seu-site.com
WP_USER=usuario_wordpress
WP_APP_PASSWORD=senha_app_wordpress
```

### Configuração do Gmail
Para usar o Gmail, você precisa:
1. Ativar autenticação de 2 fatores
2. Gerar uma senha de aplicativo
3. Usar essa senha no `EMAIL_APP_PASSWORD`

## 🎯 Como Usar

Execute o script principal:
```bash
python telejornal_gnews_data_validada.py
```

O sistema irá:
1. Gerar o roteiro do telejornal
2. Enviar por e-mail
3. Publicar no WordPress

## 📁 Estrutura do Projeto

```
sucesso-fm/
├── telejornal_gnews_data_validada.py  # Script principal
├── requirements.txt                    # Dependências Python
├── .gitignore                         # Arquivos ignorados pelo Git
├── README.md                          # Documentação
└── assets/                            # Recursos do projeto
```

## 🔧 Dependências

- `openai`: Cliente da API OpenAI
- `requests`: Requisições HTTP
- `Pillow`: Processamento de imagens
- `python-dotenv`: Gerenciamento de variáveis de ambiente

## 📝 Estrutura do Telejornal

O telejornal é dividido em 7 blocos:
1. **Abertura** - Notícias gerais do Brasil
2. **Política** - Notícias políticas
3. **Educação/Saúde** - Notícias educacionais ou de saúde
4. **Economia** - Notícias econômicas
5. **Mundo** - Notícias internacionais
6. **Brasília e Goiás** - Notícias locais
7. **Tempo e Encerramento** - Previsão do tempo

## 🎨 Geração de Capas

- Formato: 1920x1080 (16:9)
- Estilo: Breaking News com gradiente azul
- Faixa diagonal vermelha
- Título centralizado com sombra
- Data automática

## 📧 Funcionalidades de E-mail

- Envio automático para destinatários configurados
- Formato HTML
- Cópia para endereços adicionais
- Assunto personalizado

## 🌐 Integração WordPress

- Publicação automática via REST API
- Upload de imagem destacada
- Formatação HTML preservada
- Status de publicação configurável

## ⚠️ Segurança

- **NUNCA** commite suas chaves de API no repositório
- Use sempre o arquivo `.env` para credenciais
- O arquivo `.gitignore` já está configurado para proteger dados sensíveis

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato através dos e-mails configurados no sistema.

---

**Desenvolvido com ❤️ para automatizar a produção de telejornais**
