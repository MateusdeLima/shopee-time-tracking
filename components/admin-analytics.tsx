"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, FileSpreadsheet, PieChart, BarChart3, Users, Calendar, Eye } from "lucide-react"
import { HourBankAdminApproval } from "@/components/hour-bank-admin-approval"
import { supabase } from "@/lib/supabase"
import { format, parseISO, getMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

// Função auxiliar para formatação segura de datas
const formatDateSafe = (dateInput: string | null | undefined, formatString: string = "dd/MM/yyyy"): string => {
  try {
    if (!dateInput) return "Data inválida"
    if (dateInput.includes('T') || dateInput.includes(' ')) {
      const date = parseISO(dateInput)
      if (isNaN(date.getTime())) throw new Error('Data inválida')
      return format(date, formatString, { locale: ptBR })
    } else {
      const date = new Date(dateInput + 'T12:00:00')
      if (isNaN(date.getTime())) throw new Error('Data inválida')
      return format(date, formatString, { locale: ptBR })
    }
  } catch (error) {
    return 'Data inválida'
  }
}

const MESES = [
  { value: "all", label: "Todos os Meses" },
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
]

const MOTIVOS_AUSENCIA: { [key: string]: string } = {
  medical: "Consulta Médica",
  vacation: "Férias",
  personal: "Energia/Internet",
  certificate: "Atestado",
  other: "Outro",
}

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("insights")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [isExporting, setIsExporting] = useState(false)
  const [data, setData] = useState<any>({
    absences: [],
    overtimeRecords: [],
    users: [],
    holidays: [],
  })

  // Estados para filtros da aba Horas Extras
  const [employeeFilter, setEmployeeFilter] = useState("")
  const [holidayFilter, setHolidayFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: absencesData } = await supabase
        .from("absence_records")
        .select(`*, users:user_id (id, first_name, last_name, email)`)
        .order("created_at", { ascending: false })

      const { data: overtimeData } = await supabase
        .from("overtime_records")
        .select(`*, users:user_id (id, first_name, last_name, email), holidays:holiday_id (id, name, date)`)
        .order("created_at", { ascending: false })

      const { data: usersData } = await supabase.from("users").select("*").order("first_name")
      const { data: holidaysData } = await supabase.from("holidays").select("*").order("date", { ascending: false })

      setData({
        absences: absencesData || [],
        overtimeRecords: overtimeData || [],
        users: usersData || [],
        holidays: holidaysData || [],
      })
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToGoogleSheets = async () => {
    setIsExporting(true)
    try {
      const absencesFiltered = filterByMonth(filteredAbsences)
      const overtimeFiltered = filterByMonth(filteredOvertime)

      if (absencesFiltered.length === 0 && overtimeFiltered.length === 0) {
        alert("Nenhum dado para exportar no período selecionado")
        return
      }

      const absencesExport = absencesFiltered.map((absence: any) => ({
        tipo: "Ausência",
        funcionario: `${absence.users?.first_name} ${absence.users?.last_name}`,
        descricao: MOTIVOS_AUSENCIA[absence.reason] || absence.reason,
        periodo: absence.dates?.map((d: any) => formatDateSafe(d)).join(", "),
        horas: "N/A",
        status: absence.status,
        data_registro: formatDateSafe(absence.created_at, "dd/MM/yyyy HH:mm")
      }))

      const overtimeExport = overtimeFiltered.map((record: any) => ({
        tipo: "Hora Extra",
        funcionario: `${record.users?.first_name} ${record.users?.last_name}`,
        descricao: record.holiday_name,
        periodo: formatDateSafe(record.date),
        horas: `${record.hours}h`,
        status: "Registrado",
        data_registro: formatDateSafe(record.created_at, "dd/MM/yyyy HH:mm")
      }))

      const response = await fetch('/api/sheets/export-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: [...absencesExport, ...overtimeExport],
          month: selectedMonth === "all" ? "Todos os Meses" : MESES.find(m => m.value === selectedMonth)?.label || "",
          stats: {
            totalAbsences: absencesFiltered.length,
            totalOvertime: overtimeFiltered.reduce((sum: number, r: any) => sum + (r.hours || 0), 0),
            totalUsers: data.users.length,
            totalHolidays: data.holidays.length
          }
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao exportar')
      window.open(result.spreadsheetUrl, '_blank')
    } catch (error: any) {
      alert(error.message || "Erro ao exportar")
    } finally {
      setIsExporting(false)
    }
  }

  const filterByMonth = (items: any[]) => {
    if (selectedMonth === "all") return items
    return items.filter((item) => {
      const date = new Date(item.created_at || item.date)
      return getMonth(date) === parseInt(selectedMonth)
    })
  }

  const filteredAbsences = filterByMonth(
    data.absences.filter((absence: any) => {
      const userName = `${absence.users?.first_name} ${absence.users?.last_name}`.toLowerCase()
      return userName.includes(searchTerm.toLowerCase()) || absence.reason.toLowerCase().includes(searchTerm.toLowerCase())
    })
  )

  const filteredOvertime = filterByMonth(
    data.overtimeRecords.filter((record: any) => {
      const userName = `${record.users?.first_name} ${record.users?.last_name}`.toLowerCase()
      return userName.includes(searchTerm.toLowerCase()) || record.holiday_name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  )

  const stats = {
    totalAbsences: filteredAbsences.length,
    totalOvertime: filteredOvertime.filter((r:any) => !r.status || r.status === 'approved').reduce((sum:any, r:any) => sum + (r.hours || 0), 0),
    totalUsers: data.users.length,
    totalHolidays: data.holidays.length,
    absencesByReason: filteredAbsences.reduce((acc: any, absence: any) => {
      const motivo = MOTIVOS_AUSENCIA[absence.reason] || absence.reason
      acc[motivo] = (acc[motivo] || 0) + 1
      return acc
    }, {}),
    overtimeByUser: filteredOvertime.filter((r:any) => !r.status || r.status === 'approved').reduce((acc: any, record: any) => {
      const userName = `${record.users?.first_name} ${record.users?.last_name}`
      acc[userName] = (acc[userName] || 0) + (record.hours || 0)
      return acc
    }, {}),
  }

  if (loading) return <div className="p-10 text-center">Carregando métricas...</div>

  return (
    <div className="space-y-6">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Ausências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAbsences}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOvertime}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feriados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHolidays}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar agente ou motivo..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={exportToGoogleSheets} 
          disabled={isExporting}
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isExporting ? "Exportando..." : "Exportar Planilha"}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="absences">Ausências</TabsTrigger>
          <TabsTrigger value="overtime">Horas Extras</TabsTrigger>
          <TabsTrigger value="hour-bank">Banco de Horas</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Ausências por Motivo</CardTitle></CardHeader>
              <CardContent>
                {Object.entries(stats.absencesByReason).map(([reason, count]: [string, any]) => (
                  <div key={reason} className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{reason}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full">
                      <div className="bg-[#EE4D2D] h-2 rounded-full" style={{ width: `${(count / stats.totalAbsences) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top Horas Extras</CardTitle></CardHeader>
              <CardContent>
                {Object.entries(stats.overtimeByUser).sort(([,a]:any,[,b]:any) => b-a).slice(0,5).map(([user, hours]: [string, any]) => (
                  <div key={user} className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{user}</span>
                      <span className="font-bold">{hours}h</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(hours / Math.max(...Object.values(stats.overtimeByUser) as number[])) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="absences">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Datas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((abs: any) => (
                    <TableRow key={abs.id}>
                      <TableCell>{abs.users?.first_name} {abs.users?.last_name}</TableCell>
                      <TableCell>{MOTIVOS_AUSENCIA[abs.reason] || abs.reason}</TableCell>
                      <TableCell className="text-xs">{abs.dates?.map((d:any) => formatDateSafe(d)).join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={abs.status === 'approved' ? 'default' : 'secondary'}>
                          {abs.status === 'approved' ? 'Aprovado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead>Feriado</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOvertime.map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.users?.first_name} {rec.users?.last_name}</TableCell>
                      <TableCell>{rec.holiday_name}</TableCell>
                      <TableCell className="font-bold">{rec.hours}h</TableCell>
                      <TableCell>
                         <Badge variant={rec.status === 'approved' ? 'default' : 'secondary'}>
                          {rec.status === 'approved' ? 'Aprovado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hour-bank">
           <HourBankAdminApproval onUpdate={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
