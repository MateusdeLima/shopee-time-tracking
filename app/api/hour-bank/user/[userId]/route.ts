import { NextRequest, NextResponse } from "next/server"
import { getHourBankCompensationsByUserId } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      )
    }

    const compensations = await getHourBankCompensationsByUserId(userId)
    return NextResponse.json(compensations)
  } catch (error) {
    console.error("Erro ao buscar compensações do usuário:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
