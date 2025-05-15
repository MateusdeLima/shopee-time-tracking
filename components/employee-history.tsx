"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Edit2, Trash2, AlertCircle, Calendar, Clock, FileDown, ClipboardCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  getHolidays,
  getOvertimeRecordsByUserId,
  updateOvertimeRecord,
  deleteOvertimeRecord,
  getUserHolidayStats,
} from "@/lib/db"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import "jspdf-autotable"
import autoTable from "jspdf-autotable"

const OVERTIME_OPTIONS = [
  { id: "7h_18h", label: "7h às 18h", value: 2 },
  { id: "9h_20h", label: "9h às 20h", value: 2 },
  { id: "8h_19h", label: "8h às 19h", value: 2 },
  { id: "8h_18h", label: "8h às 18h", value: 1 },
  { id: "9h_19h", label: "9h às 19h", value: 1 },
]

interface EmployeeHistoryProps {
  user: any
}

export function EmployeeHistory({ user }: EmployeeHistoryProps) {
  const [records, setRecords] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [selectedOption, setSelectedOption] = useState("")
  const [error, setError] = useState("")
  const [holidayHoursMap, setHolidayHoursMap] = useState<Record<number, { used: number; max: number }>>({})
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null)

  useEffect(() => {
    // Carregar feriados
    const loadHolidays = async () => {
      try {
        const allHolidays = await getHolidays()
        if (Array.isArray(allHolidays)) {
          setHolidays(allHolidays)
        } else {
          console.error("getHolidays() did not return an array:", allHolidays)
          setHolidays([])
        }
      } catch (error) {
        console.error("Error loading holidays:", error)
        setHolidays([])
      }
    }

    // Carregar registros do usuário
    const loadUserRecords = async () => {
      try {
        const userRecords = await getOvertimeRecordsByUserId(user.id)
        if (Array.isArray(userRecords)) {
          // Ordenar por data (mais recentes primeiro)
          userRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setRecords(userRecords)
        } else {
          console.error("getOvertimeRecordsByUserId() did not return an array:", userRecords)
          setRecords([])
        }
      } catch (error) {
        console.error("Error loading user records:", error)
        setRecords([])
      }
    }

    // Calcular horas usadas por feriado
    const calculateHoursMap = async () => {
      try {
        if (Array.isArray(holidays)) {
          const hoursMap: Record<number, { used: number; max: number }> = {}
          for (const holiday of holidays) {
            const stats = await getUserHolidayStats(user.id, holiday.id)
            hoursMap[holiday.id] = stats
          }
          setHolidayHoursMap(hoursMap)
        }
      } catch (error) {
        console.error("Error calculating hours map:", error)
      }
    }

    const loadRecords = async () => {
      await loadHolidays()
      await loadUserRecords()
    calculateHoursMap()
    }

    loadRecords()

    // Inscrever-se para atualizações em tempo real
    const subscription = supabase
      .channel('overtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'overtime_records',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadRecords()
        }
      )
      .subscribe()

    // Limpar inscrição quando o componente for desmontado
    return () => {
      subscription.unsubscribe()
    }
  }, [user.id])

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setSelectedOption(record.optionId)
    setError("")
    setIsEditing(true)
  }

  const handleDelete = async () => {
    if (recordToDelete === null) return
    try {
      await deleteOvertimeRecord(recordToDelete)
      const updatedUserRecords = records.filter((record) => record.id !== recordToDelete)
      setRecords(updatedUserRecords)
      // Atualizar mapa de horas
      const deletedRecord = records.find((record) => record.id === recordToDelete)
      if (deletedRecord) {
        const holidayId = deletedRecord.holidayId
        const currentHoursInfo = holidayHoursMap[holidayId]
        if (currentHoursInfo) {
          setHolidayHoursMap({
            ...holidayHoursMap,
            [holidayId]: {
              ...currentHoursInfo,
              used: currentHoursInfo.used - deletedRecord.hours,
            },
          })
        }
      }
      toast({
        title: "Registro excluído",
        description: "O registro de horas extras foi excluído com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o registro",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleSaveEdit = () => {
    if (!selectedOption) {
      setError("Selecione uma opção de hora extra")
      return
    }

    // Obter detalhes da opção selecionada
    const option = OVERTIME_OPTIONS.find((opt) => opt.id === selectedOption)
    if (!option) {
      setError("Opção inválida")
      return
    }

    // Calcular quantas horas seriam usadas após a edição
    const holidayId = selectedRecord.holidayId
    const currentHoursInfo = holidayHoursMap[holidayId]

    // Calcular o total de horas que seria usado
    const hoursDifference = option.value - selectedRecord.hours
    const newTotalHours = currentHoursInfo.used + hoursDifference

    // Verificar se a edição excederia o máximo de horas
    if (newTotalHours > currentHoursInfo.max) {
      setError(`Esta alteração excederia o limite de ${currentHoursInfo.max}h para este feriado`)
      return
    }

    try {
      // Atualizar o registro
      const updatedRecord = updateOvertimeRecord(selectedRecord.id, {
        optionId: selectedOption,
        optionLabel: option.label,
        hours: option.value,
      })

      // Atualizar estado
      const updatedRecords = records.map((record) => (record.id === selectedRecord.id ? updatedRecord : record))
      setRecords(updatedRecords)

      // Atualizar mapa de horas
      setHolidayHoursMap({
        ...holidayHoursMap,
        [holidayId]: {
          ...currentHoursInfo,
          used: newTotalHours,
        },
      })

      toast({
        title: "Registro atualizado",
        description: "O registro de horas extras foi atualizado com sucesso",
      })

      // Resetar estado de edição
      setIsEditing(false)
      setSelectedRecord(null)
      setSelectedOption("")
    } catch (error: any) {
      setError(error.message || "Falha ao atualizar registro. Tente novamente.")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A"
    return timeString
  }

  const formatHours = (hours: number) => {
    return hours === 0.5 ? "30 min" : `${hours}h`
  }

  // Get available options for editing based on remaining hours
  const getAvailableOptions = (record: any) => {
    const holidayId = record.holidayId
    const currentHoursInfo = holidayHoursMap[holidayId]

    if (!currentHoursInfo) return OVERTIME_OPTIONS

    // Calculate remaining hours plus the current record's hours (since we're replacing it)
    const remainingHours = currentHoursInfo.max - currentHoursInfo.used + record.hours

    return OVERTIME_OPTIONS.filter((option) => option.value <= remainingHours)
  }

  const generateReport = async () => {
    try {
      setIsGeneratingReport(true)

      // Criar novo documento PDF
      const doc = new jsPDF()
      
      // Configurar fonte para suportar caracteres especiais
      doc.setFont("helvetica")
      
      // Adicionar cabeçalho
      doc.setFontSize(16)
      doc.text("Relatório de Horas Extras", 105, 15, { align: "center" })
      
      // Adicionar informações do funcionário
      doc.setFontSize(12)
      doc.text(`Funcionário: ${user.firstName} ${user.lastName}`, 14, 25)
      doc.text(`Email: ${user.email}`, 14, 32)
      doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 14, 39)

      // Agrupar registros por feriado
      const groupedRecords = records.reduce((acc, record) => {
        if (!acc[record.holidayId]) {
          acc[record.holidayId] = {
            holidayName: record.holidayName,
            records: []
          }
        }
        acc[record.holidayId].records.push(record)
        return acc
      }, {} as Record<number, { holidayName: string; records: typeof records }>)

      // Posição inicial para a tabela
      let yPos = 50

      // Iterar sobre cada feriado
      for (const [holidayId, data] of Object.entries(groupedRecords)) {
        const holidayData = data as { holidayName: string; records: typeof records }
        // Adicionar título do feriado
        doc.setFont("helvetica", "bold")
        doc.text(holidayData.holidayName, 14, yPos)
        doc.setFont("helvetica", "normal")
        
        // Calcular total de horas para este feriado
        const totalHours = holidayData.records.reduce((sum: number, record: any) => sum + record.hours, 0)
        
        // Preparar dados para a tabela
        const tableData = holidayData.records.map((record: any) => [
          formatDate(record.date),
          formatHours(record.hours),
          record.optionLabel,
          format(parseISO(record.createdAt), "dd/MM/yyyy HH:mm")
        ])

        // Adicionar tabela
        autoTable(doc, {
          startY: yPos + 5,
          head: [["Data", "Horas", "Período", "Registrado em"]],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [238, 77, 45] },
          styles: { font: "helvetica", fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 25 },
            2: { cellWidth: 70 },
            3: { cellWidth: 40 }
          },
          foot: [[
            "Total",
            formatHours(totalHours),
            "",
            ""
          ]],
          footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], font: "helvetica-bold" }
        })

        // Atualizar posição Y para o próximo feriado
        yPos = (doc as any).lastAutoTable.finalY + 15

        // Verificar se precisa adicionar nova página
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
      }

      // Adicionar rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(10)
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        )
      }

      // Salvar o PDF
      const fileName = `relatorio_horas_extras_${format(new Date(), "yyyy-MM-dd")}.pdf`
      doc.save(fileName)

      toast({
        title: "Relatório gerado com sucesso",
        description: "O relatório foi baixado para o seu computador",
      })
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  if (records.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Você ainda não possui registros de horas extras</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Histórico de Horas Extras</h3>
        <Button
          onClick={generateReport}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isGeneratingReport || records.length === 0}
        >
          {isGeneratingReport ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Gerando...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>
      {records.map((record) => {
        const holiday = holidays.find((h) => h.id === record.holidayId)
        const hoursInfo = holidayHoursMap[record.holidayId]
        const availableOptions = getAvailableOptions(record)

        return (
          <Card key={record.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[#EE4D2D] text-base sm:text-lg break-words">{record.holidayName}</h4>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {formatDate(record.date)}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm w-fit">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatHours(record.hours)} - {record.optionLabel}
                    </Badge>
                  {record.task && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-semibold w-fit">
                      <ClipboardCheck className="h-3 w-3" /> Task: {record.task}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end gap-2 sm:gap-0 mt-2 sm:mt-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold">
                  <Calendar className="h-3 w-3" /> Registrado em: {formatDate(record.createdAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setRecordToDelete(record.id)
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir registro</span>
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Registro de Hora Extra</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Você está prestes a excluir este registro de hora extra.</p>
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a este registro serão permanentemente excluídos.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

