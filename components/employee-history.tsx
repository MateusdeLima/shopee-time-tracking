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
import { Edit2, Trash2, AlertCircle, Calendar, Clock, FileDown, ClipboardCheck, Filter, Bot, Sparkles, LogOut } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getHolidays,
  getOvertimeRecordsByUserId,
  updateOvertimeRecord,
  deleteOvertimeRecord,
  getUserHolidayStats,
  finalizeOvertimeRecord,
  getTimesFromOptionId,
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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedHolidayForReport, setSelectedHolidayForReport] = useState<string>("all")
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [recordToFinalize, setRecordToFinalize] = useState<any | null>(null)
  const [insertExitDialogOpen, setInsertExitDialogOpen] = useState(false)
  const [recordToInsertExit, setRecordToInsertExit] = useState<any | null>(null)
  const [manualExitTime, setManualExitTime] = useState<string>("")

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
    try {
      if (!dateString) return 'Data não disponível'
      
      // Verificar se é uma data simples (YYYY-MM-DD) ou timestamp completo
      if (dateString.includes('T') || dateString.includes(' ')) {
        // É um timestamp completo, usar parseISO
        const date = parseISO(dateString)
        if (isNaN(date.getTime())) {
          throw new Error('Data inválida após parseISO')
        }
        return format(date, "dd/MM/yyyy", { locale: ptBR })
      } else {
        // É uma data simples, adicionar T12:00:00 para corrigir timezone
        const date = new Date(dateString + 'T12:00:00')
        if (isNaN(date.getTime())) {
          throw new Error('Data inválida após new Date')
        }
        return format(date, "dd/MM/yyyy", { locale: ptBR })
      }
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return 'Data inválida'
    }
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

      // Filtrar registros baseado na seleção
      let filteredRecords = records
      if (selectedHolidayForReport !== "all") {
        filteredRecords = records.filter(record => record.holidayId.toString() === selectedHolidayForReport)
      }

      if (filteredRecords.length === 0) {
        toast({
          title: "Nenhum registro encontrado",
          description: "Não há registros para o filtro selecionado",
          variant: "destructive",
        })
        setIsGeneratingReport(false)
        return
      }

      // Criar novo documento PDF
      const doc = new jsPDF()
      
      // Configurar fonte para suportar caracteres especiais
      doc.setFont("helvetica")
      
      // Adicionar cabeçalho
      doc.setFontSize(16)
      const reportTitle = selectedHolidayForReport === "all" 
        ? "Relatório de Horas Extras - Todos os Feriados"
        : `Relatório de Horas Extras - ${holidays.find(h => h.id.toString() === selectedHolidayForReport)?.name || "Feriado Específico"}`
      doc.text(reportTitle, 105, 15, { align: "center" })
      
      // Adicionar informações do funcionário
      doc.setFontSize(12)
      doc.text(`Funcionário: ${user.firstName} ${user.lastName}`, 14, 25)
      doc.text(`Email: ${user.email}`, 14, 32)
      doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 14, 39)

      // Agrupar registros por feriado
      const groupedRecords = filteredRecords.reduce((acc, record) => {
        if (!acc[record.holidayId]) {
          acc[record.holidayId] = {
            holidayName: record.holidayName,
            records: []
          }
        }
        acc[record.holidayId].records.push(record)
        return acc
      }, {} as Record<number, { holidayName: string; records: typeof filteredRecords }>)

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
      const holidayName = selectedHolidayForReport === "all" 
        ? "todos_feriados" 
        : holidays.find(h => h.id.toString() === selectedHolidayForReport)?.name.replace(/\s+/g, '_').toLowerCase() || "feriado"
      const fileName = `relatorio_horas_extras_${holidayName}_${format(new Date(), "yyyy-MM-dd")}.pdf`
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
      setIsReportDialogOpen(false)
    }
  }

  const approvedRecords = records.filter(r => r.status === 'approved')
  const pendingRecords = records.filter(r => r.status === 'pending_admin')

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
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={records.length === 0}
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtrar Relatório de Horas Extras
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="holiday-filter">Selecionar Feriado</Label>
                <Select value={selectedHolidayForReport} onValueChange={setSelectedHolidayForReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um feriado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Feriados</SelectItem>
                    {holidays
                      .filter(holiday => records.some(record => record.holidayId === holiday.id))
                      .map((holiday) => (
                        <SelectItem key={holiday.id} value={holiday.id.toString()}>
                          {holiday.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={generateReport}
                disabled={isGeneratingReport}
                className="bg-[#EE4D2D] hover:bg-[#D23F20]"
              >
                {isGeneratingReport ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {pendingRecords.length > 0 && (
        <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Aguardando aprovação do RH</h4>
          {pendingRecords.map(r => (
            <div key={r.id} className="flex gap-3 items-center mb-2 text-gray-500">
              <span className="font-mono bg-gray-200 text-gray-700 rounded px-2 py-1 text-xs">{r.hours}h</span>
              <span>{r.holidayName} ({r.date})</span>
              <span className="italic text-xs">Comprovante em análise</span>
            </div>
          ))}
        </div>
      )}
      {approvedRecords.map((record) => {
        const holiday = holidays.find((h) => h.id === record.holidayId)
        const hoursInfo = holidayHoursMap[record.holidayId]
        const availableOptions = getAvailableOptions(record)
        const isAIGenerated = record.optionId === "ai_bank_hours"
        const isPendingAdmin = record.status === "pending_admin"
        const isRejectedAdmin = record.status === "rejected_admin"

        return (
          <Card key={record.id} className={`p-4 hover:shadow-md transition-shadow ${
            isAIGenerated && isPendingAdmin
              ? "border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50" 
              : isAIGenerated && isRejectedAdmin
              ? "border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50"
              : isAIGenerated 
              ? "border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
              : ""
          }`}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-[#EE4D2D] text-base sm:text-lg break-words">{record.holidayName}</h4>
                  {isAIGenerated && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      isPendingAdmin 
                        ? "bg-purple-100 text-purple-700"
                        : isRejectedAdmin
                        ? "bg-red-100 text-red-700" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      <Bot className="h-3 w-3" />
                      <Sparkles className="h-3 w-3" />
                      {isPendingAdmin ? "Aguardando" : isRejectedAdmin ? "Rejeitado" : "Aprovado"}
                    </div>
                  )}
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {formatDate(record.date)}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <Badge variant="outline" className={`text-xs sm:text-sm w-fit ${
                    isAIGenerated && isPendingAdmin
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : isAIGenerated && isRejectedAdmin
                      ? "bg-red-50 text-red-700 border-red-200"
                      : isAIGenerated 
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {formatHours(record.hours)} - {
                      isAIGenerated 
                        ? isPendingAdmin 
                          ? "Banco de Horas IA (Aguardando verificação)"
                          : isRejectedAdmin
                          ? "Banco de Horas IA (Rejeitado pelo admin)"
                          : "Banco de Horas IA (Aprovado)"
                        : record.optionLabel
                    }
                  </Badge>
                  {record.task && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold w-fit ${
                      isAIGenerated 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-orange-100 text-orange-800"
                    }`}>
                      {isAIGenerated ? <Bot className="h-3 w-3" /> : <ClipboardCheck className="h-3 w-3" />}
                      {isAIGenerated ? "Compensação Automática" : `Task: ${record.task}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end gap-2 sm:gap-0 mt-2 sm:mt-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold">
                  <Calendar className="h-3 w-3" /> Registrado em: {formatDate(record.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  {record.endTime ? (
                    <span className="text-xs text-gray-600">Entrada: {formatTime(record.startTime)} • Saída: {formatTime(record.endTime)}</span>
                  ) : (
                    <>
                      <span className="text-xs text-gray-600">Entrada: {formatTime(record.startTime)} • Saída: —</span>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                        onClick={() => {
                          setRecordToInsertExit(record)
                          setManualExitTime("")
                          setInsertExitDialogOpen(true)
                        }}
                      >
                        Inserir data de saída
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirme o registro de ponto</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4 text-sm">
            {recordToFinalize && (
              <>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="text-xs text-gray-600 mb-1">{new Date(recordToFinalize.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] text-gray-600">Hora atual</div>
                      <div className="text-2xl font-semibold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-700 font-semibold text-lg">
                      ✓
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="text-[12px] text-gray-500">Entrada</div>
                    <div className="text-base font-medium">
                      {(() => {
                        const derived = getTimesFromOptionId(recordToFinalize.optionId)
                        return formatTime(recordToFinalize.startTime || derived.startTime || "")
                      })()}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[12px] text-gray-500">Saída prevista</div>
                    <div className="text-base font-medium">
                      {(() => {
                        const derived = getTimesFromOptionId(recordToFinalize.optionId)
                        return formatTime(derived.endTime || recordToFinalize.endTime || "")
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Ao confirmar, vamos registrar a saída agora e recalcular as horas extras com base no seu turno padrão.</div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!recordToFinalize) return
                try {
                  const updated = await finalizeOvertimeRecord(recordToFinalize.id)
                  // Atualizar lista local
                  setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
                  toast({ title: "Registro confirmado", description: "Saída registrada com sucesso." })
                  setFinalizeDialogOpen(false)
                  setRecordToFinalize(null)
                } catch (e: any) {
                  toast({ variant: "destructive", title: "Erro ao finalizar", description: e.message || "Tente novamente." })
                }
              }}
              disabled={(() => {
                if (!recordToFinalize) return true
                // Bloquear se já possui endTime
                if (recordToFinalize.endTime) return true
                // Bloquear se ainda não chegou na saída prevista
                const derived = getTimesFromOptionId(recordToFinalize.optionId)
                const planned = derived.endTime
                if (!planned) return false
                const [ph, pm] = planned.split(":").map(Number)
                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                const plannedMinutes = ph * 60 + pm
                return currentMinutes < plannedMinutes
              })()}
            >
              Confirmar registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      {/* Inserir data de saída (envio para aprovação do admin) */}
      <Dialog open={insertExitDialogOpen} onOpenChange={setInsertExitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir data de saída</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Informe a hora que você saiu no dia deste registro. O pedido irá para aprovação do administrador.</p>
            <div>
              <Label htmlFor="manual-exit-time">Horário de saída</Label>
              <input id="manual-exit-time" type="time" value={manualExitTime} onChange={(e) => setManualExitTime(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsertExitDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!recordToInsertExit || !manualExitTime) return
                try {
                  // Registrar solicitação para admin (reutiliza overtime_records com status pending_admin e end_time proposto)
                  await updateOvertimeRecord(recordToInsertExit.id, {
                    endTime: manualExitTime,
                    status: 'pending_admin',
                  })
                  // Atualiza UI local
                  setRecords(prev => prev.map(r => r.id === recordToInsertExit.id ? { ...r, endTime: null, status: 'pending_admin' } : r))
                  toast({ title: 'Enviado para aprovação', description: 'O administrador irá validar sua saída.' })
                  setInsertExitDialogOpen(false)
                } catch (e: any) {
                  toast({ variant: 'destructive', title: 'Erro', description: e.message || 'Tente novamente.' })
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!manualExitTime}
            >
              Enviar para aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

