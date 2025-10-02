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
import { format, isAfter, isBefore, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getMonth, getYear, startOfDay } from "date-fns"
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
    if (!dateString) return "Data inválida"
    
    try {
      // Criar uma nova data considerando que a string está em UTC
      const [year, month, day] = dateString.split('-').map(Number)
      if (!year || !month || !day) return "Data inválida"
      
      const date = new Date(year, month - 1, day)
      if (isNaN(date.getTime())) return "Data inválida"
      
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return "Data inválida"
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
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Aprovado! <PartyPopper className="h-3 w-3 ml-1" />
        </Badge>
      )
    } else if (absence.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {absence.reason === "personal" ? "Protocolo Enviado" : "Comprovante Enviado"}
        </Badge>
      )
    } else if (absence.reason === "vacation") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Aguardando Aprovação
        </Badge>
      )
    } else if (absence.reason === "personal" && absence.status === "pending") {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-1">
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
        
        const startDate = new Date(startYear, startMonth - 1, startDay)
        const endDate = new Date(endYear, endMonth - 1, endDay)
        
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
        
        const date = new Date(year, month - 1, day)
        
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

      // Agrupar ausências por mês
      const groupedAbsences = absences.reduce((acc, absence) => {
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

                    {Array.isArray(absence.dates) && absence.dates.length > 0 && absence.dates.length <= 5 && (
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
                      Registrado em: {(() => {
                        if (!absence.createdAt) return "Data inválida"
                        try {
                          const date = parseISO(absence.createdAt)
                          return !isNaN(date.getTime()) ? format(date, "dd/MM/yyyy") : "Data inválida"
                        } catch (error) {
                          console.error('Erro ao formatar data:', absence.createdAt, error)
                          return "Data inválida"
                        }
                      })()}
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
                          {absence.reason === "personal" ? "Enviar Protocolo" : "Enviar Comprovante"}
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

            {/* Data e Hora de Saída */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Data e Hora de Saída</Label>
              <div className={cn("grid gap-3", formData.reason === "vacation" ? "grid-cols-1" : "grid-cols-2")}>
                <div>
                  <Label htmlFor="departureDate" className="text-sm">Data Saída</Label>
                  <Input
                    id="departureDate"
                    type="date"
                    value={formData.departureDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, departureDate: e.target.value})}
                    max={formData.reason === "certificate" ? format(new Date(), "yyyy-MM-dd") : undefined}
                    required
                    className="mt-1"
                  />
                </div>
                {formData.reason !== "vacation" && (
                  <div>
                    <Label htmlFor="departureTime" className="text-sm">Hora</Label>
                    <Input
                      id="departureTime"
                      type="time"
                      value={formData.departureTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, departureTime: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Data e Hora de Volta */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Data e Hora de Volta
                {formData.reason === "personal" && (
                  <span className="text-sm font-normal text-gray-500 ml-2">(Opcional - será registrada ao enviar protocolo)</span>
                )}
              </Label>
              <div className={cn("grid gap-3", formData.reason === "vacation" ? "grid-cols-1" : "grid-cols-2")}>
                <div>
                  <Label htmlFor="returnDate" className="text-sm">Data Volta</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={formData.returnDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, returnDate: e.target.value})}
                    min={formData.departureDate}
                    max={formData.reason === "certificate" ? format(new Date(), "yyyy-MM-dd") : undefined}
                    required={formData.reason !== "personal"}
                    className="mt-1"
                  />
                </div>
                {formData.reason !== "vacation" && (
                  <div>
                    <Label htmlFor="returnTime" className="text-sm">Hora</Label>
                    <Input
                      id="returnTime"
                      type="time"
                      value={formData.returnTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, returnTime: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
              {formData.reason === "personal" && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Se não informar a data/hora de volta, será registrada automaticamente quando você enviar o protocolo
                </p>
              )}
            </div>

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

