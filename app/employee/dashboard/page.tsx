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
import { getCurrentUser, logout, setCurrentUser } from "@/lib/auth"
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
              {/* Foto de perfil com overlay para edição */}
              <div className="relative group">
                {user.profilePictureUrl ? (
                  <>
                    <Image
                      src={user.profilePictureUrl}
                      alt="Foto de perfil"
                      width={32}
                      height={32}
                      className="rounded-full mr-2 border-2 border-white cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => document.getElementById('profile-picture-upload')?.click()}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                         onClick={() => document.getElementById('profile-picture-upload')?.click()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2 border-2 border-white cursor-pointer hover:bg-gray-400 transition-colors"
                    onClick={() => document.getElementById('profile-picture-upload')?.click()}
                  >
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      setLoading(true);
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
                      setLoading(false);
                      // Resetar o input para permitir selecionar o mesmo arquivo novamente
                      e.target.value = '';
                    }
                  }}
                />
              </div>
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

