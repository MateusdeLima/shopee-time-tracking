"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HolidayManagement } from "@/components/holiday-management"
import { EmployeeReports } from "@/components/employee-reports"
import { EmployeeManagement } from "@/components/employee-management"
import { AdminSummary } from "@/components/admin-summary"
import { AdminAbsences } from "@/components/admin-absences"
import { AdminNotifications } from "@/components/admin-notifications"
import { Sidebar } from "@/components/sidebar"
import { getCurrentUser, logout, refreshCurrentUser } from "@/lib/auth"
import { useAdminSession, clearAdminSession } from "@/hooks/use-admin-session"
import { initializeDb } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, LogOut } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getHolidays, getOvertimeRecords, getUserById, getUserHolidayStats, getHolidayById, getEmployeePortalTabs, setEmployeePortalTabs } from "@/lib/db"

export const dynamic = "force-dynamic"

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAdmin, isLoading } = useAdminSession()
  const [activeMainTab, setActiveMainTab] = useState("holidays")
  const [activeHolidayTab, setActiveHolidayTab] = useState("manage")
  const [portalTabs, setPortalTabs] = useState<{ holidays: boolean; absences: boolean }>({ holidays: true, absences: true })
  const [isHourBankExportModalOpen, setIsHourBankExportModalOpen] = useState(false)
  const [selectedExportHolidays, setSelectedExportHolidays] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [data, setData] = useState<any>({ holidays: [] }) // garantir array padrão

  useEffect(() => {
    // Inicializar banco de dados
    initializeDb()

    // Verificar se não é admin ou não está carregando
    if (!isLoading && !isAdmin) {
      router.push("/")
      return
    }
  }, [router, isAdmin, isLoading])

  useEffect(() => {
    if (user && !isLoading) {
      getHolidays().then(holidays => setData((prev: any) => ({ ...prev, holidays })));
      getEmployeePortalTabs().then(setPortalTabs);
    }
  }, [user, isLoading]);

  const handleLogout = () => {
    clearAdminSession() // Limpar sessão persistente
    logout()
    router.push("/")
  }

  const handleProfileUpdate = async () => {
    // Recarregar dados do usuário do banco de dados
    const updatedUser = await refreshCurrentUser()
    // Nota: Com sessão persistente, o user será atualizado automaticamente
  }

  // Listener para mudança de aba via notificação
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail
      console.log('🔔 REDIRECT: Mudando para aba:', tab)
      setActiveMainTab(tab)
    }

    // Adicionar listener para evento personalizado
    window.addEventListener('admin-tab-change', handleTabChange as EventListener)

    // Verificar se há parâmetro de aba na URL ao carregar
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam && ['dashboard', 'absences', 'employees'].includes(tabParam)) {
      console.log('🔔 URL: Definindo aba inicial:', tabParam)
      setActiveMainTab(tabParam)
    }

    return () => {
      window.removeEventListener('admin-tab-change', handleTabChange as EventListener)
    }
  }, [])


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Redirecionando...</div>
  }

  const renderContent = () => {
    console.log("🔥 DASHBOARD renderContent chamado, activeMainTab:", activeMainTab)
    switch (activeMainTab) {
      case "holidays":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <AdminSummary />
            </div>
            <Card className="mx-2 sm:mx-0">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Gerenciamento de Feriados</CardTitle>
                <CardDescription className="text-sm sm:text-base">Gerencie feriados e visualize relatórios</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Botões de navegação dentro do card */}
                <div className="flex justify-center mb-6">
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
                {/* Área com altura mínima igual para ambas as abas e responsiva */}
                <div className="min-h-[70vh]">
                  <div className="w-full overflow-x-auto">
                    {activeHolidayTab === "manage" ? (
                      <div className="w-full">
                        <HolidayManagement />
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex justify-end mb-4">
                          <Button
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setIsHourBankExportModalOpen(true)}
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Relatório
                          </Button>
                        </div>
                        <EmployeeReports />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "absences":
        return (
          <Card className="mx-2 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Gerenciamento de Ausências</CardTitle>
              <CardDescription className="text-sm sm:text-base">Visualize e gerencie as ausências registradas pelos funcionários</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="overflow-x-auto">
                <AdminAbsences />
              </div>
            </CardContent>
          </Card>
        )
      case "employees":
        return (
          <Card className="mx-2 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Gerenciamento de Funcionários</CardTitle>
              <CardDescription className="text-sm sm:text-base">Visualize, gerencie e exclua funcionários do sistema</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="w-full overflow-x-auto">
                <EmployeeManagement />
              </div>
            </CardContent>
          </Card>
        )
      case "employee-portal":
        return (
          <Card className="mx-2 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Portal do Funcionário</CardTitle>
              <CardDescription className="text-sm sm:text-base">Ative ou desative as abas visíveis no portal do funcionário</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Feriados</p>
                    <p className="text-xs text-gray-500">Controla a aba de feriados no portal</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={portalTabs.holidays} onChange={async (e) => { let next = { ...portalTabs, holidays: e.target.checked }; if (!next.holidays && !next.absences) { next.absences = true } setPortalTabs(next); try { await setEmployeePortalTabs(next); } catch { /* ignore */ } }} />
                    <span className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition-colors ${portalTabs.holidays ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-4 h-4 rounded-full transform transition-transform ${portalTabs.holidays ? 'translate-x-4' : ''}`}></span>
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Ausências</p>
                    <p className="text-xs text-gray-500">Controla a aba de ausências no portal</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={portalTabs.absences} onChange={async (e) => { let next = { ...portalTabs, absences: e.target.checked }; if (!next.holidays && !next.absences) { next.holidays = true } setPortalTabs(next); try { await setEmployeePortalTabs(next); } catch { /* ignore */ } }} />
                    <span className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition-colors ${portalTabs.absences ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`bg-white w-4 h-4 rounded-full transform transition-transform ${portalTabs.absences ? 'translate-x-4' : ''}`}></span>
                    </span>
                  </label>
                </div>
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
        onTabChange={(newTab) => {
          console.log("🔥 SIDEBAR: Mudança aba de", activeMainTab, "para", newTab)
          setActiveMainTab(newTab)
        }}
        userRole="admin"
        onLogout={handleLogout}
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        userEmail={user?.email}
        profilePictureUrl={user?.profilePictureUrl}
        userId={user?.id}
        userUsername={user?.username}
        onProfileUpdate={handleProfileUpdate}
      />
      
      {/* Header com notificações para admin */}
      <div className="fixed top-0 right-0 z-40 md:left-64 left-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Dashboard Administrativo
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <AdminNotifications isAdmin={isAdmin} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
      
      <main className="flex-1 min-w-0 md:ml-64 pt-20 md:pt-24 p-3 sm:p-6">
        {renderContent()}

        <Dialog open={isHourBankExportModalOpen} onOpenChange={setIsHourBankExportModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Selecionar Feriados para Exportação</DialogTitle>
            </DialogHeader>
            <div className="py-4 max-h-[50vh] overflow-y-auto">
              {(data.holidays || []).filter((h: any) => h.active).length === 0 ? (
                <div className="text-center text-gray-500 mb-4">Nenhum feriado ativo disponível para exportação.</div>
              ) : (
                (data.holidays || []).filter((h: any) => h.active).map((h: any) => (
                  <div key={h.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`holiday_export_${h.id}`}
                      checked={selectedExportHolidays.includes(h.id.toString())}
                      onChange={e => {
                        if (e.target.checked) setSelectedExportHolidays(prev => [...prev, h.id.toString()]);
                        else setSelectedExportHolidays(prev => prev.filter(id => id !== h.id.toString()));
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={`holiday_export_${h.id}`} className="text-sm cursor-pointer">{h.name} ({h.date})</label>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsHourBankExportModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className={`text-white ${isExporting ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'}`}
                disabled={selectedExportHolidays.length === 0 || isExporting}
                onClick={async () => {
                  if (selectedExportHolidays.length === 0 || isExporting) return;
                  setIsExporting(true);
                  try {
                    const overtimeRecords = await getOvertimeRecords();
                    const records = (overtimeRecords || []).filter(
                      (r) => selectedExportHolidays.includes(r.holidayId?.toString()) && (r.status === 'approved' || !r.status)
                    );
                    if (!records.length) {
                      setIsExporting(false);
                      return;
                    }

                    // Agrupar por userId
                    const userIds = Array.from(new Set(records.map(r => r.userId)));

                    // Buscar holiday info (assume mesmo feriado para seleção múltipla -> somaremos por feriado individualmente, mas a linha é por funcionário por feriado)
                    const summaries: any[] = [];
                    for (const holidayIdStr of selectedExportHolidays) {
                      const holidayId = Number(holidayIdStr);
                      const holiday = (data.holidays || []).find((h: any) => h.id === holidayId) || null;
                      for (const uid of userIds) {
                        const stats = await getUserHolidayStats(uid, holidayId);
                        if (stats.max > 0 || stats.used > 0) {
                          const user = await getUserById(uid);
                          summaries.push({
                            holiday: holiday ? holiday.name : 'Feriado',
                            funcionario: user ? `${user.firstName} ${user.lastName}` : 'Desconhecido',
                            horas_totais: holiday ? holiday.maxHours : stats.max,
                            horas_feitas: stats.used,
                          });
                        }
                      }
                    }

                    if (!summaries.length) {
                      setIsExporting(false);
                      return;
                    }

                    const response = await fetch('/api/sheets/export-dashboard', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        mode: 'hour_bank_summary',
                        data: summaries,
                        month: 'Relatório de Banco de Horas',
                        stats: { totalAbsences: 0, totalOvertime: 0, totalUsers: userIds.length, totalHolidays: selectedExportHolidays.length },
                      }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Erro ao exportar relatório');
                    window.open(result.spreadsheetUrl, '_blank');
                  } catch (error: any) {
                    alert(error.message || 'Erro ao exportar para o Google Sheets.');
                  } finally {
                    setIsExporting(false);
                    setIsHourBankExportModalOpen(false);
                    setSelectedExportHolidays([]);
                  }
                }}
              >
                {isExporting ? (
                  <>
                    <span className="inline-flex h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Selecionados
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

