import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTE RLS INICIADO ===")
    
    const { userId, holidayId, declaredHours } = await request.json()
    
    console.log("Dados recebidos:", { userId, holidayId, declaredHours })
    
    // Testar inserção direta primeiro
    const { supabase } = await import("@/lib/supabase")
    
    console.log("1. Testando inserção direta no Supabase...")
    const { data: directInsert, error: directError } = await supabase
      .from("hour_bank_compensations")
      .insert({
        user_id: userId,
        holiday_id: parseInt(holidayId),
        declared_hours: parseFloat(declaredHours),
        detected_hours: parseFloat(declaredHours),
        confidence: 85,
        proof_image: "data:image/jpeg;base64,test",
        status: "approved",
        reason: "Teste direto RLS",
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (directError) {
      console.error("❌ Erro na inserção direta:", directError)
      return NextResponse.json({
        error: "Erro na inserção direta",
        details: directError.message
      }, { status: 500 })
    }
    
    console.log("✅ Inserção direta funcionou:", directInsert.id)
    
    // Agora testar com as funções
    console.log("2. Testando com funções do lib/db...")
    const { createHourBankCompensation, createOvertimeRecord, getHolidayById } = await import("@/lib/db")
    
    // 1. Testar criação de compensação
    console.log("1. Testando criação de compensação...")
    const compensation = await createHourBankCompensation({
      userId: userId,
      holidayId: parseInt(holidayId),
      declaredHours: parseFloat(declaredHours),
      detectedHours: parseFloat(declaredHours),
      confidence: 85,
      proofImage: '', // String vazia - não salvar imagem
      status: "approved",
      reason: "Teste de RLS",
      analyzedAt: new Date().toISOString()
    })
    
    console.log("✅ Compensação criada:", compensation.id)
    
    // 2. Testar busca de feriado
    console.log("2. Testando busca de feriado...")
    const holiday = await getHolidayById(parseInt(holidayId))
    console.log("✅ Feriado encontrado:", holiday?.name)
    
    // 3. Testar criação de registro de horas extras
    console.log("3. Testando criação de registro de horas extras...")
    const overtimeRecord = await createOvertimeRecord({
      userId: userId,
      holidayId: parseInt(holidayId),
      holidayName: holiday?.name || "Teste",
      date: holiday?.date || new Date().toISOString().split('T')[0],
      optionId: "ai_bank_hours",
      optionLabel: `Banco de Horas - ${declaredHours}h (Teste)`,
      hours: parseFloat(declaredHours),
      startTime: undefined,
      endTime: undefined,
      status: "pending_admin"
    })
    
    console.log("✅ Registro de horas extras criado:", overtimeRecord.id)
    
    return NextResponse.json({
      success: true,
      message: "Teste RLS concluído com sucesso!",
      data: {
        compensationId: compensation.id,
        overtimeRecordId: overtimeRecord.id,
        holidayName: holiday?.name
      }
    })
    
  } catch (error) {
    console.error("=== ERRO NO TESTE RLS ===")
    console.error("Erro:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "Sem stack")
    
    return NextResponse.json(
      { 
        error: "Erro no teste RLS",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        type: typeof error
      },
      { status: 500 }
    )
  }
}
