"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { format, isAfter, isBefore, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getMonth, getYear, startOfDay, getDay, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Upload, AlertCircle, FileText, X, Check, PartyPopper, Eye, Download, FileDown, Filter } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getAbsenceRecordsByUserId, createAbsenceRecord, updateAbsenceRecord, deleteAbsenceRecord, getProjectVacations, getHolidays, type Holiday } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import autoTable from 'jspdf-autotable'

const ABSENCE_REASONS = [
  { id: "medical", label: "Consulta Médica" },
  { id: "personal", label: "Energia/Internet" },
  { id: "vacation", label: "Férias" },
  { id: "certificate", label: "Atestado" },
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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedMonthForReport, setSelectedMonthForReport] = useState<string>("all")
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    reason: "",
    customReason: "",
    departureDate: "",
    departureTime: "09:00",
    returnDate: "",
    returnTime: "18:00",
    dates: [] as Date[],
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    },
    proofDocument: null as string | null,
  })

  useEffect(() => {
    loadAbsences()

    loadAbsences()
    loadHolidays()

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

    // Carregar férias do projeto para bloquear datas
    if (user.projectId) {
      loadProjectVacations()
    }

    return () => {
      channel.unsubscribe()
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [user.id, user.projectId])

  const loadProjectVacations = async () => {
    if (!user.projectId) return
    const dates = await getProjectVacations(user.projectId)
    setUnavailableDates(dates)
  }

  const loadHolidays = async () => {
    const data = await getHolidays()
    setHolidays(data)
  }

  const loadAbsences = async () => {
    try {
      const userAbsences = await getAbsenceRecordsByUserId(user.id)
      if (Array.isArray(userAbsences)) {
        // Filtrar ausências com createdAt válido e ordenar por data (mais recentes primeiro)
        const validAbsences = userAbsences.filter(absence => {
          if (!absence.createdAt) return false
          try {
            const date = parseISO(absence.createdAt)
            return !isNaN(date.getTime())
          } catch (error) {
            console.error('Ausência com createdAt inválido:', absence.id, absence.createdAt)
            return false
          }
        })

        validAbsences.sort((a, b) => {
          const dateA = parseISO(a.createdAt)
          const dateB = parseISO(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })

        setAbsences(validAbsences)
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
      departureDate: "",
      departureTime: "09:00",
      returnDate: "",
      returnTime: "18:00",
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

    // Para Energia/Internet, apenas data de saída é obrigatória
    if (formData.reason === "personal") {
      if (!formData.departureDate) {
        setError("Selecione a data e hora de início da ausência")
        return
      }
      // Data de retorno é opcional para Energia/Internet
    } else {
      if (!formData.departureDate || !formData.returnDate) {
        setError("Selecione as datas de saída e volta")
        return
      }
    }

    // Validação de conflito de férias
    if (formData.reason === "vacation" && user.projectId) {
      const isOverlap = formData.dates.some(date =>
        unavailableDates.some(unavailable =>
          format(unavailable, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
      )

      if (isOverlap) {
        setError("O período selecionado conflita com férias de outro membro do projeto.")
        return
      }

      // Validação de feriados e emendas
      const hasHoliday = formData.dates.some(date =>
        holidays.some(h => {
          if (!h.date) return false
          // Ajustar data do feriado para evitar problemas de fuso
          const hDate = new Date(h.date + 'T12:00:00')
          return format(hDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        })
      )

      if (hasHoliday) {
        setError("Não é permitido selecionar férias em dias de feriado ou emenda.")
        return
      }
    }

    // Validação específica para Atestado
    if (formData.reason === "certificate") {
      const today = startOfDay(new Date())
      const departure = startOfDay(new Date(formData.departureDate))
      const returnDay = startOfDay(new Date(formData.returnDate))

      if (departure >= today || returnDay >= today) {
        setError("Atestado só pode ser registrado para datas passadas")
        return
      }

      if (!formData.proofDocument) {
        setError("É obrigatório anexar o atestado")
        return
      }
    }

    try {
      // Para Energia/Internet sem data de retorno, usar apenas a data de saída
      let formattedDates: string[]
      let endDate: string

      if (formData.reason === "personal" && !formData.returnDate) {
        // Apenas data de saída
        formattedDates = [format(new Date(formData.departureDate), "yyyy-MM-dd")]
        endDate = formData.departureDate
      } else {
        // Calcular todas as datas entre saída e volta
        const start = new Date(formData.departureDate)
        const end = new Date(formData.returnDate)
        const dates = eachDayOfInterval({ start, end })
        formattedDates = dates.map((date) => format(date, "yyyy-MM-dd"))
        endDate = formData.returnDate
      }

      // Determinar o status inicial
      let initialStatus: "pending" | "completed" | "approved"
      if (formData.reason === "vacation") {
        initialStatus = "pending" // Férias aguardam aprovação
      } else if (formData.reason === "personal" && !formData.returnDate) {
        initialStatus = "pending" // Energia/Internet sem retorno aguarda protocolo
      } else if (formData.proofDocument) {
        initialStatus = "completed" // Com comprovante
      } else {
        initialStatus = "pending" // Sem comprovante
      }

      // Criar novo registro de ausência
      const newAbsence = await createAbsenceRecord({
        userId: user.id,
        reason: formData.reason,
        customReason: formData.reason === "other" ? formData.customReason : undefined,
        dates: formattedDates,
        status: initialStatus,
        dateRange: {
          start: formData.departureDate,
          end: endDate,
        },
        departureTime: formData.reason !== "vacation" ? formData.departureTime : undefined,
        returnTime: (formData.reason !== "vacation" && formData.returnTime && formData.returnDate) ? formData.returnTime : undefined,
        proofDocument: formData.proofDocument || undefined,
      })

      // Atualizar o estado local imediatamente
      setAbsences(prevAbsences => [newAbsence, ...prevAbsences])

      toast({
        title: "Ausência registrada",
        description:
          formData.reason === "vacation"
            ? "Sua solicitação de férias foi registrada e está aguardando aprovação"
            : formData.reason === "certificate"
              ? "Seu atestado foi registrado com sucesso"
              : formData.reason === "personal" && !formData.returnDate
                ? "Ausência registrada. Envie o protocolo para registrar o horário de retorno automaticamente"
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
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas",
        variant: "destructive",
      })
      return
    }

    // Converter arquivo para base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      if (!selectedAbsence) return

      try {
        const now = new Date()
        const currentDate = format(now, "yyyy-MM-dd")
        const currentTime = format(now, "HH:mm")

        // Preparar dados de atualização
        const updateData: any = {
          proofDocument: event.target?.result as string,
          status: "completed",
        }

        // Para Energia/Internet sem data de retorno, registrar horário atual
        if (selectedAbsence.reason === "personal" && !selectedAbsence.returnTime) {
          updateData.returnTime = currentTime

          // Se a data de retorno não foi definida, usar a data atual
          if (!selectedAbsence.dateRange?.end || selectedAbsence.dateRange.end === selectedAbsence.dateRange.start) {
            updateData.dateRange = {
              start: selectedAbsence.dateRange.start,
              end: currentDate
            }

            // Atualizar datas se necessário
            const start = new Date(selectedAbsence.dateRange.start)
            const end = new Date(currentDate)
            const dates = eachDayOfInterval({ start, end })
            updateData.dates = dates.map((date) => format(date, "yyyy-MM-dd"))
          }
        }

        // Atualizar registro com o documento
        await updateAbsenceRecord(selectedAbsence.id, updateData)

        // Atualizar o estado local imediatamente
        setAbsences(prevAbsences =>
          prevAbsences.map(absence =>
            absence.id === selectedAbsence.id
              ? { ...absence, ...updateData }
              : absence
          )
        )

        toast({
          title: "Protocolo enviado",
          description: selectedAbsence.reason === "personal" && !selectedAbsence.returnTime
            ? `Protocolo enviado e horário de retorno registrado: ${currentTime}`
            : "Seu comprovante foi enviado com sucesso",
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

  const isDateInFuture = (dateString: string) => {
    if (!dateString) return false

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false

      date.setHours(0, 0, 0, 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return date >= today
    } catch (error) {
      console.error('Erro ao verificar data futura:', dateString, error)
      return false
    }
  }

  const getReasonLabel = (absence: any) => {
    if (absence.reason === "other") {
      return absence.customReason
    }

    const reason = ABSENCE_REASONS.find((r) => r.id === absence.reason)
    return reason ? reason.label : "Motivo não especificado"
  }

  const isAbsenceActive = (absence: any) => {
    if (!absence.expiresAt) return false

    try {
      const expiresAt = parseISO(absence.expiresAt)
      if (isNaN(expiresAt.getTime())) return false

      return isAfter(expiresAt, new Date())
    } catch (error) {
      console.error('Erro ao verificar ausência ativa:', absence.id, absence.expiresAt, error)
      return false
    }
  }

  const getStatusBadge = (absence: any) => {
    if (absence.status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
          <Check className="h-3 w-3" />
          Aprovado! <PartyPopper className="h-3 w-3 ml-1" />
        </Badge>
      )
    } else if (absence.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
          <FileText className="h-3 w-3" />
          {absence.reason === "personal" ? "Protocolo Enviado" : "Comprovante Enviado"}
        </Badge>
      )
    } else if (absence.reason === "vacation") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          Aguardando Aprovação
        </Badge>
      )
    } else if (absence.reason === "personal" && absence.status === "pending") {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-1 w-fit">
          <Upload className="h-3 w-3" />
          Aguardando Protocolo
        </Badge>
      )
    }

    return null
  }

  const formatDateRange = (absence: any) => {
    try {
      // Verificar se tem horários (não é férias)
      const hasTime = absence.departureTime && absence.returnTime &&
        absence.reason !== "vacation"

      if (absence.dateRange && absence.dateRange.start && absence.dateRange.end) {
        const [startYear, startMonth, startDay] = absence.dateRange.start.split('-').map(Number)
        const [endYear, endMonth, endDay] = absence.dateRange.end.split('-').map(Number)

        if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
          return "Data inválida"
        }

        const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0)
        const endDate = new Date(endYear, endMonth - 1, endDay, 12, 0, 0)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return "Data inválida"
        }

        const startFormatted = format(startDate, "dd/MM/yyyy")
        const endFormatted = format(endDate, "dd/MM/yyyy")

        if (hasTime) {
          return `De ${startFormatted} ${absence.departureTime} até ${endFormatted} ${absence.returnTime}`
        }

        return `De ${startFormatted} até ${endFormatted}`
      } else if (absence.dates && absence.dates.length > 1) {
        return `${absence.dates.length} dias`
      } else if (absence.dates && absence.dates.length === 1) {
        const [year, month, day] = absence.dates[0].split('-').map(Number)

        if (!year || !month || !day) {
          return "Data inválida"
        }

        const date = new Date(year, month - 1, day, 12, 0, 0)

        if (isNaN(date.getTime())) {
          return "Data inválida"
        }

        const dateFormatted = format(date, "dd/MM/yyyy")

        if (hasTime) {
          return `${dateFormatted} ${absence.departureTime} - ${absence.returnTime}`
        }

        return dateFormatted
      }

      return "Data não especificada"
    } catch (error) {
      console.error('Erro ao formatar intervalo de datas:', absence, error)
      return "Data inválida"
    }
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

      // Filtrar ausências baseado na seleção de mês
      let filteredAbsences = absences
      if (selectedMonthForReport !== "all") {
        const [year, month] = selectedMonthForReport.split("-")
        filteredAbsences = absences.filter(absence => {
          if (!absence.createdAt) return false
          try {
            const date = parseISO(absence.createdAt)
            return getYear(date) === parseInt(year) && getMonth(date) === parseInt(month)
          } catch (error) {
            return false
          }
        })
      }

      if (filteredAbsences.length === 0) {
        toast({
          title: "Nenhum registro encontrado",
          description: "Não há ausências para o mês selecionado",
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
      const reportTitle = selectedMonthForReport === "all"
        ? "Relatório de Ausências - Todos os Meses"
        : `Relatório de Ausências - ${format(new Date(parseInt(selectedMonthForReport.split("-")[0]), parseInt(selectedMonthForReport.split("-")[1]), 1), "MMMM yyyy", { locale: ptBR })}`
      doc.text(reportTitle, 105, 15, { align: "center" })

      // Adicionar informações do funcionário
      doc.setFontSize(12)
      doc.text(`Funcionário: ${user.firstName} ${user.lastName}`, 14, 25)
      doc.text(`Email: ${user.email}`, 14, 32)
      doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 14, 39)

      // Agrupar ausências por mês
      const groupedAbsences = filteredAbsences.reduce((acc, absence) => {
        // Validar se createdAt existe e é válido
        if (!absence.createdAt) {
          return acc
        }

        let date: Date
        try {
          date = parseISO(absence.createdAt)
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            return acc
          }
        } catch (error) {
          console.error('Erro ao parsear data:', absence.createdAt, error)
          return acc
        }

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
        const tableData = (monthAbsences as typeof absences).map((absence: typeof absences[0]) => {
          let createdAtFormatted = "Data inválida"
          if (absence.createdAt) {
            try {
              const date = parseISO(absence.createdAt)
              if (!isNaN(date.getTime())) {
                createdAtFormatted = format(date, "dd/MM/yyyy")
              }
            } catch (error) {
              console.error('Erro ao formatar data:', absence.createdAt, error)
            }
          }

          return [
            createdAtFormatted,
            getReasonLabel(absence),
            formatDateRange(absence),
            absence.status === "approved" ? "Aprovado" :
              absence.status === "completed" ? "Comprovante Enviado" :
                absence.reason === "vacation" ? "Aguardando Aprovação" : "Pendente"
          ]
        })

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
      const monthName = selectedMonthForReport === "all"
        ? "todos_meses"
        : format(new Date(parseInt(selectedMonthForReport.split("-")[0]), parseInt(selectedMonthForReport.split("-")[1]), 1), "yyyy-MM", { locale: ptBR })
      const fileName = `relatorio_ausencias_${monthName}_${format(new Date(), "yyyy-MM-dd")}.pdf`
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

  // Gerar lista de meses disponíveis baseado nas ausências
  const getAvailableMonths = () => {
    const months = new Set<string>()
    absences.forEach(absence => {
      if (absence.createdAt) {
        try {
          const date = parseISO(absence.createdAt)
          if (!isNaN(date.getTime())) {
            const monthKey = `${getYear(date)}-${getMonth(date)}`
            months.add(monthKey)
          }
        } catch (error) {
          // Ignorar datas inválidas
        }
      }
    })

    return Array.from(months).sort().map(monthKey => {
      const [year, month] = monthKey.split("-")
      const date = new Date(parseInt(year), parseInt(month), 1)
      return {
        value: monthKey,
        label: format(date, "MMMM yyyy", { locale: ptBR })
      }
    })
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
          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex items-center gap-2",
                  isMobile && "w-full"
                )}
                disabled={absences.length === 0}
              >
                <FileDown className="h-4 w-4" />
                Gerar Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtrar Relatório de Ausências
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="month-filter">Selecionar Mês</Label>
                  <Select value={selectedMonthForReport} onValueChange={setSelectedMonthForReport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Meses</SelectItem>
                      {getAvailableMonths().map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
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
            <Card key={absence.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[#EE4D2D] text-base sm:text-lg break-words">{getReasonLabel(absence)}</h4>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {formatDateRange(absence)}
                  </div>

                  <div className="mt-2 flex flex-col gap-2">
                    {getStatusBadge(absence)}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end gap-3 sm:gap-2 mt-2 sm:mt-0">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold">
                    <CalendarIcon className="h-3 w-3" /> Registrado em: {formatDate(absence.createdAt)}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {absence.status === "completed" && absence.proofDocument && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs sm:text-sm"
                          onClick={() => handleViewProof(absence)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Visualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs sm:text-sm"
                          onClick={() => handleDownloadProof(absence.proofDocument)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Baixar
                        </Button>
                      </>
                    )}
                    {absence.status === "pending" && absence.reason !== "vacation" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs sm:text-sm"
                        onClick={() => handleUploadProof(absence.id)}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {absence.reason === "personal" ? "Enviar Protocolo" : "Enviar Comprovante"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para adicionar ausência */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl w-full">
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

            {/* Seleção de Data: Calendar para Férias, Inputs para outros */}
            {formData.reason === "vacation" ? (
              <div className="space-y-2">
                <Label>Selecione o período de férias</Label>
                <div className="border rounded-md p-4 flex justify-center bg-white">
                  <Calendar
                    mode="range"
                    locale={ptBR}
                    formatters={{
                      formatWeekdayName: (date) => format(date, "EEEEE", { locale: ptBR }).toUpperCase()
                    }}
                    selected={{
                      from: formData.dateRange.start || undefined,
                      to: formData.dateRange.end || undefined
                    }}
                    onSelect={(range) => {
                      // Se o usuário clicar em uma data desabilitada, o onSelect geralmente não é chamado,
                      // mas mantemos a validação defensiva aqui caso a UI permita.
                      const start = range?.from
                      if (start) {
                        const dayOfWeek = getDay(start)
                        if ([3, 4, 5].includes(dayOfWeek)) {
                          // Feedback redundante pois a data estará desabilitada visualmente
                          return
                        }

                        // Validação redundante de feriado
                        const isTooClose = holidays.some(h => {
                          if (!h.date) return false
                          const hDate = parseISO(h.date + 'T12:00:00') // Forçar meio-dia
                          const diff = differenceInDays(hDate, start)
                          return diff > 0 && diff < 4
                        })
                        if (isTooClose) return
                      }

                      if (range) {
                        const start = range.from || null
                        const end = range.to || null

                        let dates: Date[] = []
                        if (start && end) {
                          try {
                            dates = eachDayOfInterval({ start, end })
                          } catch (e) {
                            dates = [start]
                          }
                        } else if (start) {
                          dates = [start]
                        }

                        setFormData({
                          ...formData,
                          dateRange: { start, end },
                          dates: dates,
                          departureDate: start ? format(start, 'yyyy-MM-dd') : '',
                          returnDate: end ? format(end, 'yyyy-MM-dd') : '',
                          departureTime: "00:00",
                          returnTime: "23:59"
                        })
                      } else {
                        setFormData({
                          ...formData,
                          dateRange: { start: null, end: null },
                          dates: [],
                          departureDate: '',
                          returnDate: ''
                        })
                      }
                    }}
                    disabled={[
                      { before: new Date() },
                      ...unavailableDates,
                      { dayOfWeek: [3, 4, 5] }, // Quarta, Quinta, Sexta
                      (date) => {
                        return holidays.some(h => {
                          if (!h.date) return false
                          // Comparar com segurança de fuso horário
                          const hDate = parseISO(h.date + 'T12:00:00')
                          const diff = differenceInDays(hDate, date)

                          // Bloquear o próprio feriado (diff === 0)
                          if (diff === 0) return true

                          // Bloquear se estiver a menos de 4 dias ANTES do feriado (exclusivo)
                          // Se diff 1, 2, 3 -> Bloqueia. Se diff 4 -> OK.
                          return diff > 0 && diff < 4
                        })
                      }
                    ]}
                    modifiers={{
                      unavailable: unavailableDates,
                      holiday: holidays.filter(h => h.type !== 'bridge').map(h => parseISO(h.date ? h.date + 'T12:00:00' : '')),
                      bridge: holidays.filter(h => h.type === 'bridge').map(h => parseISO(h.date ? h.date + 'T12:00:00' : ''))
                    }}
                    modifiersStyles={{
                      unavailable: {
                        color: '#EF4444',
                        fontWeight: 'bold',
                        textDecoration: 'line-through',
                        opacity: 0.5
                      },
                      selected: {
                        backgroundColor: '#EE4D2D'
                      },
                      holiday: {
                        backgroundColor: '#FF00FF', // Magenta
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                      },
                      bridge: {
                        backgroundColor: '#FF9900', // Orange
                        color: '#FFFFFF',
                        fontWeight: 'bold'
                      },
                      outside: {
                        color: '#9CA3AF', // gray-400
                        opacity: 0.5
                      }
                    }}
                    className="rounded-md border shadow-sm p-4 w-fit mx-auto"
                    classNames={{
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "border-collapse space-y-1",
                      head_row: "flex justify-between w-full",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2 justify-between",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_outside: "text-gray-400 opacity-50"
                    }}
                  />
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-[#EE4D2D] rounded-full"></div>
                    <span>Selecionado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div>
                    <span>Indisponível (Outro membro do projeto)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    <span>Disponível</span>
                  </div>
                </div>
                {formData.dateRange.start && formData.dateRange.end && (
                  <p className="text-sm font-medium mt-2">
                    Período: {format(formData.dateRange.start, 'dd/MM/yyyy')} até {format(formData.dateRange.end, 'dd/MM/yyyy')}
                    ({formData.dates.length} dias)
                  </p>
                )}
              </div>
            ) : (
              // Inputs normais para outros motivos
              <>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Data e Hora de Saída</Label>
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <Label htmlFor="departureDate" className="text-sm">Data Saída</Label>
                      <Input
                        id="departureDate"
                        type="date"
                        value={formData.departureDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, departureDate: e.target.value })}
                        max={formData.reason === "certificate" ? format(new Date(), "yyyy-MM-dd") : undefined}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="departureTime" className="text-sm">Hora</Label>
                      <Input
                        id="departureTime"
                        type="time"
                        value={formData.departureTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, departureTime: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Data e Hora de Volta
                    {formData.reason === "personal" && (
                      <span className="text-sm font-normal text-gray-500 ml-2">(Opcional)</span>
                    )}
                  </Label>
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <Label htmlFor="returnDate" className="text-sm">Data Volta</Label>
                      <Input
                        id="returnDate"
                        type="date"
                        value={formData.returnDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, returnDate: e.target.value })}
                        min={formData.departureDate}
                        max={formData.reason === "certificate" ? format(new Date(), "yyyy-MM-dd") : undefined}
                        required={formData.reason !== "personal"}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="returnTime" className="text-sm">Hora</Label>
                      <Input
                        id="returnTime"
                        type="time"
                        value={formData.returnTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, returnTime: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notas adicionais */}

            {(formData.reason === "certificate" || (formData.departureDate && startOfDay(new Date(formData.departureDate)) < startOfDay(new Date()))) && (
              <div className="space-y-2">
                <Alert className={formData.reason === "certificate" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}>
                  <AlertCircle className={formData.reason === "certificate" ? "h-4 w-4 text-red-500" : "h-4 w-4 text-yellow-500"} />
                  <AlertDescription className={formData.reason === "certificate" ? "text-red-700" : "text-yellow-700"}>
                    {formData.reason === "certificate"
                      ? "É obrigatório anexar o atestado médico."
                      : "Você selecionou datas passadas. É necessário anexar um comprovante para registrar a ausência."}
                  </AlertDescription>
                </Alert>

                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um comprovante</p>
                  <p className="text-xs text-gray-500 mt-1">Ou arraste e solte aqui</p>
                  <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, WEBP</p>
                  <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
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
                      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: "Tipo de arquivo não suportado",
                          description: "Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas",
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
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
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
              <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, WEBP</p>
              <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
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
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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

