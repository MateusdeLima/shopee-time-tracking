"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { format, isAfter, isBefore, parseISO, eachDayOfInterval } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Upload, AlertCircle, FileText, X, Check, PartyPopper } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getAbsenceRecordsByUserId, createAbsenceRecord, updateAbsenceRecord, deleteAbsenceRecord } from "@/lib/db"

const ABSENCE_REASONS = [
  { id: "medical", label: "Consulta Médica" },
  { id: "personal", label: "Compromisso Pessoal" },
  { id: "vacation", label: "Férias" },
  { id: "other", label: "Outro" },
]

interface AbsenceManagementProps {
  user: any
}

export function AbsenceManagement({ user }: AbsenceManagementProps) {
  const [absences, setAbsences] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    reason: "",
    customReason: "",
    dates: [] as Date[],
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    },
  })

  useEffect(() => {
    loadAbsences()
  }, [user.id])

  const loadAbsences = async () => {
    try {
      const userAbsences = await getAbsenceRecordsByUserId(user.id)
      if (Array.isArray(userAbsences)) {
        // Ordenar por data (mais recentes primeiro)
        userAbsences.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setAbsences(userAbsences)
      } else {
        console.error("loadAbsences: getAbsenceRecordsByUserId não retornou um array:", userAbsences)
        setAbsences([])
      }
    } catch (error) {
      console.error("Erro ao carregar ausências:", error)
      setAbsences([])
    }
  }

  const handleAddAbsence = () => {
    setFormData({
      reason: "",
      customReason: "",
      dates: [],
      dateRange: {
        start: null,
        end: null,
      },
    })
    setError("")
    setIsAddDialogOpen(true)
  }

  const handleReasonChange = (value: string) => {
    setFormData({
      ...formData,
      reason: value,
      customReason: value === "other" ? formData.customReason : "",
    })
  }

  const handleCustomReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      customReason: e.target.value,
    })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // Ajustar a data para meio-dia para evitar problemas de fuso horário
    const adjustedDate = new Date(date)
    adjustedDate.setHours(12, 0, 0, 0)

    // Se não temos data inicial, definimos esta como a data inicial
    if (!formData.dateRange.start) {
      setFormData({
        ...formData,
        dateRange: {
          start: adjustedDate,
          end: null,
        },
        dates: [adjustedDate],
      })
      return
    }

    // Se já temos uma data inicial, mas não uma data final
    if (formData.dateRange.start && !formData.dateRange.end) {
      // Ajustar a data inicial também
      const adjustedStart = new Date(formData.dateRange.start)
      adjustedStart.setHours(12, 0, 0, 0)

      // Se a data selecionada é anterior à data inicial, trocamos as datas
      if (isBefore(adjustedDate, adjustedStart)) {
        // Gerar todas as datas no intervalo
        const dateRange = eachDayOfInterval({
          start: adjustedDate,
          end: adjustedStart,
        }).map(d => {
          const adjusted = new Date(d)
          adjusted.setHours(12, 0, 0, 0)
          return adjusted
        })

        setFormData({
          ...formData,
          dateRange: {
            start: adjustedDate,
            end: adjustedStart,
          },
          dates: dateRange,
        })
      } else {
        // Caso contrário, a data selecionada é a data final
        // Gerar todas as datas no intervalo
        const dateRange = eachDayOfInterval({
          start: adjustedStart,
          end: adjustedDate,
        }).map(d => {
          const adjusted = new Date(d)
          adjusted.setHours(12, 0, 0, 0)
          return adjusted
        })

        setFormData({
          ...formData,
          dateRange: {
            start: adjustedStart,
            end: adjustedDate,
          },
          dates: dateRange,
        })
      }
    } else {
      // Se já temos ambas as datas, começamos um novo intervalo
      setFormData({
        ...formData,
        dateRange: {
          start: adjustedDate,
          end: null,
        },
        dates: [adjustedDate],
      })
    }
  }

  const handleSaveAbsence = () => {
    setError("")

    if (!formData.reason) {
      setError("Selecione um motivo para a ausência")
      return
    }

    if (formData.reason === "other" && !formData.customReason.trim()) {
      setError("Descreva o motivo da ausência")
      return
    }

    if (formData.dates.length === 0) {
      setError("Selecione pelo menos uma data para a ausência")
      return
    }

    // Verificar se todas as datas são futuras
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const hasPastDate = formData.dates.some((date) => {
      const dateToCheck = new Date(date)
      dateToCheck.setHours(0, 0, 0, 0)
      return dateToCheck < today
    })

    if (hasPastDate) {
      setError("Todas as datas devem ser futuras")
      return
    }

    try {
      // Formatar datas para string ISO mantendo o fuso horário local
      const formattedDates = formData.dates.map((date) => format(date, "yyyy-MM-dd"))

      // Determinar o status inicial com base no motivo
      const initialStatus = formData.reason === "vacation" ? "pending" : "pending"

      // Criar novo registro de ausência
      createAbsenceRecord({
        userId: user.id,
        reason: formData.reason,
        customReason: formData.reason === "other" ? formData.customReason : undefined,
        dates: formattedDates,
        status: initialStatus,
        dateRange:
          formData.dateRange.start && formData.dateRange.end
            ? {
                start: format(formData.dateRange.start, "yyyy-MM-dd"),
                end: format(formData.dateRange.end, "yyyy-MM-dd"),
              }
            : undefined,
      })

      toast({
        title: "Ausência registrada",
        description:
          formData.reason === "vacation"
            ? "Sua solicitação de férias foi registrada e está aguardando aprovação"
            : "Sua ausência foi registrada com sucesso",
      })

      // Atualizar lista e fechar diálogo
      loadAbsences()
      setIsAddDialogOpen(false)
    } catch (error: any) {
      setError(error.message || "Ocorreu um erro ao registrar a ausência")
    }
  }

  const handleUploadProof = (absenceId: number) => {
    setSelectedAbsence(absences.find((a) => a.id === absenceId))
    setIsUploadDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB",
        variant: "destructive",
      })
      return
    }

    // Verificar tipo do arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPEG, PNG, GIF) e PDF são permitidos",
        variant: "destructive",
      })
      return
    }

    // Converter arquivo para base64
    const reader = new FileReader()
    reader.onload = (event) => {
      if (!selectedAbsence) return

      try {
        // Atualizar registro com o documento
        updateAbsenceRecord(selectedAbsence.id, {
          proofDocument: event.target?.result as string,
          status: "completed",
        })

        toast({
          title: "Comprovante enviado",
          description: "Seu comprovante foi enviado com sucesso",
        })

        // Atualizar lista e fechar diálogo
        loadAbsences()
        setIsUploadDialogOpen(false)
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao enviar o comprovante",
          variant: "destructive",
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAbsence = (absenceId: number) => {
    if (confirm("Tem certeza que deseja excluir este registro de ausência?")) {
      try {
        deleteAbsenceRecord(absenceId)

        toast({
          title: "Ausência excluída",
          description: "O registro de ausência foi excluído com sucesso",
        })

        loadAbsences()
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao excluir a ausência",
          variant: "destructive",
        })
      }
    }
  }

  const formatDate = (dateString: string) => {
    // Criar uma nova data considerando que a string está em UTC
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const isDateInFuture = (dateString: string) => {
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return date >= today
  }

  const getReasonLabel = (absence: any) => {
    if (absence.reason === "other") {
      return absence.customReason
    }

    const reason = ABSENCE_REASONS.find((r) => r.id === absence.reason)
    return reason ? reason.label : "Motivo não especificado"
  }

  const isAbsenceActive = (absence: any) => {
    const expiresAt = new Date(absence.expiresAt)
    return isAfter(expiresAt, new Date())
  }

  const getStatusBadge = (absence: any) => {
    if (absence.status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Aprovado! <PartyPopper className="h-3 w-3 ml-1" />
        </Badge>
      )
    } else if (absence.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Comprovante Enviado
        </Badge>
      )
    } else if (absence.reason === "vacation") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Aguardando Aprovação
        </Badge>
      )
    }

    return null
  }

  const formatDateRange = (absence: any) => {
    if (absence.dateRange && absence.dateRange.start && absence.dateRange.end) {
      const [startYear, startMonth, startDay] = absence.dateRange.start.split('-').map(Number)
      const [endYear, endMonth, endDay] = absence.dateRange.end.split('-').map(Number)
      const startDate = new Date(startYear, startMonth - 1, startDay)
      const endDate = new Date(endYear, endMonth - 1, endDay)
      return `De ${format(startDate, "dd/MM/yyyy")} até ${format(endDate, "dd/MM/yyyy")}`
    } else if (absence.dates.length > 1) {
      return `${absence.dates.length} dias`
    } else {
      const [year, month, day] = absence.dates[0].split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "dd/MM/yyyy")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ausências Futuras</h3>
        <Button onClick={handleAddAbsence} className="bg-[#EE4D2D] hover:bg-[#D23F20]">
          Registrar Ausência
        </Button>
      </div>

      {absences.length === 0 ? (
        <div className="text-center p-6">
          <p className="text-gray-500">Você não possui ausências registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {absences.filter(isAbsenceActive).map((absence) => (
            <Card key={absence.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-medium">{getReasonLabel(absence)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">{formatDateRange(absence)}</div>

                    {absence.dates.length <= 5 && (
                      <div className="flex flex-wrap gap-2">
                        {absence.dates.map((date: string, index: number) => (
                          <Badge
                            key={index}
                            variant={isDateInFuture(date) ? "outline" : "default"}
                            className={
                              isDateInFuture(date)
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(date)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Registrado em: {format(parseISO(absence.createdAt), "dd/MM/yyyy")}
                    </p>

                    {getStatusBadge(absence)}

                    {absence.status === "pending" &&
                      absence.reason !== "vacation" &&
                      absence.dates.some(isDateInFuture) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleUploadProof(absence.id)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Enviar Comprovante
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para adicionar ausência */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Ausência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Motivo da Ausência</Label>
              <RadioGroup value={formData.reason} onValueChange={handleReasonChange}>
                {ABSENCE_REASONS.map((reason) => (
                  <div key={reason.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.id} id={reason.id} />
                    <Label htmlFor={reason.id}>{reason.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {formData.reason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Descreva o motivo</Label>
                <Textarea
                  id="customReason"
                  value={formData.customReason}
                  onChange={handleCustomReasonChange}
                  placeholder="Descreva o motivo da sua ausência"
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Datas de Ausência</Label>
              <p className="text-xs text-gray-500 mb-2">
                {formData.dateRange.start && !formData.dateRange.end
                  ? "Selecione a data final para criar um intervalo"
                  : "Selecione a data inicial e depois a data final para criar um intervalo"}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dates.length && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateRange.start && formData.dateRange.end
                      ? `De ${format(formData.dateRange.start, "dd/MM/yyyy")} até ${format(formData.dateRange.end, "dd/MM/yyyy")}`
                      : formData.dateRange.start
                        ? `Início: ${format(formData.dateRange.start, "dd/MM/yyyy")} - Selecione o fim`
                        : "Selecione as datas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dateRange.end ?? formData.dateRange.start ?? undefined}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      // Desabilitar datas passadas
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return isBefore(date, today)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {formData.dates.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    {formData.dates.length} {formData.dates.length === 1 ? "dia selecionado" : "dias selecionados"}
                  </p>

                  {formData.dates.length <= 5 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.dates.map((date, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {format(date, "dd/MM/yyyy")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {formData.reason === "vacation" && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  Solicitações de férias precisam ser aprovadas pelo administrador.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={handleSaveAbsence}>
                Registrar Ausência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para upload de comprovante */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Comprovante</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              Envie um comprovante para a ausência registrada em {selectedAbsence && formatDateRange(selectedAbsence)}
            </p>

            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
              <p className="text-xs text-gray-500 mt-1">Ou arraste e solte aqui</p>
              <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPEG, PNG, GIF, PDF</p>
              <p className="text-xs text-gray-500">Tamanho máximo: 5MB</p>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,application/pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

