"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CalendarDays, Calendar, Users, LogOut, FileText, Clock, User, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole: "admin" | "employee"
  onLogout: () => void
  userName?: string
  userEmail?: string
  profilePictureUrl?: string
}

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  userRole, 
  onLogout, 
  userName, 
  userEmail,
  profilePictureUrl 
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
    { id: "employees", label: "Funcionários", icon: Users },
  ]

  const employeeTabs = [
    { id: "holidays", label: "Feriados", icon: Clock },
    { id: "absences", label: "Ausências", icon: Calendar },
  ]

  const tabs = userRole === "admin" ? adminTabs : employeeTabs

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  // Mobile menu button
  if (isMobile) {
    return (
      <>
        {/* Mobile header with menu button */}
        <div className="fixed top-0 left-0 right-0 bg-[#EE4D2D] text-white p-4 z-50 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Shopee Page Control</h1>
            <p className="text-xs text-white/80">O controle da shopee external</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:bg-[#D23F20]"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
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
              />
            </div>
          </>
        )}
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
      />
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
  showHeader 
}: {
  tabs: Array<{ id: string; label: string; icon: any }>
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  userName?: string
  userEmail?: string
  profilePictureUrl?: string
  userRole: "admin" | "employee"
  showHeader: boolean
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
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Foto de perfil"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#EE4D2D]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-[#EE4D2D]">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {userName && (
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              )}
              {userEmail && (
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
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
                <Icon className="h-5 w-5" />
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
