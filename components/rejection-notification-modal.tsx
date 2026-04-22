"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, CheckCircle, Calendar, Clock, User } from "lucide-react"

// Funções de formatação locais
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const formatHours = (hours: number) => {
  return `${hours}h`
}

interface ProcessedRecord {
  id: number
  holidayName: string
  hours: number
  date: string
  userId: string
  optionLabel: string
  updatedAt: string
  status: "approved" | "rejected_admin"
}

interface BankHoursNotificationModalProps {
  userId: string
  onClose: () => void
}

export default function BankHoursNotificationModal({ userId, onClose }: BankHoursNotificationModalProps) {
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProcessedRecords()
  }, [userId])

  const STORAGE_KEY = `hourBankNoticeSeen_${userId}`

  const loadProcessedRecords = async () => {
    try {
      setLoading(true)
      const { getOvertimeRecords } = await import("@/lib/db")
      const allRecords = await getOvertimeRecords()
      const userProcessed = allRecords.filter(record => 
        record.userId === userId &&
        record.optionId === "manual_bank_hours" &&
        (record.status === "approved" || record.status === "rejected_admin") &&
        // últimas 30 dias para comparação, mas exibiremos só se não visto
        new Date(record.updatedAt || record.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).map(record => ({
        id: record.id,
        holidayName: record.holidayName,
        hours: record.hours,
        date: record.date,
        userId: record.userId,
        optionLabel: record.optionLabel,
        updatedAt: record.updatedAt || new Date().toISOString(),
        status: record.status as "approved" | "rejected_admin"
      }))

      setProcessedRecords(userProcessed)

      // Verificar se há novidade não vista
      if (userProcessed.length > 0) {
        const latest = userProcessed
          .map(r => new Date(r.updatedAt).getTime())
          .reduce((a, b) => Math.max(a, b), 0)
        const lastSeen = Number(localStorage.getItem(STORAGE_KEY) || 0)
        if (latest > lastSeen) {
          setIsOpen(true)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar rejeições:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Marcar como visto até o último registro processado
    if (processedRecords.length > 0) {
      const latest = processedRecords
        .map(r => new Date(r.updatedAt).getTime())
        .reduce((a, b) => Math.max(a, b), 0)
      localStorage.setItem(STORAGE_KEY, String(latest))
    }
    setIsOpen(false)
    onClose()
  }

  if (loading || processedRecords.length === 0) {
    return null
  }

  const approvedRecords = processedRecords.filter(r => r.status === "approved")
  const rejectedRecords = processedRecords.filter(r => r.status === "rejected_admin")

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approvedRecords.length > 0 && rejectedRecords.length > 0 ? (
              <>
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600">Atualizações de Banco de Horas</span>
              </>
            ) : approvedRecords.length > 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600">Solicitações Aprovadas</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-600">Solicitações Rejeitadas</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {approvedRecords.length > 0 && rejectedRecords.length > 0
              ? "Você tem atualizações sobre suas solicitações de banco de horas:"
              : approvedRecords.length > 0
              ? `${approvedRecords.length === 1 ? "Sua solicitação foi aprovada" : `${approvedRecords.length} solicitações foram aprovadas`}:`
              : `${rejectedRecords.length === 1 ? "Sua solicitação foi rejeitada" : `${rejectedRecords.length} solicitações foram rejeitadas`}:`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {processedRecords.map((record: ProcessedRecord) => (
            <div key={record.id} className={`border rounded-lg p-3 ${
              record.status === "approved" 
                ? "border-green-200 bg-green-50" 
                : "border-red-200 bg-red-50"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-semibold ${
                  record.status === "approved" ? "text-green-800" : "text-red-800"
                }`}>
                  {record.holidayName}
                </h4>
                <Badge 
                  variant={record.status === "approved" ? "default" : "destructive"} 
                  className={`text-xs ${
                    record.status === "approved" 
                      ? "bg-green-500 hover:bg-green-600" 
                      : ""
                  }`}
                >
                  {record.status === "approved" ? "Aprovado" : "Rejeitado"}
                </Badge>
              </div>
              
              <div className={`space-y-1 text-sm ${
                record.status === "approved" ? "text-green-700" : "text-red-700"
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatHours(record.hours)} {record.status === "approved" ? "aprovadas" : "solicitadas"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {record.status === "approved" ? "Aprovado" : "Rejeitado"} em: {formatDate(record.updatedAt)}
                  </span>
                </div>
              </div>
              
              <p className={`text-xs mt-2 font-medium ${
                record.status === "approved" ? "text-green-600" : "text-red-600"
              }`}>
                {record.status === "approved" 
                  ? "✅ Suas horas foram descontadas do feriado!"
                  : "Entre em contato com o RH para mais informações."
                }
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleClose} className="w-full">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
