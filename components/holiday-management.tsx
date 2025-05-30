"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Edit2, Plus, Pencil, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getHolidays, createHoliday, updateHoliday, toggleHolidayStatus, deleteHoliday } from "@/lib/db"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function HolidayManagement() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [holidayToDelete, setHolidayToDelete] = useState<any>(null)
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

  const handleDeleteHoliday = async () => {
    if (!holidayToDelete) return
    try {
      await deleteHoliday(holidayToDelete.id)
      toast({
        title: "Feriado excluído",
        description: `${holidayToDelete.name} foi excluído com sucesso`,
      })
      await loadHolidays()
      setIsDeleteDialogOpen(false)
      setHolidayToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir o feriado",
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

  const formatHours = (hours: number) => {
    return hours === 0.5 ? "30 min" : `${hours}h`
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-2 sm:mb-0">Configuração de um Feriado</h2>
      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <TabsList className="flex items-center gap-2">
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>
          <div className="mt-2 sm:mt-0 sm:ml-0 flex justify-center sm:block">
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Feriado
        </Button>
      </div>
        </div>

        <TabsContent value="active" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium">Configuração de um Feriado</h3>
      </div>

      {loading ? (
        <div className="text-center p-6">
          <p className="text-gray-500">Carregando feriados...</p>
        </div>
          ) : holidays.filter(holiday => holiday.active).length === 0 ? (
        <div className="text-center p-6">
              <p className="text-gray-500">Nenhum feriado ativo cadastrado</p>
        </div>
      ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-3 w-full">
              {holidays
                .filter(holiday => holiday.active)
                .map((holiday) => (
                  <Card key={holiday.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[#EE4D2D] text-base sm:text-lg font-medium">{holiday.name}</CardTitle>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {formatDate(holiday.date)}
                      </div>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        Prazo: {formatDate(holiday.deadline)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm w-fit mt-2">
                        Máximo: {formatHours(holiday.maxHours)}
                      </Badge>
                      <div className="flex items-center gap-2 mt-4">
                        <Switch
                          checked={holiday.active}
                          onCheckedChange={() => handleToggleActive(holiday)}
                          disabled={loading}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditHoliday(holiday)}
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setHolidayToDelete(holiday)
                          setIsDeleteDialogOpen(true)
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium">Feriados Inativos</h3>
          </div>

          {loading ? (
            <div className="text-center p-6">
              <p className="text-gray-500">Carregando feriados...</p>
                  </div>
          ) : holidays.filter(holiday => !holiday.active).length === 0 ? (
            <div className="text-center p-6">
              <p className="text-gray-500">Nenhum feriado inativo</p>
                </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-3 w-full">
              {holidays
                .filter(holiday => !holiday.active)
                .map((holiday) => (
                  <Card key={holiday.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[#EE4D2D] text-base sm:text-lg font-medium">{holiday.name}</CardTitle>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {formatDate(holiday.date)}
                      </div>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        Prazo: {formatDate(holiday.deadline)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm w-fit mt-2">
                        Máximo: {formatHours(holiday.maxHours)}
                      </Badge>
                      <div className="flex items-center gap-2 mt-4">
                        <Switch
                          checked={holiday.active}
                          onCheckedChange={() => handleToggleActive(holiday)}
                          disabled={loading}
                        />
                        <Label>Ativo</Label>
                  </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditHoliday(holiday)}
                        disabled={loading}
                  >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setHolidayToDelete(holiday)
                      setIsDeleteDialogOpen(true)
                    }}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                    </CardFooter>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium">Relatório de Feriados</h3>
          </div>

          {loading ? (
            <div className="text-center p-6">
              <p className="text-gray-500">Carregando relatório...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center p-6">
              <p className="text-gray-500">Nenhum dado disponível para relatório</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Total de Feriados:</span>
                      <Badge variant="outline">{holidays.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Feriados Ativos:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {holidays.filter(h => h.active).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Feriados Inativos:</span>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {holidays.filter(h => !h.active).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lista Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{holiday.name}</h4>
                            <p className="text-sm text-gray-500">
                              Data: {formatDate(holiday.date)} | Prazo: {formatDate(holiday.deadline)}
                            </p>
                          </div>
                          <Badge
                            variant={holiday.active ? "success" : "secondary"}
                            className={holiday.active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}
                          >
                            {holiday.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm">
                            Horas Máximas: {formatHours(holiday.maxHours)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                <PopoverContent className="w-auto p-0 sm:w-auto sm:p-0 max-w-[95vw] sm:max-w-xs" sideOffset={4} align="center" style={{ minWidth: '260px', width: '100%', maxWidth: 360 }}>
                  <div className="flex justify-center items-center w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => handleDateChange(date, "date")}
                      initialFocus
                    />
                  </div>
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
                <PopoverContent className="w-auto p-0 sm:w-auto sm:p-0 max-w-[95vw] sm:max-w-xs" sideOffset={4} align="center" style={{ minWidth: '260px', width: '100%', maxWidth: 360 }}>
                  <div className="flex justify-center items-center w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={formData.deadline}
                      onSelect={(date) => handleDateChange(date, "deadline")}
                      initialFocus
                    />
                  </div>
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
                <PopoverContent className="w-auto p-0 sm:w-auto sm:p-0 max-w-[95vw] sm:max-w-xs" sideOffset={4} align="center" style={{ minWidth: '260px', width: '100%', maxWidth: 360 }}>
                  <div className="flex justify-center items-center w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => handleDateChange(date, "date")}
                      initialFocus
                    />
                  </div>
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
                <PopoverContent className="w-auto p-0 sm:w-auto sm:p-0 max-w-[95vw] sm:max-w-xs" sideOffset={4} align="center" style={{ minWidth: '260px', width: '100%', maxWidth: 360 }}>
                  <div className="flex justify-center items-center w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={formData.deadline}
                      onSelect={(date) => handleDateChange(date, "deadline")}
                      initialFocus
                    />
                  </div>
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

      {/* Delete Holiday Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Feriado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Você está prestes a excluir o feriado <strong>{holidayToDelete?.name}</strong> ({holidayToDelete && formatDate(holidayToDelete.date)}).</p>
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a este feriado serão permanentemente excluídos.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteHoliday}>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

