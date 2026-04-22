import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== LIMPANDO DADOS DE BANCO DE HORAS IA ===")
    
    // 1. Deletar registros de horas extras criados pela IA
    const { error: overtimeError } = await supabase
      .from("overtime_records")
      .delete()
      .eq("option_id", "ai_bank_hours")
    
    if (overtimeError) {
      console.error("Erro ao deletar overtime_records:", overtimeError)
      throw overtimeError
    }
    
    // 2. Deletar compensações de banco de horas
    const { error: compensationError } = await supabase
      .from("hour_bank_compensations")
      .delete()
      .neq("id", 0) // Deletar todos os registros
    
    if (compensationError) {
      console.error("Erro ao deletar hour_bank_compensations:", compensationError)
      // Não falhar se a tabela não existir
      console.warn("Tabela hour_bank_compensations pode não existir ainda")
    }
    
    // 3. Verificar quantos registros foram deletados
    const { data: remainingOvertime } = await supabase
      .from("overtime_records")
      .select("id")
      .eq("option_id", "ai_bank_hours")
    
    const { data: remainingCompensations } = await supabase
      .from("hour_bank_compensations")
      .select("id")
    
    console.log("=== LIMPEZA CONCLUÍDA ===")
    console.log("Registros overtime restantes:", remainingOvertime?.length || 0)
    console.log("Registros compensations restantes:", remainingCompensations?.length || 0)
    
    return NextResponse.json({
      success: true,
      message: "Dados de banco de horas IA limpos com sucesso",
      deleted: {
        overtimeRecords: "Deletados registros com option_id = 'ai_bank_hours'",
        compensations: "Deletados todos os registros de compensações"
      },
      remaining: {
        overtimeRecords: remainingOvertime?.length || 0,
        compensations: remainingCompensations?.length || 0
      }
    })
    
  } catch (error) {
    console.error("=== ERRO AO LIMPAR DADOS ===")
    console.error("Erro completo:", error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      message: "Falha ao limpar dados de banco de horas IA"
    }, { status: 500 })
  }
}
