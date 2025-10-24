"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, Calendar, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ClassicTimeClock } from "@/components/classic-time-clock"
import { getActiveHolidays, getOvertimeRecordsByUserId } from "@/lib/db"

interface SimpleHolidaySelectionProps {
  user: any
}

export function SimpleHolidaySelection({ user }: SimpleHolidaySelectionProps) {
  const [activeHolidays, setActiveHolidays] = useState<any[]>([])
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [error, setError] = useState("")
  const [userRecords, setUserRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      // Carregar feriados ativos
      const holidays = await getActiveHolidays()
      setActiveHolidays(holidays)
      
      // Carregar registros do usuário
      const records = await getOvertimeRecordsByUserId(user.id)
      setUserRecords(records)
      
      // Não selecionar automaticamente - funcionário deve escolher
      
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err)
      setError(err.message || "Erro ao carregar feriados")
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar dados dos feriados"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    loadData() // Recarregar dados após registro
  }

  // Função para calcular o progresso do feriado
  const getHolidayProgress = (holiday: any) => {
    // Buscar TODOS os registros aprovados do feriado
    const holidayRecords = userRecords.filter(record => 
      record.holidayId === holiday.id && record.status === "approved"
    )
    
    // Separar registros normais de banco de horas
    const normalRecords = holidayRecords.filter(record => 
      record.optionId !== "manual_bank_hours" && record.optionId !== "ai_bank_hours"
    )
    const bankHoursRecords = holidayRecords.filter(record => 
      record.optionId === "manual_bank_hours" || record.optionId === "ai_bank_hours"
    )
    
    // Horas máximas do feriado (assumindo 8 horas como padrão)
    const maxHours = holiday.maxHours || 8
    
    // Somar horas normais registradas
    const normalHours = normalRecords.reduce((total, record) => {
      return total + (record.hours || 0)
    }, 0)
    
    // Somar horas de banco aprovadas (que diminuem a necessidade)
    const bankHours = bankHoursRecords.reduce((total, record) => {
      return total + (record.hours || 0)
    }, 0)
    
    // Horas efetivamente necessárias = máximas - banco aprovado
    const effectiveMaxHours = Math.max(maxHours - bankHours, 0)
    
    // Calcular porcentagem baseada nas horas efetivamente necessárias
    const percentage = effectiveMaxHours === 0 ? 100 : Math.min((normalHours / effectiveMaxHours) * 100, 100)
    
    return {
      registered: normalHours,
      total: effectiveMaxHours,
      bankHours: bankHours,
      originalTotal: maxHours,
      percentage: Math.round(percentage)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Carregando feriados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (activeHolidays.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Não há feriados disponíveis para registro de horas extras no momento.
        </AlertDescription>
      </Alert>
    )
  }

  // Verificar se já atingiu o limite de 2 registros para o feriado selecionado (excluindo banco de horas)
  const holidayRecords = userRecords.filter(record => 
    record.holidayId === selectedHoliday?.id && 
    record.status === "approved" &&
    record.optionId !== "manual_bank_hours" && // Excluir banco de horas da contagem
    record.optionId !== "ai_bank_hours" // Excluir banco de horas da contagem
  )
  const hasReachedLimit = false // Removido limite de registros por dia

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Seleção de Feriado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Feriados Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {activeHolidays.map((holiday) => {
              const progress = getHolidayProgress(holiday)
              const holidayRecordsCount = userRecords.filter(record => 
                record.holidayId === holiday.id && 
                record.status === "approved" &&
                record.optionId !== "manual_bank_hours" && // Excluir banco de horas da contagem
                record.optionId !== "ai_bank_hours" // Excluir banco de horas da contagem
              ).length
              
              return (
                <div
                  key={holiday.id}
                  className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedHoliday?.id === holiday.id
                      ? "border-[#EE4D2D] bg-[#EE4D2D]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedHoliday(holiday)}
                >
                  <div className="space-y-3">
                    {/* Header do card */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{holiday.name}</h3>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(holiday.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {holidayRecordsCount > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {holidayRecordsCount === 1 ? "1 registro" : `${holidayRecordsCount} registros`}
                          </Badge>
                        )}
                        {selectedHoliday?.id === holiday.id && (
                          <Badge className="bg-[#EE4D2D]">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progresso */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso do feriado:</span>
                        <span className="font-medium">
                          {progress.registered}h de {progress.total}h ({progress.percentage}%)
                        </span>
                      </div>
                      {progress.bankHours > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-600">Banco de horas aprovado:</span>
                          <span className="font-medium text-blue-600">
                            -{progress.bankHours}h (de {progress.originalTotal}h originais)
                          </span>
                        </div>
                      )}
                      <Progress 
                        value={progress.percentage} 
                        className="h-2"
                      />
                      {progress.percentage === 100 && (
                        <p className="text-xs text-green-600 font-medium">
                          ✓ Feriado completo!
                        </p>
                      )}
                      {progress.percentage === 0 && progress.total > 0 && (
                        <p className="text-xs text-gray-500">
                          Nenhuma hora registrada ainda
                        </p>
                      )}
                      {progress.total === 0 && (
                        <p className="text-xs text-blue-600 font-medium">
                          ✓ Feriado compensado pelo banco de horas!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registro de Horas */}
      {selectedHoliday && (
        <>
          {hasReachedLimit ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Você já atingiu o limite de 2 marcações para o feriado <strong>{selectedHoliday.name}</strong>.
                Verifique seu histórico para mais detalhes.
              </AlertDescription>
            </Alert>
          ) : (
            <ClassicTimeClock 
              user={user} 
              selectedHoliday={selectedHoliday}
              onUpdate={handleUpdate}
            />
          )}
        </>
      )}
    </div>
  )
}
