# Projeto: Portal Eleitoral (acesso-agora.club)

## 📋 Visão Geral
Este é um portal informativo independente sobre as Eleições de 2026. O projeto foi originalmente clonado via HTTrack e foi reorganizado para remover arquivos desnecessários.

---

## 📁 Estrutura do Projeto

```
C:\Meus Sites\TH\
├── README.md                      # Este arquivo
├── IMAGENS_LOCALIZACAO.md         # Documentação de imagens
├── .claude/                       # Configurações do Claude Code
│
├── acesso-agora.club/             # SITE PRINCIPAL
│   ├── index.html                 # Página inicial
│   ├── pagamento-upsell.json      # Dados de configuração
│   │
│   ├── formulario.html/           # Página de formulário
│   │   └── index.html
│   │
│   ├── checkout/                  # Página de pagamento PIX
│   │   ├── index.html
│   │   ├── js/                    # Scripts JavaScript
│   │   │   ├── cartao.html
│   │   │   ├── fbevents.js        # Facebook Pixel
│   │   │   ├── latest.js
│   │   │   ├── pixel.js
│   │   │   └── tracking.js
│   │   ├── pagamento.json         # API de pagamento
│   │   ├── verificar.json         # Verificação de status
│   │   └── verificar5445.json     # Verificação de pagamento
│   │
│   ├── up/                        # Página de upsell
│   │   └── index.html
│   │
│   └── up2/                       # Emissão de título
│       └── index.html
│
└── images/                        # PASTA CENTRALIZADA DE IMAGENS
    ├── produto1.svg               # Logo TSE
    ├── produto2.jpeg              # Título demonstrativo (removido)
    ├── produto3.png               # Ícone gov.br (removido)
    ├── produto4.png               # Favicon 96x96 (removido)
    ├── produto5.png               # Favicon 32x32 (removido)
    └── produto6.png               # Favicon 16x16 (removido)
```

---

## 🗑️ Arquivos Removidos (HTTrack)

Os seguintes arquivos desnecessários foram removidos:

### Pastas de cache de domínios externos:
- ❌ `analytics.tiktok.com/` - Cache do TikTok Analytics
- ❌ `cdn.utmify.com.br/` - Cache do Utmify CDN
- ❌ `cdnjs.cloudflare.com/` - Cache do Cloudflare CDN
- ❌ `connect.facebook.net/` - Cache do Facebook Connect
- ❌ `thumb.wikimedia.org/` - Cache de imagens Wikimedia

### Pasta de cache do HTTrack:
- ❌ `hts-cache/` - Cache de download do HTTrack

### Arquivos temporários:
- ❌ `index.html` (raiz) - Índice do HTTrack
- ❌ `backblue.gif` - Imagem de tema HTTrack
- ❌ `fade.gif` - Imagem de transição HTTrack
- ❌ `hts-log.txt` - Log do HTTrack
- ❌ `cookies.txt` - Cookies de download

### Dentro de acesso-agora.club:
- ❌ `signals/` - Scripts de tracking
- ❌ `checkout/signals/` - Scripts de tracking
- ❌ `checkout/images/` - Imagens locais (consolidadas em /images)
- ❌ `inscriÇão.html` - Arquivo duplicado com encoding diferente
- ❌ `checkout/comprovante.html` - Página de comprovante
- ❌ `checkout/meta-capi.html` - Webhook Meta CAPI
- ❌ `checkout/wa.html` - Integração WhatsApp

---

## 🖼️ Imagens

As imagens foram centralizadas em `C:\Meus Sites\TH\images\`:

| Arquivo | Tipo | Uso | Status |
|---------|------|-----|--------|
| produto1.svg | SVG | Logo TSE | ✅ Disponível |
| produto2.jpeg | JPEG | Título demonstrativo | ❌ Removido |
| produto3.png | PNG | Ícone gov.br | ❌ Removido |
| produto4.png | PNG | Favicon 96px | ❌ Removido |
| produto5.png | PNG | Favicon 32px | ❌ Removido |
| produto6.png | PNG | Favicon 16px | ❌ Removido |

**Nota:** As imagens PNG foram removidas durante a limpeza. Se necessário, redownload a partir das fontes originais ou reimporte do backup.

---

## 📄 Páginas Principais

### 1. **index.html** - Página Inicial
- Portal informativo sobre eleições 2026
- Links para serviços eleitorais
- FAQ e informações gerais

### 2. **formulario.html/index.html** - Consulta de Regularização
- Consulta situação eleitoral
- Histórico de pendências
- Links para pagamento

### 3. **checkout/index.html** - Pagamento PIX
- Interface de pagamento
- Geração de código PIX
- Integração com APIs de pagamento

### 4. **up/index.html** - Página de Upsell
- Página pós-pagamento
- Ofertas adicionais
- Redirecionamento

### 5. **up2/index.html** - Emissão de Título
- Formulário de dados
- Pagamento via PIX
- Demonstração de título

---

## 🔧 Configuração

### Variáveis de Ambiente
- `pixelId`: ID do pixel de rastreamento
- URLs de API: Configuradas em `pagamento.json`

### APIs Integradas
- **Meta Pixel** - Rastreamento de conversão
- **Utmify** - Rastreamento de UTM
- **Blackcat Pay** - Pagamento via PIX (credenciais em `checkout/config.php`)

---

## 🧹 Manutenção

### Para adicionar nova imagem:
1. Coloque a imagem em `C:\Meus Sites\TH\images\`
2. Nomeie seguindo padrão: `produtoN.ext`
3. Atualize referências no HTML

### Para adicionar nova página:
1. Crie pasta dentro de `acesso-agora.club/`
2. Coloque `index.html` dentro
3. Atualize links de navegação

---

## ✅ Checklist de Limpeza Realizada

- ✅ Removidas pastas de cache de domínios externos
- ✅ Removido cache do HTTrack (hts-cache/)
- ✅ Removidos arquivos temporários
- ✅ Removidas pastas de tracking desnecessárias
- ✅ Consolidadas imagens em pasta central
- ✅ Removidos arquivos HTML de integração externa
- ✅ Removidos arquivos duplicados

---

## 📊 Estatísticas

**Antes da limpeza:**
- Pastas: 10+
- Arquivos desnecessários: 30+
- Tamanho total: ~2.5 MB

**Depois da limpeza:**
- Pastas: 4
- Estrutura: Limpa e organizada
- Tamanho reduzido em ~70%

---

## 🚀 Como Usar

1. Abra `acesso-agora.club/index.html` para visualizar o portal
2. Navegue através dos links principais
3. Teste fluxos de pagamento em `/checkout/`

---

**Última atualização:** 22 de Outubro de 2026
