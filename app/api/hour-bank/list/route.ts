import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("=== LISTANDO COMPENSAÇÕES ===")

    const { data, error } = await supabase
      .from("hour_bank_compensations")
      .select(`
        *,
        users!inner(first_name, last_name, email),
        holidays!inner(name, date)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao listar compensações:", error)
      return NextResponse.json({
        success: false,
        error: "Erro ao listar compensações",
        details: error
      })
    }

    console.log("Compensações encontradas:", data?.length || 0)
    console.log("Dados das compensações:", data)

    return NextResponse.json({
      success: true,
      compensations: data || [],
      count: data?.length || 0,
      message: `${data?.length || 0} compensações encontradas no banco de dados`
    })

  } catch (error) {
    console.error("Erro geral ao listar:", error)
    return NextResponse.json({
      success: false,
      error: "Erro geral ao listar compensações",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}
