"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Clock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { determineOvertimeOption, getOvertimeRecordsByUserId, getUserHolidayStats } from "@/lib/db"

interface OvertimeOption {
  id: string
  label: string
  value: number
}

interface OvertimeOptions {
  horario9h: OvertimeOption[]
  horario8h: OvertimeOption[]
}

// Função para obter todas as opções de horário
function getAllOvertimeOptions(): OvertimeOptions {
  // Todas as opções de horário disponíveis
  return {
    horario9h: [
      // Opções para 30 minutos (0.5h)
      { id: "8h30_18h", label: "8:30h às 18h", value: 0.5 },
      { id: "9h_18h30", label: "9h às 18:30h", value: 0.5 },
      // Opções para 1 hora
      { id: "8h_18h_9h", label: "8h às 18h", value: 1 },
      { id: "9h_19h", label: "9h às 19h", value: 1 },
      // Opções para 2 horas
      { id: "7h_18h_9h", label: "7h às 18h", value: 2 },
  { id: "9h_20h", label: "9h às 20h", value: 2 },
    ],
    horario8h: [
      // Opções para 30 minutos (0.5h)
      { id: "7h30_17h", label: "7:30h às 17h", value: 0.5 },
      { id: "8h_17h30", label: "8h às 17:30h", value: 0.5 },
      // Opções para 1 hora
      { id: "7h_17h", label: "7h às 17h", value: 1 },
      { id: "8h_18h_8h", label: "8h às 18h", value: 1 },
      // Opções para 2 horas
      { id: "6h_17h", label: "6h às 17h", value: 2 },
  { id: "8h_19h", label: "8h às 19h", value: 2 },
]
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
  const [overtimeOptions, setOvertimeOptions] = useState<OvertimeOptions>({ horario9h: [], horario8h: [] })
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<boolean>(false)

  useEffect(() => {
    const options = getAllOvertimeOptions()
    setOvertimeOptions(options)
  }, [])

  const handleOptionChange = (optionId: string) => {
    setSelectedOption(optionId)
    setError("")

    const allOptions = [...overtimeOptions.horario9h, ...overtimeOptions.horario8h]
    const option = allOptions.find((opt: OvertimeOption) => opt.id === optionId)

    if (option) {
      // ... existing code ...
    }
  }

  const handleRegisterOvertime = async () => {
    if (!selectedHoliday) {
      setError("Selecione um feriado para registrar horas extras")
      return
    }

    if (!selectedOption) {
      setError("Por favor, selecione uma opção de horário")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Verificar o total de horas já registradas para este feriado
      const { used: horasRegistradas, max: horasMaximas } = await getUserHolidayStats(user.id, selectedHoliday.id)

      const allOptions = [...overtimeOptions.horario9h, ...overtimeOptions.horario8h]
      const option = allOptions.find((opt: OvertimeOption) => opt.id === selectedOption)

      if (!option) {
        setError("Opção de horário inválida")
        setLoading(false)
        return
      }

      // Verificar se o novo registro ultrapassará o limite de horas
      if (horasRegistradas + option.value > horasMaximas) {
        const horasRestantes = horasMaximas - horasRegistradas
        toast({
          variant: "destructive",
          title: "Limite de horas excedido",
          description: `Você já registrou ${horasRegistradas}h de ${horasMaximas}h permitidas. Restam ${horasRestantes}h para este feriado.`
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
        option.label
      )

      // Limpar seleção
      setSelectedOption("")

      toast({
        title: "Horas extras registradas",
        description: `Foram registradas ${option.value === 0.5 ? "30 min" : `${option.value}h`} extras (${option.label}). Total: ${horasRegistradas + option.value === 0.5 ? "30 min" : `${horasRegistradas + option.value}h`} de ${horasMaximas}h`,
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

  // Função para extrair horários de entrada e saída da opção
  const getTimesFromOption = (optionId: string): [string, string] => {
    // Remover sufixos _9h e _8h dos IDs
    const baseId = optionId.replace(/_[89]h$/, "")
    const [start, end] = baseId.split("_")
    const startTime = start.replace("h", ":00")
    const endTime = end.replace("h", ":00")
    return [startTime, endTime]
  }

  if (!selectedHoliday) {
    return null
  }

  return (
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
          <div>
            <h3 className="text-lg font-semibold mb-4">Horários disponíveis</h3>
            <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
              <div className="space-y-6">
                {/* Seção para horário das 9h */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-[#EE4D2D]">Horário padrão (9h às 18h)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {overtimeOptions.horario9h.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer">
                            {option.label} ({option.value === 0.5 ? "30 min" : `${option.value}h`})
                  </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção para horário das 8h */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-[#EE4D2D]">Horário alternativo (8h às 17h)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {overtimeOptions.horario8h.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="cursor-pointer">
                            {option.label} ({option.value === 0.5 ? "30 min" : `${option.value}h`})
                          </Label>
                        </div>
                </div>
              ))}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleRegisterOvertime}
            className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]"
            disabled={loading || !selectedOption}
          >
            {loading ? "Processando..." : "Registrar Horas Extras"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

