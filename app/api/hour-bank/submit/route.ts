import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== INICIANDO SUBMISSÃO DE BANCO DE HORAS ===")
    
    const body = await request.json()
    const { image, declaredHours, holidayId, userId } = body
    
    console.log("Dados recebidos:", {
      userId,
      holidayId,
      declaredHours,
      imageSize: image?.length || 0
    })

    // Validações básicas
    if (!image || !declaredHours || !holidayId || !userId) {
      return NextResponse.json({
        success: false,
        error: "Dados obrigatórios faltando: image, declaredHours, holidayId, userId"
      }, { status: 400 })
    }

    // Importar as funções necessárias
    const { createOvertimeRecord, getHolidayById, getUserById } = await import("@/lib/db")
    
    // Buscar informações do usuário
    const user = await getUserById(userId)
    if (!user) {
      throw new Error("Usuário não encontrado")
    }
    
    // Buscar informações do feriado
    const holiday = await getHolidayById(parseInt(holidayId.toString()))
    if (!holiday) {
      throw new Error("Feriado não encontrado")
    }

    console.log("Usuário encontrado:", user.firstName, user.lastName)
    console.log("Feriado encontrado:", holiday.name)

    // FLUXO SIMPLIFICADO: Criar registro pendente direto (sem IA)
    console.log("=== CRIANDO REGISTRO PENDENTE PARA APROVAÇÃO MANUAL ===")
    
    const declaredHoursFloat = parseFloat(declaredHours.toString())
    
    // Criar registro pendente para Dashboard Analytics (COM imagem)
    const overtimeRecord = await createOvertimeRecord({
      userId: userId,
      holidayId: parseInt(holidayId.toString()),
      holidayName: holiday.name,
      date: holiday.date || new Date().toISOString().split('T')[0],
      optionId: "manual_bank_hours", // ID para identificar banco de horas manual
      optionLabel: `Banco de Horas - ${declaredHoursFloat}h (Aguardando aprovação)`,
      hours: declaredHoursFloat,
      startTime: undefined,
      endTime: undefined,
      status: "pending_admin", // Status aguardando aprovação do administrador
      proofImage: image // Salvar imagem temporariamente
    })

    console.log("Registro pendente criado:", overtimeRecord)

    console.log("=== SUBMISSÃO CONCLUÍDA COM SUCESSO ===")
    console.log("Resultado final:", {
      declaredHours: declaredHoursFloat,
      overtimeRecordId: overtimeRecord?.id
    })

    return NextResponse.json({
      success: true,
      approved: false, // Sempre pendente inicialmente
      declaredHours: declaredHoursFloat,
      reason: "Comprovante recebido e enviado para análise manual",
      userId,
      holidayId,
      overtimeRecord: overtimeRecord,
      message: `Comprovante enviado com sucesso! ${declaredHoursFloat}h aguardando aprovação no Dashboard Analytics.`
    })
  } catch (error) {
    console.error("=== ERRO CRÍTICO NA SUBMISSÃO ===")
    console.error("Tipo do erro:", typeof error)
    console.error("Erro completo:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "Sem stack")
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro interno do servidor",
      message: "Falha ao enviar comprovante de banco de horas"
    }, { status: 500 })
  }
}
