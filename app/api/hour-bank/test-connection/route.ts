import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("Testando conexão com Supabase...")

    // 1. Testar conexão básica
    const { data: connectionTest, error: connectionError } = await supabase
      .from("users")
      .select("id")
      .limit(1)

    if (connectionError) {
      console.error("Erro de conexão:", connectionError)
      return NextResponse.json({
        success: false,
        error: "Erro de conexão com Supabase",
        details: connectionError
      })
    }

    console.log("✅ Conexão com Supabase OK")

    // 2. Verificar se a tabela hour_bank_compensations existe
    const { data: tableTest, error: tableError } = await supabase
      .from("hour_bank_compensations")
      .select("*")
      .limit(1)

    if (tableError) {
      console.error("Erro na tabela hour_bank_compensations:", tableError)
      return NextResponse.json({
        success: false,
        error: "Tabela hour_bank_compensations não existe ou não acessível",
        details: tableError,
        connectionOk: true
      })
    }

    console.log("✅ Tabela hour_bank_compensations OK")

    // 3. Testar inserção simples
    const testData = {
      user_id: "test-user-id",
      holiday_id: 1,
      declared_hours: 2.0,
      detected_hours: 2.0,
      confidence: 85,
      proof_image: "test-image-data",
      status: "approved",
      reason: "Teste de conexão",
      analyzed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data: insertTest, error: insertError } = await supabase
      .from("hour_bank_compensations")
      .insert(testData)
      .select()
      .single()

    if (insertError) {
      console.error("Erro ao inserir teste:", insertError)
      return NextResponse.json({
        success: false,
        error: "Erro ao inserir dados de teste",
        details: insertError,
        connectionOk: true,
        tableOk: true
      })
    }

    console.log("✅ Inserção de teste OK:", insertTest)

    // 4. Limpar dados de teste
    await supabase
      .from("hour_bank_compensations")
      .delete()
      .eq("user_id", "test-user-id")

    return NextResponse.json({
      success: true,
      message: "Todos os testes passaram!",
      connectionOk: true,
      tableOk: true,
      insertOk: true,
      testData: insertTest
    })

  } catch (error) {
    console.error("Erro geral no teste:", error)
    return NextResponse.json({
      success: false,
      error: "Erro geral no teste de conexão",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}
