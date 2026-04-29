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
import { format, isAfter, isBefore, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getMonth, getYear, startOfDay, getDay, differenceInDays, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Upload, AlertCircle, FileText, X, Check, PartyPopper, Eye, Download, FileDown, Filter, Pencil, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getAbsenceRecordsByUserId, createAbsenceRecord, updateAbsenceRecord, deleteAbsenceRecord, getHolidays, type Holiday } from "@/lib/db"
import { supabase, uploadCertificate } from "@/lib/supabase"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import autoTable from 'jspdf-autotable'

const ABSENCE_REASONS = [
  { id: "medical", label: "Consulta médica // Exame médico (marcado antecipadamente)" },
  { id: "personal", label: "Energia/Internet" },
  { id: "certificate", label: "Atestado // Emergencial" },
  { id: "other", label: "Outro" },
]

interface AbsenceManagementProps {
  user: any
}

export function AbsenceManagement({ user }: AbsenceManagementProps) {
  const [absences, setAbsences] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [absenceToDelete, setAbsenceToDelete] = useState<any>(null)
  const [cancellationReason, setCancellationReason] = useState("")
  const [tempReturnTime, setTempReturnTime] = useState("18:00")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isCorrection, setIsCorrection] = useState(false)
  const [oldProofUrl, setOldProofUrl] = useState<string | null>(null)
  const [selectedMonthForReport, setSelectedMonthForReport] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isCertificateMultiDay, setIsCertificateMultiDay] = useState<boolean | null>(null)
  const [certificateDays, setCertificateDays] = useState<number>(1)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [absenceToEdit, setAbsenceToEdit] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    editReason: ""
  })

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



    return () => {
      channel.unsubscribe()
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [user.id, user.projectId])



  const loadHolidays = async () => {
    const data = await getHolidays()
    setHolidays(data)
  }

  const syncAbsenceToSheets = async (action: 'create' | 'update' | 'update_proof' | 'update_status' | 'delete', absence: any) => {
    try {
      console.log(`📡 [SHEETS] Sincronizando ausência (${action}):`, absence.id)
      const res = await fetch('/api/sheets/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          type: 'absence',
          data: absence,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            team: user.team,
            discord_id: user.discordId || null
          }
        })
      })
      const result = await res.json()
      if (res.ok) {
        console.log('✅ [SHEETS] Sincronização concluída com sucesso')
        toast({
          title: "Planilha atualizada",
          description: "Os dados foram enviados para o Google Sheets com sucesso.",
        })
      } else {
        console.error('❌ [SHEETS] Erro na sincronização:', result.error)
        toast({
          variant: "destructive",
          title: "Erro na planilha",
          description: "Não foi possível sincronizar com o Google Sheets: " + (result.error || "Erro desconhecido"),
        })
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar com Google Sheets:', error)
      alert("Erro crítico na sincronização: " + error.message)
    }
  }

  const loadAbsences = async () => {
    try {
      const userAbsences = await getAbsenceRecordsByUserId(user.id)
      if (Array.isArray(userAbsences)) {
        // Filtrar ausências: 
        // 1. Deve ter createdAt válido
        // 2. NÃO deve ser do tipo 'vacation' (pois estas ficam na aba de Férias)
        const validAbsences = userAbsences.filter(absence => {
          if (!absence.createdAt) return false
          if (absence.reason === 'vacation') return false // Esconder férias desta aba
          
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

    // Para Energia/Internet e Consultas, apenas data de saída é obrigatória no registro
    if (formData.reason === "personal" || formData.reason === "medical") {
      if (!formData.departureDate) {
        setError("Selecione a data e hora de saída")
        return
      }
      // Data de retorno é opcional (ou preenchida depois) para estes casos
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
      // Se houver um documento base64 no formData, fazemos o upload antes de salvar o registro
      let finalProofUrl = formData.proofDocument;
      if (formData.proofDocument && formData.proofDocument.startsWith('data:')) {
        // Converter base64 para Blob para o upload
        const response = await fetch(formData.proofDocument);
        const blob = await response.blob();
        const publicUrl = await uploadCertificate(user.id, blob, "comprovante_inicial.png");
        
        if (!publicUrl) {
          throw new Error("Falha ao gerar link público para o comprovante");
        }
        finalProofUrl = publicUrl;
      }

      // Calculo de datas final
      let formattedDates: string[]
      let endDate: string

      if (formData.reason === "certificate" && isCertificateMultiDay && certificateDays > 1) {
        // Atestado múltiplo informado no registro
        const [startY, startM, startD] = formData.departureDate.split('-').map(Number)
        const start = new Date(startY, startM - 1, startD, 12, 0, 0)
        const newEnd = addDays(start, certificateDays - 1)
        
        endDate = format(newEnd, "yyyy-MM-dd")
        const dates = eachDayOfInterval({ start, end: newEnd })
        formattedDates = dates.map((date) => format(date, "yyyy-MM-dd"))
      } else if ((formData.reason === "personal" || formData.reason === "medical") && !formData.returnDate) {
        // Apenas data de saída - evitar fuso horário usando string ou meio-dia local
        formattedDates = [formData.departureDate]
        endDate = formData.departureDate
      } else {
        // Calcular todas as datas entre saída e volta
        const [startY, startM, startD] = formData.departureDate.split('-').map(Number)
        const [endY, endM, endD] = formData.returnDate.split('-').map(Number)
        
        const start = new Date(startY, startM - 1, startD, 12, 0, 0)
        const end = new Date(endY, endM - 1, endD, 12, 0, 0)
        
        const dates = eachDayOfInterval({ start, end })
        formattedDates = dates.map((date) => format(date, "yyyy-MM-dd"))
        endDate = formData.returnDate
      }

      // Determinar o status inicial
      let initialStatus: "pending" | "completed" | "approved"
      if ((formData.reason === "personal" || formData.reason === "medical") && !formData.returnDate) {
        initialStatus = "pending" // Aguarda protocolo ou retorno da consulta
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
        departureTime: formData.departureTime || undefined,
        returnTime: (formData.reason !== "medical" && formData.returnTime && formData.returnDate) ? formData.returnTime : undefined,
        proofDocument: finalProofUrl || undefined,
      })

      // Atualizar o estado local imediatamente
      setAbsences(prevAbsences => [newAbsence, ...prevAbsences])

      toast({
        title: "Ausência registrada",
        description:
          formData.reason === "certificate"
            ? "Seu atestado foi registrado com sucesso"
            : formData.reason === "personal" && !formData.returnDate
              ? "Ausência registrada. Envie o protocolo para registrar o horário de retorno automaticamente"
              : "Sua ausência foi registrada com sucesso",
      })

      // Fechar diálogo
      setIsAddDialogOpen(false)

      // Sincronizar com Google Sheets (segundo plano)
      syncAbsenceToSheets('create', newAbsence)

      // Notificar via Discord
      console.log('📡 [NOTIFY] Enviando notificação de ausência...')
      fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          team: user.team,
          reason: formData.reason,
          dates: formattedDates,
          customReason: formData.reason === "other" ? formData.customReason : undefined,
          startTime: formData.departureTime,
          endTime: formData.returnTime,
          hasProof: !!finalProofUrl,
          proofUrl: finalProofUrl || undefined,
          certificateDays: (formData.reason === "certificate" && isCertificateMultiDay) ? certificateDays : undefined
        })
      })
      .then(async res => {
        const data = await res.json()
        console.log('✅ [NOTIFY] Resposta da API:', data)
      })
      .catch(err => {
        console.error('❌ [NOTIFY] Erro ao enviar notificação:', err)
      })
    } catch (error: any) {
      console.error("ERRO NO REGISTRO:", error)
      alert("ERRO AO SALVAR: " + error.message)
      setError(error.message || "Ocorreu um erro ao registrar a ausência")
    }
  }

  const handleUploadProof = (absenceId: number, correction: boolean = false) => {
    const absence = absences.find((a) => a.id === absenceId)
    setSelectedAbsence(absence)
    setIsCorrection(correction)
    setOldProofUrl(correction ? absence?.proofDocument || null : null)
    setPreviewImage(null)
    setPendingFile(null)
    setIsCertificateMultiDay(null)
    setCertificateDays(1)
    
    if (absence?.reason === "medical") {
      setTempReturnTime(absence.returnTime || "18:00")
    }
    setIsUploadDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB",
        variant: "destructive",
      })
      return
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas",
        variant: "destructive",
      })
      return
    }

    setPendingFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const confirmUpload = async () => {
    if (!pendingFile || !selectedAbsence) return

    setIsLoading(true)
    try {
      const publicUrl = await uploadCertificate(user.id, pendingFile, pendingFile.name)
      
      if (!publicUrl) {
        throw new Error("Falha ao gerar link público para a imagem")
      }

      const now = new Date()
      const currentDate = format(now, "yyyy-MM-dd")
      const currentTime = format(now, "HH:mm")

      const updateData: any = {
        proofDocument: publicUrl,
        status: "completed",
      }

      if (selectedAbsence.reason === "medical" && tempReturnTime) {
        updateData.returnTime = tempReturnTime
      }

      if (selectedAbsence.reason === "personal" && !selectedAbsence.returnTime) {
        updateData.returnTime = currentTime
      }

      if (selectedAbsence.reason === "certificate" && isCertificateMultiDay && certificateDays > 1) {
        const start = parseISO(selectedAbsence.dateRange.start)
        const newEnd = addDays(start, certificateDays - 1)
        const newEndDateStr = format(newEnd, "yyyy-MM-dd")
        
        const dates = eachDayOfInterval({ start, end: newEnd })
        updateData.dateRange = {
          start: selectedAbsence.dateRange.start,
          end: newEndDateStr
        }
        updateData.dates = dates.map((date) => format(date, "yyyy-MM-dd"))
      }

      await updateAbsenceRecord(selectedAbsence.id, updateData)

      setAbsences(prevAbsences =>
        prevAbsences.map(absence =>
          absence.id === selectedAbsence.id ? { ...absence, ...updateData } : absence
        )
      )

      toast({
        title: isCorrection ? "Comprovante corrigido" : "Protocolo enviado",
        description: isCorrection ? "A correção foi informada ao SeaTalk." : "Seu comprovante foi enviado com sucesso.",
      })

      setIsUploadDialogOpen(false)
      setPreviewImage(null)
      setPendingFile(null)

      syncAbsenceToSheets('update_proof', { 
        id: selectedAbsence.id, 
        ...updateData
      })

      fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: selectedAbsence.reason,
          dates: selectedAbsence.dates,
          isProofUpdate: !isCorrection,
          isCorrection: isCorrection,
          proofUrl: publicUrl,
          oldProofUrl: oldProofUrl,
          newProofUrl: publicUrl,
          returnTime: updateData.returnTime,
          certificateDays: (selectedAbsence.reason === "certificate" && isCertificateMultiDay) ? certificateDays : undefined
        })
      }).catch(err => console.error('Erro ao enviar notificação:', err))

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao enviar o comprovante",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (absence: any) => {
    setAbsenceToDelete(absence)
    setCancellationReason("")
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteAbsence = async () => {
    if (!absenceToDelete) return
    if (!cancellationReason.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Por favor, informe o motivo da exclusão.",
        variant: "destructive",
      })
      return
    }

    try {
      // 1. Notificar ANTES de excluir para garantir que os dados ainda existam para o webhook
      const startDateStr = formatDateRange(absenceToDelete)
      
      await fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: absenceToDelete.reason,
          customReason: absenceToDelete.reason === "other" ? absenceToDelete.customReason : undefined,
          dates: absenceToDelete.dates,
          isCancellation: true,
          cancelReason: cancellationReason,
          userName: `${user.firstName} ${user.lastName}`
        })
      })

      // 2. Excluir do banco
      await deleteAbsenceRecord(absenceToDelete.id)

      // 3. Sincronizar com Planilha
      syncAbsenceToSheets('delete', { id: absenceToDelete.id })

      // 4. Atualizar estado local
      setAbsences(prev => prev.filter(a => a.id !== absenceToDelete.id))

      toast({
        title: "Ausência excluída",
        description: "O registro foi excluído e a administração foi notificada.",
      })

      setIsDeleteDialogOpen(false)
      setAbsenceToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir a ausência",
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (absence: any) => {
    setAbsenceToEdit(absence)
    let depDate = ""
    let retDate = ""
    if (absence.dateRange && absence.dateRange.start) {
      depDate = absence.dateRange.start
      retDate = absence.dateRange.end || absence.dateRange.start
    } else if (absence.dates && absence.dates.length > 0) {
      depDate = absence.dates[0]
      retDate = absence.dates[absence.dates.length - 1]
    }
    setEditFormData({
      departureDate: depDate,
      departureTime: absence.departureTime || "",
      returnDate: retDate,
      returnTime: absence.returnTime || "",
      editReason: ""
    })
    setIsEditDialogOpen(true)
  }

  const confirmEditAbsence = async () => {
    if (!absenceToEdit) return
    if (!editFormData.editReason.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Por favor, informe o motivo da alteração.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      const [startY, startM, startD] = editFormData.departureDate.split('-').map(Number)
      const start = new Date(startY, startM - 1, startD, 12, 0, 0)
      
      let endDate = editFormData.returnDate || editFormData.departureDate
      let formattedDates: string[] = []
      
      if (absenceToEdit.reason === "medical" || absenceToEdit.reason === "personal") {
         endDate = editFormData.departureDate
         formattedDates = [editFormData.departureDate]
      } else {
         const [endY, endM, endD] = endDate.split('-').map(Number)
         const end = new Date(endY, endM - 1, endD, 12, 0, 0)
         const dates = eachDayOfInterval({ start, end })
         formattedDates = dates.map((date) => format(date, "yyyy-MM-dd"))
      }

      const updateData = {
        dateRange: {
          start: editFormData.departureDate,
          end: endDate,
        },
        dates: formattedDates,
        departureTime: editFormData.departureTime || undefined,
        returnTime: (absenceToEdit.reason !== "medical" && editFormData.returnTime && editFormData.returnDate) ? editFormData.returnTime : undefined,
      }

      await updateAbsenceRecord(absenceToEdit.id, updateData)

      syncAbsenceToSheets('update', { id: absenceToEdit.id, ...updateData })
      
      await fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: absenceToEdit.reason,
          customReason: absenceToEdit.reason === "other" ? absenceToEdit.customReason : undefined,
          dates: formattedDates,
          isEdit: true,
          editReason: editFormData.editReason,
          startTime: editFormData.departureTime,
          endTime: editFormData.returnTime,
          userName: `${user.firstName} ${user.lastName}`
        })
      })

      setAbsences(prev => prev.map(a => 
        a.id === absenceToEdit.id ? { ...a, ...updateData } : a
      ))

      toast({
        title: "Ausência atualizada",
        description: "O horário foi alterado e a administração notificada.",
      })

      setIsEditDialogOpen(false)
      setAbsenceToEdit(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao atualizar a ausência",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

        if (startFormatted === endFormatted) {
          if (absence.departureTime && absence.returnTime) {
             return `${startFormatted} das ${absence.departureTime} às ${absence.returnTime}`
          } else if (absence.departureTime) {
             return `${startFormatted} a partir das ${absence.departureTime}`
          }
          return startFormatted
        }

        const startStr = absence.departureTime ? `${startFormatted} às ${absence.departureTime}` : startFormatted
        const endStr = absence.returnTime ? `${endFormatted} às ${absence.returnTime}` : endFormatted
        return `De ${startStr} até ${endStr}`
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

        if (absence.departureTime && absence.returnTime) {
          return `${dateFormatted} das ${absence.departureTime} às ${absence.returnTime}`
        } else if (absence.departureTime) {
          return `${dateFormatted} a partir das ${absence.departureTime}`
        }

        return dateFormatted
      }

      return "Data não especificada"
    } catch (error) {
      console.error('Erro ao formatar intervalo de datas:', absence, error)
      return "Data inválida"
    }
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
                "Pendente"
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
            <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto pr-4">
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
                          onClick={() => window.open(absence.proofDocument, '_blank')}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Ver imagem
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-[#EE4D2D]"
                          onClick={() => handleUploadProof(absence.id, true)}
                          title="Alterar Comprovante"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {absence.status === "pending" && (
                      <div className="flex flex-col items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs sm:text-sm"
                          disabled={isDateInFuture(absence.dateRange?.start)}
                          onClick={() => handleUploadProof(absence.id)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {absence.reason === "personal" ? "Enviar Protocolo" : "Enviar Comprovante"}
                        </Button>
                        {isDateInFuture(absence.dateRange?.start) && (
                          <span className="text-[10px] text-orange-500 font-medium mt-1">
                          Disponível apenas no dia da ausência
                        </span>
                      )}
                    </div>
                  )}
                  
                  {(absence.reason === "medical" || absence.reason === "personal") && isDateInFuture(absence.dateRange?.start) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleEditClick(absence)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Alterar
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(absence)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        </div>
      )}

      {/* Dialog para adicionar ausência */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto pr-4">
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
            {/* Seleção de Data e Hora */}
            <div className="space-y-4">
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

                {formData.reason !== "medical" && (
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
                )}
            </div>

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
          <div className="mt-4 p-2 border rounded-md bg-gray-50">
            <p className="text-sm font-medium mb-2">Preview do Comprovante:</p>
            <img src={formData.proofDocument} alt="Preview" className="max-h-40 mx-auto rounded-md shadow-sm" />
            <div className="flex items-center gap-2 mt-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Comprovante anexado</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setFormData({ ...formData, proofDocument: null });
                  setIsCertificateMultiDay(null);
                  setCertificateDays(1);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {formData.reason === "certificate" && formData.proofDocument && (
          <div className="mt-4 space-y-4 p-4 bg-orange-50 rounded-md border border-orange-100 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-orange-800">Seu atestado é de dias?</Label>
              <div className="flex gap-2">
                <Button 
                  variant={isCertificateMultiDay === false ? "default" : "outline"} 
                  size="sm"
                  onClick={() => { setIsCertificateMultiDay(false); setCertificateDays(1); }}
                  className={cn(isCertificateMultiDay === false ? "bg-orange-600" : "")}
                >
                  Não
                </Button>
                <Button 
                  variant={isCertificateMultiDay === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsCertificateMultiDay(true)}
                  className={cn(isCertificateMultiDay === true ? "bg-orange-600" : "")}
                >
                  Sim
                </Button>
              </div>
            </div>

            {isCertificateMultiDay && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label className="text-sm font-semibold text-orange-800">De quantos dias?</Label>
                <Select 
                  value={certificateDays.toString()} 
                  onValueChange={(val) => setCertificateDays(parseInt(val))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dia de hoje</SelectItem>
                    {Array.from({ length: 30 }, (_, i) => i + 2).map((day) => (
                      <SelectItem key={day} value={day.toString()}>{day} dias</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-orange-600">O sistema estenderá sua ausência automaticamente com base nesta seleção.</p>
              </div>
            )}
          </div>
        )}
              </div>
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
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle>Enviar Comprovante</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              Envie um comprovante para a ausência registrada em {selectedAbsence && formatDateRange(selectedAbsence)}
            </p>

            {selectedAbsence?.reason === "medical" && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                <Label htmlFor="tempReturnTime" className="text-[#EE4D2D] font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horário de Retorno (Obrigatório conforme comprovante)
                </Label>
                <Input
                  id="tempReturnTime"
                  type="time"
                  value={tempReturnTime}
                  onChange={(e) => setTempReturnTime(e.target.value)}
                  className="bg-white"
                  required
                />
                <p className="text-[10px] text-blue-600 opacity-80 mt-1">Este horário será registrado na planilha como sua volta oficial conforme o documento anexado.</p>
              </div>
            )}

            {selectedAbsence?.reason === "certificate" && (
              <div className="space-y-4 p-4 bg-orange-50 rounded-md border border-orange-100">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-orange-800">Seu atestado é de dias?</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={isCertificateMultiDay === false ? "default" : "outline"} 
                      size="sm"
                      onClick={() => { setIsCertificateMultiDay(false); setCertificateDays(1); }}
                      className={cn(isCertificateMultiDay === false ? "bg-orange-600" : "")}
                    >
                      Não
                    </Button>
                    <Button 
                      variant={isCertificateMultiDay === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsCertificateMultiDay(true)}
                      className={cn(isCertificateMultiDay === true ? "bg-orange-600" : "")}
                    >
                      Sim
                    </Button>
                  </div>
                </div>

                {isCertificateMultiDay && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-sm font-semibold text-orange-800">De quantos dias?</Label>
                    <Select 
                      value={certificateDays.toString()} 
                      onValueChange={(val) => setCertificateDays(parseInt(val))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Dia de hoje</SelectItem>
                        {Array.from({ length: 30 }, (_, i) => i + 2).map((day) => (
                          <SelectItem key={day} value={day.toString()}>{day} dias</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-orange-600">O sistema estenderá sua ausência automaticamente com base nesta seleção.</p>
                  </div>
                )}
              </div>
            )}

            <div
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors",
                previewImage ? "border-green-300 bg-green-50" : "border-gray-300 cursor-pointer hover:bg-gray-50"
              )}
              onClick={() => !previewImage && fileInputRef.current?.click()}
            >
              {previewImage ? (
                <div className="space-y-4 w-full">
                  <p className="text-xs font-medium text-green-700 text-center">Preview do Comprovante Selecionado:</p>
                  <img src={previewImage} alt="Preview" className="max-h-60 mx-auto rounded-md shadow-md border-2 border-white" />
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setPendingFile(null); }}>
                      <X className="h-4 w-4 mr-1" /> Remover e Trocar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
                  <p className="text-xs text-gray-500 mt-1">Ou arraste e solte aqui</p>
                  <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, WEBP</p>
                  <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>
                </>
              )}

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
              {!previewImage ? (
                <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              ) : (
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={confirmUpload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isCorrection ? "Confirmar Alteração" : "Confirmar e Enviar"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar data/horário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Alterar Data / Horário
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                Você está remarcando a ausência de <strong>{absenceToEdit ? (ABSENCE_REASONS.find(r => r.id === absenceToEdit.reason)?.label || absenceToEdit.reason) : ""}</strong>. Informe o motivo da alteração.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-departure-date" className="text-sm font-medium">Data de Saída</Label>
                <Input
                  id="edit-departure-date"
                  type="date"
                  value={editFormData.departureDate}
                  onChange={(e) => setEditFormData({ ...editFormData, departureDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-departure-time" className="text-sm font-medium">Horário de Saída</Label>
                <Input
                  id="edit-departure-time"
                  type="time"
                  value={editFormData.departureTime}
                  onChange={(e) => setEditFormData({ ...editFormData, departureTime: e.target.value })}
                  className="mt-1"
                />
              </div>

              {absenceToEdit && absenceToEdit.reason !== "medical" && absenceToEdit.reason !== "personal" && (
                <>
                  <div>
                    <Label htmlFor="edit-return-date" className="text-sm font-medium">Data de Retorno</Label>
                    <Input
                      id="edit-return-date"
                      type="date"
                      value={editFormData.returnDate}
                      min={editFormData.departureDate}
                      onChange={(e) => setEditFormData({ ...editFormData, returnDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-return-time" className="text-sm font-medium">Horário de Retorno</Label>
                    <Input
                      id="edit-return-time"
                      type="time"
                      value={editFormData.returnTime}
                      onChange={(e) => setEditFormData({ ...editFormData, returnTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {absenceToEdit && (absenceToEdit.reason === "medical" || absenceToEdit.reason === "personal") && (
                <div>
                  <Label htmlFor="edit-return-time-single" className="text-sm font-medium">Horário de Retorno <span className="text-gray-400 font-normal">(Opcional)</span></Label>
                  <Input
                    id="edit-return-time-single"
                    type="time"
                    value={editFormData.returnTime}
                    onChange={(e) => setEditFormData({ ...editFormData, returnTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="edit-reason" className="text-sm font-medium">Motivo da Alteração <span className="text-red-500">*</span></Label>
                <Textarea
                  id="edit-reason"
                  value={editFormData.editReason}
                  onChange={(e) => setEditFormData({ ...editFormData, editReason: e.target.value })}
                  placeholder="Explique por que está alterando a data/horário desta ausência..."
                  className="min-h-[90px] mt-1"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmEditAbsence}
                disabled={isLoading || !editFormData.editReason.trim() || !editFormData.departureDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Confirmar Alteração
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para exclusão com motivo */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir Ausência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação apagará o registro de ausência. É necessário informar o motivo para notificar a administração.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="cancelReason">Motivo da Exclusão / Cancelamento</Label>
              <Textarea
                id="cancelReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Explique por que está excluindo esta ausência..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteAbsence}
                disabled={!cancellationReason.trim()}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

