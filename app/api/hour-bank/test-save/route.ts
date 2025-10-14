import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("API test-save recebeu:", body)
    
    // Simular salvamento sem Supabase
    const mockCompensation = {
      id: Math.floor(Math.random() * 1000),
      userId: body.userId,
      holidayId: body.holidayId,
      declaredHours: body.declaredHours,
      detectedHours: body.detectedHours,
      confidence: body.confidence,
      status: "approved",
      reason: body.reason,
      analyzedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    console.log("Mock compensation criada:", mockCompensation)

    return NextResponse.json({
      success: true,
      compensation: mockCompensation,
      message: "Compensação salva com sucesso (TESTE - sem Supabase)"
    })
  } catch (error) {
    console.error("Erro na API test-save:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
