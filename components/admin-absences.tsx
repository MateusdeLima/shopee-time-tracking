"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Calendar, Eye, Download, AlertCircle, Check, PartyPopper, Trash2, FileSpreadsheet, CalendarIcon, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getAbsenceRecords, getUserById, updateAbsenceRecord, deleteAbsenceRecord } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { toast } from "@/components/ui/use-toast"

export function AdminAbsences() {
  const [absences, setAbsences] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null)
  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    reason: "",
    searchTerm: "",
    month: "",
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined
    }
  })
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadAbsences()
  }, [])

    const loadAbsences = async () => {
      try {
        const allAbsences = await getAbsenceRecords()
      if (!Array.isArray(allAbsences)) {
        console.error("getAbsenceRecords() não retornou um array:", allAbsences)
        setAbsences([])
        return
      }

      // Extrair IDs únicos dos funcionários
      const uniqueUserIds = Array.from(new Set(allAbsences.map(record => record.userId)))

      // Buscar dados de todos os funcionários
      const employeesData = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const user = await getUserById(userId as string)
      return {
        id: userId,
            name: user ? `${user.firstName} ${user.lastName}` : 'Usuário não encontrado',
            email: user ? user.email : '',
      }
    })
      )

      setEmployees(employeesData)
      setAbsences(allAbsences)
    } catch (error) {
      console.error("Erro ao carregar ausências:", error)
      setAbsences([])
      setEmployees([])
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters({
      ...filters,
      [field]: value,
    })
  }

  const handleDateRangeChange = (field: 'from' | 'to', value: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      month: "", // Limpa o filtro de mês quando seleciona período personalizado
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }))
  }

  const clearDateRange = () => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        from: undefined,
        to: undefined
      }
    }))
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      searchTerm: e.target.value,
    })
  }

  const handleViewDetails = (absence: any) => {
    setSelectedAbsence(absence)
    setIsDetailsOpen(true)
  }

  const handleApproveAbsence = (absence: any) => {
    setSelectedAbsence(absence)
    setIsApprovalDialogOpen(true)
  }

  const confirmApproval = async () => {
    try {
      // Atualizar o status da ausência para "approved"
      await updateAbsenceRecord(selectedAbsence.id, {
        status: "approved",
      })

      // Atualizar a lista de ausências
      loadAbsences()

      // Fechar o diálogo
      setIsApprovalDialogOpen(false)
      setIsDetailsOpen(false)

      // Mostrar mensagem de sucesso
      toast({
        title: "Ausência aprovada",
        description: "Ausência aprovada com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao aprovar ausência:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao aprovar a ausência. Tente novamente mais tarde.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadProof = () => {
    if (!selectedAbsence || !selectedAbsence.proofDocument) return

    // Extrair tipo de arquivo da string base64
    const matches = selectedAbsence.proofDocument.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      return
    }

    const type = matches[1]
    const base64Data = matches[2]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type })

    // Criar URL para download
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url

    // Determinar extensão de arquivo
    let extension = "file"
    if (type.includes("pdf")) extension = "pdf"
    else if (type.includes("jpeg")) extension = "jpg"
    else if (type.includes("png")) extension = "png"
    else if (type.includes("gif")) extension = "gif"

    // Nome do arquivo: employee_name_date.extension
    const employee = employees.find((e) => e.id === selectedAbsence.userId)
    const employeeName = employee ? employee.name.replace(/\s+/g, "_").toLowerCase() : "employee"
    const date = format(parseISO(selectedAbsence.createdAt), "yyyyMMdd")

    link.download = `${employeeName}_${date}.${extension}`
    document.body.appendChild(link)
    link.click()

    // Limpar
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return ""
    if (dateStr.includes("T")) {
      const [date, time] = dateStr.split("T")
      const [year, month, day] = date.split("-")
      return `${day}/${month}/${year} ${time.slice(0,5)}`
    } else {
      const [year, month, day] = dateStr.split("-")
      return `${day}/${month}/${year}`
    }
  }

  const getEmployeeName = (userId: string) => {
    const employee = employees.find((e) => e.id === userId)
    return employee ? `${employee.name} (${employee.email})` : userId
  }

  const getReasonText = (absence: any) => {
    if (absence.reason === "medical") return "Consulta Médica"
    if (absence.reason === "medical_certificate") return "Atestado Médico"
    if (absence.reason === "personal") return "Compromisso Pessoal"
    if (absence.reason === "vacation") return "Férias"
    return absence.customReason || "Outro"
  }

  const formatDateRange = (absence: any) => {
    if (absence.dateRange && absence.dateRange.start && absence.dateRange.end) {
      return `De ${formatDateTime(absence.dateRange.start)} até ${formatDateTime(absence.dateRange.end)}`
    } else if (absence.dates.length > 1) {
      return `${absence.dates.length} dias`
    } else if (absence.dates.length === 1) {
      return formatDateTime(absence.dates[0])
    } else {
      return "-"
    }
  }

  // Função auxiliar para contar dias
  const getDaysCount = (absence: any) => {
    if (absence.dateRange && absence.dateRange.start && absence.dateRange.end) {
      const start = new Date(absence.dateRange.start)
      const end = new Date(absence.dateRange.end)
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    } else if (absence.dates && absence.dates.length > 1) {
      return absence.dates.length
    } else {
      return 1
    }
  }

  // Filtrar ausências
  const filteredAbsences = absences.filter((absence) => {
    // Filtrar por funcionário
    if (filters.employee && filters.employee !== "all" && absence.userId !== filters.employee) {
      return false
    }

    // Filtrar por status
    if (filters.status && filters.status !== "all") {
      if (filters.status === "pending" && absence.status !== "pending") return false
      if (filters.status === "completed" && absence.status !== "completed") return false
      if (filters.status === "approved" && absence.status !== "approved") return false
    }

    // Filtrar por motivo
    if (filters.reason && filters.reason !== "all") {
      if (absence.reason !== filters.reason) return false
    }

    // Filtrar por período personalizado
    if (filters.dateRange.from && filters.dateRange.to) {
      const absenceDate = parseISO(absence.createdAt)
      if (!isWithinInterval(absenceDate, { 
        start: startOfDay(filters.dateRange.from), 
        end: endOfDay(filters.dateRange.to) 
      })) {
        return false
      }
    }
    // Filtrar por mês (apenas se não houver período personalizado selecionado)
    else if (filters.month && filters.month !== "all") {
      const absenceDate = parseISO(absence.createdAt)
      const [year, month] = filters.month.split("-")
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1))
      const endDate = endOfMonth(startDate)
      
      if (!isWithinInterval(absenceDate, { start: startDate, end: endDate })) {
        return false
      }
    }

    // Filtrar por termo de busca
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const employee = employees.find((e) => e.id === absence.userId)
      const employeeName = employee ? employee.name.toLowerCase() : ""
      const reason = getReasonText(absence).toLowerCase()

      return employeeName.includes(searchLower) || reason.includes(searchLower)
    }

    return true
  })

  // Adicionar função de exclusão
  const handleDeleteAbsence = async () => {
    if (!selectedAbsence) return

    try {
      await deleteAbsenceRecord(selectedAbsence.id)
      
      // Atualizar a lista de ausências
      await loadAbsences()

      // Fechar os diálogos
      setIsDeleteDialogOpen(false)
      setIsDetailsOpen(false)

      toast({
        title: "Ausência excluída",
        description: "O registro de ausência foi excluído com sucesso",
      })
    } catch (error) {
      console.error("Erro ao excluir ausência:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a ausência. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const exportToGoogleSheets = async () => {
    try {
      setIsExporting(true)
      // Filtrar ausências excluindo férias
      const absencesToExport = filteredAbsences.filter(absence => absence.reason !== "vacation")
      
      if (absencesToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há registros de ausências para gerar o relatório",
          variant: "destructive"
        })
        return
      }

      // Formatar dados para exportação
      const data = absencesToExport.map(absence => ({
        funcionario: getEmployeeName(absence.userId).split(' (')[0], // Remove o email
        motivo: getReasonText(absence),
        periodo: formatDateRange(absence),
        data_registro: format(parseISO(absence.createdAt), "dd/MM/yyyy"),
        status: absence.status === "approved" ? "Aprovado" : 
               absence.status === "completed" ? "Comprovante Enviado" : "Pendente",
        comprovante: absence.proofDocument ? "Sim" : "Não"
      }))

      // Obter email do usuário atual
      const currentUser = getCurrentUser()
      if (!currentUser?.email) {
        toast({
          title: "Erro ao exportar",
          description: "Email do usuário não encontrado",
          variant: "destructive"
        })
        return
      }

      // Chamar API para criar planilha
      const response = await fetch('/api/sheets/export-absences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data,
          userEmail: currentUser.email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao exportar dados')
      }

      toast({
        title: "Relatório exportado com sucesso",
        description: "O relatório foi gerado no Google Sheets",
      })

      // Abrir planilha em nova aba
      window.open(result.spreadsheetUrl, '_blank')
    } catch (error: any) {
      console.error('Erro ao exportar:', error)
      toast({
        title: "Erro ao exportar",
        description: error.message || "Ocorreu um erro ao gerar o relatório. Verifique as credenciais do Google Sheets.",
        variant: "destructive"
      })
    }
    setIsExporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Registros de Ausências</h2>
        <Button 
          onClick={exportToGoogleSheets}
          className="bg-green-600 hover:bg-green-700"
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Exportando...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Relatório
            </>
          )}
        </Button>
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {/* Filtro de Funcionário */}
        <div className="col-span-1">
          <Label htmlFor="employee-filter">Filtrar por Funcionário</Label>
          <Select value={filters.employee} onValueChange={(value) => handleFilterChange("employee", value)}>
            <SelectTrigger id="employee-filter">
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Status */}
        <div className="col-span-1">
          <Label htmlFor="status-filter">Filtrar por Status</Label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Comprovante Enviado</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Motivo */}
        <div className="col-span-1">
          <Label htmlFor="reason-filter">Filtrar por Motivo</Label>
          <Select value={filters.reason} onValueChange={(value) => handleFilterChange("reason", value)}>
            <SelectTrigger id="reason-filter">
              <SelectValue placeholder="Todos os motivos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motivos</SelectItem>
              <SelectItem value="medical">Consulta Médica</SelectItem>
              <SelectItem value="personal">Compromisso Pessoal</SelectItem>
              <SelectItem value="vacation">Férias</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campo de Busca */}
        <div className="col-span-1">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              id="search"
              placeholder="Buscar por funcionário ou motivo"
              className="pl-8"
              value={filters.searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {/* Filtro de Período em uma linha separada */}
      <div className="mb-6">
        <div className="space-y-2">
          <Label>Filtrar por Período</Label>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      formatDateTime(filters.dateRange.from.toISOString())
                    ) : (
                      "Data inicial"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange.from}
                    onSelect={(date) => handleDateRangeChange('from', date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      formatDateTime(filters.dateRange.to.toISOString())
                    ) : (
                      "Data final"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange.to}
                    onSelect={(date) => handleDateRangeChange('to', date)}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) =>
                      filters.dateRange.from ? date < filters.dateRange.from : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(filters.dateRange.from || filters.dateRange.to) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDateRange}
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Limpar período</span>
              </Button>
            )}
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
                  <TableHead className="min-w-[120px]">Motivo</TableHead>
                  <TableHead className="min-w-[150px]">Período</TableHead>
                  <TableHead className="min-w-[80px]">Qtd. Dias</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[140px]">Registrado em</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAbsences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAbsences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell className="font-medium">{getEmployeeName(absence.userId)}</TableCell>
                      <TableCell>{getReasonText(absence)}</TableCell>
                      <TableCell>{formatDateRange(absence)}</TableCell>
                      <TableCell>{getDaysCount(absence)} {getDaysCount(absence) === 1 ? 'dia' : 'dias'}</TableCell>
                      <TableCell>
                        {absence.status === "approved" ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Aprovado
                          </Badge>
                        ) : absence.status === "completed" ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">Comprovante Enviado</Badge>
                        ) : absence.reason === "vacation" ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Aguardando Aprovação
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{format(parseISO(absence.createdAt), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(absence)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>

                          {absence.reason === "vacation" && absence.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleApproveAbsence(absence)}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Aprovar</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modal de Detalhes da Ausência */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Ausência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAbsence && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Funcionário</Label>
                    <p>{getEmployeeName(selectedAbsence.userId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Motivo</Label>
                    <p>{getReasonText(selectedAbsence)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Período</Label>
                  {selectedAbsence.dates.length <= 7 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedAbsence.dates.map((date: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDateTime(date)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-2">
                    {getDaysCount(selectedAbsence)} {getDaysCount(selectedAbsence) === 1 ? 'dia selecionado' : 'dias selecionados'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Registrado em</Label>
                    <p>{formatDateTime(selectedAbsence.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <div className="mt-1">
                      {selectedAbsence.status === "approved" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Aprovado <PartyPopper className="h-3 w-3 ml-1" />
                        </Badge>
                      ) : selectedAbsence.status === "completed" ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Comprovante Enviado</Badge>
                      ) : selectedAbsence.reason === "vacation" ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Aguardando Aprovação
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedAbsence.status === "completed" && selectedAbsence.proofDocument ? (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-500 mb-2">Comprovante</Label>
                    <div className="flex justify-center p-4 border rounded-md bg-gray-50">
                      {selectedAbsence.proofDocument.includes("image") ? (
                        <img
                          src={selectedAbsence.proofDocument || "/placeholder.svg"}
                          alt="Comprovante"
                          className="max-h-64 object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Visualização não disponível</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button variant="outline" onClick={handleDownloadProof} className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Comprovante
                      </Button>
                    </div>
                  </div>
                ) : selectedAbsence.reason === "vacation" && selectedAbsence.status === "pending" ? (
                  <Alert className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Esta solicitação de férias está aguardando sua aprovação.</AlertDescription>
                  </Alert>
                ) : selectedAbsence.reason === "vacation" && selectedAbsence.status === "approved" ? (
                  <Alert className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-4 w-4" />
                    <AlertDescription>Esta solicitação de férias foi aprovada.</AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Nenhum comprovante foi enviado para esta ausência.</AlertDescription>
                  </Alert>
                )}

                {selectedAbsence.reason === "vacation" && selectedAbsence.status === "pending" && (
                  <div className="flex justify-end mt-4">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApproveAbsence(selectedAbsence)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar Férias
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            {selectedAbsence && (
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Ausência
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Ausência</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              Você está prestes a excluir a ausência de{" "}
              <strong>{selectedAbsence && getEmployeeName(selectedAbsence.userId)}</strong> para o período{" "}
              <strong>{selectedAbsence && formatDateRange(selectedAbsence)}</strong>.
            </p>

            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a esta ausência serão permanentemente excluídos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAbsence}>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Aprovação */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação de Férias</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              Você está prestes a aprovar a solicitação de férias de{" "}
              <strong>{selectedAbsence && getEmployeeName(selectedAbsence.userId)}</strong> para o período{" "}
              <strong>{selectedAbsence && formatDateRange(selectedAbsence)}</strong>.
            </p>

            <p className="mt-4">Deseja confirmar esta aprovação?</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmApproval}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

