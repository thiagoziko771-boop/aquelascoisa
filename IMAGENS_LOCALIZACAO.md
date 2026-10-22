# Centralização de Imagens do Projeto

## Status: ✅ Concluído

Todas as imagens do projeto foram consolidadas e renomeadas consistentemente para evitar inconsistências.

---

## 📁 Localização Central
**Pasta:** `C:\Meus Sites\TH\images\`

---

## 📋 Mapeamento de Imagens

| Nome Novo | Tipo | Origem Original | Uso |
|-----------|------|-----------------|-----|
| **produto1.svg** | SVG | Logo TSE (criado localmente) | Logo do Tribunal Superior Eleitoral em headers/footers |
| **produto2.jpeg** | JPEG | https://acesso-agora.club/up2/assets/titulo-demonstracao.jpeg | Imagem demonstrativa de título eleitoral |
| **produto3.png** | PNG | acesso-agora.club/checkout/images/iconegov.png | Ícone gov.br nos headers |
| **produto4.png** | PNG | icons8-brasil-windows-11-color-96.png | Favicon 96x96 |
| **produto5.png** | PNG | icons8-brasil-windows-11-color-32.png | Favicon 32x32 |
| **produto6.png** | PNG | icons8-brasil-windows-11-color-16.png | Favicon 16x16 |

---

## 🔄 Arquivos HTML Atualizados

### 1. **acesso-agora.club/index.html**
- ✅ Logo TSE no header: `../../images/produto1.svg`
- ✅ Logo TSE no footer: `../../images/produto1.svg`

### 2. **acesso-agora.club/formulario.html/index.html**
- ✅ Logo TSE no header: `../../../images/produto1.svg`

### 3. **acesso-agora.club/checkout/index.html**
- ✅ Favicon 96x96: `../../images/produto4.png`
- ✅ Favicon 32x32: `../../images/produto5.png`
- ✅ Favicon 16x16: `../../images/produto6.png`
- ✅ Ícone gov.br no header: `../../images/produto3.png`
- ✅ Ícone gov.br no footer: `../../images/produto3.png`

### 4. **acesso-agora.club/up2/index.html**
- ✅ Logo TSE no header: `../../images/produto1.svg`
- ✅ Imagem título demonstrativo: `../../images/produto2.jpeg`

---

## 🎯 Benefícios

✅ **Consistência:** Todas as imagens estão em um único local  
✅ **Facilidade de Manutenção:** Alterações de imagens afetam todo o projeto  
✅ **Nomeação Padronizada:** Nomenclatura sequencial simples (`produto1`, `produto2`, etc.)  
✅ **Sem Dependências Externas:** Todas as imagens são locais  
✅ **Rastreabilidade:** Documento centralizado de mapeamento  

---

## 📝 Notas

- O SVG do TSE foi recriado localmente, pois o servidor original retornou erro de acesso
- Todas as URLs externas foram substituídas por referências relativas locais
- As imagens ainda estão preservadas nas pastas originais para referência futura
