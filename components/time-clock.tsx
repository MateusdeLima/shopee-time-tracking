"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Clock, AlertCircle, Upload, FileImage, Loader2, CheckCircle, XCircle, LogIn, LogOut, Bell } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { determineOvertimeOption, getOvertimeRecordsByUserId, getUserHolidayStats, createOvertimeRecord, calculateOvertimeHours, createTimeClockRecord, updateTimeClockRecord, getActiveTimeClockByUserId, createTimeRequest } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRef } from "react"
import BankHoursNotificationModal from "./rejection-notification-modal"

interface OvertimeOption {
  id: string
  label: string
  value: number
}

interface OvertimeOptions {
  schedule9h: OvertimeOption[]
  schedule8h: OvertimeOption[]
}

// Função para obter todas as opções de horário conforme briefing
function getOvertimeOptionsByShift(shift: "8-17" | "9-18") {
  if (shift === "8-17") {
    return [
      // Antecipado
      { id: "7h30_17h", label: "Entrar 7h30, sair 17h (30min extras)", value: 0.5 },
      { id: "7h_17h", label: "Entrar 7h, sair 17h (1h extra)", value: 1 },
      { id: "6h30_17h", label: "Entrar 6h30, sair 17h (1h30 extras)", value: 1.5 },
      { id: "6h_17h", label: "Entrar 6h, sair 17h (2h extras)", value: 2 },
      // Após o expediente
      { id: "8h_17h30", label: "Entrar 8h, sair 17h30 (30min extras)", value: 0.5 },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
      { id: "8h_18h30", label: "Entrar 8h, sair 18h30 (1h30 extras)", value: 1.5 },
      { id: "8h_19h", label: "Entrar 8h, sair 19h (2h extras)", value: 2 },
      // Misto
      { id: "7h_18h", label: "Entrar 7h, sair 18h (1h antes + 1h depois)", value: 2 },
      { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (30min antes + 1h30 depois)", value: 2 },
      { id: "6h30_17h30", label: "Entrar 6h30, sair 17h30 (1h30 antes + 30min depois)", value: 2 },
      { id: "7h30_17h30", label: "Entrar 7h30, sair 17h30 (30min antes + 30min depois)", value: 1 },
    ]
  } else {
    return [
      // Antecipado
      { id: "8h30_18h", label: "Entrar 8h30, sair 18h (30min extras)", value: 0.5 },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
      { id: "7h30_18h", label: "Entrar 7h30, sair 18h (1h30 extras)", value: 1.5 },
      { id: "7h_18h", label: "Entrar 7h, sair 18h (2h extras)", value: 2 },
      // Após o expediente
      { id: "9h_18h30", label: "Entrar 9h, sair 18h30 (30min extras)", value: 0.5 },
      { id: "9h_19h", label: "Entrar 9h, sair 19h (1h extra)", value: 1 },
      { id: "9h_19h30", label: "Entrar 9h, sair 19h30 (1h30 extras)", value: 1.5 },
      { id: "9h_20h", label: "Entrar 9h, sair 20h (2h extras)", value: 2 },
      // Misto
      { id: "8h_19h", label: "Entrar 8h, sair 19h (1h antes + 1h depois)", value: 2 },
      { id: "8h30_19h30", label: "Entrar 8h30, sair 19h30 (30min antes + 1h30 depois)", value: 2 },
      { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (1h30 antes + 30min depois)", value: 2 },
      { id: "8h30_18h30", label: "Entrar 8h30, sair 18h30 (30min antes + 30min depois)", value: 1 },
    ]
  }
}

function getOvertimeOptionsByShiftGrouped(shift: "8-17" | "9-18") {
  if (shift === "8-17") {
    return {
      antecipado: [
        { id: "7h30_17h", label: "Entrar 7h30, sair 17h (30min extras)", value: 0.5 },
        { id: "7h_17h", label: "Entrar 7h, sair 17h (1h extra)", value: 1 },
        { id: "6h30_17h", label: "Entrar 6h30, sair 17h (1h30 extras)", value: 1.5 },
        { id: "6h_17h", label: "Entrar 6h, sair 17h (2h extras)", value: 2 },
      ],
      apos: [
        { id: "8h_17h30", label: "Entrar 8h, sair 17h30 (30min extras)", value: 0.5 },
        { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
        { id: "8h_18h30", label: "Entrar 8h, sair 18h30 (1h30 extras)", value: 1.5 },
        { id: "8h_19h", label: "Entrar 8h, sair 19h (2h extras)", value: 2 },
      ],
      misto: [
        { id: "7h_18h", label: "Entrar 7h, sair 18h (1h antes + 1h depois)", value: 2 },
        { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (30min antes + 1h30 depois)", value: 2 },
        { id: "6h30_17h30", label: "Entrar 6h30, sair 17h30 (1h30 antes + 30min depois)", value: 2 },
        { id: "7h30_17h30", label: "Entrar 7h30, sair 17h30 (30min antes + 30min depois)", value: 1 },
      ],
    }
  } else {
    return {
      antecipado: [
        { id: "8h30_18h", label: "Entrar 8h30, sair 18h (30min extras)", value: 0.5 },
        { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
        { id: "7h30_18h", label: "Entrar 7h30, sair 18h (1h30 extras)", value: 1.5 },
        { id: "7h_18h", label: "Entrar 7h, sair 18h (2h extras)", value: 2 },
      ],
      apos: [
        { id: "9h_18h30", label: "Entrar 9h, sair 18h30 (30min extras)", value: 0.5 },
        { id: "9h_19h", label: "Entrar 9h, sair 19h (1h extra)", value: 1 },
        { id: "9h_19h30", label: "Entrar 9h, sair 19h30 (1h30 extras)", value: 1.5 },
        { id: "9h_20h", label: "Entrar 9h, sair 20h (2h extras)", value: 2 },
      ],
      misto: [
        { id: "8h_19h", label: "Entrar 8h, sair 19h (1h antes + 1h depois)", value: 2 },
        { id: "8h30_19h30", label: "Entrar 8h30, sair 19h30 (30min antes + 1h30 depois)", value: 2 },
        { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (1h30 antes + 30min depois)", value: 2 },
        { id: "8h30_18h30", label: "Entrar 8h30, sair 18h30 (30min antes + 30min depois)", value: 1 },
      ],
    }
  }
}

interface TimeClockProps {
  user: any
  selectedHoliday: any
  onOvertimeCalculated: (
    hours: number,
    startTime: string,
    endTime: string,
    optionId: string,
    optionLabel: string,
  ) => void
}

export function TimeClock({ user, selectedHoliday, onOvertimeCalculated }: TimeClockProps) {
  const [options, setOptions] = useState<any[]>([])
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<boolean>(false)
  const [groupedOptions, setGroupedOptions] = useState<any>({ antecipado: [], apos: [], misto: [] })
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false)
  const [activeClock, setActiveClock] = useState<any | null>(null)
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [isAlarmDialogOpen, setIsAlarmDialogOpen] = useState(false)
  const [alarmTime, setAlarmTime] = useState<string>("")
  const alarmTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isAlarmRinging, setIsAlarmRinging] = useState(false)
  const [isAlarmRingingDialogOpen, setIsAlarmRingingDialogOpen] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  // Trava de mín/max e sugestões de saída
  const [suggestedEndOptions, setSuggestedEndOptions] = useState<{ endTime: string; totalHours: number; label: string }[]>([])
  const [selectedSuggestedEnd, setSelectedSuggestedEnd] = useState<string>("")
  
  // Estados para solicitação de ponto perdido
  const [isMissingTimeDialogOpen, setIsMissingTimeDialogOpen] = useState(false)
  const [requestedEntryTime, setRequestedEntryTime] = useState("")
  const [entryReason, setEntryReason] = useState("")
  
  // Estados para solicitação de saída
  const [isMissingExitDialogOpen, setIsMissingExitDialogOpen] = useState(false)
  const [requestedExitTime, setRequestedExitTime] = useState("")
  const [exitReason, setExitReason] = useState("")
  
  // Estados para banco de horas
  const [showRejectionModal, setShowRejectionModal] = useState(true) // Mostrar modal ao carregar
  const [isHourBankDialogOpen, setIsHourBankDialogOpen] = useState(false)
  const [hourBankStep, setHourBankStep] = useState(1) // 1: anexar, 2: loading, 3: resultado
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [declaredHours, setDeclaredHours] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showExampleImage, setShowExampleImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função para recarregar estatísticas do feriado
  const refreshHolidayStats = async () => {
    if (user && selectedHoliday) {
      try {
        const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
        console.log('Estatísticas atualizadas do feriado:', stats)
        // As estatísticas serão refletidas na próxima verificação de horas
      } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error)
      }
    }
  }

  useEffect(() => {
    if (user?.shift === "8-17" || user?.shift === "9-18") {
      setGroupedOptions(getOvertimeOptionsByShiftGrouped(user.shift))
      setOptions(getOvertimeOptionsByShift(user.shift))
    } else {
      setGroupedOptions({ antecipado: [], apos: [], misto: [] })
      setOptions([])
    }
  }, [user?.shift])

  // Carregar registro de ponto ativo deste feriado
  useEffect(() => {
    const loadActiveClock = async () => {
      if (!user?.id || !selectedHoliday?.id) return
      const rec = await getActiveTimeClockByUserId(user.id, selectedHoliday.id)
      setActiveClock(rec)
      // Sugestões ao recuperar um ponto ativo
      if (rec?.startTime) {
        const opts = buildSuggestedEnds(rec.startTime)
        setSuggestedEndOptions(opts)
        setSelectedSuggestedEnd(opts[0]?.endTime || "")
      }
      // rearm stored alarm if present
      if (rec) {
        const key = `alarm_${user.id}_${selectedHoliday.id}_${rec.id}`
        const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        if (stored) {
          const when = new Date(stored).getTime()
          const now = Date.now()
          if (when > now) {
            scheduleAlarmAt(new Date(when), key)
          } else {
            localStorage.removeItem(key)
          }
        }
      }
    }
    loadActiveClock()
  }, [user?.id, selectedHoliday?.id])

  const handleOptionChange = (optionId: string) => {
    setSelectedOption(optionId)
    setError("")

    const allOptions = [...options]
    const option = allOptions.find((opt: OvertimeOption) => opt.id === optionId)

    if (option) {
      // ... existing code ...
    }
  }

  const isDeadlinePassed = selectedHoliday && new Date() > new Date(selectedHoliday.deadline)

  const handleRegisterOvertime = async () => {
    if (!selectedHoliday) {
      setError("Selecione um feriado para registrar horas extras")
      return
    }

    if (isDeadlinePassed) {
      setIsDeadlineDialogOpen(true)
      return
    }

    if (!selectedOption) {
      setError("Por favor, selecione uma opção de horário")
      return
    }


    setLoading(true)
    setError("")

    try {
      // Verificar se o funcionário bateu ponto dentro da tolerância hoje
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      
      if (!isWithinTolerance(currentTime, user.shift)) {
        toast({
          variant: "destructive",
          title: "Registro bloqueado",
          description: `Você não pode registrar horas extras pois chegou fora da janela de tolerância (6:00-9:15). Horário atual: ${currentTime}`
        })
        setLoading(false)
        return
      }

      // Verificar o total de horas já registradas para este feriado
      const { used: horasRegistradas, max: horasMaximas, compensated: horasCompensadas } = await getUserHolidayStats(user.id, selectedHoliday.id)

      const allOptions = [...options]
      const option = allOptions.find((opt: OvertimeOption) => opt.id === selectedOption)

      if (!option) {
        setError("Opção de horário inválida")
        setLoading(false)
        return
      }

      // Verificar se o novo registro ultrapassará o limite de horas
      if (horasRegistradas + option.value > horasMaximas) {
        const horasRestantes = horasMaximas - horasRegistradas
        const horasOriginais = selectedHoliday.maxHours
        
        let description = `Você já registrou ${horasRegistradas}h de ${horasMaximas}h permitidas. Restam ${horasRestantes}h para este feriado.`
        
        if (horasCompensadas > 0) {
          description += ` (${horasCompensadas}h foram compensadas pelo seu banco de horas da Page)`
        }
        
        toast({
          variant: "destructive",
          title: "Limite de horas excedido",
          description
        })
        setError(`Você só pode registrar mais ${horasRestantes}h para este feriado`)
        setLoading(false)
        return
      }

      // Extrair horários da opção selecionada
      const [startTime, endTime] = getTimesFromOption(option.id)

      // Validar campos obrigatórios
      if (!user?.id || !selectedHoliday.id || !selectedHoliday.name || !option.id || !option.label || option.value === undefined) {
        setError("Dados inválidos para registro")
        setLoading(false)
        return
      }

      // Notificar o componente pai sobre as horas extras calculadas
      onOvertimeCalculated(
        Number(option.value),
        startTime,
        endTime,
        option.id,
        option.label,
      )

      // Limpar seleção
      setSelectedOption(undefined)

      let successDescription = `Foram registradas ${option.value === 0.5 ? "30 min" : `${option.value}h`} extras (${formatTimeString(startTime)} - ${formatTimeString(endTime)}). Total: ${horasRegistradas + option.value === 0.5 ? "30 min" : `${horasRegistradas + option.value}h`} de ${horasMaximas}h`
      
      if (horasCompensadas > 0) {
        successDescription += `. Você economizou ${horasCompensadas}h com seu banco de horas da Page! 🎉`
      }
      
      toast({
        title: "Horas extras registradas",
        description: successDescription,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: error.message || "Falha ao registrar horas extras. Tente novamente."
      })
      setError(error.message || "Falha ao registrar horas extras. Tente novamente.")
      console.error("Erro detalhado:", error)
    } finally {
      setLoading(false)
    }
  }

  // Função para verificar se o horário está dentro da tolerância
  const isWithinTolerance = (currentTime: string, shift: "8-17" | "9-18"): boolean => {
    const [hours, minutes] = currentTime.split(':').map(Number)
    const currentMinutes = hours * 60 + minutes
    
    // Definir janelas de tolerância baseadas no turno
    let startWindow: number, endWindow: number
    
    if (shift === "8-17") {
      // Turno 8-17: tolerância de 6:00 às 9:15 (6h às 9h15)
      startWindow = 6 * 60 // 6:00 = 360 minutos
      endWindow = 9 * 60 + 15 // 9:15 = 555 minutos
    } else {
      // Turno 9-18: tolerância de 6:00 às 9:15 (mesmo horário)
      startWindow = 6 * 60 // 6:00 = 360 minutos  
      endWindow = 9 * 60 + 15 // 9:15 = 555 minutos
    }
    
    return currentMinutes >= startWindow && currentMinutes <= endWindow
  }

  // Função para verificar se o horário de saída está dentro da tolerância
  const isExitTimeValid = (currentTime: string, shift: "8-17" | "9-18"): { valid: boolean; minTime: string; maxTime: string } => {
    const [hours, minutes] = currentTime.split(':').map(Number)
    const currentMinutes = hours * 60 + minutes
    
    let minExitTime: number, maxExitTime: number
    
    if (shift === "8-17") {
      // Turno 8-17: saída permitida entre 17:20 (17:30 - 10min) e 20:10 (20:00 + 10min)
      minExitTime = 17 * 60 + 20 // 17:20 = 1040 minutos
      maxExitTime = 20 * 60 + 10 // 20:10 = 1210 minutos
    } else {
      // Turno 9-18: saída permitida entre 18:20 (18:30 - 10min) e 20:10 (20:00 + 10min)
      minExitTime = 18 * 60 + 20 // 18:20 = 1100 minutos
      maxExitTime = 20 * 60 + 10 // 20:10 = 1210 minutos
    }
    
    const minTimeStr = `${Math.floor(minExitTime / 60).toString().padStart(2, '0')}:${(minExitTime % 60).toString().padStart(2, '0')}`
    const maxTimeStr = `${Math.floor(maxExitTime / 60).toString().padStart(2, '0')}:${(maxExitTime % 60).toString().padStart(2, '0')}`
    
    return {
      valid: currentMinutes >= minExitTime && currentMinutes <= maxExitTime,
      minTime: minTimeStr,
      maxTime: maxTimeStr
    }
  }

  // Função para criar solicitação de ponto perdido
  const createMissingTimeRequest = async (requestedTime: string, reason: string) => {
    try {
      await createTimeRequest({
        userId: user.id,
        holidayId: selectedHoliday.id,
        requestType: "missing_entry",
        requestedTime,
        reason,
        status: "pending"
      })
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de adição de ponto foi enviada para aprovação do admin."
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar solicitação",
        description: error.message || "Tente novamente."
      })
    }
  }

  // Função para enviar solicitação do modal de entrada
  const handleSubmitMissingTimeRequest = async () => {
    if (!requestedEntryTime.trim()) {
      toast({
        variant: "destructive",
        title: "Horário obrigatório",
        description: "Por favor, informe o horário que você começou a trabalhar."
      })
      return
    }

    if (!entryReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo obrigatório",
        description: "Por favor, explique o motivo do esquecimento do ponto."
      })
      return
    }

    try {
      const reason = `Funcionário esqueceu de bater ponto. Horário real de entrada: ${requestedEntryTime}. Motivo: ${entryReason}`
      await createMissingTimeRequest(requestedEntryTime, reason)
      
      // Limpar campos e fechar modal
      setRequestedEntryTime("")
      setEntryReason("")
      setIsMissingTimeDialogOpen(false)
    } catch (error: any) {
      console.error("Erro ao enviar solicitação:", error)
    }
  }

  // Função para enviar solicitação do modal de saída
  const handleSubmitMissingExitRequest = async () => {
    if (!requestedExitTime.trim()) {
      toast({
        variant: "destructive",
        title: "Horário obrigatório",
        description: "Por favor, informe o horário que você quer sair."
      })
      return
    }

    if (!exitReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo obrigatório",
        description: "Por favor, explique o motivo da saída fora do horário."
      })
      return
    }

    try {
      await createTimeRequest({
        userId: user.id,
        holidayId: selectedHoliday.id,
        requestType: "missing_exit",
        requestedTime: requestedExitTime,
        reason: `Funcionário quer sair fora da tolerância. Horário solicitado: ${requestedExitTime}. Motivo: ${exitReason}`,
        status: "pending"
      })
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saída foi enviada para aprovação do admin."
      })
      
      // Limpar campos e fechar modal
      setRequestedExitTime("")
      setExitReason("")
      setIsMissingExitDialogOpen(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar solicitação",
        description: error.message || "Tente novamente."
      })
    }
  }

  // Novo fluxo: iniciar ponto de entrada
  const handleStartEntry = async () => {
    if (!selectedHoliday) {
      setError("Selecione um feriado para registrar")
      return
    }
    setLoading(true)
    setError("")
    try {

      const existing = await getActiveTimeClockByUserId(user.id, selectedHoliday.id)
      if (existing) {
        setActiveClock(existing)
        setLoading(false)
        toast({ title: "Ponto já iniciado", description: `Início: ${existing.startTime}` })
        return
      }

      const now = new Date()
      const startTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      
      // Verificar se o horário está dentro da tolerância
      if (!isWithinTolerance(startTime, user.shift)) {
        // Horário fora da tolerância - abrir modal para solicitar ponto
        setLoading(false)
        setIsMissingTimeDialogOpen(true)
        return
      }

      const created = await createTimeClockRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        date: new Date().toISOString().slice(0, 10),
        startTime,
        endTime: null,
        status: "active",
        overtimeHours: 0,
      })
      setActiveClock(created)
      // calcular sugestões a partir do novo início
      const opts = buildSuggestedEnds(startTime)
      setSuggestedEndOptions(opts)
      setSelectedSuggestedEnd(opts[0]?.endTime || "")
      toast({ title: "Ponto de entrada registrado", description: `Início: ${startTime}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao iniciar ponto", description: e.message || "Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  // Finalizar dia: grava saída, calcula horas extras e cria registro consolidado
  const handleConfirmFinish = async () => {
    if (!activeClock) return
    setLoading(true)
    try {
      // Parar alarme (som e timer), se ativo
      try {
        if (alarmTimerRef.current) {
          clearTimeout(alarmTimerRef.current as unknown as number)
          alarmTimerRef.current = null
        }
        oscillatorRef.current?.stop()
        oscillatorRef.current?.disconnect()
        gainRef.current?.disconnect()
        oscillatorRef.current = null
        setIsAlarmRinging(false)
        setIsAlarmRingingDialogOpen(false)
      } catch {}

      const endTime = selectedSuggestedEnd || (() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      })()
      const updatedClock = await updateTimeClockRecord(activeClock.id, { endTime, status: "completed" })

      const standard = user?.shift === '8-17' ? { s: '08:00', e: '17:00' } : { s: '09:00', e: '18:00' }
      const overtime = calculateOvertimeHours(activeClock.date, activeClock.startTime, endTime, standard.s, standard.e)

      const option = determineOvertimeOption(activeClock.startTime, endTime)

      await createOvertimeRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        holidayName: selectedHoliday.name,
        date: activeClock.date,
        optionId: option.id,
        optionLabel: `${activeClock.startTime} às ${endTime}`,
        hours: overtime,
        startTime: activeClock.startTime,
        endTime,
        status: 'approved',
      })

      setActiveClock(updatedClock)
      setIsFinishDialogOpen(false)
      toast({ title: "Saída registrada", description: `Fim: ${endTime}. Horas extras: ${overtime}h` })
      await refreshHolidayStats()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao finalizar", description: e.message || "Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  // Utilitários de tempo (minutos)
  const toMinutes = (hhmm: string) => {
    const [hh, mm] = hhmm.split(":").map(Number)
    return hh * 60 + mm
  }
  const fromMinutes = (mins: number) => {
    const h = Math.floor(mins / 60) % 24
    const m = Math.abs(mins % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  const roundUpToHalfHour = (hours: number) => {
    const halves = Math.ceil(hours * 2)
    return halves / 2
  }

  // Monta sugestões válidas entre 0.5h e 2h totais com base no turno
  const buildSuggestedEnds = (start: string) => {
    const standard = user?.shift === '8-17' ? { s: '08:00', e: '17:00' } : { s: '09:00', e: '18:00' }
    const startMin = toMinutes(start)
    const sMin = toMinutes(standard.s)
    const eMin = toMinutes(standard.e)
    // Extra já obtido antes do expediente
    const earnedBefore = Math.max(0, (sMin - startMin) / 60)
    // Totais permitidos
    const allowedTotals = [0.5, 1, 1.5, 2]
    const floorMin = Math.max(0.5, roundUpToHalfHour(earnedBefore))
    const validTotals = allowedTotals.filter(t => t >= floorMin)
    const opts = validTotals.map(t => {
      const afterHours = t - earnedBefore
      const endMinutes = eMin + Math.round(afterHours * 60)
      const endTime = fromMinutes(endMinutes)
      const label = `${endTime} (${t === 0.5 ? '30min' : `${t}h`})`
      return { endTime, totalHours: t, label }
    })
    return opts
  }

  // Alarm helpers
  const scheduleAlarmAt = (when: Date, storageKey: string) => {
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current as unknown as number)
      alarmTimerRef.current = null
    }
    const delay = Math.max(0, when.getTime() - Date.now())
    alarmTimerRef.current = setTimeout(async () => {
      try {
        if ("Notification" in window) {
          if (Notification.permission !== "granted") {
            await Notification.requestPermission().catch(() => {})
          }
          if (Notification.permission === "granted") {
            new Notification("Lembrete: Confirmar saída", { body: `Hora de finalizar o dia no feriado ${selectedHoliday?.name}` })
          }
        }
        // play continuous alarm
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
          }
          const ctx = audioCtxRef.current
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = 880
          gain.gain.value = 0.05
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          oscillatorRef.current = osc
          gainRef.current = gain
          setIsAlarmRinging(true)
          setIsAlarmRingingDialogOpen(true)
        } catch {}
      } finally {
        localStorage.removeItem(storageKey)
      }
    }, delay) as unknown as NodeJS.Timeout
  }

  const openAlarmDialogWithSuggestion = () => {
    const suggestion = user?.shift === '8-17' ? '17:00' : '18:00'
    setAlarmTime(suggestion)
    setIsAlarmDialogOpen(true)
  }

  // Função para extrair horários de entrada e saída da opção
  const getTimesFromOption = (optionId: string): [string, string] => {
    // Remover sufixos _9h e _8h dos IDs
    const baseId = optionId.replace(/_[89]h$/, "")
    const [start, end] = baseId.split("_")
    // Corrigir para 07:30, 17:30, 07:00, etc
    function parseHour(h: string) {
      if (h.includes("h")) {
        const [hour, min] = h.split("h")
        return `${hour.padStart(2, "0")}:${min ? min.padEnd(2, "0") : "00"}`
      }
      return h
    }
    const startTime = parseHour(start)
    const endTime = parseHour(end)
    return [startTime, endTime]
  }

  // Função utilitária para formatar horário (ex: '17:00' ou '17:30')
  function formatTimeString(time: string) {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    return `${hour}:${minute}`;
  }

  // Funções para banco de horas
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive"
      })
      return
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo inválido",
        description: "Apenas imagens são aceitas",
        variant: "destructive"
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitHourBank = async () => {
    if (!selectedImage || !declaredHours) {
      toast({
        title: "Dados incompletos",
        description: "Anexe a imagem e informe as horas",
        variant: "destructive"
      })
      return
    }

    setHourBankStep(2) // Loading
    setIsAnalyzing(true)

    try {
      // Submeter comprovante para aprovação
      const response = await fetch('/api/hour-bank/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          declaredHours: parseFloat(declaredHours),
          holidayId: selectedHoliday.id,
          userId: user.id
        })
      })
      if (!response.ok) throw new Error('Falha ao enviar comprovante')

      setHourBankStep(3)
      toast({
        title: "Imagem enviada!",
        description: "Seu comprovante foi enviado ao dashboard, aguarde análise do RH.",
      })
    } catch (error) {
      toast({
        title: "Erro no envio",
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: "destructive"
      })
      setHourBankStep(1)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!selectedHoliday) {
    return null
  }

  return (
    <>
      {isDeadlineDialogOpen && (
        <Dialog open={isDeadlineDialogOpen} onOpenChange={setIsDeadlineDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Prazo Expirado</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O prazo para registrar horas deste feriado já expirou.<br />
                  Entre em contato com o administrador para mais informações.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeadlineDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Registro de Horas Extras - {selectedHoliday.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

          <div className="space-y-6">

            {/* Botão de Banco de Horas */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 text-base sm:text-lg leading-snug break-words">Você já tem horas no seu banco da Page?</h4>
                    <p className="text-xs sm:text-sm text-blue-600 leading-snug">Anexe o comprovante para compensar suas horas!</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 text-sm sm:text-base whitespace-normal leading-snug px-3 py-2"
                  onClick={() => setIsHourBankDialogOpen(true)}
                >
                  📸 Anexar Comprovante do Banco de Horas
                </Button>
              </div>
            </div>

            {/* Novo fluxo: ponto de entrada/saída */}
            {!activeClock || (activeClock && activeClock.status === 'completed') ? (
              <div className="rounded-md border p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">Registre o início do seu expediente extra para este feriado.</p>
                <Button onClick={handleStartEntry} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  <LogIn className="h-4 w-4 mr-2" /> {loading ? 'Registrando...' : 'Registrar ponto de entrada'}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border p-4 bg-green-50">
                <div className="space-y-3">
                  <div className="text-center sm:text-left">
                    <div className="text-sm text-green-800 font-medium">Ponto iniciado</div>
                    <div className="text-xs text-green-700">Entrada: {activeClock.startTime}</div>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Button 
                      onClick={openAlarmDialogWithSuggestion} 
                      variant="outline" 
                      className="border-green-600 text-green-700 w-full xs:flex-1 h-10 text-sm"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Alarme
                    </Button>
                    <Button 
                      onClick={() => setIsFinishDialogOpen(true)} 
                      className="bg-green-600 hover:bg-green-700 w-full xs:flex-1 h-10 text-sm"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Finalizar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* fluxo antigo desativado */}
      </CardContent>
    </Card>

    {/* Modal finalizar dia */}
    <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar saída</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border p-3 bg-gray-50">
            <div>Hora atual: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          {activeClock && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-[12px] text-gray-500">Entrada</div>
                <div className="text-base font-medium">{activeClock.startTime}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-[12px] text-gray-500">Saída</div>
                <div className="text-base font-medium">{selectedSuggestedEnd || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )}
          

          {/* Opções de horários de saída */}
          {activeClock && suggestedEndOptions.length > 0 && (
            <div className="space-y-2">
              <div className="text-[12px] text-gray-500">Escolha o horário de saída</div>
              <div className="grid grid-cols-2 gap-2">
                {suggestedEndOptions.map(opt => (
                  <button
                    key={opt.endTime}
                    type="button"
                    onClick={() => setSelectedSuggestedEnd(opt.endTime)}
                    className={`border rounded px-3 py-2 text-sm text-left transition-all ${
                      selectedSuggestedEnd === opt.endTime 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="font-medium">{opt.endTime}</div>
                    <div className="text-[11px] opacity-80">Total: {opt.totalHours === 0.5 ? '30min' : `${opt.totalHours}h`}</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-gray-500">
                Selecione o horário desejado para finalizar seu expediente extra.
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">Ao confirmar, registraremos a saída agora e calcularemos suas horas extras automaticamente conforme seu turno.</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>Voltar</Button>
          <Button 
            onClick={handleConfirmFinish} 
            className="bg-blue-600 hover:bg-blue-700" 
            disabled={!activeClock || loading || !selectedSuggestedEnd}
          >
            {loading ? 'Registrando...' : 'Confirmar registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal configurar alarme */}
    <Dialog open={isAlarmDialogOpen} onOpenChange={setIsAlarmDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar alarme de saída</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Defina um horário para lembrarmos você de confirmar a saída.</p>
          <div>
            <Label htmlFor="alarm-time">Horário</Label>
            <input id="alarm-time" type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </div>
          <div className="text-xs text-gray-500">O alarme usa notificação do navegador; permita notificações quando solicitado.</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAlarmDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!activeClock || !alarmTime) return
              const [hh, mm] = alarmTime.split(":").map(Number)
              const now = new Date()
              const when = new Date(now)
              when.setHours(hh, mm, 0, 0)
              if (when.getTime() <= now.getTime()) when.setDate(when.getDate() + 1)
              const key = `alarm_${user.id}_${selectedHoliday.id}_${activeClock.id}`
              localStorage.setItem(key, when.toISOString())
              if ("Notification" in window && Notification.permission !== "granted") {
                await Notification.requestPermission().catch(() => {})
              }
              scheduleAlarmAt(when, key)
              toast({ title: "Alarme configurado", description: `Vamos avisar às ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` })
              setIsAlarmDialogOpen(false)
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar alarme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal alarme tocando */}
    <Dialog open={isAlarmRingingDialogOpen} onOpenChange={(open) => {
      setIsAlarmRingingDialogOpen(open)
      if (!open) {
        try {
          oscillatorRef.current?.stop()
          oscillatorRef.current?.disconnect()
          gainRef.current?.disconnect()
          oscillatorRef.current = null
          setIsAlarmRinging(false)
        } catch {}
      }
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>⏰ Alarme</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-700">Hora de finalizar o dia! Confirme sua saída para parar o alarme.</div>
        <DialogFooter>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              try {
                oscillatorRef.current?.stop()
                oscillatorRef.current?.disconnect()
                gainRef.current?.disconnect()
                oscillatorRef.current = null
                setIsAlarmRinging(false)
              } catch {}
              setIsAlarmRingingDialogOpen(false)
            }}
          >
            Parar alarme
          </Button>
          <Button
            onClick={async () => {
              try {
                oscillatorRef.current?.stop()
                oscillatorRef.current?.disconnect()
                gainRef.current?.disconnect()
                oscillatorRef.current = null
                setIsAlarmRinging(false)
              } catch {}
              setIsAlarmRingingDialogOpen(false)
              await handleConfirmFinish()
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirmar saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Banco de Horas */}
    <Dialog open={isHourBankDialogOpen} onOpenChange={setIsHourBankDialogOpen}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Compensação de Banco de Horas - {selectedHoliday.name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Anexar Imagem */}
        {hourBankStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📋 Como verificar seu banco de horas no Page Interim:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                <li>Acesse o sistema <strong>Page Interim</strong></li>
                <li>Vá na seção <strong>"Saldo Banco de Horas"</strong></li>
                <li>Tire um print da tela completa usando:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong>Botão Print Screen (PrtSc)</strong> do teclado</li>
                    <li>Ou o aplicativo <strong>"Ferramenta de Captura"</strong> do Windows</li>
                  </ul>
                </li>
                <li>Certifique-se que apareça na imagem:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Cabeçalho "Page Interim" visível</li>
                    <li><strong>Seu nome</strong> na coluna "Nome"</li>
                    <li>Valor no <strong>"Saldo Atual"</strong> (ex: 02:00)</li>
                    <li>Data e informações da empresa</li>
                  </ul>
                </li>
              </ol>
              
              {/* Botão Ver Imagem Base */}
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowExampleImage(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ver imagem base
                </button>
              </div>
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                <strong>⚠️ Importante:</strong> A imagem deve mostrar claramente o "Saldo Atual" no formato HH:MM (ex: 02:00 = 2 horas)
              </div>
            </div>

            {selectedImage ? (
              <div className="border-2 border-dashed border-[#EE4D2D] bg-orange-50 rounded-lg p-6 text-center">
                <div className="space-y-4">
                  <div className="relative mx-auto w-64 h-48">
                    <Image
                      src={selectedImage}
                      alt="Comprovante do banco de horas"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedImage(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remover imagem
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="space-y-6 cursor-pointer hover:bg-orange-100 transition-all duration-200 p-8 rounded-lg border-2 border-dashed border-[#EE4D2D] hover:border-[#D23F20] group bg-orange-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileImage className="h-20 w-20 text-gray-400 group-hover:text-[#EE4D2D] mx-auto transition-colors" />
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-700 group-hover:text-[#EE4D2D] mb-3 transition-colors">
                    Anexe o print do seu banco de horas
                  </h3>
                  <p className="text-base text-gray-600 mb-6">
                    Clique em qualquer lugar neste card para selecionar a imagem
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-[#EE4D2D] transition-colors">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">Selecionar arquivo</span>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedImage && (
              <div className="space-y-3">
                <Label htmlFor="hours">Quantas horas aparecem no "Saldo Atual"?</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="12"
                  value={declaredHours}
                  onChange={(e) => setDeclaredHours(e.target.value)}
                  placeholder="Ex: 2 (se aparecer 02:00) ou 2.5 (se aparecer 02:30)"
                  className="text-center text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 text-center">
                  <strong>Conversão:</strong> 02:00 = 2 horas | 02:30 = 2.5 horas | 04:15 = 4.25 horas
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsHourBankDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitHourBank}
                disabled={!selectedImage || !declaredHours}
                className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
              >
                Confirmar envio
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {hourBankStep === 2 && (
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-[#EE4D2D]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Enviando comprovante...</h3>
              <p className="text-gray-600">Um momento, estamos processando seu envio!</p>
            </div>
          </div>
        )}

        {/* Step 3: Resultado */}
        {hourBankStep === 3 && (
          <div className="space-y-8 text-center py-8">
            <div className='flex justify-center'><CheckCircle className='h-16 w-16 text-green-500 mx-auto' /></div>
            <h3 className="text-xl font-semibold text-green-800 mb-4">Comprovante enviado!</h3>
            <p className="text-green-700 max-w-xs mx-auto">Seu comprovante foi enviado ao dashboard RH. Você será avisado(a) automaticamente se ele for aprovado ou reprovado.<br/>Você pode acompanhar o status na tela principal do sistema.</p>
            <Button onClick={() => {
              setIsHourBankDialogOpen(false);
              setHourBankStep(1);
              setSelectedImage(null);
              setDeclaredHours("")
            }} className="bg-[#EE4D2D] hover:bg-[#D23F20] w-52 mx-auto">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Modal da Imagem Base */}
    <Dialog open={showExampleImage} onOpenChange={setShowExampleImage}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            📊 Imagem Base - Exemplo do Page Interim
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Imagem de exemplo real */}
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6 text-center">
            <div className="bg-white rounded-lg p-2 shadow-sm border">
              <h4 className="font-semibold text-blue-800 mb-3">📸 Exemplo: Como deve ser seu print</h4>
              <div className="relative w-full max-w-3xl mx-auto">
                <Image
                  src="/base.png"
                  alt="Exemplo de tela do Page Interim mostrando banco de horas"
                  width={800}
                  height={400}
                  className="rounded-lg border shadow-sm object-contain w-full"
                  priority
                />
              </div>
              <div className="mt-3 text-sm text-blue-700">
                <p className="font-medium">👆 Tire um print exatamente como esta imagem</p>
                <p>Onde está escrito "Seu nome aqui", deve aparecer <strong>seu nome real</strong></p>
              </div>
            </div>
          </div>
          
          {/* Instruções */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">✓ O que a IA procura na sua imagem:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
              <li><strong>Logo "Page Interim"</strong> - No canto superior esquerdo</li>
              <li><strong>Informações da empresa</strong> - No canto superior direito</li>
              <li><strong>Título "Saldo Banco de Horas"</strong> - Centralizado</li>
              <li><strong>Seu nome real</strong> - Na coluna "Nome" (onde está "Seu nome aqui")</li>
              <li><strong>Valor no "Saldo Atual"</strong> - Formato HH:MM (ex: 02:00)</li>
              <li><strong>Data atual</strong> - No campo "Gerado em"</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">⚠️ Muito Importante:</h4>
            <p className="text-sm text-amber-700">
              <strong>Sua imagem deve ser IDÊNTICA</strong> ao exemplo acima. A IA usa esta imagem base 
              como referência para validar seu comprovante. Certifique-se que:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-amber-700">
              <li>O layout seja exatamente igual</li>
              <li>Todas as informações estejam visíveis</li>
              <li>O "Saldo Atual" mostre suas horas reais</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Como tirar o print:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Pressione <strong>Print Screen (PrtSc)</strong> no teclado</li>
              <li>Ou use a <strong>"Ferramenta de Captura"</strong> do Windows</li>
              <li>Cole a imagem em um editor (Paint, Word, etc.)</li>
              <li>Salve como arquivo de imagem (PNG, JPG)</li>
            </ol>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button 
            onClick={() => setShowExampleImage(false)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Entendi, fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Notificação de Banco de Horas */}
    {/* Modal de solicitação de ponto perdido */}
    <Dialog open={isMissingTimeDialogOpen} onOpenChange={setIsMissingTimeDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Horário fora da tolerância
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 mb-2">
              <strong>Você chegou às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, fora da janela permitida (6:00-9:15).</strong>
            </p>
            <p className="text-xs text-red-600">
              Uma solicitação será enviada ao admin para aprovação.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="requestedTime" className="text-sm font-medium">
                Que horas você realmente começou a trabalhar hoje? *
              </Label>
              <Input
                id="requestedTime"
                type="time"
                value={requestedEntryTime}
                onChange={(e) => setRequestedEntryTime(e.target.value)}
                className="mt-1"
                placeholder="HH:MM"
              />
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                Por que esqueceu de bater o ponto? *
              </Label>
              <textarea
                id="reason"
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Ex: Esqueci de bater o ponto ao chegar, estava focado no trabalho..."
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Importante:</strong> Seja honesto sobre o horário real. O admin verificará sua solicitação e poderá aprovar ou rejeitar com base nas informações fornecidas.
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsMissingTimeDialogOpen(false)
              setRequestedEntryTime("")
              setEntryReason("")
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitMissingTimeRequest}
            disabled={!requestedEntryTime.trim() || !entryReason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de solicitação de saída fora do horário */}
    <Dialog open={isMissingExitDialogOpen} onOpenChange={setIsMissingExitDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            Saída fora da tolerância
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-700 mb-2">
              <strong>Você está tentando sair fora da janela permitida.</strong>
            </p>
            <p className="text-xs text-orange-600">
              Uma solicitação será enviada ao admin para aprovação.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="requestedExitTime" className="text-sm font-medium">
                Que horas você quer sair? *
              </Label>
              <Input
                id="requestedExitTime"
                type="time"
                value={requestedExitTime}
                onChange={(e) => setRequestedExitTime(e.target.value)}
                className="mt-1"
                placeholder="HH:MM"
              />
            </div>

            <div>
              <Label htmlFor="exitReason" className="text-sm font-medium">
                Por que precisa sair neste horário? *
              </Label>
              <textarea
                id="exitReason"
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Ex: Compromisso médico, emergência familiar, etc..."
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Importante:</strong> O admin verificará sua solicitação e poderá aprovar ou rejeitar com base no motivo fornecido.
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsMissingExitDialogOpen(false)
              setRequestedExitTime("")
              setExitReason("")
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitMissingExitRequest}
            disabled={!requestedExitTime.trim() || !exitReason.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {showRejectionModal && (
      <BankHoursNotificationModal 
        userId={user.id}
        onClose={() => setShowRejectionModal(false)}
      />
    )}
    </>
  )
}

