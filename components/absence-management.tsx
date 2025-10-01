"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { format, isAfter, isBefore, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Upload, AlertCircle, FileText, X, Check, PartyPopper, Eye, Download, FileDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getAbsenceRecordsByUserId, createAbsenceRecord, updateAbsenceRecord, deleteAbsenceRecord } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import autoTable from 'jspdf-autotable'

const ABSENCE_REASONS = [
  { id: "medical", label: "Consulta Médica" },
  { id: "energy_internet", label: "Energia/Internet" },
  { id: "vacation", label: "Férias" },
  { id: "other", label: "Outro" },
]

interface AbsenceManagementProps {
  user: any
}

export function AbsenceManagement({ user }: AbsenceManagementProps) {
  const [absences, setAbsences] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isViewProofDialogOpen, setIsViewProofDialogOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    reason: "",
    customReason: "",
    dates: [] as Date[],
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    },
    proofDocument: null as string | null,
  })

  useEffect(() => {
    loadAbsences()

    // Configurar canal do Supabase para atualizações em tempo real
    const channel = supabase
      .channel('absence_records_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Escutar apenas eventos de inserção
          schema: 'public',
          table: 'absence_records',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          await loadAbsences()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', // Escutar eventos de exclusão
          schema: 'public',
          table: 'absence_records',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          await loadAbsences()
        }
      )
      .subscribe()

    // Detectar se é dispositivo móvel
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      channel.unsubscribe()
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [user.id])

  const loadAbsences = async () => {
    try {
      const userAbsences = await getAbsenceRecordsByUserId(user.id)
      if (Array.isArray(userAbsences)) {
    // Ordenar por data (mais recentes primeiro)
    userAbsences.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setAbsences(userAbsences)
      } else {
        console.error("loadAbsences: getAbsenceRecordsByUserId não retornou um array:", userAbsences)
        setAbsences([])
      }
    } catch (error) {
      console.error("Erro ao carregar ausências:", error)
      setAbsences([])
    }
  }

  const handleAddAbsence = () => {
    setFormData({
      reason: "",
      customReason: "",
      dates: [],
      dateRange: {
        start: null,
        end: null,
      },
      proofDocument: null,
    })
    setError("")
    setIsAddDialogOpen(true)
  }

  const handleReasonChange = (value: string) => {
    setFormData({
      ...formData,
      reason: value,
      customReason: value === "other" ? formData.customReason : "",
    })
  }

  const handleCustomReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      customReason: e.target.value,
    })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // Ajustar a data para meio-dia para evitar problemas de fuso horário
    const adjustedDate = new Date(date)
    adjustedDate.setHours(12, 0, 0, 0)

    // Se não temos data inicial, definimos esta como a data inicial
    if (!formData.dateRange.start) {
      setFormData({
        ...formData,
        dateRange: {
          start: adjustedDate,
          end: null,
        },
        dates: [adjustedDate],
      })
      return
    }

    // Se já temos uma data inicial, mas não uma data final
    if (formData.dateRange.start && !formData.dateRange.end) {
      // Ajustar a data inicial também
      const adjustedStart = new Date(formData.dateRange.start)
      adjustedStart.setHours(12, 0, 0, 0)

      // Se a data selecionada é anterior à data inicial, trocamos as datas
      if (isBefore(adjustedDate, adjustedStart)) {
        // Gerar todas as datas no intervalo
        const dateRange = eachDayOfInterval({
          start: adjustedDate,
          end: adjustedStart,
        }).map(d => {
          const adjusted = new Date(d)
          adjusted.setHours(12, 0, 0, 0)
          return adjusted
        })

        setFormData({
          ...formData,
          dateRange: {
            start: adjustedDate,
            end: adjustedStart,
          },
          dates: dateRange,
        })
      } else {
        // Caso contrário, a data selecionada é a data final
        // Gerar todas as datas no intervalo
        const dateRange = eachDayOfInterval({
          start: adjustedStart,
          end: adjustedDate,
        }).map(d => {
          const adjusted = new Date(d)
          adjusted.setHours(12, 0, 0, 0)
          return adjusted
        })

        setFormData({
          ...formData,
          dateRange: {
            start: adjustedStart,
            end: adjustedDate,
          },
          dates: dateRange,
        })
      }
    } else {
      // Se já temos ambas as datas, começamos um novo intervalo
      setFormData({
        ...formData,
        dateRange: {
          start: adjustedDate,
          end: null,
        },
        dates: [adjustedDate],
      })
    }
  }

  const hasPastDates = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return formData.dates.some((date) => {
      const dateToCheck = new Date(date)
      dateToCheck.setHours(0, 0, 0, 0)
      return dateToCheck < today
    })
  }

  const handleSaveAbsence = async () => {
    setError("")

    if (!formData.reason) {
      setError("Selecione um motivo para a ausência")
      return
    }

    if (formData.reason === "other" && !formData.customReason.trim()) {
      setError("Descreva o motivo da ausência")
      return
    }

    // Para Energia/Internet permitimos apenas a data inicial (fim opcional)
    if (formData.dates.length === 0) {
      setError("Selecione pelo menos a data inicial para a ausência")
      return
    }

    // Para Energia/Internet, se houver datas passadas e não tiver comprovante, mantém pendente para posterior anexação
    if (hasPastDates() && !formData.proofDocument && formData.reason !== "energy_internet") {
      setError("É necessário anexar um comprovante para datas passadas")
      return
    }

    try {
      // Formatar datas para string ISO mantendo o fuso horário local
      const formattedDates = formData.dates.map((date) => format(date, "yyyy-MM-dd"))

      // Determinar o status inicial com base no motivo e se há comprovante
      const initialStatus = formData.reason === "vacation"
        ? "pending"
        : formData.reason === "energy_internet"
          ? (formData.proofDocument ? "completed" : "pending")
          : (formData.proofDocument ? "completed" : "pending")

      // Criar novo registro de ausência
      const newAbsence = await createAbsenceRecord({
        userId: user.id,
        reason: formData.reason,
        customReason: formData.reason === "other" ? formData.customReason : undefined,
        dates: formattedDates,
        status: initialStatus,
        // Para Energia/Internet, a data final é opcional
        dateRange:
          formData.dateRange.start
            ? {
                start: format(formData.dateRange.start, "yyyy-MM-dd"),
                end: formData.dateRange.end ? format(formData.dateRange.end, "yyyy-MM-dd") : undefined as any,
              }
            : undefined,
        proofDocument: formData.proofDocument || undefined,
      })

      // Atualizar o estado local imediatamente
      setAbsences(prevAbsences => [newAbsence, ...prevAbsences])

      toast({
        title: "Ausência registrada",
        description:
          formData.reason === "vacation"
            ? "Sua solicitação de férias foi registrada e está aguardando aprovação"
            : "Sua ausência foi registrada com sucesso",
      })

      // Fechar diálogo
      setIsAddDialogOpen(false)
    } catch (error: any) {
      setError(error.message || "Ocorreu um erro ao registrar a ausência")
    }
  }

  const handleUploadProof = (absenceId: number) => {
    setSelectedAbsence(absences.find((a) => a.id === absenceId))
    setIsUploadDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB",
        variant: "destructive",
      })
      return
    }

    // Verificar tipo do arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPEG, PNG, GIF) e PDF são permitidos",
        variant: "destructive",
      })
      return
    }

    // Converter arquivo para base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      if (!selectedAbsence) return

      try {
        // Atualizar registro com o documento
        const updatedAbsence = await updateAbsenceRecord(selectedAbsence.id, {
          proofDocument: event.target?.result as string,
          status: "completed",
        })

        // Atualizar o estado local imediatamente
        setAbsences(prevAbsences => 
          prevAbsences.map(absence => 
            absence.id === selectedAbsence.id 
              ? { ...absence, proofDocument: event.target?.result as string, status: "completed" }
              : absence
          )
        )

        toast({
          title: "Comprovante enviado",
          description: "Seu comprovante foi enviado com sucesso",
        })

        // Fechar diálogo
        setIsUploadDialogOpen(false)
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao enviar o comprovante",
          variant: "destructive",
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAbsence = async (absenceId: number) => {
    if (confirm("Tem certeza que deseja excluir este registro de ausência?")) {
      try {
        await deleteAbsenceRecord(absenceId)

        toast({
          title: "Ausência excluída",
          description: "O registro de ausência foi excluído com sucesso",
        })
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao excluir a ausência",
          variant: "destructive",
        })
      }
    }
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || typeof dateString !== "string" || !dateString.includes("-")) return "-"
    const parts = dateString.split('-').map(Number)
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return "-"
    const [year, month, day] = parts
    const date = new Date(year, (month || 1) - 1, day || 1)
    if (isNaN(date.getTime())) return "-"
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const isDateInFuture = (dateString: string) => {
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return date >= today
  }

  const getReasonLabel = (absence: any) => {
    if (absence.reason === "other") {
      return absence.customReason
    }

    const reason = ABSENCE_REASONS.find((r) => r.id === absence.reason)
    return reason ? reason.label : "Motivo não especificado"
  }

  const isAbsenceActive = (absence: any) => {
    const expiresAt = new Date(absence.expiresAt)
    return isAfter(expiresAt, new Date())
  }

  const getStatusBadge = (absence: any) => {
    if (absence.status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Aprovado! <PartyPopper className="h-3 w-3 ml-1" />
        </Badge>
      )
    } else if (absence.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Comprovante Enviado
        </Badge>
      )
    } else if (absence.reason === "vacation") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Aguardando Aprovação
        </Badge>
      )
    }

    return null
  }

  const formatDateRange = (absence: any) => {
    const startStr = absence?.dateRange?.start as string | undefined
    const endStr = absence?.dateRange?.end as string | undefined

    if (startStr && endStr) {
      return `De ${formatDate(startStr)} até ${formatDate(endStr)}`
    }

    if (startStr && !endStr) {
      return `${formatDate(startStr)}`
    }

    const dates: string[] = Array.isArray(absence?.dates) ? absence.dates : []
    if (dates.length > 1) {
      return `${dates.length} dias`
    }
    if (dates.length === 1) {
      return formatDate(dates[0])
    }
    return "-"
  }

  const handleViewProof = (absence: any) => {
    setSelectedProof(absence.proofDocument)
    setIsViewProofDialogOpen(true)
  }

  const handleDownloadProof = (proofDocument: string) => {
    // Extrair tipo de arquivo da string base64
    const matches = proofDocument.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      return
    }

    const type = matches[1]
    const base64Data = matches[2]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type })

    // Criar URL para download
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url

    // Determinar extensão de arquivo
    let extension = "file"
    if (type.includes("pdf")) extension = "pdf"
    else if (type.includes("jpeg")) extension = "jpg"
    else if (type.includes("png")) extension = "png"
    else if (type.includes("gif")) extension = "gif"

    const date = format(new Date(), "yyyyMMdd")
    link.download = `comprovante_${date}.${extension}`
    document.body.appendChild(link)
    link.click()

    // Limpar
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
      doc.text("Relatório de Ausências", 105, 15, { align: "center" })
      
      // Adicionar informações do funcionário
      doc.setFontSize(12)
      doc.text(`Funcionário: ${user.firstName} ${user.lastName}`, 14, 25)
      doc.text(`Email: ${user.email}`, 14, 32)
      doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 14, 39)

      // Helpers seguros
      const safeParseISO = (value?: string) => {
        if (!value) return null
        const ts = Date.parse(value)
        return Number.isNaN(ts) ? null : new Date(ts)
      }
      const formatCreated = (value?: string, pattern = "dd/MM/yyyy") => {
        const d = safeParseISO(value)
        try { return d ? format(d, pattern, { locale: ptBR }) : "-" } catch { return "-" }
      }

      // Agrupar ausências por mês
      const groupedAbsences = absences.reduce((acc, absence) => {
        const date = safeParseISO(absence.createdAt) || new Date()
        const monthYear = format(date, "MMMM yyyy", { locale: ptBR })
        
        if (!acc[monthYear]) {
          acc[monthYear] = []
        }
        
        acc[monthYear].push(absence)
        return acc
      }, {} as Record<string, typeof absences>)

      // Posição inicial para a tabela
      let yPos = 50

      // Iterar sobre cada mês
      for (const [monthYear, monthAbsences] of Object.entries(groupedAbsences)) {
        // Adicionar título do mês
        doc.setFont("helvetica", "bold")
        doc.text(monthYear, 14, yPos)
        doc.setFont("helvetica", "normal")
        
        // Preparar dados para a tabela
        const tableData = (monthAbsences as typeof absences).map((absence: typeof absences[0]) => [
          formatCreated(absence.createdAt, "dd/MM/yyyy"),
          getReasonLabel(absence),
          formatDateRange(absence),
          absence.status === "approved" ? "Aprovado" :
          absence.status === "completed" ? "Comprovante Enviado" :
          absence.reason === "vacation" ? "Aguardando Aprovação" : "Pendente"
        ])

        // Adicionar tabela
        autoTable(doc, {
          startY: yPos + 5,
          head: [["Data Registro", "Motivo", "Período", "Status"]],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [238, 77, 45] },
          styles: { font: "helvetica", fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 50 },
            2: { cellWidth: 60 },
            3: { cellWidth: 40 }
          }
        })

        // Atualizar posição Y para o próximo mês
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
      const fileName = `relatorio_ausencias_${format(new Date(), "yyyy-MM-dd")}.pdf`
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

  return (
    <div className="space-y-6">
      <div className={cn(
        "flex justify-between items-center",
        isMobile && "flex-col gap-2 items-stretch"
      )}>
        <h3 className="text-lg font-medium">Ausências Futuras</h3>
        <div className={cn(
          "flex gap-2",
          isMobile && "flex-col gap-2 w-full"
        )}>
          <Button
            onClick={generateReport}
            variant="outline"
            className={cn(
              "flex items-center gap-2",
              isMobile && "w-full"
            )}
            disabled={isGeneratingReport || absences.length === 0}
          >
            {isGeneratingReport ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Gerar Relatório
              </>
            )}
          </Button>
          <Button 
            onClick={handleAddAbsence} 
            className={cn(
              "bg-[#EE4D2D] hover:bg-[#D23F20]",
              isMobile && "w-full"
            )}
          >
            Registrar Ausência
          </Button>
        </div>
      </div>

      {absences.length === 0 ? (
        <div className="text-center p-6">
          <p className="text-gray-500">Você não possui ausências registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {absences.filter(isAbsenceActive).map((absence) => (
            <Card key={absence.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <CardTitle className="text-lg font-medium">{getReasonLabel(absence)}</CardTitle>
                  {getStatusBadge(absence)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">{formatDateRange(absence)}</div>

                    {absence.dates.length <= 5 && (
                      <div className="flex flex-wrap gap-2">
                        {absence.dates.map((date: string, index: number) => (
                          <Badge
                            key={index}
                            variant={isDateInFuture(date) ? "outline" : "default"}
                            className={cn(
                              isDateInFuture(date)
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-700 border-gray-200",
                              "text-xs sm:text-sm"
                            )}
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(date)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <p className="text-xs text-gray-500 order-2 sm:order-1">
                      Registrado em: {(() => { try { const ts = Date.parse(absence.createdAt); return Number.isNaN(ts) ? "-" : format(new Date(ts), "dd/MM/yyyy") } catch { return "-" } })()}
                    </p>

                    <div className="flex flex-wrap gap-2 order-1 sm:order-2 w-full sm:w-auto">
                      {absence.status === "completed" && absence.proofDocument && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            onClick={() => handleViewProof(absence)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Visualizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            onClick={() => handleDownloadProof(absence.proofDocument)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Baixar
                          </Button>
                        </>
                      )}
                      {absence.status === "pending" &&
                      absence.reason !== "vacation" && (
                        <Button
                          variant="outline"
                          size="sm"
                            className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                          onClick={() => handleUploadProof(absence.id)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Enviar Comprovante
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para adicionar ausência */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Ausência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Motivo da Ausência</Label>
              <RadioGroup value={formData.reason} onValueChange={handleReasonChange}>
                {ABSENCE_REASONS.map((reason) => (
                  <div key={reason.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.id} id={reason.id} />
                    <Label htmlFor={reason.id}>{reason.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {formData.reason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Descreva o motivo</Label>
                <Textarea
                  id="customReason"
                  value={formData.customReason}
                  onChange={handleCustomReasonChange}
                  placeholder="Descreva o motivo da sua ausência"
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Datas de Ausência</Label>
              <p className="text-xs text-gray-500 mb-2">
                {formData.dateRange.start && !formData.dateRange.end
                  ? "Selecione a data final para criar um intervalo"
                  : "Selecione a data inicial e depois a data final para criar um intervalo"}
              </p>
              <Popover 
                open={isCalendarOpen} 
                onOpenChange={setIsCalendarOpen}
                modal={isMobile}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal relative",
                      !formData.dates.length && "text-muted-foreground",
                    )}
                    onClick={() => setIsCalendarOpen(true)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateRange.start && formData.dateRange.end
                      ? `De ${format(formData.dateRange.start, "dd/MM/yyyy")} até ${format(formData.dateRange.end, "dd/MM/yyyy")}`
                      : formData.dateRange.start
                        ? `Início: ${format(formData.dateRange.start, "dd/MM/yyyy")} - Selecione o fim`
                        : "Selecione as datas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className={cn(
                    "p-0 absolute z-50",
                    isMobile ? "w-screen h-screen max-w-none max-h-none fixed top-0 left-0 -translate-x-0 -translate-y-0 rounded-none" : "w-auto"
                  )}
                  align={isMobile ? "center" : "start"}
                  side="bottom"
                  sideOffset={isMobile ? 0 : 5}
                  avoidCollisions
                >
                  <div className={cn(
                    "p-3 bg-white rounded-lg shadow-lg",
                    isMobile && "h-full flex flex-col justify-between rounded-none"
                  )}>
                    {isMobile && (
                      <div className="p-2 border-b flex justify-end sticky top-0 bg-white z-10">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsCalendarOpen(false)}
                          className="w-full bg-[#EE4D2D] hover:bg-[#D23F20] text-white"
                        >
                          Fechar
                        </Button>
                      </div>
                    )}
                    <Calendar
                      mode="single"
                      selected={formData.dateRange.end ?? formData.dateRange.start ?? undefined}
                      onSelect={(date) => {
                        handleDateSelect(date)
                        if (formData.dateRange.start && date) {
                          setIsCalendarOpen(false)
                        }
                      }}
                      initialFocus
                      className={cn(
                        "rounded-md border shadow-md w-full touch-manipulation",
                        isMobile && "text-base flex-1"
                      )}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {formData.dates.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    {formData.dates.length} {formData.dates.length === 1 ? "dia selecionado" : "dias selecionados"}
                  </p>

                  {formData.dates.length <= 5 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.dates.map((date, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {format(date, "dd/MM/yyyy")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasPastDates() && (
              <div className="space-y-2">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-700">
                    Você selecionou datas passadas. É necessário anexar um comprovante para registrar a ausência.
                  </AlertDescription>
                </Alert>

                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um comprovante</p>
                  <p className="text-xs text-gray-500 mt-1">Ou arraste e solte aqui</p>
                  <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, PDF</p>
                  <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      // Verificar tamanho do arquivo (máximo 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        toast({
                          title: "Arquivo muito grande",
                          description: "O tamanho máximo permitido é 5MB",
                          variant: "destructive",
                        })
                        return
                      }

                      // Verificar tipo do arquivo
                      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"]
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: "Tipo de arquivo não suportado",
                          description: "Apenas imagens (JPEG, PNG, GIF) e PDF são permitidos",
                          variant: "destructive",
                        })
                        return
                      }

                      // Converter arquivo para base64
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        setFormData({
                          ...formData,
                          proofDocument: event.target?.result as string,
                        })
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </div>

                {formData.proofDocument && (
                  <div className="flex items-center gap-2 mt-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700">Comprovante anexado</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setFormData({ ...formData, proofDocument: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {formData.reason === "vacation" && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  Solicitações de férias precisam ser aprovadas pelo administrador.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-[#EE4D2D] hover:bg-[#D23F20]" 
                onClick={handleSaveAbsence}
                disabled={hasPastDates() && !formData.proofDocument}
              >
                Registrar Ausência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para upload de comprovante */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Comprovante</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              Envie um comprovante para a ausência registrada em {selectedAbsence && formatDateRange(selectedAbsence)}
            </p>

            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
              <p className="text-xs text-gray-500 mt-1">Ou arraste e solte aqui</p>
              <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, PDF</p>
              <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,application/pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar comprovante */}
      <Dialog open={isViewProofDialogOpen} onOpenChange={setIsViewProofDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualizar Comprovante</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedProof && (
              <div className="flex flex-col items-center justify-center">
                {selectedProof.includes("image") ? (
                  <img
                    src={selectedProof}
                    alt="Comprovante"
                    className="max-h-[70vh] object-contain rounded-lg"
                  />
                ) : selectedProof.includes("pdf") ? (
                  <div className="flex flex-col items-center gap-4">
                    <AlertCircle className="h-16 w-16 text-gray-400" />
                    <p className="text-gray-500">Este é um arquivo PDF</p>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownloadProof(selectedProof)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Visualização não disponível</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsViewProofDialogOpen(false)}>
                Fechar
              </Button>
              {selectedProof && (
                <Button 
                  className="bg-[#EE4D2D] hover:bg-[#D23F20]" 
                  onClick={() => handleDownloadProof(selectedProof)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Comprovante
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

