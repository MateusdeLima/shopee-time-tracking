"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Check, X, Calendar, Search, User, Pencil, Trash2, AlertCircle, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { getUserById, createAbsenceRecord, deleteAbsenceRecord } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { eachDayOfInterval } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AdminVacations() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [editData, setEditData] = useState({
    startDate: "",
    endDate: "",
    status: ""
  })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchVacationRequests()
  }, [])

  const fetchVacationRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          *,
          users:user_id (id, first_name, last_name, email, discord_id)
        `)
        .eq('reason', 'vacation')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transformar dados para camelCase manual para simplificar esta view
      const transformed = (data || []).map(req => ({
        id: req.id,
        userId: req.user_id,
        userName: `${req.users?.first_name} ${req.users?.last_name}`,
        userEmail: req.users?.email,
        discordId: req.users?.discord_id,
        dates: req.dates,
        status: req.status,
        createdAt: req.created_at,
        dateRange: req.date_range,
        proofDocument: req.proof_document
      }))

      setRequests(transformed)
    } catch (error) {
      console.error('Erro ao buscar solicitações de férias:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as solicitações de férias.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (request: any, decision: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('absence_records')
        .update({ status: decision })
        .eq('id', request.id)

      if (error) throw error

      // Notificar via Discord (apenas se for aprovado ou rejeitado)
      if (decision !== 'pending') {
        fetch('/api/notify-absence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: request.userId,
            reason: 'vacation',
            statusUpdate: true,
            status: decision
          })
        }).catch(err => console.error('Erro ao enviar notificação Discord (approval):', err))
      }

      // Sincronizar com Planilha (Update Status)
      fetch('/api/sheets/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_status',
          type: 'vacation',
          data: { id: request.id, status: decision },
          user: {
            id: request.userId,
            email: request.userEmail,
            firstName: (request.userName || "").split(' ')[0] || "Agente",
            lastName: (request.userName || "").split(' ').slice(1).join(' ') || ""
          }
        }),
      }).catch(err => console.error('Erro ao sincronizar planilha (vacation status):', err))

      toast({
        title: "Status Atualizado",
        description: `A solicitação de ${request.userName} foi marcada como ${decision === 'approved' ? 'aprovada' : decision === 'rejected' ? 'rejeitada' : 'pendente'}.`,
      })

      // Atualizar lista local
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: decision } : r))
    } catch (error: any) {
      console.error('Erro detalhado ao processar decisão:', error)
      toast({
        title: "Erro",
        description: error.message || error.details || "Não foi possível processar a decisão.",
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (request: any) => {
    setSelectedRequest(request)
    setEditData({
      startDate: request.dates[0],
      endDate: request.dates[request.dates.length - 1],
      status: request.status
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateVacation = async () => {
    if (!selectedRequest) return
    setIsProcessing(true)

    try {
      // Gerar novo array de datas
      const start = new Date(editData.startDate + 'T12:00:00')
      const end = new Date(editData.endDate + 'T12:00:00')
      
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new Error("Datas inválidas selecionadas")
      }

      const newDates = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'))
      
      const { error } = await supabase
        .from('absence_records')
        .update({ 
          dates: newDates,
          status: editData.status,
          date_range: {
            start: editData.startDate,
            end: editData.endDate
          }
        })
        .eq('id', selectedRequest.id)

      if (error) throw error

      // Notificar se mudou status
      if (editData.status !== selectedRequest.status && editData.status !== 'pending') {
        fetch('/api/notify-absence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedRequest.userId,
            reason: 'vacation',
            statusUpdate: true,
            decision: editData.status
          })
        }).catch(err => console.error('Erro ao enviar notificação Discord:', err))
      }

      // Sincronizar com Planilha (Create de novo ou Update customizado)
      // Para simplificar, vamos sincronizar como create na aba de férias (sobrepondo ou atualizando via Apps Script se ele suportasse edit, mas aqui o Apps Script vai duplicar ou precisamos de action update)
      // Como o Apps Script atualiza status via ID, vamos enviar update_status + update_dates
      fetch('/api/sheets/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_status', // Podemos enviar mais campos se o Apps Script aceitar
          type: 'vacation',
          data: { 
            id: selectedRequest.id, 
            status: editData.status,
            departureTime: format(start, 'dd/MM/yyyy'),
            returnTime: format(end, 'dd/MM/yyyy')
          },
          user: {
            id: selectedRequest.userId,
            email: selectedRequest.userEmail,
            firstName: (selectedRequest.userName || "").split(' ')[0] || "Agente",
            lastName: (selectedRequest.userName || "").split(' ').slice(1).join(' ') || ""
          }
        }),
      }).catch(err => console.error('Erro ao sincronizar planilha:', err))

      toast({
        title: "Férias Atualizadas",
        description: "As datas e status foram atualizados com sucesso.",
      })

      fetchVacationRequests()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error('Erro ao atualizar férias:', error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar as férias.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteVacation = async () => {
    if (!selectedRequest) return
    setIsProcessing(true)

    try {
      // Deletar do Banco
      const { error } = await supabase
        .from('absence_records')
        .delete()
        .eq('id', selectedRequest.id)

      if (error) throw error

      // Sincronizar com Planilha (Action: delete)
      fetch('/api/sheets/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete',
          type: 'vacation',
          data: { id: selectedRequest.id },
          user: { id: selectedRequest.userId }
        }),
      }).catch(err => console.error('Erro ao sincronizar delete planilha:', err))

      toast({
        title: "Férias Excluídas",
        description: "O registro foi removido com sucesso.",
      })

      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error('Erro ao excluir férias:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredRequests = requests.filter(req => 
    req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDateRange = (dates: string[]) => {
    if (!dates || dates.length === 0) return "N/A"
    const sorted = [...dates].sort()
    const start = format(parseISO(sorted[0]), "dd/MM/yyyy", { locale: ptBR })
    const end = format(parseISO(sorted[sorted.length - 1]), "dd/MM/yyyy", { locale: ptBR })
    return `${start} - ${end} (${dates.length} dias)`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#EE4D2D]" />
          Aprovação de Férias
        </CardTitle>
        <CardDescription>
          Gerencie e aprove as solicitações de férias dos agentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchVacationRequests}>
            Atualizar
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Nenhuma solicitação encontrada.</TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{req.userName}</span>
                        <span className="text-xs text-gray-500">{req.userEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateRange(req.dates)}</TableCell>
                    <TableCell>{format(parseISO(req.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={
                        req.status === 'approved' ? 'default' : 
                        req.status === 'pending' ? 'outline' : 
                        'destructive'
                      } className={req.status === 'approved' ? 'bg-green-600' : ''}>
                        {req.status === 'approved' ? 'Aprovado' : 
                         req.status === 'pending' ? 'Pendente' : 
                         'Rejeitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {req.proofDocument && (
                          <a href={req.proofDocument} target="_blank" rel="noopener noreferrer">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                              title="Ver Print do Sistema PAGE"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {req.status === 'pending' && (
                          <>
                            <Button 
                              variant="default" 
                              size="icon" 
                              className="h-8 w-8 text-white bg-green-600 hover:bg-green-700"
                              onClick={() => handleDecision(req, 'approved')}
                              title="Aprovar"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="h-8 w-8 text-white bg-red-600 hover:bg-red-700"
                              onClick={() => handleDecision(req, 'rejected')}
                              title="Rejeitar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditClick(req)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setSelectedRequest(req); setIsDeleteDialogOpen(true) }}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Solicitação de Férias</DialogTitle>
            <DialogDescription>
              Ajuste as datas ou o status da solicitação de {selectedRequest?.userName}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editStartDate">Data de Início</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={editData.startDate}
                  onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndDate">Data de Fim</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={editData.endDate}
                  onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select 
                value={editData.status} 
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger id="editStatus">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#EE4D2D] hover:bg-[#D23F20] text-white" 
              onClick={handleUpdateVacation}
              disabled={isProcessing}
            >
              {isProcessing ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Registro de Férias</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente o registro de férias?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-600">
              Esta ação removerá o registro de <strong>{selectedRequest?.userName}</strong> do sistema e da planilha.
            </p>
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteVacation}
              disabled={isProcessing}
            >
              {isProcessing ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
