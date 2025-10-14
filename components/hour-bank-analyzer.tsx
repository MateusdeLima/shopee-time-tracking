"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Clock, Upload, CheckCircle, XCircle, AlertCircle, Camera, Clipboard, FileImage } from "lucide-react"
import Image from "next/image"

interface HourBankAnalyzerProps {
  holidayId: string
  holidayName: string
  totalHours: number
  userId: string
  onHoursCompensated?: (compensatedHours: number) => void
}

interface AnalysisResult {
  approved: boolean
  detectedHours: number
  confidence: number
  reason: string
}

export default function HourBankAnalyzer({ 
  holidayId, 
  holidayName, 
  totalHours, 
  userId, 
  onHoursCompensated 
}: HourBankAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [declaredHours, setDeclaredHours] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handlePasteImage = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type)
            const reader = new FileReader()
            reader.onload = (event) => {
              setSelectedImage(event.target?.result as string)
            }
            reader.readAsDataURL(blob)
            return
          }
        }
      }
      
      toast({
        title: "Nenhuma imagem encontrada",
        description: "Copie uma imagem e tente novamente",
        variant: "destructive"
      })
    } catch (error) {
      toast({
        title: "Erro ao colar imagem",
        description: "Tente selecionar o arquivo manualmente",
        variant: "destructive"
      })
    }
  }

  const steps = [
    {
      title: "Como verificar seu banco de horas",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Passo a passo:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li>Acesse o sistema de ponto da Page</li>
              <li>Vá na seção "Banco de Horas" ou "Saldo de Horas"</li>
              <li>Localize o campo que mostra seu saldo atual</li>
              <li>Tire um print da tela mostrando claramente o saldo</li>
              <li>Certifique-se que a data e seu nome estejam visíveis</li>
            </ol>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">⚠️ Importante:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
              <li>A imagem deve ser clara e legível</li>
              <li>O saldo deve estar visível na tela</li>
              <li>Não edite ou altere a imagem</li>
              <li>Use apenas prints recentes (máximo 24h)</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">📱 Exemplo do que procurar:</h4>
            <p className="text-sm text-green-700">
              Procure por campos como: "Saldo: +2:30h", "Banco de Horas: 1h 45min", 
              "Crédito: 3:15" ou similar que mostre seu saldo positivo.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Anexar comprovante",
      content: (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {selectedImage ? (
              <div className="space-y-4">
                <div className="relative mx-auto w-48 h-32">
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
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar arquivo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePasteImage}
                      className="flex items-center gap-2"
                    >
                      <Clipboard className="h-4 w-4" />
                      Colar imagem
                    </Button>
                  </div>
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
              <Label htmlFor="hours">Quantas horas você tem no banco?</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="12"
                value={declaredHours}
                onChange={(e) => setDeclaredHours(e.target.value)}
                placeholder="Ex: 2.5 (para 2h 30min)"
                className="text-center text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 text-center">
                Use ponto para decimais (ex: 2.5 = 2h 30min)
              </p>
            </div>
          )}
        </div>
      )
    }
  ]

  const handleAnalyze = async () => {
    if (!selectedImage || !declaredHours) {
      toast({
        title: "Dados incompletos",
        description: "Anexe a imagem e informe as horas",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/hour-bank/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: selectedImage,
          declaredHours: parseFloat(declaredHours),
          holidayId,
          userId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro na análise')
      }

      setAnalysisResult(result)
      
      if (result.approved && onHoursCompensated) {
        onHoursCompensated(parseFloat(declaredHours))
      }

    } catch (error) {
      console.error('Erro na análise:', error)
      toast({
        title: "Erro na análise",
        description: "Tente novamente em alguns minutos",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetModal = () => {
    setSelectedImage(null)
    setDeclaredHours("")
    setAnalysisResult(null)
    setCurrentStep(1)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(resetModal, 300) // Aguarda animação de fechamento
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full flex items-center gap-2 border-[#EE4D2D] text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white transition-colors"
      >
        <Clock className="h-4 w-4" />
        Você já tem horas no seu banco da Page? Anexe o comprovante para compensar!
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#EE4D2D]">
              <Clock className="h-5 w-5" />
              Compensar Horas - {holidayName}
            </DialogTitle>
          </DialogHeader>

          {!analysisResult ? (
            <div className="space-y-6">
              {/* Informações do feriado */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Informações do Feriado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total de horas necessárias:</span>
                    <Badge variant="outline" className="font-semibold">
                      {totalHours}h
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Horas a compensar:</span>
                    <Badge variant="secondary" className="font-semibold">
                      {declaredHours ? `${declaredHours}h` : "0h"}
                    </Badge>
                  </div>
                  {declaredHours && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-semibold">Horas restantes:</span>
                      <Badge className="bg-[#EE4D2D] font-semibold">
                        {Math.max(0, totalHours - parseFloat(declaredHours))}h
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {steps.map((_, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                        ${currentStep > index + 1 ? 'bg-green-500 text-white' : 
                          currentStep === index + 1 ? 'bg-[#EE4D2D] text-white' : 
                          'bg-gray-200 text-gray-500'}
                      `}>
                        {currentStep > index + 1 ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-16 h-1 mx-2 ${
                          currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{steps[currentStep - 1].title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {steps[currentStep - 1].content}
                  </CardContent>
                </Card>
              </div>

              {/* Botões de navegação */}
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                )}
                
                {currentStep < steps.length ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
                    disabled={currentStep === 1 ? false : !selectedImage}
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    onClick={handleAnalyze}
                    disabled={!selectedImage || !declaredHours || isAnalyzing}
                    className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Analisar Comprovante
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Resultado da análise */
            <div className="space-y-6">
              <Card className={`border-2 ${
                analysisResult.approved ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2">
                    {analysisResult.approved ? (
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    ) : (
                      <XCircle className="h-12 w-12 text-red-500" />
                    )}
                  </div>
                  <CardTitle className={`text-xl ${
                    analysisResult.approved ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {analysisResult.approved ? 'Comprovante Aprovado!' : 'Comprovante Rejeitado'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Horas declaradas:</span>
                      <p className="font-semibold">{declaredHours}h</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Horas detectadas:</span>
                      <p className="font-semibold">{analysisResult.detectedHours}h</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Confiança:</span>
                      <p className="font-semibold">{analysisResult.confidence}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Badge className={analysisResult.approved ? 'bg-green-500' : 'bg-red-500'}>
                        {analysisResult.approved ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <span className="text-gray-600 text-sm">Motivo:</span>
                    <p className="font-medium">{analysisResult.reason}</p>
                  </div>

                  {analysisResult.approved && (
                    <div className="bg-green-100 p-3 rounded border border-green-300">
                      <p className="text-green-800 text-sm">
                        ✅ Suas {declaredHours}h foram compensadas com sucesso! 
                        Agora você precisa cumprir apenas {Math.max(0, totalHours - parseFloat(declaredHours))}h neste feriado.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Fechar
                </Button>
                {!analysisResult.approved && (
                  <Button
                    onClick={resetModal}
                    className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
                  >
                    Tentar Novamente
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
