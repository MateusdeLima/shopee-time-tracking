"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HolidayManagement } from "@/components/holiday-management"
import { EmployeeReports } from "@/components/employee-reports"
import { EmployeeManagement } from "@/components/employee-management"
import { AdminSummary } from "@/components/admin-summary"
import { AdminAbsences } from "@/components/admin-absences"
import { CalendarDays, FileText, Users, LogOut, Calendar } from "lucide-react"
import { getCurrentUser, logout } from "@/lib/auth"
import { initializeDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("holidays")
  const [activeHolidayTab, setActiveHolidayTab] = useState("manage")

  useEffect(() => {
    // Inicializar banco de dados
    initializeDb()

    // Verificar autenticação
    const user = getCurrentUser()
    if (!user) {
      router.push("/")
      return
    }

    if (user.role !== "admin") {
      router.push("/")
      return
    }

    setUser(user)
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Redirecionando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#EE4D2D] text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Shopee Page Control</h1>
            <p className="text-sm">O controle da shopee external</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-[#D23F20]">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <AdminSummary />
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-full md:w-auto inline-flex">
              <TabsTrigger value="holidays" className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4" /> Feriados
              </TabsTrigger>
              <TabsTrigger value="absences" className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" /> Ausências
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex items-center">
                <Users className="mr-2 h-4 w-4" /> Funcionários
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo da aba Feriados */}
          <TabsContent value="holidays">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Feriados</CardTitle>
                <CardDescription>Gerencie feriados e visualize relatórios</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeHolidayTab} onValueChange={setActiveHolidayTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="manage" className="flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4" /> Gerenciar Feriados
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" /> Relatórios
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manage">
                    <HolidayManagement />
                  </TabsContent>

                  <TabsContent value="reports">
                    <EmployeeReports />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conteúdo da aba Ausências */}
          <TabsContent value="absences">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Ausências</CardTitle>
                <CardDescription>Visualize e gerencie as ausências registradas pelos funcionários</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminAbsences />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conteúdo da aba Funcionários */}
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Funcionários</CardTitle>
                <CardDescription>Visualize, gerencie e exclua funcionários do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

