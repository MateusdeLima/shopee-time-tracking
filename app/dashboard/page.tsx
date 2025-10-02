"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LogOut, Search, FileSpreadsheet, PieChart, BarChart3, Users, Calendar, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, getMonth, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"

export const dynamic = "force-dynamic"

interface DashboardData {
  absences: any[]
  overtimeRecords: any[]
  users: any[]
  holidays: any[]
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
  personal: "Energia/Internet",
  vacation: "Férias",
  certificate: "Atestado",
  other: "Outro",
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [data, setData] = useState<DashboardData>({
    absences: [],
    overtimeRecords: [],
    users: [],
    holidays: [],
  })

  useEffect(() => {
    // Verificar autenticação
    const auth = localStorage.getItem("dashboardAuth")
    if (auth !== "true") {
      router.push("/")
      return
    }

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar ausências com informações do usuário
      const { data: absencesData, error: absencesError } = await supabase
        .from("absence_records")
        .select(`
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      // Carregar registros de horas extras com informações do usuário e feriado
      const { data: overtimeData, error: overtimeError } = await supabase
        .from("overtime_records")
        .select(`
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email
          ),
          holidays:holiday_id (
            id,
            name,
            date
          )
        `)
        .order("created_at", { ascending: false })

      // Carregar usuários
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("first_name")

      // Carregar feriados
      const { data: holidaysData, error: holidaysError } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: false })

      if (absencesError) console.error("Erro ao carregar ausências:", absencesError)
      if (overtimeError) console.error("Erro ao carregar horas extras:", overtimeError)
      if (usersError) console.error("Erro ao carregar usuários:", usersError)
      if (holidaysError) console.error("Erro ao carregar feriados:", holidaysError)

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

  const handleLogout = () => {
    setIsLogoutModalOpen(true)
  }

  const confirmLogout = () => {
    localStorage.removeItem("dashboardAuth")
    router.push("/")
  }

  const exportToGoogleSheets = async () => {
    setIsExporting(true)
    try {
      // Preparar dados filtrados
      const absencesFiltered = filterByMonth(filteredAbsences)
      const overtimeFiltered = filterByMonth(filteredOvertime)

      if (absencesFiltered.length === 0 && overtimeFiltered.length === 0) {
        alert("Nenhum dado para exportar no período selecionado")
        setIsExporting(false)
        return
      }

      // Formatar dados de ausências
      const absencesData = absencesFiltered.map((absence: any) => {
        const user = absence.users || data.users.find((u: any) => u.id === absence.user_id)
        const userName = user ? `${user.first_name} ${user.last_name}` : "Desconhecido"
        const motivo = MOTIVOS_AUSENCIA[absence.reason] || absence.reason
        
        // Formatar datas
        let periodo = ""
        if (absence.dates && absence.dates.length > 0) {
          if (absence.dates.length === 1) {
            periodo = format(new Date(absence.dates[0]), "dd/MM/yyyy", { locale: ptBR })
          } else {
            periodo = `${format(new Date(absence.dates[0]), "dd/MM/yyyy", { locale: ptBR })} até ${format(new Date(absence.dates[absence.dates.length - 1]), "dd/MM/yyyy", { locale: ptBR })}`
          }
        }
        
        return {
          tipo: "Ausência",
          funcionario: userName,
          descricao: motivo,
          periodo: periodo,
          horas: "N/A",
          status: absence.status === "approved" ? "Aprovado" : absence.status === "completed" ? "Completo" : "Pendente",
          data_registro: format(new Date(absence.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
        }
      })

      // Formatar dados de horas extras
      const overtimeData = overtimeFiltered.map((record: any) => {
        const user = record.users || data.users.find((u: any) => u.id === record.user_id)
        const userName = user ? `${user.first_name} ${user.last_name}` : "Desconhecido"
        
        return {
          tipo: "Hora Extra",
          funcionario: userName,
          descricao: record.holiday_name,
          periodo: format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR }),
          horas: `${record.hours}h`,
          status: "Registrado",
          data_registro: format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
        }
      })

      // Combinar todos os dados
      const allData = [...absencesData, ...overtimeData]

      // Chamar API para criar planilha
      const response = await fetch('/api/sheets/export-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: allData,
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

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao exportar dados')
      }

      alert("Relatório exportado com sucesso! Abrindo Google Sheets...")
      
      // Abrir planilha em nova aba
      window.open(result.spreadsheetUrl, '_blank')
      
    } catch (error: any) {
      console.error("Erro ao exportar:", error)
      alert(error.message || "Erro ao exportar para Google Sheets. Verifique as credenciais.")
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

  // Filtrar dados baseado na pesquisa e mês
  const filteredAbsences = filterByMonth(
    data.absences.filter((absence) => {
      const user = absence.users || data.users.find((u) => u.id === absence.user_id)
      const userName = user ? `${user.first_name} ${user.last_name}`.toLowerCase() : ""
      return (
        userName.includes(searchTerm.toLowerCase()) ||
        absence.reason.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  )

  const filteredOvertime = filterByMonth(
    data.overtimeRecords.filter((record) => {
      const user = record.users || data.users.find((u) => u.id === record.user_id)
      const userName = user ? `${user.first_name} ${user.last_name}`.toLowerCase() : ""
      return (
        userName.includes(searchTerm.toLowerCase()) ||
        record.holiday_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  )

  // Calcular estatísticas com dados filtrados
  const stats = {
    totalAbsences: filteredAbsences.length,
    totalOvertime: filteredOvertime.reduce((sum, r) => sum + (r.hours || 0), 0),
    totalUsers: data.users.length,
    totalHolidays: data.holidays.length,
    absencesByReason: filteredAbsences.reduce((acc: any, absence) => {
      const motivo = MOTIVOS_AUSENCIA[absence.reason] || absence.reason
      acc[motivo] = (acc[motivo] || 0) + 1
      return acc
    }, {}),
    overtimeByUser: filteredOvertime.reduce((acc: any, record) => {
      const user = record.users || data.users.find((u: any) => u.id === record.user_id)
      const userName = user ? `${user.first_name} ${user.last_name}` : "Desconhecido"
      acc[userName] = (acc[userName] || 0) + (record.hours || 0)
      return acc
    }, {}),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EE4D2D] mx-auto mb-4"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#EE4D2D] text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Analytics</h1>
            <p className="text-sm text-white/80">Shopee Page Control - Visão Completa</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-[#D23F20]">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ausências</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAbsences}</div>
              <p className="text-xs text-muted-foreground">Registros totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOvertime}h</div>
              <p className="text-xs text-muted-foreground">Total registrado</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsUsersModalOpen(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" /> Clique para visualizar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feriados</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHolidays}</div>
              <p className="text-xs text-muted-foreground">Registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Exportação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros e Exportação</CardTitle>
            <CardDescription>Filtre por mês, pesquise e exporte os dados para Google Sheets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por funcionário ou feriado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={exportToGoogleSheets} 
                className="bg-green-600 hover:bg-green-700"
                disabled={isExporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar para Google Sheets"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos e Tabelas */}
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">📊 Insights</TabsTrigger>
            <TabsTrigger value="absences">📅 Ausências</TabsTrigger>
            <TabsTrigger value="overtime">⏰ Horas Extras</TabsTrigger>
          </TabsList>

          {/* Aba de Ausências */}
          <TabsContent value="absences">
            <Card>
              <CardHeader>
                <CardTitle>Registros de Ausências</CardTitle>
                <CardDescription>
                  {filteredAbsences.length} registro(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Datas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registrado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAbsences.map((absence) => {
                        const user = absence.users || data.users.find((u) => u.id === absence.user_id)
                        const motivo = MOTIVOS_AUSENCIA[absence.reason] || absence.reason
                        return (
                          <TableRow key={absence.id}>
                            <TableCell className="font-medium">
                              {user ? `${user.first_name} ${user.last_name}` : "Desconhecido"}
                            </TableCell>
                            <TableCell>{motivo}</TableCell>
                            <TableCell className="text-sm">
                              {absence.dates.slice(0, 2).map((date: string) => 
                                format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
                              ).join(", ")}
                              {absence.dates.length > 2 && ` +${absence.dates.length - 2} dia(s)`}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  absence.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : absence.status === "completed"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {absence.status === "approved" ? "Aprovado" : absence.status === "completed" ? "Completo" : "Pendente"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(absence.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Horas Extras */}
          <TabsContent value="overtime">
            <Card>
              <CardHeader>
                <CardTitle>Registros de Horas Extras</CardTitle>
                <CardDescription>
                  {filteredOvertime.length} registro(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Feriado</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Registrado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOvertime.map((record) => {
                        const user = record.users || data.users.find((u) => u.id === record.user_id)
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {user ? `${user.first_name} ${user.last_name}` : "Desconhecido"}
                            </TableCell>
                            <TableCell>{record.holiday_name}</TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              <br />
                              <span className="text-xs text-gray-500">
                                {format(new Date(record.date), "EEEE", { locale: ptBR })}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-[#EE4D2D]">{record.hours}h</TableCell>
                            <TableCell className="text-sm">
                              {record.start_time && record.end_time
                                ? `${record.start_time} - ${record.end_time}`
                                : "Não informado"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Insights */}
          <TabsContent value="insights">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Gráfico de Pizza - Ausências por Motivo */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Ausências por Motivo</CardTitle>
                  <CardDescription>Distribuição dos tipos de ausência</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalAbsences > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.absencesByReason).map(([reason, count]: [string, any]) => {
                        const percentage = ((count / stats.totalAbsences) * 100).toFixed(1)
                        const colors = {
                          "Consulta Médica": "bg-blue-500",
                          "Energia/Internet": "bg-yellow-500",
                          "Férias": "bg-green-500",
                          "Atestado": "bg-red-500",
                          "Outro": "bg-purple-500"
                        }
                        const color = colors[reason as keyof typeof colors] || "bg-gray-500"
                        return (
                          <div key={reason} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{reason}</span>
                              <span className="text-muted-foreground">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`${color} h-3 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nenhuma ausência registrada</p>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Horas Extras por Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle>⏰ Horas Extras por Funcionário</CardTitle>
                  <CardDescription>Top funcionários com mais horas extras</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(stats.overtimeByUser).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.overtimeByUser)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5)
                        .map(([userName, hours]: [string, any]) => {
                          const maxHours = Math.max(...Object.values(stats.overtimeByUser) as number[])
                          const percentage = ((hours / maxHours) * 100).toFixed(1)
                          return (
                            <div key={userName} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{userName}</span>
                                <span className="text-muted-foreground font-bold">
                                  {hours}h
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-[#EE4D2D] h-3 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nenhuma hora extra registrada</p>
                  )}
                </CardContent>
              </Card>

              {/* Estatísticas Gerais */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>📈 Resumo Geral do Período</CardTitle>
                  <CardDescription>
                    {selectedMonth === "all" 
                      ? "Dados de todos os meses" 
                      : `Dados de ${MESES.find(m => m.value === selectedMonth)?.label || ""}` }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                      <span className="text-2xl font-bold text-blue-700">{stats.totalAbsences}</span>
                      <span className="text-xs text-blue-600 text-center">Ausências</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
                      <span className="text-2xl font-bold text-orange-700">{stats.totalOvertime}h</span>
                      <span className="text-xs text-orange-600 text-center">Horas Extras</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <Users className="h-8 w-8 text-green-600 mb-2" />
                      <span className="text-2xl font-bold text-green-700">{stats.totalUsers}</span>
                      <span className="text-xs text-green-600 text-center">Funcionários</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <PieChart className="h-8 w-8 text-purple-600 mb-2" />
                      <span className="text-2xl font-bold text-purple-700">{stats.totalHolidays}</span>
                      <span className="text-xs text-purple-600 text-center">Feriados</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Confirmação de Logout */}
      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Saída</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair do dashboard?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Funcionários */}
      <Dialog open={isUsersModalOpen} onOpenChange={setIsUsersModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lista de Funcionários</DialogTitle>
            <DialogDescription>
              Total de {data.users.length} funcionário(s) cadastrado(s) no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === "admin" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.role === "admin" ? "Administrador" : "Funcionário"}
                      </span>
                    </TableCell>
                    <TableCell>{user.shift || "9-18"}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
