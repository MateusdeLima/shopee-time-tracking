import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; holidayId: string } }
) {
  try {
    const { userId, holidayId } = params

    if (!userId || !holidayId) {
      return NextResponse.json(
        { error: "userId e holidayId são obrigatórios" },
        { status: 400 }
      )
    }

    // Buscar compensações aprovadas para este usuário e feriado no Supabase
    const compensatedHours = await getCompensatedHours(userId, parseInt(holidayId))
    
    return NextResponse.json({
      userId,
      holidayId: parseInt(holidayId),
      compensatedHours,
      message: compensatedHours > 0 
        ? `Usuário tem ${compensatedHours}h compensadas para este feriado`
        : "Nenhuma compensação encontrada para este usuário/feriado"
    })
  } catch (error) {
    console.error("Erro ao buscar horas compensadas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Função para buscar horas compensadas no Supabase
async function getCompensatedHours(userId: string, holidayId: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("hour_bank_compensations")
      .select("detected_hours")
      .eq("user_id", userId)
      .eq("holiday_id", holidayId)
      .eq("status", "approved")

    if (error) {
      console.error("Erro ao buscar compensações:", error)
      return 0
    }

    // Somar todas as horas detectadas aprovadas
    const totalHours = data?.reduce((sum, compensation) => sum + (compensation.detected_hours || 0), 0) || 0
    
    return totalHours
  } catch (error) {
    console.error("Erro na query de compensações:", error)
    return 0
  }
}
