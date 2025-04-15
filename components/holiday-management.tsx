"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Edit2, Plus } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getHolidays, createHoliday, updateHoliday, toggleHolidayStatus } from "@/lib/db"

export function HolidayManagement() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    date: new Date(),
    active: true,
    deadline: new Date(),
    maxHours: 2,
  })

  useEffect(() => {
    // Carregar feriados
    loadHolidays()
  }, [])

  const loadHolidays = async () => {
    try {
      setLoading(true)
      // Carregar feriados
      const allHolidays = await getHolidays()

      // Ensure allHolidays is an array before sorting
      if (Array.isArray(allHolidays)) {
        // Ordenar por data (mais recentes primeiro)
        allHolidays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setHolidays(allHolidays)
      } else {
        console.error("getHolidays() did not return an array:", allHolidays)
        setHolidays([])
      }
    } catch (error) {
      console.error("Error loading holidays:", error)
      setHolidays([])
      toast({
        title: "Erro",
        description: "Não foi possível carregar os feriados. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target

    if (type === "number") {
      setFormData({
        ...formData,
        [name]: Number.parseFloat(value),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      active: checked,
    })
  }

  const handleDateChange = (date: Date | undefined, field: string) => {
    if (date) {
      setFormData({
        ...formData,
        [field]: date,
      })
    }
  }

  const handleAddHoliday = () => {
    // Reset form
    setFormData({
      name: "",
      date: new Date(),
      active: true,
      deadline: new Date(),
      maxHours: 2,
    })
    setIsAddDialogOpen(true)
  }

  const handleEditHoliday = (holiday: any) => {
    setSelectedHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date),
      active: holiday.active,
      deadline: new Date(holiday.deadline),
      maxHours: holiday.maxHours,
    })
    setIsEditDialogOpen(true)
  }

  const handleToggleActive = async (holiday: any) => {
    try {
      // Alternar estado do feriado
      const updatedHoliday = await toggleHolidayStatus(holiday.id)

      // Atualizar estado
      const updatedHolidays = holidays.map((h) => (h.id === holiday.id ? updatedHoliday : h))
      setHolidays(updatedHolidays)

      toast({
        title: `Feriado ${updatedHoliday.active ? "ativado" : "desativado"}`,
        description: `${holiday.name} foi ${updatedHoliday.active ? "ativado" : "desativado"} com sucesso`,
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao alterar o estado do feriado",
        variant: "destructive",
      })
    }
  }

  const saveHoliday = async (isEdit: boolean) => {
    try {
      // Formatar datas para string ISO
      const formattedDate = format(formData.date, "yyyy-MM-dd")
      const formattedDeadline = format(formData.deadline, "yyyy-MM-dd")

      if (isEdit && selectedHoliday) {
        // Atualizar feriado existente
        const updatedHoliday = await updateHoliday(selectedHoliday.id, {
          name: formData.name,
          date: formattedDate,
          active: formData.active,
          deadline: formattedDeadline,
          maxHours: formData.maxHours,
        })

        toast({
          title: "Feriado atualizado",
          description: `${formData.name} foi atualizado com sucesso`,
        })
      } else {
        // Adicionar novo feriado
        await createHoliday({
          name: formData.name,
          date: formattedDate,
          active: formData.active,
          deadline: formattedDeadline,
          maxHours: formData.maxHours,
        })

        toast({
          title: "Feriado adicionado",
          description: `${formData.name} foi adicionado com sucesso`,
        })
      }

      // Atualizar lista e fechar diálogo
      await loadHolidays()
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Erro ao salvar feriado:", error)
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o feriado",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-medium">Lista de Feriados</h3>
        <Button onClick={handleAddHoliday} className="bg-[#EE4D2D] hover:bg-[#D23F20] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Feriado
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-6">
          <p className="text-gray-500">Carregando feriados...</p>
        </div>
      ) : holidays.length === 0 ? (
        <div className="text-center p-6">
          <p className="text-gray-500">Nenhum feriado cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {holidays.map((holiday) => (
            <Card key={holiday.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h4 className="font-medium text-[#EE4D2D]">{holiday.name}</h4>
                  <p className="text-sm text-gray-600">{formatDate(holiday.date)}</p>
                  <div className="mt-2 text-sm">
                    <p>Prazo: {formatDate(holiday.deadline)}</p>
                    <p>Máximo: {holiday.maxHours}h</p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col justify-between items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{holiday.active ? "Ativo" : "Inativo"}</span>
                    <Switch checked={holiday.active} onCheckedChange={() => handleToggleActive(holiday)} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-0 sm:mt-2"
                    onClick={() => handleEditHoliday(holiday)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Feriado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Feriado</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Natal"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Data do Feriado</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => handleDateChange(date, "date")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Prazo para Cumprimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deadline && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => handleDateChange(date, "deadline")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxHours">Máximo de Horas</Label>
              <Input
                id="maxHours"
                name="maxHours"
                type="number"
                min="1"
                max="8"
                value={formData.maxHours}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="active" checked={formData.active} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="active">Feriado Ativo</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={() => saveHoliday(false)}>
                Adicionar Feriado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Feriado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome do Feriado</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Natal"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Data do Feriado</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => handleDateChange(date, "date")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Prazo para Cumprimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deadline && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => handleDateChange(date, "deadline")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-maxHours">Máximo de Horas</Label>
              <Input
                id="edit-maxHours"
                name="maxHours"
                type="number"
                min="1"
                max="8"
                value={formData.maxHours}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="edit-active" checked={formData.active} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="edit-active">Feriado Ativo</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={() => saveHoliday(true)}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

