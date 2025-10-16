"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, Calendar, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TimeClock } from "@/components/time-clock"
import { getActiveHolidays, getOvertimeRecordsByUserId, createOvertimeRecord, getUserHolidayStats } from "@/lib/db"
import { supabase } from "@/lib/supabase"

interface HolidaySelectionProps {
  user: any
}

// Função utilitária para formatar horário (ex: '17:00' ou '17:30')
function formatTimeString(time: string) {
  if (!time) return "";
  const [hour, minute] = time.split(":");
  return `${hour}:${minute}`;
}

export function HolidaySelection({ user }: HolidaySelectionProps) {
  const [activeHolidays, setActiveHolidays] = useState<any[]>([])
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [error, setError] = useState("")
  const [userRecords, setUserRecords] = useState<any[]>([])
  const [remainingHours, setRemainingHours] = useState<number>(0)

  useEffect(() => {
    // Buscar feriados ativos
    const loadActiveHolidays = async () => {
      try {
        const active = await getActiveHolidays()
        if (Array.isArray(active)) {
          setActiveHolidays(active)
        } else {
          console.error("getActiveHolidays() did not return an array:", active)
          setActiveHolidays([])
        }
      } catch (error) {
        console.error("Error loading active holidays:", error)
        setActiveHolidays([])
      }
    }

    // Buscar registros do usuário
    const loadUserRecords = async () => {
      try {
        const records = await getOvertimeRecordsByUserId(user.id)
        if (Array.isArray(records)) {
          setUserRecords(records)
        } else {
          console.error("getOvertimeRecordsByUserId() did not return an array:", records)
          setUserRecords([])
        }
      } catch (error) {
        console.error("Error loading user records:", error)
        setUserRecords([])
      }
    }

    // Configurar subscription para atualizações em tempo real
    const channel = supabase
      .channel('overtime_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'overtime_records',
          filter: `user_id=eq.${user.id}` // Filtrar apenas registros do usuário atual
        },
        async (payload) => {
          console.log('Mudança detectada:', payload)
          // Recarregar registros quando houver mudanças
          await loadUserRecords()
          
          // Se houver um feriado selecionado, atualizar suas estatísticas
          if (selectedHoliday?.id) {
            const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
            const maxHours = stats.max - stats.used
            setRemainingHours(maxHours)
          }
        }
      )
      .subscribe()

    loadActiveHolidays()
    loadUserRecords()

    // Cleanup da subscription
    return () => {
      channel.unsubscribe()
    }
  }, [user.id, selectedHoliday?.id])

  useEffect(() => {
    const updateHolidayStats = async () => {
    if (selectedHoliday) {
        try {
          const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
          const maxHours = stats.max - stats.used
          setRemainingHours(maxHours)
        } catch (error) {
          console.error("Error getting holiday stats:", error)
          setRemainingHours(0)
    }
      }
    }

    updateHolidayStats()
  }, [selectedHoliday, user.id, userRecords])

  const handleHolidaySelect = (holiday: any) => {
    setSelectedHoliday(holiday)
    setError("")
  }

  const handleOvertimeCalculated = async (
    hours: number,
    startTime: string,
    endTime: string,
    optionId: string,
    optionLabel: string,
    task: string
  ) => {
    if (!selectedHoliday) return

    if (hours <= 0) {
      toast({
        title: "Sem horas extras",
        description: "Não foram registradas horas extras para este período.",
      })
      return
    }

    if (hours > remainingHours) {
      toast({
        title: "Limite excedido",
        description: `Você só possui ${remainingHours}h disponíveis. Serão registradas apenas ${remainingHours}h.`,
      })
      hours = remainingHours
    }

    try {
      // Criar novo registro com os horários selecionados
      const newRecord = await createOvertimeRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        holidayName: selectedHoliday.name,
        date: selectedHoliday.date,
        optionId: optionId,
        optionLabel: optionLabel,
        hours: hours,
        startTime: startTime,
        endTime: endTime,
        task: task,
      })

      // Atualizar registros locais imediatamente
      setUserRecords(prevRecords => [...prevRecords, newRecord])

      // Atualizar estatísticas do feriado
      const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
      const maxHours = stats.max - stats.used
      setRemainingHours(maxHours)

      toast({
        title: "Horas extras registradas",
        description: `Foram registradas ${hours}h extras (${formatTimeString(startTime)} - ${formatTimeString(endTime)})`,
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao registrar horas extras.",
        variant: "destructive",
      })
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
        return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      } else {
        // É uma data simples, adicionar T12:00:00 para corrigir timezone
        const date = new Date(dateString + 'T12:00:00')
        if (isNaN(date.getTime())) {
          throw new Error('Data inválida após new Date')
        }
        return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      }
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return 'Data inválida'
    }
  }

  const formatHours = (hours: number) => {
    return hours === 0.5 ? "30 min" : `${hours}h`
  }

  if (activeHolidays.length === 0) {
    return (
      <div className="text-center p-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          <Calendar className="h-12 w-12 text-gray-400" />
          <p className="text-gray-500">Não há feriados ativos no momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-lg font-medium mb-3">Feriados Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeHolidays.map((holiday) => {
            const today = new Date().toISOString().slice(0,10)
            const hasTodayRecord = userRecords.some((r) => {
              const created = (r.createdAt || r.created_at || r.date || '').slice(0,10)
              return created === today
            })
            // Calculate used hours for this holiday (apenas aprovados)
            const holidayRecords = userRecords.filter((record) => record.holidayId === holiday.id)
            const hoursUsed = holidayRecords
              .filter((r) => !r.status || r.status === 'approved')
              .reduce((total, record) => total + record.hours, 0)
            const remaining = holiday.maxHours - hoursUsed

            return (
              <Card
                key={holiday.id}
                className={`p-4 transition-all ${
                  hasTodayRecord
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-md"
                } ${selectedHoliday?.id === holiday.id ? "border-[#EE4D2D] bg-orange-50" : "border-gray-200"}`}
                onClick={() => {
                  if (hasTodayRecord) {
                    toast({
                      variant: "destructive",
                      title: "Limite diário atingido",
                      description: "Você já registrou hoje. Só poderá registrar novamente amanhã ou após exclusão pelo admin.",
                    })
                    return
                  }
                  handleHolidaySelect(holiday)
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-[#EE4D2D]">{holiday.name}</h4>
                  </div>
                  <Badge
                    variant={remaining > 0 ? "success" : "outline"}
                    className="bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {formatHours(remaining)} restantes
                  </Badge>
                </div>
                {hasTodayRecord && (
                  <div className="mt-2 text-xs text-red-600">Registro de hoje já efetuado</div>
                )}
                <div className="mt-2 text-sm">
                  <p>Prazo: {formatDate(holiday.deadline)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-[#EE4D2D] h-2 rounded-full"
                      style={{ width: `${(hoursUsed / holiday.maxHours) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatHours(hoursUsed)} de {formatHours(holiday.maxHours)} utilizadas
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {selectedHoliday && (
        <TimeClock user={user} selectedHoliday={selectedHoliday} onOvertimeCalculated={handleOvertimeCalculated} />
      )}
    </div>
  )
}

