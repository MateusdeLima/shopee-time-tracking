import { NextRequest, NextResponse } from "next/server"

// Análise simulada simples
async function analyzeHourBankImageSimple(imageBase64: string, declaredHours: number) {
  // Simular processamento de IA (1 segundo)
  await new Promise(resolve => setTimeout(resolve, 1000))

  const declaredHoursFloat = parseFloat(declaredHours.toString())
  
  // Simular detecção (sempre aprovar para teste)
  const detectedHours = declaredHoursFloat
  const confidence = 90
  const approved = true
  const reason = `✅ Teste aprovado! Detectado ${detectedHours}h no banco de horas.`

  return {
    approved,
    detectedHours,
    confidence,
    reason
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== API ANALYZE SIMPLE INICIADA ===")
    
    const body = await request.json()
    console.log("Dados recebidos:", {
      declaredHours: body.declaredHours,
      holidayId: body.holidayId,
      userId: body.userId,
      hasImage: !!body.image
    })
    
    const { image, declaredHours, holidayId, userId } = body

    // Validações básicas
    if (!image || !declaredHours || !holidayId || !userId) {
      console.error("Dados obrigatórios ausentes")
      return NextResponse.json(
        { error: "Dados obrigatórios: image, declaredHours, holidayId, userId" },
        { status: 400 }
      )
    }

    // Analisar imagem com simulação simples
    console.log("Iniciando análise simples...")
    const analysisResult = await analyzeHourBankImageSimple(image, declaredHours)
    console.log("Análise concluída:", analysisResult)

    // Retornar apenas o resultado da análise (sem salvar no banco)
    console.log("=== API ANALYZE SIMPLE CONCLUÍDA ===")

    return NextResponse.json({
      success: true,
      approved: analysisResult.approved,
      detectedHours: analysisResult.detectedHours,
      confidence: analysisResult.confidence,
      reason: analysisResult.reason,
      userId,
      holidayId,
      declaredHours: parseFloat(declaredHours),
      message: "Análise simples concluída com sucesso (sem salvar no banco)"
    })
    
  } catch (error) {
    console.error("=== ERRO NA API ANALYZE SIMPLE ===")
    console.error("Erro:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "Sem stack")
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
