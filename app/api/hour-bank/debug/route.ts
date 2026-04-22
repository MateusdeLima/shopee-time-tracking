import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("=== DEBUG API INICIADA ===")
    
    const body = await request.json()
    console.log("Body recebido:", body)
    
    // Teste 1: Verificar conexão básica
    console.log("Teste 1: Verificando conexão...")
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (connectionError) {
      console.error("Erro de conexão:", connectionError)
      return NextResponse.json({
        success: false,
        step: "connection",
        error: connectionError
      })
    }
    
    console.log("✅ Conexão OK")
    
    // Teste 2: Verificar se consegue inserir na tabela
    console.log("Teste 2: Tentando inserção simples...")
    const testData = {
      user_id: connectionTest[0].id,
      holiday_id: 1,
      declared_hours: 1.0,
      detected_hours: 1.0,
      confidence: 85,
      proof_image: 'test-debug',
      status: 'approved',
      reason: 'Teste debug API',
      analyzed_at: new Date().toISOString()
    }
    
    console.log("Dados de teste:", testData)
    
    const { data: insertTest, error: insertError } = await supabase
      .from('hour_bank_compensations')
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      console.error("Erro de inserção:", insertError)
      return NextResponse.json({
        success: false,
        step: "insert",
        error: insertError,
        testData
      })
    }
    
    console.log("✅ Inserção OK:", insertTest)
    
    // Limpar teste
    await supabase
      .from('hour_bank_compensations')
      .delete()
      .eq('id', insertTest.id)
    
    return NextResponse.json({
      success: true,
      message: "Todos os testes passaram!",
      connectionTest: connectionTest[0],
      insertTest
    })
    
  } catch (error) {
    console.error("Erro geral:", error)
    return NextResponse.json({
      success: false,
      step: "general",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}
