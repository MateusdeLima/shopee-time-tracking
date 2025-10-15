// Configuração para integração com Google Gemini AI
export const GEMINI_CONFIG = {
  // Adicione sua chave da API do Google AI Studio aqui
  API_KEY: process.env.GOOGLE_AI_API_KEY || "",
  
  // Endpoint base da API
  BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
  
  // Modelos disponíveis em ordem de preferência
  MODELS: [
    "gemini-2.5-pro",
    "gemini-2.5-flash", 
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite"
  ],
  
  // Configurações de timeout e retry
  TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 2,
  
  // Configurações específicas para análise de imagem
  IMAGE_ANALYSIS: {
    MAX_IMAGE_SIZE: 4 * 1024 * 1024, // 4MB
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    CONFIDENCE_THRESHOLD: 75,
    MAX_DISCREPANCY: 0.5 // horas
  }
}

// Função para fazer chamada real para API Gemini
export async function callGeminiAPI(
  model: string, 
  imageBase64: string, 
  prompt: string
): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    // Remover prefixo data:image se existir
    const cleanImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    
    const response = await fetch(
      `${GEMINI_CONFIG.BASE_URL}/models/${model}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg", // Assumir JPEG por padrão
                  data: cleanImageData
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1, // Baixa temperatura para respostas mais consistentes
            topK: 1,
            topP: 1,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
        signal: AbortSignal.timeout(GEMINI_CONFIG.TIMEOUT)
      }
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pelo modelo')
    }

    const content = result.candidates[0].content.parts[0].text
    
    // Tentar fazer parse do JSON retornado
    try {
      const parsedData = JSON.parse(content)
      return {
        success: true,
        data: parsedData
      }
    } catch (parseError) {
      throw new Error(`Resposta inválida do modelo: ${content}`)
    }

  } catch (error) {
    console.error(`Erro na chamada para ${model}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// Função para validar se a API está configurada
export function isGeminiConfigured(): boolean {
  return !!GEMINI_CONFIG.API_KEY && GEMINI_CONFIG.API_KEY.length > 0
}
