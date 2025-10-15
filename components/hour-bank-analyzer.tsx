"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [showExampleImage, setShowExampleImage] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [declaredHours, setDeclaredHours] = useState("")
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
              <li>Acesse o sistema <strong>Page Interim</strong></li>
              <li>Vá na seção <strong>"Saldo Banco de Horas"</strong></li>
              <li>Tire um print da tela completa mostrando:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Cabeçalho "Page Interim" visível</li>
                  <li>Seu nome na coluna "Nome"</li>
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
          {selectedImage ? (
            <div className="border-2 border-dashed border-[#EE4D2D] bg-orange-50 rounded-lg p-6 text-center">
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
            </div>
          ) : (
            <>
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
              
              {/* Botão separado para colar imagem */}
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handlePasteImage}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-[#EE4D2D] hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hover:border-[#EE4D2D]"
                >
                  <Clipboard className="h-4 w-4" />
                  Colar imagem da área de transferência
                </button>
              </div>
            </>
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
      const response = await fetch('/api/hour-bank/submit', {
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

      // Sucesso no envio - mostrar mensagem e fechar modal
      toast({
        title: "Comprovante Enviado!",
        description: "Seu comprovante será analisado por nossos admins.",
      })
      
      // Fechar modal automaticamente após 2 segundos
      setTimeout(() => {
        setIsOpen(false)
        resetModal()
      }, 2000)

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
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enviar Comprovante
                      </>
                    )}
                  </Button>
                )}
              </div>
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
            <DialogDescription className="text-center text-sm text-gray-600">
              Esta é a imagem de exemplo do sistema Page Interim
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Imagem de exemplo */}
            <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6 text-center">
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                {/* Simulação da tela do Page Interim */}
                <div className="space-y-4">
                  {/* Cabeçalho */}
                  <div className="bg-blue-600 text-white p-3 rounded-t-lg">
                    <h3 className="font-bold text-lg">Page Interim</h3>
                    <p className="text-sm opacity-90">Sistema de Controle de Ponto</p>
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="p-4 space-y-3">
                    <h4 className="font-semibold text-gray-800">Saldo Banco de Horas</h4>
                    
                    {/* Tabela simulada */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 p-2 border-b">
                        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                          <span>Nome</span>
                          <span>Saldo Atual</span>
                          <span>Data Atualização</span>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="font-medium text-blue-600">João Silva</span>
                          <span className="font-bold text-green-600 text-lg">02:30</span>
                          <span className="text-gray-600">14/10/2025</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Informações da empresa */}
                    <div className="text-xs text-gray-500 mt-4">
                      <p>Empresa: Shopee Brasil Ltda.</p>
                      <p>Período: Outubro 2025</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Instruções */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">✓ O que a IA procura:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                <li><strong>Cabeçalho "Page Interim"</strong> - Confirma que é o sistema correto</li>
                <li><strong>Seu nome</strong> - Valida que é seu comprovante</li>
                <li><strong>"Saldo Atual" visível</strong> - Deve mostrar o valor em formato HH:MM</li>
                <li><strong>Data recente</strong> - Máximo 24 horas de diferença</li>
                <li><strong>Informações da empresa</strong> - Confirma autenticidade</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Importante:</h4>
              <p className="text-sm text-amber-700">
                A imagem deve mostrar claramente o <strong>"Saldo Atual"</strong> no formato HH:MM 
                (ex: 02:00 = 2 horas). A IA compara sua imagem com este padrão para validar 
                se todas as informações necessárias estão presentes.
              </p>
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
    </>
  )
}
