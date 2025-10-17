"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { CalendarDays, Calendar, Users, LogOut, FileText, Clock, User, Menu, X, Edit, Upload, Banknote } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole: "admin" | "employee"
  onLogout: () => void
  userName?: string
  userEmail?: string
  profilePictureUrl?: string
  userId?: string
  onProfileUpdate?: () => void
  userUsername?: string
  userShift?: string
  customTabs?: Array<{ id: string; label: string; icon?: any }>
}

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  userRole, 
  onLogout, 
  userName, 
  userEmail,
  profilePictureUrl,
  userId,
  onProfileUpdate,
  userUsername,
  userShift,
  customTabs,
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const adminTabs = [
    { id: "holidays", label: "Feriados", icon: CalendarDays },
    { id: "absences", label: "Ausências", icon: Calendar },
    { id: "schedules", label: "Horários", icon: Clock },
    { id: "employees", label: "Funcionários", icon: Users },
    { id: "employee-portal", label: "Portal Funcionário", icon: User },
  ]

  const employeeTabs = [
    { id: "holidays", label: "Feriados", icon: Clock },
    { id: "absences", label: "Ausências", icon: Calendar },
  ]

  const tabs = customTabs && customTabs.length > 0 ? customTabs : (userRole === "admin" ? adminTabs : employeeTabs)

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  const handlePhotoClick = () => {
    setIsPhotoDialogOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB",
        variant: "destructive",
      })
      return
    }

    // Verificar tipo do arquivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUpdatingPhoto(true)

      // Converter arquivo para base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64String = event.target?.result as string

          // Fazer requisição para atualizar a foto
          const response = await fetch('/api/user/update-profile-picture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              profilePicture: base64String
            })
          })

          if (!response.ok) {
            throw new Error('Erro ao atualizar foto de perfil')
          }

          toast({
            title: "Foto atualizada",
            description: "Sua foto de perfil foi atualizada com sucesso!",
          })

          // Chamar callback para atualizar a interface
          if (onProfileUpdate) {
            onProfileUpdate()
          }

          setIsPhotoDialogOpen(false)
        } catch (error) {
          console.error('Erro ao atualizar foto:', error)
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao atualizar a foto de perfil",
            variant: "destructive",
          })
        } finally {
          setIsUpdatingPhoto(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o arquivo",
        variant: "destructive",
      })
      setIsUpdatingPhoto(false)
    }
  }

  // Mobile menu button
  if (isMobile) {
    return (
      <>
        {/* Mobile header with menu button */}
        <div className="fixed top-0 left-0 right-0 bg-[#EE4D2D] text-white p-4 z-50 flex items-center">
          <div className="w-10 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:bg-[#D23F20]"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold">Shopee Page Control</h1>
            <p className="text-xs text-white/80">O controle da shopee external</p>
          </div>
          <div className="w-10 flex-shrink-0" />
        </div>

        {/* Mobile sidebar overlay */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed top-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col h-screen z-50 transform transition-transform">
              <SidebarContent 
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={onLogout}
                userName={userName}
                userEmail={userEmail}
                profilePictureUrl={profilePictureUrl}
                userRole={userRole}
                showHeader={false}
                onPhotoClick={handlePhotoClick}
                userUsername={userUsername}
                userShift={userShift}
              />
            </div>
          </>
        )}

        {/* Dialog de foto para mobile */}
        <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Foto de Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Foto de perfil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#EE4D2D]"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center border-4 border-[#EE4D2D]">
                    <User className="h-16 w-16 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingPhoto}
                  className="bg-[#EE4D2D] hover:bg-[#D23F20] w-full"
                >
                  {isUpdatingPhoto ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Alterar Foto
                    </>
                  )}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500 text-center">
                  Formatos aceitos: JPEG, PNG, GIF, WEBP<br />
                  Tamanho máximo: 5MB
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop sidebar
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40">
      <SidebarContent 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        userName={userName}
        userEmail={userEmail}
        profilePictureUrl={profilePictureUrl}
        userRole={userRole}
        showHeader={true}
        onPhotoClick={handlePhotoClick}
        userUsername={userUsername}
        userShift={userShift}
      />
      
      {/* Dialog de visualização e edição da foto */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de Perfil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Visualização da foto atual */}
            <div className="flex justify-center">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#EE4D2D]"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center border-4 border-[#EE4D2D]">
                  <User className="h-16 w-16 text-gray-600" />
                </div>
              )}
            </div>
            
            {/* Botão para editar foto */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingPhoto}
                className="bg-[#EE4D2D] hover:bg-[#D23F20] w-full"
              >
                {isUpdatingPhoto ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Alterar Foto
                  </>
                )}
              </Button>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
              />
              
              <p className="text-xs text-gray-500 text-center">
                Formatos aceitos: JPEG, PNG, GIF, WEBP<br />
                Tamanho máximo: 5MB
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SidebarContent({ 
  tabs, 
  activeTab, 
  onTabChange, 
  onLogout, 
  userName, 
  userEmail, 
  profilePictureUrl, 
  userRole,
  showHeader,
  onPhotoClick,
  userUsername,
  userShift,
}: {
  tabs: Array<{ id: string; label: string; icon?: any }>
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  userName?: string
  userEmail?: string
  profilePictureUrl?: string
  userRole: "admin" | "employee"
  showHeader: boolean
  onPhotoClick?: () => void
  userUsername?: string
  userShift?: string
}) {
  return (
    <>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 bg-[#EE4D2D] text-white">
          <h1 className="text-lg font-bold">Shopee Page Control</h1>
          <p className="text-xs text-white/80">O controle da shopee external</p>
        </div>
      )}

      {/* User Info */}
      {(userName || userEmail) && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div 
              className="relative cursor-pointer group"
              onClick={onPhotoClick}
              title="Clique para visualizar/editar foto"
            >
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Foto de perfil"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#EE4D2D] group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-[#EE4D2D] group-hover:bg-gray-400 transition-colors">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              )}
              {/* Ícone de edição no hover */}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {userName && (
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              )}
              {userEmail && (
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              )}
              {userUsername && (
                <p className="text-[10px] mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  user: <span className="ml-1 font-semibold">{userUsername}</span>
                </p>
              )}
              {userRole === "employee" && userShift && (
                <p className="text-[10px] mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  expediente: <span className="ml-1 font-semibold">{userShift.replace('-', '–')}</span>
                </p>
              )}
              <p className="text-xs text-gray-400">
                {userRole === "admin" ? "Administrador" : "Funcionário"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  activeTab === tab.id 
                    ? "bg-[#EE4D2D] text-white hover:bg-[#D23F20]" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                {Icon ? <Icon className="h-5 w-5" /> : null}
                {tab.label}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-gray-700 hover:bg-red-50 hover:text-red-600"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </>
  )
}
