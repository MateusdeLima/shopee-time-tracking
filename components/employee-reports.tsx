"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Clock, Eye, AlertCircle, Calendar, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getOvertimeRecords, getHolidays, getUserById, getOvertimeRecordsByUserId, deleteOvertimeRecord } from "@/lib/db"
import { toast } from "@/components/ui/use-toast"

export function EmployeeReports() {
  const [records, setRecords] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState<any>(null)
  const [detailRecords, setDetailRecords] = useState<any[]>([])

  const [filters, setFilters] = useState({
    employee: "",
    holiday: "",
    searchTerm: "",
  })

  useEffect(() => {
    // Carregar registros
    const loadRecords = async () => {
      try {
        const allRecords = await getOvertimeRecords()
        if (Array.isArray(allRecords)) {
          setRecords(allRecords)
        } else {
          console.error("getOvertimeRecords() did not return an array:", allRecords)
          setRecords([])
        }
      } catch (error) {
        console.error("Error loading overtime records:", error)
        setRecords([])
      }
    }

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

    loadRecords()
    loadHolidays()
  }, [])

  useEffect(() => {
    const fetchEmployeeData = async () => {
      const uniqueUserIds = Array.from(new Set(records.map((record) => record.userId)))

      if (uniqueUserIds.length === 0) {
        setEmployees([])
        return
      }

      try {
        const userPromises = uniqueUserIds.map(userId => getUserById(userId as string))
        const usersData = await Promise.all(userPromises)

        const uniqueEmployees = uniqueUserIds.map((userId, index) => {
          const user = usersData[index]
          return {
            id: userId,
            email: user ? `${user.firstName} ${user.lastName} (${user.email})` : `Usuário ${userId}` // Usar dados ou um placeholder
          }
        })

        setEmployees(uniqueEmployees)
      } catch (error) {
        console.error("Erro ao buscar dados dos funcionários:", error)
        // Opcional: Lidar com o erro, talvez mostrando os IDs
        const fallbackEmployees = uniqueUserIds.map(userId => ({ id: userId, email: `Erro ao buscar ${userId}` }))
        setEmployees(fallbackEmployees)
      }
    }

    fetchEmployeeData()
  }, [records])

  useEffect(() => {
    if (records.length > 0 && holidays.length > 0) {
      // Agrupar registros por funcionário e feriado
      const summaryMap = new Map()

      // Inicializar mapa com todas as combinações de funcionários e feriados
      employees.forEach((employee) => {
        holidays.forEach((holiday) => {
          const key = `${employee.id}-${holiday.id}`
          summaryMap.set(key, {
            employeeId: employee.id,
            employeeEmail: employee.email,
            holidayId: holiday.id,
            holidayName: holiday.name,
            holidayDate: holiday.date,
            maxHours: holiday.maxHours,
            hoursCompleted: 0,
            hoursRemaining: holiday.maxHours,
            lastUpdated: null,
          })
        })
      })

      // Atualizar com registros reais
      records.forEach((record) => {
        const key = `${record.userId}-${record.holidayId}`
        if (summaryMap.has(key)) {
          const entry = summaryMap.get(key)
          entry.hoursCompleted += record.hours
          entry.hoursRemaining = entry.maxHours - entry.hoursCompleted

          // Rastrear a atualização mais recente
          const recordDate = new Date(record.updatedAt || record.createdAt)
          if (!entry.lastUpdated || recordDate > new Date(entry.lastUpdated)) {
            entry.lastUpdated = record.updatedAt || record.createdAt
          }
        }
      })

      // Converter mapa para array e ordenar
      const summaryArray = Array.from(summaryMap.values())

      // Aplicar filtros
      let filtered = [...summaryArray]

      if (filters.employee && filters.employee !== "all") {
        filtered = filtered.filter((item) => item.employeeId === filters.employee)
      }

      if (filters.holiday && filters.holiday !== "all") {
        filtered = filtered.filter((item) => item.holidayId === Number.parseInt(filters.holiday))
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        filtered = filtered.filter(
          (item) =>
            item.employeeEmail.toLowerCase().includes(searchLower) ||
            item.holidayName.toLowerCase().includes(searchLower),
        )
      }

      // Ordenar por funcionário e feriado
      filtered.sort((a, b) => {
        if (a.employeeEmail !== b.employeeEmail) {
          return a.employeeEmail.localeCompare(b.employeeEmail)
        }
        return a.holidayName.localeCompare(b.holidayName)
      })

      setSummaryData(filtered)
    }
  }, [records, holidays, employees, filters])

  const handleFilterChange = (field: string, value: string) => {
    setFilters({
      ...filters,
      [field]: value,
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      searchTerm: e.target.value,
    })
  }

  const handleViewDetails = async (item: any) => {
    try {
      // Buscar registros específicos para este funcionário e feriado
      const userRecords = await getOvertimeRecordsByUserId(item.employeeId)

      if (!Array.isArray(userRecords)) {
        console.error("getOvertimeRecordsByUserId não retornou um array:", userRecords)
        setDetailRecords([])
        setSelectedDetails(item)
        setIsDetailsOpen(true)
        return
      }

      const holidayRecords = userRecords.filter((record) => record.holidayId === item.holidayId)

      // Ordenar por data de criação (mais recentes primeiro)
      holidayRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setSelectedDetails(item)
      setDetailRecords(holidayRecords)
      setIsDetailsOpen(true)
    } catch (error) {
      console.error("Erro ao buscar detalhes dos registros:", error)
      setDetailRecords([])
      setSelectedDetails(item)
      setIsDetailsOpen(true)
    }
  }

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm("Tem certeza que deseja excluir este registro de horas extras?")) {
      return
    }

    try {
      await deleteOvertimeRecord(recordId)
      
      // Atualizar a lista de registros
      if (selectedDetails) {
        const updatedRecords = await getOvertimeRecordsByUserId(selectedDetails.employeeId)
        const holidayRecords = updatedRecords.filter((record) => record.holidayId === selectedDetails.holidayId)
        setDetailRecords(holidayRecords)

        // Atualizar também a lista principal
        const allRecords = await getOvertimeRecords()
        setRecords(allRecords)
      }

      toast({
        title: "Registro excluído",
        description: "O registro de horas extras foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir registro:", error)
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })
  }

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A"
    return timeString
  }

  const formatHours = (hours: number) => {
    return hours === 0.5 ? "30 min" : `${hours}h`
  }

  if (records.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum registro encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="employee-filter">Filtrar por Funcionário</Label>
          <Select value={filters.employee} onValueChange={(value) => handleFilterChange("employee", value)}>
            <SelectTrigger id="employee-filter">
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="holiday-filter">Filtrar por Feriado</Label>
          <Select value={filters.holiday} onValueChange={(value) => handleFilterChange("holiday", value)}>
            <SelectTrigger id="holiday-filter">
              <SelectValue placeholder="Todos os feriados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os feriados</SelectItem>
              {holidays.map((holiday) => (
                <SelectItem key={holiday.id} value={holiday.id.toString()}>
                  {holiday.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              id="search"
              placeholder="Buscar por funcionário ou feriado"
              className="pl-8"
              value={filters.searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Card>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Funcionário</TableHead>
                  <TableHead className="min-w-[120px]">Feriado</TableHead>
                  <TableHead className="min-w-[100px]">Data</TableHead>
                  <TableHead className="min-w-[180px]">Progresso</TableHead>
                  <TableHead className="min-w-[100px]">Horas Cumpridas</TableHead>
                  <TableHead className="min-w-[100px]">Horas Restantes</TableHead>
                  <TableHead className="min-w-[140px]">Última Atualização</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  summaryData.map((item, index) => (
                    <TableRow key={`${item.employeeId}-${item.holidayId}-${index}`}>
                      <TableCell className="font-medium">{item.employeeEmail}</TableCell>
                      <TableCell>{item.holidayName}</TableCell>
                      <TableCell>{formatDate(item.holidayDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(item.hoursCompleted / item.maxHours) * 100} className="h-2" />
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {Math.round((item.hoursCompleted / item.maxHours) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatHours(item.hoursCompleted)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatHours(item.hoursRemaining)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.lastUpdated ? format(new Date(item.lastUpdated), "dd/MM/yyyy HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(item)}
                          disabled={item.hoursCompleted === 0}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalhes</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modal de Detalhes dos Registros */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes dos Registros - {selectedDetails?.holidayName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Funcionário</Label>
                <p>{selectedDetails?.employeeEmail}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Data do Feriado</Label>
                <p>{selectedDetails && formatDate(selectedDetails.holidayDate)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatHours(selectedDetails?.hoursCompleted)} de {selectedDetails?.maxHours}h
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                {Math.round((selectedDetails?.hoursCompleted / selectedDetails?.maxHours) * 100 || 0)}% concluído
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#EE4D2D] h-2 rounded-full"
                style={{
                  width: `${selectedDetails ? (selectedDetails.hoursCompleted / selectedDetails.maxHours) * 100 : 0}%`,
                }}
              ></div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Registros de Horas Extras</h3>

              {detailRecords.length === 0 ? (
                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Não há registros de horas extras para este feriado</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {detailRecords.map((record) => (
                    <Card key={record.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-[#EE4D2D]">{record.holidayName}</h4>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {formatDate(record.date)}
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatHours(record.hours)} - {record.optionLabel}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col justify-between items-end">
                          <div className="text-sm text-gray-500">
                            {formatDateTime(record.createdAt)}
                            {record.updatedAt && record.updatedAt !== record.createdAt && (
                              <span className="text-xs"> (Editado: {formatDateTime(record.updatedAt)})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir registro</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

