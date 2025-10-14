import { NextRequest, NextResponse } from "next/server"
import { getAllHourBankCompensations } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const compensations = await getAllHourBankCompensations()
    return NextResponse.json(compensations)
  } catch (error) {
    console.error("Erro ao buscar compensações:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
