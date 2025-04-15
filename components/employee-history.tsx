"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Edit2, Trash2, AlertCircle, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  getHolidays,
  getOvertimeRecordsByUserId,
  updateOvertimeRecord,
  deleteOvertimeRecord,
  getUserHolidayStats,
} from "@/lib/db"

const OVERTIME_OPTIONS = [
  { id: "7h_18h", label: "7h às 18h", value: 2 },
  { id: "9h_20h", label: "9h às 20h", value: 2 },
  { id: "8h_19h", label: "8h às 19h", value: 2 },
  { id: "8h_18h", label: "8h às 18h", value: 1 },
  { id: "9h_19h", label: "9h às 19h", value: 1 },
]

interface EmployeeHistoryProps {
  user: any
}

export function EmployeeHistory({ user }: EmployeeHistoryProps) {
  const [records, setRecords] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [selectedOption, setSelectedOption] = useState("")
  const [error, setError] = useState("")
  const [holidayHoursMap, setHolidayHoursMap] = useState<Record<number, { used: number; max: number }>>({})

  useEffect(() => {
    // Carregar feriados
    const loadHolidays = async () => {
      try {
        const allHolidays = await getHolidays()
        if (Array.isArray(allHolidays)) {
          setHolidays(allHolidays)
        } else {
          console.error("getHolidays() did not return an array:", allHolidays)
          setHolidays([])
        }
      } catch (error) {
        console.error("Error loading holidays:", error)
        setHolidays([])
      }
    }

    // Carregar registros do usuário
    const loadUserRecords = async () => {
      try {
        const userRecords = await getOvertimeRecordsByUserId(user.id)
        if (Array.isArray(userRecords)) {
          // Ordenar por data (mais recentes primeiro)
          userRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setRecords(userRecords)
        } else {
          console.error("getOvertimeRecordsByUserId() did not return an array:", userRecords)
          setRecords([])
        }
      } catch (error) {
        console.error("Error loading user records:", error)
        setRecords([])
      }
    }

    // Calcular horas usadas por feriado
    const calculateHoursMap = async () => {
      try {
        if (Array.isArray(holidays)) {
          const hoursMap: Record<number, { used: number; max: number }> = {}
          for (const holiday of holidays) {
            const stats = await getUserHolidayStats(user.id, holiday.id)
            hoursMap[holiday.id] = stats
          }
          setHolidayHoursMap(hoursMap)
        }
      } catch (error) {
        console.error("Error calculating hours map:", error)
      }
    }

    loadHolidays()
    loadUserRecords()

    // Calculate hours map after holidays are loaded
    calculateHoursMap()
  }, [user.id, holidays])

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setSelectedOption(record.optionId)
    setError("")
    setIsEditing(true)
  }

  const handleDelete = (recordId: number) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      // Excluir registro
      deleteOvertimeRecord(recordId)

      // Atualizar estado
      const updatedUserRecords = records.filter((record) => record.id !== recordId)
      setRecords(updatedUserRecords)

      // Atualizar mapa de horas
      const deletedRecord = records.find((record) => record.id === recordId)
      if (deletedRecord) {
        const holidayId = deletedRecord.holidayId
        const currentHoursInfo = holidayHoursMap[holidayId]

        if (currentHoursInfo) {
          setHolidayHoursMap({
            ...holidayHoursMap,
            [holidayId]: {
              ...currentHoursInfo,
              used: currentHoursInfo.used - deletedRecord.hours,
            },
          })
        }
      }

      toast({
        title: "Registro excluído",
        description: "O registro de horas extras foi excluído com sucesso",
      })
    }
  }

  const handleSaveEdit = () => {
    if (!selectedOption) {
      setError("Selecione uma opção de hora extra")
      return
    }

    // Obter detalhes da opção selecionada
    const option = OVERTIME_OPTIONS.find((opt) => opt.id === selectedOption)
    if (!option) {
      setError("Opção inválida")
      return
    }

    // Calcular quantas horas seriam usadas após a edição
    const holidayId = selectedRecord.holidayId
    const currentHoursInfo = holidayHoursMap[holidayId]

    // Calcular o total de horas que seria usado
    const hoursDifference = option.value - selectedRecord.hours
    const newTotalHours = currentHoursInfo.used + hoursDifference

    // Verificar se a edição excederia o máximo de horas
    if (newTotalHours > currentHoursInfo.max) {
      setError(`Esta alteração excederia o limite de ${currentHoursInfo.max}h para este feriado`)
      return
    }

    try {
      // Atualizar o registro
      const updatedRecord = updateOvertimeRecord(selectedRecord.id, {
        optionId: selectedOption,
        optionLabel: option.label,
        hours: option.value,
      })

      // Atualizar estado
      const updatedRecords = records.map((record) => (record.id === selectedRecord.id ? updatedRecord : record))
      setRecords(updatedRecords)

      // Atualizar mapa de horas
      setHolidayHoursMap({
        ...holidayHoursMap,
        [holidayId]: {
          ...currentHoursInfo,
          used: newTotalHours,
        },
      })

      toast({
        title: "Registro atualizado",
        description: "O registro de horas extras foi atualizado com sucesso",
      })

      // Resetar estado de edição
      setIsEditing(false)
      setSelectedRecord(null)
      setSelectedOption("")
    } catch (error: any) {
      setError(error.message || "Falha ao atualizar registro. Tente novamente.")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A"
    return timeString
  }

  // Get available options for editing based on remaining hours
  const getAvailableOptions = (record: any) => {
    const holidayId = record.holidayId
    const currentHoursInfo = holidayHoursMap[holidayId]

    if (!currentHoursInfo) return OVERTIME_OPTIONS

    // Calculate remaining hours plus the current record's hours (since we're replacing it)
    const remainingHours = currentHoursInfo.max - currentHoursInfo.used + record.hours

    return OVERTIME_OPTIONS.filter((option) => option.value <= remainingHours)
  }

  if (records.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Você ainda não possui registros de horas extras</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {records.map((record) => {
        const holiday = holidays.find((h) => h.id === record.holidayId)
        const hoursInfo = holidayHoursMap[record.holidayId]
        const availableOptions = getAvailableOptions(record)

        return (
          <Card key={record.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between">
              <div>
                <div className="flex items-center">
                  <h4 className="font-medium text-[#EE4D2D]">{record.holidayName}</h4>
                  {holiday && (
                    <Badge className="ml-2 bg-gray-100 text-gray-700">
                      {hoursInfo ? `${hoursInfo.used}/${hoursInfo.max}h` : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{formatDate(record.date)}</p>
                <p className="mt-1">
                  {record.optionLabel} ({record.hours}h)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Registrado em: {format(parseISO(record.createdAt), "dd/MM/yyyy HH:mm")}
                </p>

                {/* Mostrar detalhes do registro de ponto, se disponíveis */}
                {record.startTime && record.endTime && (
                  <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-500" />
                      <span>Entrada: {formatTime(record.startTime)}</span>
                      <span>-</span>
                      <span>Saída: {formatTime(record.endTime)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Dialog
                  open={isEditing && selectedRecord?.id === record.id}
                  onOpenChange={(open) => !open && setIsEditing(false)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleEdit(record)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Registro</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <h4 className="font-medium">{selectedRecord?.holidayName}</h4>
                        <p className="text-sm text-gray-600">{selectedRecord && formatDate(selectedRecord.date)}</p>
                      </div>

                      {error && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <h3 className="text-sm font-medium mb-3">Opções de Hora Extra</h3>
                        {availableOptions.length > 0 ? (
                          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                            {availableOptions.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2 mb-2">
                                <RadioGroupItem value={option.id} id={`edit-${option.id}`} />
                                <Label htmlFor={`edit-${option.id}`} className="cursor-pointer">
                                  {option.label} ({option.value}h)
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : (
                          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Não há opções disponíveis devido ao limite de horas do feriado
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancelar
                        </Button>
                        <Button
                          className="bg-[#EE4D2D] hover:bg-[#D23F20]"
                          onClick={handleSaveEdit}
                          disabled={!selectedOption || availableOptions.length === 0}
                        >
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(record.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

