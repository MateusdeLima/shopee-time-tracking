"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HolidaySelection } from "@/components/holiday-selection"
import { EmployeeHistory } from "@/components/employee-history"
import { AbsenceManagement } from "@/components/absence-management"
import { Sidebar } from "@/components/sidebar"
import { User, Edit2, X } from "lucide-react"
import { getCurrentUser, logout, setCurrentUser, refreshCurrentUser } from "@/lib/auth"
import { initializeDb } from "@/lib/db"
import Image from "next/image"
import { getProfilePictureUrl } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("holidays")
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

    // Se for o primeiro acesso E não tiver foto de perfil, redireciona para upload obrigatório
    if (user.isFirstAccess && !user.profilePictureUrl) {
      router.push("/employee/primeiro-acesso")
      return
    }

    setUser(user)
    setLoading(false)
  }, [router])

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
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Feriados</CardTitle>
              <CardDescription>Registre horas extras e visualize seu histórico</CardDescription>
            </CardHeader>
            <CardContent>
              {activeHolidayTab === "register" ? (
                <HolidaySelection user={user} />
              ) : (
                <EmployeeHistory user={user} />
              )}
              <div className="flex justify-center mt-6">
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
            </CardContent>
          </Card>
        )
      case "absences":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Ausências</CardTitle>
              <CardDescription>Registre e gerencie suas ausências futuras</CardDescription>
            </CardHeader>
            <CardContent>
              <AbsenceManagement user={user} />
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
        onProfileUpdate={handleProfileUpdate}
      />
      
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 p-6">
        {renderContent()}
      </main>

      {/* Dialog de visualização e edição da foto de perfil */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Foto de Perfil</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Foto no formato 3x4 */}
            <div className="relative w-48 h-64 bg-gray-100 rounded-lg overflow-hidden border-4 border-[#EE4D2D] shadow-lg">
              {user.profilePictureUrl ? (
                <Image
                  src={user.profilePictureUrl}
                  alt="Foto de perfil"
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Informações do usuário */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">User: <strong>{user.username}</strong></p>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsProfileDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
              <Button
                className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
                onClick={() => document.getElementById('profile-picture-upload-dialog')?.click()}
                disabled={isUpdatingPhoto}
              >
                {isUpdatingPhoto ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar Foto
                  </>
                )}
              </Button>
            </div>

            {/* Input de arquivo oculto */}
            <input
              id="profile-picture-upload-dialog"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  setIsUpdatingPhoto(true);
                  const { uploadProfilePicture } = await import('@/lib/supabase');
                  const { updateUserProfilePicture } = await import('@/lib/db');
                  
                  const url = await uploadProfilePicture(user.id, file);
                  if (!url) throw new Error('Falha ao fazer upload da nova foto.');
                  
                  await updateUserProfilePicture(user.id, url);
                  
                  // Atualizar o estado do usuário
                  const updatedUser = { ...user, profilePictureUrl: url };
                  setUser(updatedUser);
                  setCurrentUser(updatedUser);
                  
                  // Mostrar notificação de sucesso
                  alert('Foto de perfil atualizada com sucesso!');
                } catch (err) {
                  console.error('Erro ao atualizar foto de perfil:', err);
                  alert('Erro ao atualizar a foto de perfil. Tente novamente.');
                } finally {
                  setIsUpdatingPhoto(false);
                  // Resetar o input para permitir selecionar o mesmo arquivo novamente
                  e.target.value = '';
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

