"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sidebar } from "@/components/sidebar"
import { User, Edit2, X } from "lucide-react"
import { getCurrentUser, logout, setCurrentUser, refreshCurrentUser } from "@/lib/auth"
import { initializeDb, getEmployeePortalTabs } from "@/lib/db"
import Image from "next/image"
import { getProfilePictureUrl } from "@/lib/supabase"

// Lazy loading dos componentes pesados
const SimpleHolidaySelection = lazy(() => import("@/components/simple-holiday-selection").then(module => ({ default: module.SimpleHolidaySelection })))
const EmployeeHistory = lazy(() => import("@/components/employee-history").then(module => ({ default: module.EmployeeHistory })))
const AbsenceManagement = lazy(() => import("@/components/absence-management").then(module => ({ default: module.AbsenceManagement })))

export const dynamic = "force-dynamic"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("holidays")
  const [portalTabs, setPortalTabs] = useState<{ holidays: boolean; absences: boolean }>({ holidays: true, absences: true })
  const [activeHolidayTab, setActiveHolidayTab] = useState("register")
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)

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

  useEffect(() => {
    getEmployeePortalTabs().then((tabs) => {
      // Regras: sempre ao menos uma ativa; definir principal
      const safeTabs = { holidays: !!tabs.holidays, absences: !!tabs.absences }
      if (!safeTabs.holidays && !safeTabs.absences) safeTabs.absences = true
      setPortalTabs(safeTabs)
      if (safeTabs.holidays && safeTabs.absences) setActiveMainTab("holidays")
      else if (safeTabs.holidays) setActiveMainTab("holidays")
      else setActiveMainTab("absences")
    })
  }, [])

  useEffect(() => {
    if (activeMainTab === "holidays" && !portalTabs.holidays) setActiveMainTab("absences")
    if (activeMainTab === "absences" && !portalTabs.absences) setActiveMainTab("holidays")
  }, [portalTabs, activeMainTab])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleProfileUpdate = async () => {
    // Recarregar dados do usuário do banco de dados
    const updatedUser = await refreshCurrentUser()
    if (updatedUser) {
      setUser(updatedUser)
    }
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
          <Card className="mx-2 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Gerenciamento de Feriados</CardTitle>
              <CardDescription className="text-sm sm:text-base">Registre horas extras e visualize seu histórico</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Botões de navegação dentro do card */}
              <div className="flex justify-center mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeHolidayTab === "register"
                        ? "bg-[#EE4D2D] text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setActiveHolidayTab("register")}
                  >
                    Registrar Horas
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeHolidayTab === "history"
                        ? "bg-[#EE4D2D] text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setActiveHolidayTab("history")}
                  >
                    Histórico
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D]"></div></div>}>
                  {activeHolidayTab === "register" ? (
                    <SimpleHolidaySelection user={user} />
                  ) : (
                    <EmployeeHistory user={user} />
                  )}
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )
      case "absences":
        return (
          <Card className="mx-2 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Gerenciamento de Ausências</CardTitle>
              <CardDescription className="text-sm sm:text-base">Registre e gerencie suas ausências futuras!</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="overflow-x-auto">
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D]"></div></div>}>
                  <AbsenceManagement user={user} />
                </Suspense>
              </div>
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
        userRole="employee"
        onLogout={handleLogout}
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        userEmail={user?.email}
        profilePictureUrl={user?.profilePictureUrl}
        userId={user?.id}
        userUsername={user?.username}
        userShift={user?.shift}
        onProfileUpdate={handleProfileUpdate}
        customTabs={[
          ...(portalTabs.holidays ? [{ id: 'holidays', label: 'Feriados' }] as any : []),
          ...(portalTabs.absences ? [{ id: 'absences', label: 'Ausências' }] as any : []),
        ]}
      />
      
      <main className="flex-1 min-w-0 md:ml-64 pt-20 md:pt-0 p-2 sm:p-4 lg:p-6">
        {renderContent()}
      </main>

      {/* Dialog de visualização e edição da foto de perfil */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Minhas Informações</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Informações do usuário sem foto */}
            <div className="bg-[#EE4D2D]/10 p-6 rounded-full mb-2">
              <User className="h-16 w-16 text-[#EE4D2D]" />
            </div>

            {/* Informações do usuário */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">User: <strong>{user.username}</strong></p>
              <p className="text-xs text-blue-600 font-medium">Expediente: {user.shift}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsProfileDialogOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

