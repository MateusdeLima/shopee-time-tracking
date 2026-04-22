import { NextRequest, NextResponse } from "next/server"
import { updateOvertimeRecord, getOvertimeRecordById } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("=== API ADMIN APPROVAL INICIADA ===")
    
    const { recordId, action, adminId } = await request.json()
    
    // Validações básicas
    if (!recordId || !action || !adminId) {
      return NextResponse.json(
        { error: "Dados obrigatórios: recordId, action, adminId" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action deve ser 'approve' ou 'reject'" },
        { status: 400 }
      )
    }

    // Buscar o registro atual
    const currentRecord = await getOvertimeRecordById(recordId)
    if (!currentRecord) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se é um registro de IA pendente
    if (currentRecord.optionId !== "ai_bank_hours" || currentRecord.status !== "pending_admin") {
      return NextResponse.json(
        { error: "Este registro não está aguardando aprovação do admin" },
        { status: 400 }
      )
    }

    // Atualizar status
    const newStatus = action === "approve" ? "approved" : "rejected_admin"
    
    await updateOvertimeRecord(recordId, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    console.log(`Registro ${recordId} ${action === "approve" ? "aprovado" : "rejeitado"} pelo admin ${adminId}`)

    return NextResponse.json({
      success: true,
      message: `Registro ${action === "approve" ? "aprovado" : "rejeitado"} com sucesso`,
      recordId,
      newStatus,
      action
    })

  } catch (error) {
    console.error("=== ERRO NA API ADMIN APPROVAL ===")
    console.error("Erro:", error)
    
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Buscar registros pendentes de aprovação
    const { getOvertimeRecords } = await import("@/lib/db")
    
    const allRecords = await getOvertimeRecords()
    const pendingRecords = allRecords.filter(record => 
      record.optionId === "ai_bank_hours" && record.status === "pending_admin"
    )

    return NextResponse.json({
      success: true,
      pendingRecords,
      count: pendingRecords.length
    })

  } catch (error) {
    console.error("Erro ao buscar registros pendentes:", error)
    
    return NextResponse.json(
      { 
        error: "Erro ao buscar registros pendentes",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
