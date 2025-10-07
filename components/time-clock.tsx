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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
    task: string
  ) => void
}

export function TimeClock({ user, selectedHoliday, onOvertimeCalculated }: TimeClockProps) {
  const [options, setOptions] = useState<any[]>([])
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<boolean>(false)
  const [groupedOptions, setGroupedOptions] = useState<any>({ antecipado: [], apos: [], misto: [] })
  const [task, setTask] = useState<string>("")
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false)

  useEffect(() => {
    if (user?.shift === "8-17" || user?.shift === "9-18") {
      setGroupedOptions(getOvertimeOptionsByShiftGrouped(user.shift))
      setOptions(getOvertimeOptionsByShift(user.shift))
    } else {
      setGroupedOptions({ antecipado: [], apos: [], misto: [] })
      setOptions([])
    }
  }, [user?.shift])

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

    if (!task.trim()) {
      setError("Por favor, preencha o projeto/task que está atuando.")
      return
    }

    if (task.trim().length < 10) {
      setError("Por favor, forneça uma descrição mais detalhada do projeto/task (mínimo 10 caracteres).")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Verificar o total de horas já registradas para este feriado
      const { used: horasRegistradas, max: horasMaximas } = await getUserHolidayStats(user.id, selectedHoliday.id)

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
        option.label,
        task.trim()
      )

      // Limpar seleção
      setSelectedOption("")
      setTask("")

      toast({
        title: "Horas extras registradas",
        description: `Foram registradas ${option.value === 0.5 ? "30 min" : `${option.value}h`} extras (${formatTimeString(startTime)} - ${formatTimeString(endTime)}). Total: ${horasRegistradas + option.value === 0.5 ? "30 min" : `${horasRegistradas + option.value}h`} de ${horasMaximas}h`,
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
            <div className="mb-6">
              <Label htmlFor="task" className="font-medium">Qual projeto/task está atuando?</Label>
              <input
                id="task"
                name="task"
                type="text"
                className="w-full border rounded px-3 py-2 mt-1"
                placeholder="Descreva o nome completo do projeto/task (ex: Projeto E-commerce - Implementação do carrinho de compras)"
                value={task}
                onChange={e => setTask(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Por favor, informe o nome completo do projeto e uma breve descrição da task
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Horários disponíveis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Coluna Antecipado */}
          <div>
                  <h4 className="text-md font-bold text-[#EE4D2D] mb-2 text-center">Antecipado</h4>
            <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
                    {groupedOptions.antecipado.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer">
                          {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
                {/* Coluna Após o Expediente */}
                <div>
                  <h4 className="text-md font-bold text-[#EE4D2D] mb-2 text-center">Após o Expediente</h4>
                  <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
                    {groupedOptions.apos.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                {/* Coluna Misto */}
                <div>
                  <h4 className="text-md font-bold text-[#EE4D2D] mb-2 text-center">Misto</h4>
                  <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
                    {groupedOptions.misto.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRegisterOvertime}
            className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]"
            disabled={loading || !selectedOption}
          >
            {loading ? "Processando..." : "Registrar Horas Extras"}
          </Button>
      </CardContent>
    </Card>
    </>
  )
}

