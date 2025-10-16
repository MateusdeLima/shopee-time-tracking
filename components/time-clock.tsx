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
      // Regra: apenas um registro por dia por usuário
      const today = new Date().toISOString().slice(0, 10)
      const userRecords = await getOvertimeRecordsByUserId(user.id)
      const hasTodayRecord = (userRecords || []).some((r: any) => (r.date || '').slice(0,10) === today)
      if (hasTodayRecord) {
        toast({
          variant: "destructive",
          title: "Limite diário atingido",
          description: "Você só pode registrar horas uma vez por dia. Fale com o admin para ajustar.",
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
    {showRejectionModal && (
      <BankHoursNotificationModal 
        userId={user.id}
        onClose={() => setShowRejectionModal(false)}
      />
    )}
    </>
  )
}

