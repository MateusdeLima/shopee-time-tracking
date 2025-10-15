import { NextRequest, NextResponse } from "next/server"
import { createOvertimeRecord, createHourBankCompensation, getHolidayById } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("=== API PROCESS APPROVAL INICIADA ===")
    
    const body = await request.json()
    console.log("Dados recebidos:", JSON.stringify(body, null, 2))
    
    const { 
      userId, 
      holidayId, 
      declaredHours, 
      detectedHours, 
      confidence, 
      reason, 
      proofImage,
      approved 
    } = body

    // Validação básica
    if (!userId || !holidayId || declaredHours === undefined || detectedHours === undefined || approved === undefined) {
      console.error("Campos obrigatórios ausentes")
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: userId, holidayId, declaredHours, detectedHours, approved" },
        { status: 400 }
      )
    }

    // Buscar informações do feriado
    const holiday = await getHolidayById(parseInt(holidayId.toString()))
    if (!holiday) {
      console.error("Feriado não encontrado:", holidayId)
      return NextResponse.json(
        { error: "Feriado não encontrado" },
        { status: 400 }
      )
    }

    // 1. Sempre salvar a compensação (aprovada ou rejeitada)
    console.log("Salvando compensação de banco de horas...")
    const compensation = await createHourBankCompensation({
      userId: userId,
      holidayId: parseInt(holidayId.toString()),
      declaredHours: parseFloat(declaredHours.toString()),
      detectedHours: parseFloat(detectedHours.toString()),
      confidence: confidence ? parseInt(confidence.toString()) : 85,
      proofImage: '', // String vazia - não salvar imagem
      status: approved ? 'approved' : 'rejected',
      reason: reason || (approved ? 'Análise automática aprovada' : 'Análise automática rejeitada'),
      analyzedAt: new Date().toISOString()
    })

    console.log("Compensação salva:", compensation)

    let overtimeRecord = null

    // 2. Se aprovado, criar registro de horas extras (como o método manual)
    if (approved) {
      console.log("Aprovado pela IA - criando registro de horas extras...")
      
      // Usar as horas detectadas pela IA
      const hoursToRegister = parseFloat(detectedHours.toString())
      
      // Criar um registro de horas extras especial para banco de horas
      overtimeRecord = await createOvertimeRecord({
        userId: userId,
        holidayId: parseInt(holidayId.toString()),
        holidayName: holiday.name,
        date: holiday.date || new Date().toISOString().split('T')[0],
        optionId: "ai_bank_hours", // ID especial para identificar que veio da IA
        optionLabel: `Banco de Horas IA - ${hoursToRegister}h compensadas`,
        hours: hoursToRegister,
        startTime: undefined, // Não há horário específico para banco de horas
        endTime: undefined,
        task: `Compensação automática via banco de horas da Page Interim - ${hoursToRegister}h detectadas pela IA`
      })

      console.log("Registro de horas extras criado:", overtimeRecord)
    }

    console.log("=== API PROCESS APPROVAL CONCLUÍDA COM SUCESSO ===")

    return NextResponse.json({
      success: true,
      approved,
      compensation,
      overtimeRecord,
      message: approved 
        ? `Compensação aprovada! ${detectedHours}h foram registradas como horas extras.`
        : "Compensação rejeitada. Tente novamente com uma imagem mais clara."
    })

  } catch (error) {
    console.error("=== ERRO NA API PROCESS APPROVAL ===")
    console.error("Erro completo:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "Sem stack")
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
