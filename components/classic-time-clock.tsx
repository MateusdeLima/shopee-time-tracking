"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Clock, Upload, FileImage, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createOvertimeRecord, getOvertimeRecordsByUserId } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Image from "next/image"

interface OvertimeOption {
  id: string
  label: string
  value: number
}

// Função para obter opções de horário baseadas no commit original
function getOvertimeOptionsByShift(shift: "8-17" | "9-18") {
  if (shift === "8-17") {
    return [
      // Antecipado
      { id: "7h30_17h", label: "Entrar 7h30, sair 17h (30min extras)", value: 0.5, category: "antecipado" },
      { id: "7h_17h", label: "Entrar 7h, sair 17h (1h extra)", value: 1, category: "antecipado" },
      { id: "6h30_17h", label: "Entrar 6h30, sair 17h (1h30 extras)", value: 1.5, category: "antecipado" },
      { id: "6h_17h", label: "Entrar 6h, sair 17h (2h extras)", value: 2, category: "antecipado" },
      // Após o expediente
      { id: "8h_17h30", label: "Entrar 8h, sair 17h30 (30min extras)", value: 0.5, category: "apos" },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1, category: "apos" },
      { id: "8h_18h30", label: "Entrar 8h, sair 18h30 (1h30 extras)", value: 1.5, category: "apos" },
      { id: "8h_19h", label: "Entrar 8h, sair 19h (2h extras)", value: 2, category: "apos" },
      // Misto
      { id: "7h_18h", label: "Entrar 7h, sair 18h (2h extras)", value: 2, category: "misto" },
      { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (2h extras)", value: 2, category: "misto" },
      { id: "6h30_17h30", label: "Entrar 6h30, sair 17h30 (2h extras)", value: 2, category: "misto" },
      { id: "7h30_17h30", label: "Entrar 7h30, sair 17h30 (1h extra)", value: 1, category: "misto" },
    ]
  } else {
    return [
      // Antecipado
      { id: "8h30_18h", label: "Entrar 8h30, sair 18h (30min extras)", value: 0.5, category: "antecipado" },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1, category: "antecipado" },
      { id: "7h30_18h", label: "Entrar 7h30, sair 18h (1h30 extras)", value: 1.5, category: "antecipado" },
      { id: "7h_18h", label: "Entrar 7h, sair 18h (2h extras)", value: 2, category: "antecipado" },
      // Após o expediente
      { id: "9h_18h30", label: "Entrar 9h, sair 18h30 (30min extras)", value: 0.5, category: "apos" },
      { id: "9h_19h", label: "Entrar 9h, sair 19h (1h extra)", value: 1, category: "apos" },
      { id: "9h_19h30", label: "Entrar 9h, sair 19h30 (1h30 extras)", value: 1.5, category: "apos" },
      { id: "9h_20h", label: "Entrar 9h, sair 20h (2h extras)", value: 2, category: "apos" },
      // Misto
      { id: "8h_19h", label: "Entrar 8h, sair 19h (2h extras)", value: 2, category: "misto" },
      { id: "8h30_19h30", label: "Entrar 8h30, sair 19h30 (2h extras)", value: 2, category: "misto" },
      { id: "7h30_18h30", label: "Entrar 7h30, sair 18h30 (2h extras)", value: 2, category: "misto" },
      { id: "8h30_18h30", label: "Entrar 8h30, sair 18h30 (1h extra)", value: 1, category: "misto" },
    ]
  }
}

interface ClassicTimeClockProps {
  user: any
  selectedHoliday: any
  onUpdate?: () => void
}

export function ClassicTimeClock({ user, selectedHoliday, onUpdate }: ClassicTimeClockProps) {
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showExampleImage, setShowExampleImage] = useState(false)
  const [isHourBankDialogOpen, setIsHourBankDialogOpen] = useState(false)
  const [hourBankStep, setHourBankStep] = useState(1)
  const [selectedBankImage, setSelectedBankImage] = useState<File | null>(null)
  const [declaredHours, setDeclaredHours] = useState("")
  const [holidayStats, setHolidayStats] = useState({ used: 0, max: 0, compensated: 0 })
  const bankFileInputRef = useRef<HTMLInputElement>(null)

  const overtimeOptions = getOvertimeOptionsByShift(user?.shift || "8-17")

  // Carregar estatísticas do feriado
  useEffect(() => {
    const loadHolidayStats = async () => {
      if (!user?.id || !selectedHoliday?.id) return
      
      try {
        const { getUserHolidayStats } = await import("@/lib/db")
        const stats = await getUserHolidayStats(user.id, selectedHoliday.id)
        setHolidayStats(stats)
      } catch (error) {
        console.error("Erro ao carregar estatísticas do feriado:", error)
      }
    }
    
    loadHolidayStats()
  }, [user?.id, selectedHoliday?.id])

  // Filtrar opções baseado nas horas restantes
  const getFilteredOptions = () => {
    const horasRestantes = holidayStats.max - holidayStats.used
    
    // Se já atingiu ou ultrapassou o limite, não mostrar nenhuma opção
    if (horasRestantes <= 0) {
      return []
    }
    
    // Filtrar opções que não ultrapassem as horas restantes
    return overtimeOptions.filter(opt => opt.value <= horasRestantes)
  }

  const filteredOptions = getFilteredOptions()

  // Agrupar opções filtradas por categoria
  const groupedOptions = {
    antecipado: filteredOptions.filter(opt => (opt as any).category === "antecipado"),
    apos: filteredOptions.filter(opt => (opt as any).category === "apos"),
    misto: filteredOptions.filter(opt => (opt as any).category === "misto"),
  }



  const handleOptionChange = (value: string) => {
    setSelectedOption(value)
    setError("")
  }

  const handleBankFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedBankImage(file)
    }
  }

  const handleSubmitHourBank = async () => {
    if (!selectedBankImage || !declaredHours) return

    setHourBankStep(2) // Loading

    try {
      // Converter imagem para base64 para salvar via MCP
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(selectedBankImage)
      })

      // Criar registro de banco de horas para dashboard analytics
      const record = await createOvertimeRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        holidayName: selectedHoliday.name,
        date: new Date().toISOString().slice(0, 10),
        optionId: "manual_bank_hours", // Identificador para dashboard analytics
        optionLabel: `Comprovante Banco de Horas - ${declaredHours}h`,
        hours: parseFloat(declaredHours.replace(',', '.')) || 0,
        startTime: "00:00",
        endTime: "00:00",
        status: "pending_admin", // Aguardando aprovação no dashboard analytics
        proofImage: imageBase64, // Salvar imagem em base64 via MCP
      })
      
      setHourBankStep(3) // Sucesso
      
      toast({
        title: "Comprovante enviado!",
        description: "Seu comprovante foi enviado ao dashboard analytics para aprovação."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Falha ao enviar comprovante. Tente novamente."
      })
      setHourBankStep(1)
    }
  }


  // Função para extrair horários da opção selecionada
  const getTimesFromOption = (optionId: string): [string, string] => {
    const [start, end] = optionId.split("_")
    
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

  const handleRegisterOvertime = async () => {
    if (!selectedOption) {
      setError("Selecione um horário para continuar.")
      return
    }

    // Verificar se ainda há horas disponíveis
    const horasRestantes = holidayStats.max - holidayStats.used
    if (horasRestantes <= 0) {
      setError("Você já atingiu o limite máximo de horas para este feriado.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const option = filteredOptions.find(opt => opt.id === selectedOption)
      if (!option) throw new Error("Opção inválida")

      const [startTime, endTime] = getTimesFromOption(selectedOption)

      // Criar registro de horas extras
      await createOvertimeRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        holidayName: selectedHoliday.name,
        date: new Date().toISOString().slice(0, 10),
        optionId: selectedOption,
        optionLabel: option.label,
        hours: option.value,
        startTime: startTime,
        endTime: endTime,
        status: "approved",
        proofImage: "Não anexado",
      })

      toast({
        title: "Horas extras registradas!",
        description: `Horário ${option.label} registrado e aprovado automaticamente.`
      })

      // Reset form
      setSelectedOption("")
      
      // Recarregar estatísticas do feriado
      const { getUserHolidayStats } = await import("@/lib/db")
      const updatedStats = await getUserHolidayStats(user.id, selectedHoliday.id)
      setHolidayStats(updatedStats)
      
      // Pequeno delay para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (onUpdate) onUpdate()

    } catch (error: any) {
      setError(error.message || "Falha ao registrar horas extras. Tente novamente!")
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: error.message || "Falha ao registrar horas extras. Tente novamente."
      })
    } finally {
      setLoading(false)
    }
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
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 min-h-[44px] text-sm sm:text-sm"
                onClick={() => setIsHourBankDialogOpen(true)}
              >
                📸 Anexar Comprovante do Banco de Horas
              </Button>
            </div>
          </div>

          {/* Seleção de Horários */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Horários disponíveis</h3>
            
            {/* Informações sobre horas restantes */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Horas registradas: <strong>{holidayStats.used}h</strong></span>
                <span>Limite máximo: <strong>{holidayStats.max}h</strong></span>
                <span>Restantes: <strong>{Math.max(0, holidayStats.max - holidayStats.used)}h</strong></span>
              </div>
              {holidayStats.compensated > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {holidayStats.compensated}h foram compensadas pelo seu banco de horas da Page
                </p>
              )}
            </div>

            {filteredOptions.length === 0 ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limite atingido!</strong> Você já completou todas as horas permitidas para este feriado.
                  {holidayStats.used > holidayStats.max && (
                    <span className="block mt-1 text-orange-600">
                      Você registrou {holidayStats.used - holidayStats.max}h a mais que o limite.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Coluna Antecipado */}
              <div>
                <h4 className="text-md font-bold text-[#EE4D2D] mb-2 text-center">Antecipado</h4>
                <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
                  {groupedOptions.antecipado.map((option: any) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 sm:p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2 min-h-[44px]">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer text-sm">
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
                    <div key={option.id} className="flex items-center space-x-2 p-3 sm:p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2 min-h-[44px]">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer text-sm">
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
                    <div key={option.id} className="flex items-center space-x-2 p-3 sm:p-2 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2 min-h-[44px]">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
            )}
          </div>


          <Button
            onClick={handleRegisterOvertime}
            className="w-full bg-[#EE4D2D] hover:bg-[#D23F20] min-h-[48px] text-base sm:text-sm"
            disabled={loading || !selectedOption || filteredOptions.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Registrar Horas Extras"
            )}
          </Button>
        </div>
      </CardContent>

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
                    <FileImage className="h-4 w-4" />
                    Ver imagem base
                  </button>
                </div>
              </div>

              {/* Upload da imagem */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Anexar comprovante do Page Interim:</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => bankFileInputRef.current?.click()}
                >
                  {selectedBankImage ? (
                    <div className="space-y-2">
                      <FileImage className="h-8 w-8 mx-auto text-green-600" />
                      <p className="text-sm text-green-800 font-medium">{selectedBankImage.name}</p>
                      <p className="text-xs text-gray-500">Clique para trocar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileImage className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">Clique para selecionar a imagem</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={bankFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBankFileChange}
                  className="hidden"
                />
              </div>

              {/* Campo de horas declaradas */}
              {selectedBankImage && (
                <div className="space-y-2">
                  <Label htmlFor="declaredHours" className="text-sm font-medium">
                    Quantas horas aparecem no seu "Saldo Atual"? *
                  </Label>
                  <Input
                    id="declaredHours"
                    value={declaredHours}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeclaredHours(e.target.value)}
                    placeholder="Ex: 02:00 ou 2.5"
                    className="mt-1"
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
                  disabled={!selectedBankImage || !declaredHours}
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
              <div className='flex justify-center'>
                <CheckCircle className='h-16 w-16 text-green-500 mx-auto' />
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-4">Comprovante enviado!</h3>
              <p className="text-green-700 max-w-xs mx-auto">
                Seu comprovante foi enviado ao dashboard analytics. Você será avisado(a) automaticamente se ele for aprovado ou reprovado.<br/>
                Você pode acompanhar o status na tela principal do sistema.
              </p>
              <Button 
                onClick={() => {
                  setIsHourBankDialogOpen(false);
                  setHourBankStep(1);
                  setSelectedBankImage(null);
                  setDeclaredHours("")
                }} 
                className="bg-[#EE4D2D] hover:bg-[#D23F20] w-52 mx-auto"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal da Imagem Base */}
      <Dialog open={showExampleImage} onOpenChange={setShowExampleImage}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
    </Card>
  )
}
