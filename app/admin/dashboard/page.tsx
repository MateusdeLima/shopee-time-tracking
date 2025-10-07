"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HolidayManagement } from "@/components/holiday-management"
import { EmployeeReports } from "@/components/employee-reports"
import { EmployeeManagement } from "@/components/employee-management"
import { AdminSummary } from "@/components/admin-summary"
import { AdminAbsences } from "@/components/admin-absences"
import { Sidebar } from "@/components/sidebar"
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

  const renderContent = () => {
    switch (activeMainTab) {
      case "holidays":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <AdminSummary />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Feriados</CardTitle>
                <CardDescription>Gerencie feriados e visualize relatórios</CardDescription>
              </CardHeader>
              <CardContent>
                {activeHolidayTab === "manage" ? (
                  <HolidayManagement />
                ) : (
                  <EmployeeReports />
                )}
                <div className="flex justify-center mt-6">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeHolidayTab === "manage"
                          ? "bg-[#EE4D2D] text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => setActiveHolidayTab("manage")}
                    >
                      Gerenciar Feriados
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeHolidayTab === "reports"
                          ? "bg-[#EE4D2D] text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => setActiveHolidayTab("reports")}
                    >
                      Relatórios
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "absences":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Ausências</CardTitle>
              <CardDescription>Visualize e gerencie as ausências registradas pelos funcionários</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAbsences />
            </CardContent>
          </Card>
        )
      case "employees":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Funcionários</CardTitle>
              <CardDescription>Visualize, gerencie e exclua funcionários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeManagement />
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
        userRole="admin"
        onLogout={handleLogout}
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        userEmail={user?.email}
      />
      
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 p-6">
        {renderContent()}
      </main>
    </div>
  )
}

