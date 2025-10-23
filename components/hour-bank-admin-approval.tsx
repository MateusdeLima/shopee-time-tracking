"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle, XCircle, Clock, Calendar, Bot, Sparkles, Eye, User, Image as ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getOvertimeRecords, updateOvertimeRecord, getUsers, getHolidays } from "@/lib/db"
import Image from "next/image"

interface HourBankAdminApprovalProps {
  onUpdate?: () => void
}

export function HourBankAdminApproval({ onUpdate }: HourBankAdminApprovalProps) {
  const [pendingRecords, setPendingRecords] = useState<any[]>([])
  const [approvedRecords, setApprovedRecords] = useState<any[]>([])
  const [historyRecords, setHistoryRecords] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null)
  const [processing, setProcessing] = useState(false)
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "rejected">("all")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // TEMPORÁRIO: usar registros de horas extras (mais estável)
      console.log("Carregando dados do Dashboard Analytics...")
      const allRecords = await getOvertimeRecords()
      const pending = allRecords
        .filter(record => (record.optionId === "ai_bank_hours" || record.optionId === "manual_bank_hours") && record.status === "pending_admin")
        .sort((a,b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())

      const processed = allRecords
        .filter(record => (record.optionId === "ai_bank_hours" || record.optionId === "manual_bank_hours") && (record.status === "approved" || record.status === "rejected_admin"))
        .sort((a,b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 20)
      
      console.log("Dados carregados:", { pending: pending.length, processed: processed.length })
      
      // Debug: verificar se as imagens estão sendo carregadas
      console.log("=== DEBUG REGISTROS PENDENTES ===")
      pending.forEach((record, index) => {
        console.log(`Registro ${index + 1}:`, {
          id: record.id,
          userId: record.userId,
          status: record.status,
          optionId: record.optionId,
          proofImage: record.proofImage ? `${record.proofImage.substring(0, 50)}...` : 'SEM IMAGEM',
          hasImage: !!record.proofImage,
          imageLength: record.proofImage?.length || 0
        })
      })
      
      // Debug: verificar registros processados também
      console.log("=== DEBUG REGISTROS PROCESSADOS ===")
      processed.forEach((record, index) => {
        console.log(`Processado ${index + 1}:`, {
          id: record.id,
          status: record.status,
          proofImage: record.proofImage ? 'TEM IMAGEM (não deveria ter)' : 'SEM IMAGEM (correto)',
          hasImage: !!record.proofImage
        })
      })
      
      // Carregar usuários e feriados para exibição
      const [usersData, holidaysData] = await Promise.all([
        getUsers(),
        getHolidays()
      ])
      
      setPendingRecords(pending || [])
      setApprovedRecords(processed || [])
      setHistoryRecords(processed || [])
      setUsers(usersData)
      setHolidays(holidaysData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      console.error("Detalhes do erro:", JSON.stringify(error, null, 2))
      toast({
        title: "Erro",
        description: `Não foi possível carregar os dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? `${user.first_name || user.firstName} ${user.last_name || user.lastName}` : "Usuário não encontrado"
  }

  const getHolidayName = (holidayId: number) => {
    const holiday = holidays.find(h => h.id === holidayId)
    return holiday ? holiday.name : "Feriado não encontrado"
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Data não disponível'
      
      if (dateString.includes('T') || dateString.includes(' ')) {
        const date = parseISO(dateString)
        if (isNaN(date.getTime())) {
          throw new Error('Data inválida após parseISO')
        }
        return format(date, "dd/MM/yyyy", { locale: ptBR })
      } else {
        const date = new Date(dateString + 'T12:00:00')
        if (isNaN(date.getTime())) {
          throw new Error('Data inválida após new Date')
        }
        return format(date, "dd/MM/yyyy", { locale: ptBR })
      }
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return 'Data inválida'
    }
  }

  const formatHours = (hours: number) => {
    if (hours === 0.5) return "30min"
    return `${hours}h`
  }

  const handleViewRecord = (record: any) => {
    setSelectedRecord(record)
    setIsViewDialogOpen(true)
  }

  const handleApprovalAction = (record: any, action: "approve" | "reject") => {
    setSelectedRecord(record)
    setApprovalAction(action)
    setIsApprovalDialogOpen(true)
  }

  const processApproval = async () => {
    if (!selectedRecord || !approvalAction) return

    try {
      setProcessing(true)
      
      console.log("=== PROCESSANDO APROVAÇÃO ===")
      console.log("selectedRecord:", selectedRecord)
      console.log("approvalAction:", approvalAction)
      
      // Atualizar o registro existente (que já está pendente)
      const { updateOvertimeRecord } = await import("@/lib/db")
      
      const newStatus = approvalAction === "approve" ? "approved" : "rejected_admin"
      
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
      
      if (approvalAction === "approve") {
        updateData.optionLabel = `Banco de Horas - ${formatHours(selectedRecord.hours)} (Aprovado pelo Dashboard Analytics)`
        console.log("Admin aprovou - ativando registro de horas extras")
      } else {
        console.log("Admin rejeitou - marcando registro como rejeitado")
      }
      
      await updateOvertimeRecord(selectedRecord.id, {
        ...updateData,
        proofImage: '', // Limpa imagem ao aprovar/reprovar como solicitado
      })

      // Atualizar lista local
      setPendingRecords(prev => prev.filter(r => r.id !== selectedRecord.id))
      
      toast({
        title: approvalAction === "approve" ? "Aprovado com sucesso" : "Rejeitado com sucesso",
        description: `O registro de ${getUserName(selectedRecord.userId)} foi ${
          approvalAction === "approve" ? "aprovado" : "rejeitado"
        }.`,
      })

      // Callback para atualizar outros componentes
      if (onUpdate) onUpdate()
      
      // Invalidar cache e forçar recálculo das estatísticas
      console.log("Invalidando cache e forçando recálculo das estatísticas...")
      try {
        const { invalidateCache } = await import("@/lib/stats-cache")
        const { getUserHolidayStats } = await import("@/lib/db")
        
        // Invalidar cache
        invalidateCache(selectedRecord.userId, selectedRecord.holidayId)
        
        // Forçar recálculo
        const stats = await getUserHolidayStats(selectedRecord.userId, selectedRecord.holidayId, true)
        console.log("Estatísticas recalculadas:", stats)
      } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error)
      }
      
      setIsApprovalDialogOpen(false)
      setSelectedRecord(null)
      setApprovalAction(null)
    } catch (error) {
      console.error("=== ERRO AO PROCESSAR APROVAÇÃO ===")
      console.error("Tipo do erro:", typeof error)
      console.error("Erro completo:", error)
      console.error("Stack trace:", error instanceof Error ? error.stack : "Sem stack")
      console.error("selectedRecord no erro:", selectedRecord)
      
      toast({
        title: "Erro ao processar aprovação",
        description: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold">Aprovações de Banco de Horas</h3>
        <Badge variant="secondary">{pendingRecords.length} pendente(s)</Badge>
      </div>

      {pendingRecords.length > 0 ? (
        pendingRecords.map((record) => (
          <Card key={record.id} className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-[#EE4D2D]">{getHolidayName(record.holidayId)}</h4>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                      <Bot className="h-3 w-3" />
                      <Sparkles className="h-3 w-3" />
                      Aguardando
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{getUserName(record.userId)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Registrado em: {formatDate(record.date)}</span>
                    </div>
                    
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 w-fit">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatHours(record.hours)} compensadas
                    </Badge>
                    
                    {record.proofImage && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Comprovante anexado:</p>
                        <img 
                          src={record.proofImage} 
                          alt="Comprovante de banco de horas"
                          className="max-w-full h-32 object-contain border rounded cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setSelectedRecord(record)
                            setIsViewDialogOpen(true)
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewRecord(record)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprovalAction(record, "approve")}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprovalAction(record, "reject")}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Não há registros de banco de horas aguardando aprovação</p>
            </div>
          </CardContent>
        </Card>
      )}

      {historyRecords.length > 0 && (
        <Card className="mt-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Histórico de Solicitações</CardTitle>
                <Badge variant="secondary">{historyRecords.filter(r => 
                  historyFilter === "all" || 
                  (historyFilter === "approved" && r.status === "approved") ||
                  (historyFilter === "rejected" && r.status === "rejected_admin")
                ).length} registro(s)</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={historyFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={historyFilter === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryFilter("approved")}
                  className="text-green-600 hover:text-green-700"
                >
                  Aprovados
                </Button>
                <Button
                  variant={historyFilter === "rejected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryFilter("rejected")}
                  className="text-red-600 hover:text-red-700"
                >
                  Recusados
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {historyRecords
                .filter(record => 
                  historyFilter === "all" || 
                  (historyFilter === "approved" && record.status === "approved") ||
                  (historyFilter === "rejected" && record.status === "rejected_admin")
                )
                .map((record) => (
                <div key={record.id} className={`flex items-center justify-between p-4 rounded-lg border ${record.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {record.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${record.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                        {getUserName(record.userId)}
                      </div>
                      <div className={`text-sm ${record.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                        {record.holidayName} • {formatDate(record.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${record.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                      {formatHours(record.hours)}
                    </Badge>
                    <span className="text-xs text-gray-500">{formatDate(record.updatedAt || record.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Status do Registro
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="flex flex-col items-center gap-8 p-4">
              <span className={`px-4 py-2 rounded-full font-bold text-base ${selectedRecord.status === 'approved' ? 'bg-green-100 text-green-700' : selectedRecord.status === 'pending_admin' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                {selectedRecord.status === 'approved' ? 'Aprovado' : selectedRecord.status === 'pending_admin' ? 'Aguardando aprovação' : 'Rejeitado'}
              </span>
              
              
              {selectedRecord.proofImage ? (
                <img
                  src={selectedRecord.proofImage}
                  alt="Comprovante do banco de horas"
                  className="rounded shadow-lg cursor-zoom-in max-w-xs max-h-80 border"
                  onClick={() => setIsImageFullscreen(true)}
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', e)
                    console.log('URL da imagem:', selectedRecord.proofImage)
                  }}
                />
              ) : (
                <div className="text-gray-500 italic">Nenhum comprovante anexado</div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog fullscreen/lightbox para imagem */}
      <Dialog open={isImageFullscreen} onOpenChange={setIsImageFullscreen}>
        <DialogContent className="flex justify-center items-center bg-black bg-opacity-90 max-w-none w-auto h-auto p-0" style={{maxWidth: "90vw", maxHeight: "90vh"}}>
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização em tela cheia do comprovante</DialogTitle>
          </DialogHeader>
          <img
            src={selectedRecord?.proofImage}
            alt="Comprovante banco de horas fullscreen"
            className="rounded-lg shadow-lg max-w-[90vw] max-h-[90vh] object-contain border-4 border-white"
          />
          <Button variant="secondary" className="absolute top-5 right-5" onClick={() => setIsImageFullscreen(false)}>Fechar</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Aprovação/Rejeição */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalAction === "approve" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {approvalAction === "approve" ? "Aprovar" : "Rejeitar"} Registro
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="py-4">
              <p className="mb-4">
                Você está prestes a <strong>{approvalAction === "approve" ? "aprovar" : "rejeitar"}</strong> o 
                registro de banco de horas de <strong>{getUserName(selectedRecord.user_id)}</strong> 
                para o feriado <strong>{getHolidayName(selectedRecord.holiday_id)}</strong>.
              </p>
              
              <Alert className={approvalAction === "approve" ? "border-green-200" : "border-red-200"}>
                <AlertDescription>
                  {approvalAction === "approve" 
                    ? `As ${formatHours(selectedRecord.hours)} serão descontadas automaticamente do total exigido para este feriado.`
                    : "O funcionário será notificado sobre a rejeição e nenhum desconto será aplicado."
                  }
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsApprovalDialogOpen(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={processApproval}
              disabled={processing}
              className={approvalAction === "approve" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  {approvalAction === "approve" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirmar {approvalAction === "approve" ? "Aprovação" : "Rejeição"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
