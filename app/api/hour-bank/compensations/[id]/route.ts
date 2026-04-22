import { NextRequest, NextResponse } from "next/server"
import { updateHourBankCompensation } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status, reason } = await request.json()
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (!status || !reason) {
      return NextResponse.json(
        { error: "Status e motivo são obrigatórios" },
        { status: 400 }
      )
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      )
    }

    const updatedCompensation = await updateHourBankCompensation(id, {
      status,
      reason,
      analyzedAt: new Date().toISOString()
    })

    return NextResponse.json(updatedCompensation)
  } catch (error) {
    console.error("Erro ao atualizar compensação:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
