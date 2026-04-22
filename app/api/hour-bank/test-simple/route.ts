import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== TESTE SIMPLES DA API ===")
    
    // Testar importação das funções do banco
    const { getHolidays, getUsers } = await import("@/lib/db")
    
    console.log("Funções importadas com sucesso")
    
    // Testar busca de dados básicos
    const holidays = await getHolidays()
    const users = await getUsers()
    
    console.log("Dados obtidos:")
    console.log("- Feriados:", holidays.length)
    console.log("- Usuários:", users.length)
    
    return NextResponse.json({
      success: true,
      message: "API funcionando corretamente",
      data: {
        holidaysCount: holidays.length,
        usersCount: users.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error("=== ERRO NO TESTE SIMPLES ===")
    console.error("Erro:", error)
    
    return NextResponse.json(
      { 
        error: "Erro no teste simples",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("=== TESTE POST SIMPLES ===")
    console.log("Body recebido:", body)
    
    return NextResponse.json({
      success: true,
      message: "POST funcionando",
      receivedData: body
    })
    
  } catch (error) {
    console.error("Erro no POST:", error)
    return NextResponse.json(
      { error: "Erro no POST", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    )
  }
}
