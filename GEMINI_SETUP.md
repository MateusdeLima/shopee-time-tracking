# Configuração da API Google Gemini

Este documento explica como configurar a integração com os modelos Gemini para análise de imagens do banco de horas.

## 🔧 Configuração

### 1. Obter Chave da API

1. Acesse [Google AI Studio](https://aistudio.google.com/)
2. Faça login com sua conta Google
3. Clique em "Get API Key"
4. Crie um novo projeto ou use um existente
5. Copie a chave da API gerada

### 2. Configurar Variável de Ambiente

Adicione a chave no arquivo `.env.local`:

```bash
GOOGLE_AI_API_KEY=sua_chave_aqui
```

### 3. Modelos Disponíveis

O sistema tentará os modelos na seguinte ordem:

1. **gemini-2.5-pro** - Modelo mais avançado (maior precisão)
2. **gemini-2.5-flash** - Rápido e eficiente
3. **gemini-2.5-flash-lite** - Versão leve
4. **gemini-2.0-flash** - Modelo anterior, ainda eficaz
5. **gemini-2.0-flash-lite** - Fallback mais leve

### 4. Sistema de Fallback

```
Gemini 2.5 Pro → Gemini 2.5 Flash → Gemini 2.5 Flash-lite → 
Gemini 2.0 Flash → Gemini 2.0 Flash-lite → Simulação Local
```

## 🚀 Como Funciona

### Análise de Imagem

1. **Entrada**: Imagem base64 + horas declaradas + nome do funcionário
2. **Processamento**: IA analisa a tela do Page Interim
3. **Validação**: Verifica elementos obrigatórios + nome do usuário
4. **Saída**: Aprovação/rejeição + confiança + horas detectadas + nome detectado

### Critérios de Aprovação

- ✅ Logo "Page Interim" visível
- ✅ **Nome na imagem DEVE ser exatamente o do funcionário logado**
- ✅ "Saldo Atual" legível (formato HH:MM)
- ✅ Diferença ≤ 0.5h entre declarado vs detectado
- ✅ Confiança ≥ 95%

### 🔒 Validação de Segurança

- **Anti-fraude**: Sistema verifica se o nome na imagem corresponde ao funcionário
- **Rejeição automática**: Se nome não bater, aprovação é negada independente de outros fatores
- **Mensagens específicas**: Erros claros quando há tentativa de usar imagem de outra pessoa

## 📊 Monitoramento

### Logs da API

```bash
# Verificar qual modelo foi usado
console.log("Análise concluída com modelo:", result.modelUsed)

# Verificar se API está configurada
console.log("Gemini configurado:", isGeminiConfigured())
```

### Resposta da API

```json
{
  "success": true,
  "approved": true,
  "detectedHours": 2.5,
  "detectedName": "Leonardo Santos",
  "confidence": 92,
  "modelUsed": "gemini-2.5-pro",
  "reason": "✅ Análise aprovada pelo gemini-2.5-pro! Detectado 2.5h no campo 'Saldo Atual' do Page Interim para Leonardo Santos."
}
```

### Resposta de Rejeição por Nome

```json
{
  "success": true,
  "approved": false,
  "detectedHours": 2.0,
  "detectedName": "João Silva",
  "confidence": 35,
  "modelUsed": "gemini-2.5-pro",
  "reason": "❌ Rejeitado pelo gemini-2.5-pro. Problemas: nome na imagem (João Silva) não confere com o funcionário logado (Leonardo Santos). Certifique-se de enviar sua própria imagem do Page Interim."
}
```

## 🔒 Segurança

### Configurações de Segurança

- **Harassment**: BLOCK_MEDIUM_AND_ABOVE
- **Hate Speech**: BLOCK_MEDIUM_AND_ABOVE  
- **Sexual Content**: BLOCK_MEDIUM_AND_ABOVE
- **Dangerous Content**: BLOCK_MEDIUM_AND_ABOVE

### Limites

- **Timeout**: 30 segundos por chamada
- **Tamanho máximo**: 4MB por imagem
- **Formatos**: JPEG, PNG, WebP
- **Retries**: Máximo 2 tentativas por modelo

## 🛠️ Desenvolvimento

### Modo Simulação

Quando `GOOGLE_AI_API_KEY` não estiver configurada:
- Sistema usa simulação inteligente
- Mantém a mesma interface da API
- Permite desenvolvimento sem chave real

### Teste de Fallback

Para testar o sistema de fallback:
1. Configure uma chave inválida
2. Observe os logs mostrando tentativas
3. Verificar fallback para simulação

## 📈 Otimizações

### Performance

- **Modelos Pro**: Maior precisão, mais lento
- **Modelos Flash**: Equilibrio velocidade/qualidade  
- **Modelos Lite**: Mais rápido, menor precisão

### Custos

- **Gemini 2.5 Pro**: Mais caro, melhor qualidade
- **Gemini Flash**: Custo médio
- **Gemini Lite**: Mais barato

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro 401**: Chave da API inválida
2. **Erro 429**: Limite de rate excedido
3. **Timeout**: Imagem muito grande ou conexão lenta
4. **Parse Error**: Resposta da IA não está em JSON válido

### Soluções

```bash
# Verificar configuração
curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models

# Testar com imagem pequena
# Verificar logs do servidor
# Validar formato da imagem
```
