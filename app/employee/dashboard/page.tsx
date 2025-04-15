"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HolidaySelection } from "@/components/holiday-selection"
import { EmployeeHistory } from "@/components/employee-history"
import { AbsenceManagement } from "@/components/absence-management"
import { Clock, History, LogOut, Calendar, User } from "lucide-react"
import { getCurrentUser, logout } from "@/lib/auth"
import { initializeDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("holidays")
  const [activeHolidayTab, setActiveHolidayTab] = useState("register")

  useEffect(() => {
    // Inicializar banco de dados
    initializeDb()

    // Verificar autenticação
    const user = getCurrentUser()
    if (!user) {
      router.push("/")
      return
    }

    if (user.role !== "employee") {
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
          <div className="flex flex-col items-end">
            <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-[#D23F20]">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
            <div className="flex items-center mt-1 text-sm text-white/80">
              <User className="h-3 w-3 mr-1" />
              <span>
                User: <strong>{user.username}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="holidays" className="flex items-center">
              <Clock className="mr-2 h-4 w-4" /> Feriados
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" /> Ausências
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo da aba Feriados */}
          <TabsContent value="holidays">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Feriados</CardTitle>
                <CardDescription>Registre horas extras e visualize seu histórico</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeHolidayTab} onValueChange={setActiveHolidayTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="register" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" /> Registrar Horas
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center">
                      <History className="mr-2 h-4 w-4" /> Histórico
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="register">
                    <HolidaySelection user={user} />
                  </TabsContent>

                  <TabsContent value="history">
                    <EmployeeHistory user={user} />
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
                <CardDescription>Registre e gerencie suas ausências futuras</CardDescription>
              </CardHeader>
              <CardContent>
                <AbsenceManagement user={user} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

