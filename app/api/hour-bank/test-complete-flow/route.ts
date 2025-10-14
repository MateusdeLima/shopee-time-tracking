import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTE COMPLETO DO FLUXO DE BANCO DE HORAS ===")
    
    const { userId, holidayId, declaredHours } = await request.json()

    // Simular imagem base64
    const mockImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="

    // 1. Chamar API de análise (que agora processa automaticamente)
    console.log("1. Chamando API de análise...")
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hour-bank/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: mockImage,
        declaredHours: parseFloat(declaredHours),
        holidayId: parseInt(holidayId),
        userId: userId
      })
    })

    const analysisResult = await analysisResponse.json()
    console.log("Resultado da análise:", analysisResult)

    if (!analysisResponse.ok) {
      throw new Error(analysisResult.error || 'Erro na análise')
    }

    // 2. Verificar se foi criado registro de horas extras (se aprovado)
    if (analysisResult.approved && analysisResult.overtimeRecord) {
      console.log("✅ Fluxo completo executado com sucesso!")
      console.log("- Compensação salva:", analysisResult.compensation?.id)
      console.log("- Registro de horas extras criado:", analysisResult.overtimeRecord?.id)
      
      return NextResponse.json({
        success: true,
        message: "Fluxo completo executado com sucesso!",
        details: {
          approved: analysisResult.approved,
          detectedHours: analysisResult.detectedHours,
          confidence: analysisResult.confidence,
          compensationId: analysisResult.compensation?.id,
          overtimeRecordId: analysisResult.overtimeRecord?.id,
          reason: analysisResult.reason
        }
      })
    } else if (!analysisResult.approved) {
      console.log("❌ Análise rejeitada pela IA")
      return NextResponse.json({
        success: true,
        message: "Análise rejeitada pela IA (comportamento esperado para teste)",
        details: {
          approved: false,
          reason: analysisResult.reason,
          compensationId: analysisResult.compensation?.id
        }
      })
    } else {
      throw new Error("Fluxo incompleto - análise aprovada mas registro não criado")
    }

  } catch (error) {
    console.error("=== ERRO NO TESTE COMPLETO ===")
    console.error("Erro:", error)
    
    return NextResponse.json(
      { 
        error: "Erro no teste completo",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
