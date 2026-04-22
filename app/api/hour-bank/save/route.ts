import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("=== API SAVE INICIADA ===")
    
    const body = await request.json()
    console.log("Dados recebidos:", JSON.stringify(body, null, 2))
    
    const { userId, holidayId, declaredHours, detectedHours, confidence, reason, proofImage } = body

    // Validação básica
    if (!userId || !holidayId || declaredHours === undefined || detectedHours === undefined) {
      console.error("Campos obrigatórios ausentes")
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      )
    }

    // Verificar se usuário e feriado existem
    console.log("Verificando se usuário existe:", userId)
    const { data: userCheck } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (!userCheck) {
      console.error("Usuário não encontrado:", userId)
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 400 }
      )
    }

    console.log("Verificando se feriado existe:", holidayId)
    const { data: holidayCheck } = await supabase
      .from('holidays')
      .select('id')
      .eq('id', parseInt(holidayId.toString()))
      .single()
    
    if (!holidayCheck) {
      console.error("Feriado não encontrado:", holidayId)
      return NextResponse.json(
        { error: "Feriado não encontrado" },
        { status: 400 }
      )
    }

    // Preparar dados para inserção no Supabase (snake_case)
    const compensationData = {
      user_id: userId,
      holiday_id: parseInt(holidayId.toString()),
      declared_hours: parseFloat(declaredHours.toString()),
      detected_hours: parseFloat(detectedHours.toString()),
      confidence: confidence ? parseInt(confidence.toString()) : 85,
      proof_image: proofImage || 'data:image/jpeg;base64,placeholder',
      status: 'approved',
      reason: reason || 'Análise automática aprovada',
      analyzed_at: new Date().toISOString()
    }

    console.log("Dados preparados para Supabase:", JSON.stringify(compensationData, null, 2))

    // Inserir no Supabase
    console.log("Iniciando inserção no Supabase...")
    const { data, error } = await supabase
      .from('hour_bank_compensations')
      .insert(compensationData)
      .select()
      .single()

    if (error) {
      console.error("Erro detalhado do Supabase:")
      console.error("- Código:", error.code)
      console.error("- Mensagem:", error.message)
      console.error("- Detalhes:", error.details)
      console.error("- Hint:", error.hint)
      
      return NextResponse.json(
        { 
          error: "Erro ao salvar no banco de dados",
          details: error.message,
          code: error.code,
          supabaseError: error
        },
        { status: 500 }
      )
    }

    console.log("Dados salvos no Supabase:", data)
    console.log("=== API SAVE CONCLUÍDA COM SUCESSO ===")

    return NextResponse.json({
      success: true,
      compensation: data,
      message: "Compensação salva com sucesso no banco de dados!"
    })
  } catch (error) {
    console.error("=== ERRO NA API SAVE ===")
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
