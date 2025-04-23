"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
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
      })

      // Atualizar registros locais imediatamente
      setUserRecords(prevRecords => [...prevRecords, newRecord])

      // Atualizar estatísticas do feriado
      const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
      const maxHours = stats.max - stats.used
      setRemainingHours(maxHours)

      toast({
        title: "Horas extras registradas",
        description: `Foram registradas ${hours}h extras (${startTime} - ${endTime})`,
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
    const date = new Date(dateString)
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
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
            // Calculate used hours for this holiday
            const holidayRecords = userRecords.filter((record) => record.holidayId === holiday.id)
            const hoursUsed = holidayRecords.reduce((total, record) => total + record.hours, 0)
            const remaining = holiday.maxHours - hoursUsed

            return (
              <Card
                key={holiday.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedHoliday?.id === holiday.id ? "border-[#EE4D2D] bg-orange-50" : "border-gray-200"
                }`}
                onClick={() => handleHolidaySelect(holiday)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-[#EE4D2D]">{holiday.name}</h4>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {formatDate(holiday.date)}
                    </div>
                  </div>
                  <Badge
                    variant={remaining > 0 ? "success" : "outline"}
                    className="bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {formatHours(remaining)} restantes
                  </Badge>
                </div>
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

