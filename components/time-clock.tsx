"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Clock, AlertCircle, Upload, FileImage, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { determineOvertimeOption, getOvertimeRecordsByUserId, getUserHolidayStats } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRef } from "react"

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
  
  // Estados para banco de horas
  const [isHourBankDialogOpen, setIsHourBankDialogOpen] = useState(false)
  const [hourBankStep, setHourBankStep] = useState(1) // 1: anexar, 2: loading, 3: resultado
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [declaredHours, setDeclaredHours] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
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
        task.trim()
      )

      // Limpar seleção
      setSelectedOption("")
      setTask("")

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

  const handleAnalyzeImage = async () => {
    if (!selectedImage || !declaredHours) {
      toast({
        title: "Dados incompletos",
        description: "Anexe a imagem e informe as horas",
        variant: "destructive"
      })
      return
    }

    setHourBankStep(2) // Ir para tela de loading
    setIsAnalyzing(true)

    try {
      // Usar API completa com novo fluxo
      const response = await fetch('/api/hour-bank/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: selectedImage,
          declaredHours: parseFloat(declaredHours),
          holidayId: selectedHoliday.id,
          userId: user.id
        })
      })

      const result = await response.json()
      console.log('Resposta da API:', result)

      if (!response.ok) {
        console.error('Erro da API:', result)
        const errorMsg = result.details || result.error || 'Erro na análise'
        throw new Error(errorMsg)
      }

      setAnalysisResult(result)
      setHourBankStep(3) // Ir para tela de resultado
    } catch (error) {
      console.error('Erro na análise:', error)
      
      let errorMessage = "Não foi possível analisar a imagem. Tente novamente."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "Erro na análise",
        description: errorMessage,
        variant: "destructive"
      })
      setHourBankStep(1) // Voltar para tela inicial
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTryAgain = () => {
    setHourBankStep(1)
    setSelectedImage(null)
    setDeclaredHours("")
    setAnalysisResult(null)
  }

  const handleFinishHourBank = async () => {
    if (analysisResult?.approved) {
      // Atualizar estatísticas do feriado
      await refreshHolidayStats()
      
      toast({
        title: "Solicitação enviada!",
        description: `${analysisResult.detectedHours}h foram aprovadas pela IA e enviadas para verificação no Dashboard Analytics. Aguarde a aprovação final.`,
      })
    }
    
    // Fechar modal e resetar
    setIsHourBankDialogOpen(false)
    setHourBankStep(1)
    setSelectedImage(null)
    setDeclaredHours("")
    setAnalysisResult(null)
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

            {/* Botão de Banco de Horas */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Você já tem horas no seu banco da Page?</h4>
                    <p className="text-sm text-blue-600">Anexe o comprovante para compensar suas horas!</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => setIsHourBankDialogOpen(true)}
                >
                  📸 Anexar Comprovante do Banco de Horas
                </Button>
              </div>
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
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>Acesse o sistema <strong>Page Interim</strong></li>
                <li>Vá na seção <strong>"Saldo Banco de Horas"</strong></li>
                <li>Tire um print da tela completa mostrando:</li>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Cabeçalho "Page Interim" visível</li>
                  <li>Seu nome na coluna "Nome"</li>
                  <li>Valor no <strong>"Saldo Atual"</strong> (ex: 02:00)</li>
                  <li>Data e informações da empresa</li>
                </ul>
              </ol>
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                <strong>⚠️ Importante:</strong> A imagem deve mostrar claramente o "Saldo Atual" no formato HH:MM (ex: 02:00 = 2 horas)
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {selectedImage ? (
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
              ) : (
                <div className="space-y-4">
                  <FileImage className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Anexe o print do seu banco de horas
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar arquivo
                    </Button>
                  </div>
                </div>
              )}
            </div>

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
                onClick={handleAnalyzeImage}
                disabled={!selectedImage || !declaredHours}
                className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
              >
                Analisar Imagem
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
              <h3 className="text-xl font-semibold mb-2">Analisando sua imagem, um momento...</h3>
              <p className="text-gray-600">
                Nossa IA está verificando o comprovante do seu banco de horas
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Resultado */}
        {hourBankStep === 3 && analysisResult && (
          <div className="space-y-6">
            <div className="text-center">
              {analysisResult.approved ? (
                <div className="space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                      ✅ Comprovante Aprovado!
                    </h3>
                    <p className="text-green-700">
                      Detectamos {analysisResult.detectedHours}h no seu banco de horas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold text-red-800 mb-2">
                      ❌ Comprovante Rejeitado
                    </h3>
                    <p className="text-red-700">
                      Não foi possível validar o comprovante
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Detalhes da Análise:</h4>
              <p className="text-sm text-gray-700">{analysisResult.reason}</p>
              <div className="mt-2 text-xs text-gray-500">
                Confiança: {analysisResult.confidence}%
              </div>
            </div>

            {selectedImage && (
              <div className="text-center">
                <h4 className="font-semibold mb-2">Imagem Analisada:</h4>
                <div className="relative mx-auto w-48 h-32">
                  <Image
                    src={selectedImage}
                    alt="Comprovante analisado"
                    fill
                    className="object-contain rounded-lg border"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTryAgain}
                className="flex-1"
              >
                Enviar Novamente
              </Button>
              <Button
                onClick={handleFinishHourBank}
                className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}

