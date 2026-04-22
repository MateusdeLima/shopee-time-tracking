"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Clock, Upload, FileImage, Loader2, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { determineOvertimeOption, createOvertimeRecord, calculateOvertimeHours } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRef } from "react"

interface OvertimeOption {
  id: string
  label: string
  value: number
}

// Função para obter opções de horário simplificadas
function getOvertimeOptionsByShift(shift: "8-17" | "9-18") {
  if (shift === "8-17") {
    return [
      { id: "7h30_17h", label: "Entrar 7h30, sair 17h (30min extras)", value: 0.5 },
      { id: "7h_17h", label: "Entrar 7h, sair 17h (1h extra)", value: 1 },
      { id: "6h30_17h", label: "Entrar 6h30, sair 17h (1h30 extras)", value: 1.5 },
      { id: "6h_17h", label: "Entrar 6h, sair 17h (2h extras)", value: 2 },
      { id: "8h_17h30", label: "Entrar 8h, sair 17h30 (30min extras)", value: 0.5 },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
      { id: "8h_18h30", label: "Entrar 8h, sair 18h30 (1h30 extras)", value: 1.5 },
      { id: "8h_19h", label: "Entrar 8h, sair 19h (2h extras)", value: 2 },
    ]
  } else {
    return [
      { id: "8h30_18h", label: "Entrar 8h30, sair 18h (30min extras)", value: 0.5 },
      { id: "8h_18h", label: "Entrar 8h, sair 18h (1h extra)", value: 1 },
      { id: "7h30_18h", label: "Entrar 7h30, sair 18h (1h30 extras)", value: 1.5 },
      { id: "7h_18h", label: "Entrar 7h, sair 18h (2h extras)", value: 2 },
      { id: "9h_18h30", label: "Entrar 9h, sair 18h30 (30min extras)", value: 0.5 },
      { id: "9h_19h", label: "Entrar 9h, sair 19h (1h extra)", value: 1 },
      { id: "9h_19h30", label: "Entrar 9h, sair 19h30 (1h30 extras)", value: 1.5 },
      { id: "9h_20h", label: "Entrar 9h, sair 20h (2h extras)", value: 2 },
    ]
  }
}

interface SimpleTimeClockProps {
  user: any
  selectedHoliday: any
  onUpdate?: () => void
}

export function SimpleTimeClock({ user, selectedHoliday, onUpdate }: SimpleTimeClockProps) {
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const overtimeOptions = getOvertimeOptionsByShift(user?.shift || "8-17")

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setPreviewUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!selectedOption) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um horário para continuar."
      })
      return
    }

    if (!uploadedFile) {
      toast({
        variant: "destructive",
        title: "Erro", 
        description: "Anexe um comprovante de horas para continuar."
      })
      return
    }

    setLoading(true)
    try {
      const option = overtimeOptions.find(opt => opt.id === selectedOption)
      if (!option) throw new Error("Opção inválida")

      // Extrair horários da opção selecionada
      const [startPart, endPart] = option.id.split('_')
      const startTime = startPart.replace('h', ':').replace('30', '30')
      const endTime = endPart.replace('h', ':').replace('30', '30')
      
      // Criar registro de horas extras
      await createOvertimeRecord({
        userId: user.id,
        holidayId: selectedHoliday.id,
        holidayName: selectedHoliday.name,
        date: new Date().toISOString().slice(0, 10),
        optionId: "manual_bank_hours",
        optionLabel: "Banco de Horas Manual",
        hours: option.value,
        startTime: startTime,
        endTime: endTime,
        status: "pending_admin", // Aguardando aprovação no dashboard analytics
        proofImage: uploadedFile.name, // Salvar nome do arquivo
      })

      toast({
        title: "Registro enviado!",
        description: `Horário ${option.label} registrado e enviado para aprovação.`
      })

      // Reset form
      setSelectedOption("")
      setUploadedFile(null)
      setPreviewUrl("")
      setIsDialogOpen(false)
      
      if (onUpdate) onUpdate()

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: error.message || "Tente novamente."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registro de Horas Extras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Escolha o horário que você pretende fazer no feriado <strong>{selectedHoliday?.name}</strong> e anexe um comprovante.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Selecione o horário:</Label>
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              {overtimeOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Comprovante de horas:</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Image
                      src={previewUrl}
                      alt="Comprovante"
                      width={200}
                      height={150}
                      className="rounded-lg object-cover mx-auto"
                    />
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Trocar arquivo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <FileImage className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Anexe uma foto do seu comprovante de horas
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar arquivo
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedOption || !uploadedFile}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Registrar horário
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
