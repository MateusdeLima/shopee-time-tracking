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
import { initializeDb, updateUser, getUserById } from "@/lib/db"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadProfilePicture } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

export const dynamic = "force-dynamic"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("holidays")
  const [activeHolidayTab, setActiveHolidayTab] = useState("register")
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [isEditPhoto, setIsEditPhoto] = useState(false)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<string>("")
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

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleOpenPhotoModal = () => {
    setIsPhotoModalOpen(true)
    setIsEditPhoto(false)
    setNewPhoto(null)
    setPreviewPhoto("")
  }

  const handleEditPhoto = () => {
    setIsEditPhoto(true)
    setNewPhoto(null)
    setPreviewPhoto("")
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setNewPhoto(file)
    if (file) {
      setPreviewPhoto(URL.createObjectURL(file))
    } else {
      setPreviewPhoto("")
    }
  }

  const handleSavePhoto = async () => {
    if (!user || !newPhoto) return
    setIsUpdatingPhoto(true)
    try {
      const url = await uploadProfilePicture(newPhoto, user.email.replace(/[^a-zA-Z0-9]/g, ""))
      if (!url) throw new Error("Falha ao fazer upload da foto.")
      await updateUser(user.id, { profilePictureUrl: url })
      // Atualizar usuário localmente
      const updatedUser = await getUserById(user.id)
      setUser(updatedUser)
      setIsEditPhoto(false)
      setIsPhotoModalOpen(false)
      toast({ title: "Foto atualizada com sucesso!" })
    } catch (err: any) {
      toast({ title: "Erro ao atualizar foto", description: err.message, variant: "destructive" })
    } finally {
      setIsUpdatingPhoto(false)
    }
  }

  // Adiciona um parâmetro de cache busting na URL da foto
  const getProfilePictureUrl = () => {
    if (!user?.profilePictureUrl) return ""
    return user.profilePictureUrl + '?t=' + (user.updated_at ? new Date(user.updated_at).getTime() : Date.now())
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
            <div className="flex items-center mt-1 text-sm text-white/80 gap-2">
              <Avatar className="w-8 h-10 border border-white cursor-pointer" onClick={handleOpenPhotoModal}>
                <AvatarImage
                  src={getProfilePictureUrl()}
                  alt={user.firstName}
                  className="object-cover w-8 h-10 rounded-md"
                />
                <AvatarFallback>{user.firstName?.[0]}</AvatarFallback>
              </Avatar>
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

      {/* Modal de visualização/edição da foto de perfil */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Foto de Perfil</DialogTitle>
          </DialogHeader>
          {!isEditPhoto ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={getProfilePictureUrl()}
                alt="Foto de perfil"
                className="w-32 h-40 object-cover rounded-md border"
              />
              <Button onClick={handleEditPhoto} className="w-full">Editar Foto</Button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleSavePhoto(); }}>
              <Label htmlFor="newProfilePhoto">Nova Foto de Perfil</Label>
              <Input
                id="newProfilePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                required
              />
              {previewPhoto && (
                <img
                  src={previewPhoto}
                  alt="Pré-visualização"
                  className="w-32 h-40 object-cover rounded-md border"
                />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditPhoto(false)} disabled={isUpdatingPhoto}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#EE4D2D] hover:bg-[#D23F20]" disabled={isUpdatingPhoto}>
                  {isUpdatingPhoto ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

