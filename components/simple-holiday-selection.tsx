"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, Calendar, Clock, CheckCircle, Timer, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)

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

  const handleUpdate = (completed?: boolean) => {
    loadData() // Recarregar dados após registro
    if (completed) {
      setIsCompletionModalOpen(true)
    }
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
      percentage: Math.round(percentage),
      remaining: Math.max(0, effectiveMaxHours - normalHours)
    }
  }

  // Função para calcular estimativa de conclusão
  const getCompletionEstimation = (hoursRemaining: number, deadline: string) => {
    if (hoursRemaining <= 0) return null;

    const dailyRate = 0.5;
    const businessDaysNeeded = Math.ceil(hoursRemaining / dailyRate);

    // Data estimada pulando fins de semana
    let estimatedDate = new Date();
    let daysAdded = 0;
    while (daysAdded < businessDaysNeeded) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      const day = estimatedDate.getDay();
      if (day !== 0 && day !== 6) {
        daysAdded++;
      }
    }

    // Calcular dias úteis entre a data estimada e o prazo limite
    const deadlineDate = new Date(deadline + 'T23:59:59');
    let diffBusinessDays = 0;
    
    if (estimatedDate < deadlineDate) {
      let tempDate = new Date(estimatedDate);
      while (tempDate < deadlineDate) {
        tempDate.setDate(tempDate.getDate() + 1);
        const day = tempDate.getDay();
        if (day !== 0 && day !== 6) {
          diffBusinessDays++;
        }
      }
    }

    return {
      estimatedDate,
      deadlineDate,
      diffBusinessDays,
      isOnTime: estimatedDate <= deadlineDate
    };
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

                    {/* Estimativa de Conclusão */}
                    {progress.percentage < 100 && holiday.deadline && (
                      <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Prazo limite para registro: <strong>{format(parseISO(holiday.deadline), "dd/MM/yyyy")}</strong></span>
                        </div>
                        
                        {(() => {
                          const estimation = getCompletionEstimation(progress.remaining, holiday.deadline);
                          if (!estimation) return null;
                          
                          return (
                            <div className="bg-gray-50 rounded-md p-2 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                                <div className="flex items-center gap-1.5 text-blue-700">
                                  <Timer className="h-3.5 w-3.5" />
                                  <span>Estimativa (30min/dia):</span>
                                </div>
                                <span className="font-semibold text-blue-900 border-b border-blue-200">
                                  {format(estimation.estimatedDate, "dd/MM/yyyy")}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                                <TrendingUp className={`h-3.5 w-3.5 ${estimation.isOnTime ? 'text-green-600' : 'text-red-600'}`} />
                                <span className={estimation.isOnTime ? 'text-green-700' : 'text-red-700'}>
                                  {estimation.isOnTime 
                                    ? `Terminará ${estimation.diffBusinessDays} dias úteis antes do prazo`
                                    : `Atenção: A estimativa ultrapassa o prazo limite!`
                                  }
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
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
      {/* Modal de Conclusão de Feriado */}
      <Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Feriado Concluído com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-base text-foreground pt-4 leading-relaxed">
              O histórico de horas foi finalizado, a gestão já está a par da situação. 
              <br /><br />
              O arquivo de PDF foi baixado automaticamente. <strong>Envie o arquivo para o PIC da sua tarefa</strong> para que o mesmo possa conferir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              className="bg-[#EE4D2D] hover:bg-[#EE4D2D]/90 px-8"
              onClick={() => setIsCompletionModalOpen(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
