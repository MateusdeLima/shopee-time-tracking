"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Clock, CheckCircle, XCircle, User, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAllTimeRequests, updateTimeRequest, TimeRequest, fixApprovedRequests } from "@/lib/db"

interface TimeRequestsManagementProps {
  onUpdate?: () => void
}

export function TimeRequestsManagement({ onUpdate }: TimeRequestsManagementProps) {
  console.log("🔥 COMPONENTE TimeRequestsManagement INICIADO")
  
  // Restaurando funcionalidade completa
  const [requests, setRequests] = useState<TimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<TimeRequest | null>(null)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState("")
  const [actualTime, setActualTime] = useState("")
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [isFixing, setIsFixing] = useState(false)

  useEffect(() => {
    console.log("🔥 USEEFFECT EXECUTADO - TimeRequestsManagement montado")
    console.log("🔥 Chamando loadRequests...")
    loadRequests()
  }, [])

  const loadRequests = async () => {
    console.log("🔥 FUNÇÃO loadRequests CHAMADA")
    try {
      console.log("🔄 Iniciando carregamento...")
      setLoading(true)
      
      // Primeiro, executar correção automática de solicitações aprovadas
      console.log("🔧 Executando correção automática...")
      const fixResults = await fixApprovedRequests()
      
      if (fixResults.fixed > 0) {
        toast({
          title: "Correção Automática",
          description: `${fixResults.fixed} ponto(s) ativo(s) criado(s) para solicitações já aprovadas.`
        })
      }
      
      if (fixResults.errors.length > 0) {
        console.error("Erros na correção:", fixResults.errors)
      }
      
      // Agora carregar dados reais do banco
      const data = await getAllTimeRequests()
      console.log("📦 Dados recebidos no componente:", data)
      console.log("📊 Quantidade de itens:", data.length)
      setRequests(data)
      
    } catch (error) {
      console.error("❌ Erro ao carregar solicitações:", error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar solicitações de ponto"
      })
    } finally {
      setLoading(false)
      console.log("🏁 Carregamento finalizado")
    }
  }

  const handleApprovalAction = (request: TimeRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(action)
    setActualTime(request.requestedTime)
    setAdminNotes("")
    setIsApprovalDialogOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedRequest) return

    try {
      const updateData: Partial<TimeRequest> = {
        status: actionType === "approve" ? "approved" : "rejected",
        adminNotes: adminNotes.trim() || undefined
      }

      if (actionType === "approve" && actualTime.trim()) {
        updateData.actualTime = actualTime.trim()
      }

      await updateTimeRequest(selectedRequest.id, updateData)

      toast({
        title: actionType === "approve" ? "Solicitação aprovada" : "Solicitação rejeitada",
        description: `A solicitação de ${(selectedRequest as any).users?.first_name} foi ${actionType === "approve" ? "aprovada" : "rejeitada"} com sucesso.`
      })

      setIsApprovalDialogOpen(false)
      setSelectedRequest(null)
      loadRequests()
      onUpdate?.()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao processar solicitação"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>
      case "approved":
        return <Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge>
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejeitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "missing_entry":
        return "Ponto de Entrada"
      case "missing_exit":
        return "Ponto de Saída"
      default:
        return type
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const handleManualFix = async () => {
    setIsFixing(true)
    try {
      console.log("🔧 Executando correção manual...")
      const fixResults = await fixApprovedRequests()
      
      toast({
        title: "Correção Executada",
        description: `${fixResults.fixed} ponto(s) ativo(s) criado(s). ${fixResults.errors.length} erro(s).`,
        variant: fixResults.errors.length > 0 ? "destructive" : "default"
      })
      
      // Recarregar dados após correção
      if (fixResults.fixed > 0) {
        await loadRequests()
      }
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na Correção",
        description: error.message || "Falha ao executar correção"
      })
    } finally {
      setIsFixing(false)
    }
  }

  console.log("🎨 Renderizando TimeRequestsManagement - loading:", loading, "requests:", requests.length)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Solicitações de Ponto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando solicitações...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Solicitações de Ponto
              </CardTitle>
              <CardDescription>
                Gerencie solicitações de adição de ponto perdido dos funcionários
              </CardDescription>
            </div>
            <Button
              onClick={handleManualFix}
              disabled={isFixing}
              variant="outline"
              size="sm"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
            >
              {isFixing ? "Corrigindo..." : "🔧 Corrigir Aprovadas"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação de ponto encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {(request as any).users?.first_name || 'Nome'} {(request as any).users?.last_name || 'Sobrenome'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({(request as any).users?.email || 'email@exemplo.com'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {(request as any).holidays?.name || 'Feriado'} - {getRequestTypeLabel(request.requestType)}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Horário solicitado:</span>
                      <div className="text-muted-foreground">{request.requestedTime}</div>
                    </div>
                    {request.actualTime && (
                      <div>
                        <span className="font-medium">Horário aprovado:</span>
                        <div className="text-muted-foreground">{request.actualTime}</div>
                      </div>
                    )}
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Motivo:</span>
                    <div className="text-muted-foreground mt-1">{request.reason}</div>
                  </div>

                  {request.adminNotes && (
                    <div className="text-sm">
                      <span className="font-medium">Observações do admin:</span>
                      <div className="text-muted-foreground mt-1">{request.adminNotes}</div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Solicitado em: {formatDateTime(request.createdAt)}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprovalAction(request, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprovalAction(request, "reject")}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar" : "Rejeitar"} Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div><strong>Funcionário:</strong> {(selectedRequest as any).users?.first_name} {(selectedRequest as any).users?.last_name}</div>
                <div><strong>Feriado:</strong> {(selectedRequest as any).holidays?.name}</div>
                <div><strong>Tipo:</strong> {getRequestTypeLabel(selectedRequest.requestType)}</div>
                <div><strong>Horário solicitado:</strong> {selectedRequest.requestedTime}</div>
              </div>

              {actionType === "approve" && (
                <div className="space-y-2">
                  <Label htmlFor="actualTime">Horário a ser registrado</Label>
                  <Input
                    id="actualTime"
                    type="time"
                    value={actualTime}
                    onChange={(e) => setActualTime(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminNotes">
                  Observações {actionType === "reject" ? "(obrigatório)" : "(opcional)"}
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={actionType === "approve" 
                    ? "Adicione observações sobre a aprovação..." 
                    : "Explique o motivo da rejeição..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={actionType === "reject" && !adminNotes.trim()}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {actionType === "approve" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
