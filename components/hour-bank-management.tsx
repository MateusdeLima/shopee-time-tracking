"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  Calendar, 
  AlertTriangle,
  Search,
  Filter
} from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface HourBankCompensation {
  id: number
  userId: string
  holidayId: number
  declaredHours: number
  detectedHours: number
  confidence: number
  proofImage: string
  status: "approved" | "rejected" | "pending"
  reason: string
  analyzedAt: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  holiday?: {
    name: string
    date: string
  }
}

export default function HourBankManagement() {
  const [compensations, setCompensations] = useState<HourBankCompensation[]>([])
  const [filteredCompensations, setFilteredCompensations] = useState<HourBankCompensation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompensation, setSelectedCompensation] = useState<HourBankCompensation | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    loadCompensations()
  }, [])

  useEffect(() => {
    filterCompensations()
  }, [compensations, searchTerm, statusFilter])

  const loadCompensations = async () => {
    try {
      const response = await fetch('/api/hour-bank/compensations')
      if (response.ok) {
        const data = await response.json()
        setCompensations(data)
      }
    } catch (error) {
      console.error('Erro ao carregar compensações:', error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as compensações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterCompensations = () => {
    let filtered = compensations

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(comp => comp.status === statusFilter)
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(comp => 
        comp.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.holiday?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCompensations(filtered)
  }

  const handleViewCompensation = (compensation: HourBankCompensation) => {
    setSelectedCompensation(compensation)
    setIsViewDialogOpen(true)
  }

  const handleUpdateStatus = async (id: number, newStatus: "approved" | "rejected", reason?: string) => {
    try {
      const response = await fetch(`/api/hour-bank/compensations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reason: reason || (newStatus === "approved" ? "Aprovado pelo administrador" : "Rejeitado pelo administrador")
        })
      })

      if (response.ok) {
        toast({
          title: newStatus === "approved" ? "Compensação aprovada" : "Compensação rejeitada",
          description: `A compensação foi ${newStatus === "approved" ? "aprovada" : "rejeitada"} com sucesso`,
        })
        loadCompensations()
        setIsViewDialogOpen(false)
      } else {
        throw new Error('Erro na resposta do servidor')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status da compensação",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return "Data inválida"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Aprovado</Badge>
      case "rejected":
        return <Badge className="bg-red-500 hover:bg-red-600">Rejeitado</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
      default:
        return <Badge variant="secondary">Desconhecido</Badge>
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600"
    if (confidence >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gerenciamento de Banco de Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D]"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gerenciamento de Banco de Horas
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por funcionário ou feriado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="approved">Aprovados</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredCompensations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma compensação encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompensations.map((compensation) => (
                <Card key={compensation.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">
                            {compensation.user?.firstName} {compensation.user?.lastName}
                          </span>
                          {getStatusBadge(compensation.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{compensation.holiday?.name}</span>
                          </div>
                          <div>
                            <span className="font-medium">Horas declaradas:</span> {compensation.declaredHours}h
                          </div>
                          <div>
                            <span className="font-medium">Horas detectadas:</span> {compensation.detectedHours}h
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className={`flex items-center gap-1 ${getConfidenceColor(compensation.confidence)}`}>
                            <AlertTriangle className="h-4 w-4" />
                            <span>Confiança: {compensation.confidence}%</span>
                          </div>
                          <div className="text-gray-500">
                            {formatDate(compensation.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCompensation(compensation)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Detalhes da Compensação
            </DialogTitle>
          </DialogHeader>

          {selectedCompensation && (
            <div className="space-y-6">
              {/* Informações do Funcionário */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Informações do Funcionário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Nome:</span>
                      <p className="font-semibold">
                        {selectedCompensation.user?.firstName} {selectedCompensation.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email:</span>
                      <p className="font-semibold">{selectedCompensation.user?.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Feriado:</span>
                      <p className="font-semibold">{selectedCompensation.holiday?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Data da solicitação:</span>
                      <p className="font-semibold">{formatDate(selectedCompensation.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Análise das Horas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Análise das Horas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Horas Declaradas</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedCompensation.declaredHours}h</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Horas Detectadas</p>
                      <p className="text-2xl font-bold text-green-600">{selectedCompensation.detectedHours}h</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Confiança da IA</p>
                      <p className={`text-2xl font-bold ${getConfidenceColor(selectedCompensation.confidence)}`}>
                        {selectedCompensation.confidence}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600 mb-1">Motivo da análise:</p>
                    <p className="font-medium">{selectedCompensation.reason}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comprovante */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Comprovante Enviado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md">
                      <Image
                        src={selectedCompensation.proofImage}
                        alt="Comprovante do banco de horas"
                        width={400}
                        height={300}
                        className="rounded-lg border shadow-lg object-contain w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Atual */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Status Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(selectedCompensation.status)}
                      <span className="text-sm text-gray-600">
                        Analisado em: {formatDate(selectedCompensation.analyzedAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações Administrativas */}
              {selectedCompensation.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleUpdateStatus(selectedCompensation.id, "approved")}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Compensação
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedCompensation.id, "rejected", "Rejeitado pelo administrador após revisão manual")}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar Compensação
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
