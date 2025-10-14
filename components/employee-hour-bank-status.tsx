"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface HourBankCompensation {
  id: number
  holidayId: number
  declaredHours: number
  detectedHours: number
  confidence: number
  proofImage: string
  status: "approved" | "rejected" | "pending"
  reason: string
  analyzedAt: string
  createdAt: string
  holiday?: {
    name: string
    date: string
  }
}

interface EmployeeHourBankStatusProps {
  userId: string
}

export default function EmployeeHourBankStatus({ userId }: EmployeeHourBankStatusProps) {
  const [compensations, setCompensations] = useState<HourBankCompensation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompensation, setSelectedCompensation] = useState<HourBankCompensation | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    loadCompensations()
  }, [userId])

  const loadCompensations = async () => {
    try {
      const response = await fetch(`/api/hour-bank/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setCompensations(data)
      }
    } catch (error) {
      console.error('Erro ao carregar compensações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewCompensation = (compensation: HourBankCompensation) => {
    setSelectedCompensation(compensation)
    setIsViewDialogOpen(true)
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
        return (
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendente
          </Badge>
        )
      default:
        return <Badge variant="secondary">Desconhecido</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const approvedHours = compensations
    .filter(comp => comp.status === "approved")
    .reduce((total, comp) => total + comp.declaredHours, 0)

  const pendingHours = compensations
    .filter(comp => comp.status === "pending")
    .reduce((total, comp) => total + comp.declaredHours, 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Banco de Horas Compensadas
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
            Banco de Horas Compensadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compensations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma compensação de banco de horas encontrada</p>
              <p className="text-sm mt-2">
                Use o botão "Banco de Horas" na seção de feriados para compensar suas horas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Horas Aprovadas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{approvedHours}h</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Horas Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{pendingHours}h</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Total de Solicitações</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{compensations.length}</p>
                </div>
              </div>

              {/* Lista de Compensações */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Histórico de Compensações</h3>
                {compensations.map((compensation) => (
                  <Card key={compensation.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(compensation.status)}
                            <span className="font-semibold">{compensation.holiday?.name}</span>
                            {getStatusBadge(compensation.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Horas compensadas:</span> {compensation.declaredHours}h
                            </div>
                            <div>
                              <span className="font-medium">Confiança:</span> {compensation.confidence}%
                            </div>
                            <div>
                              <span className="font-medium">Data:</span> {formatDate(compensation.createdAt)}
                            </div>
                          </div>
                          
                          {compensation.status === "approved" && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                              ✅ Hora paga de acordo com o banco de horas da Page
                            </div>
                          )}
                          
                          {compensation.status === "rejected" && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                              ❌ {compensation.reason}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCompensation(compensation)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
              Detalhes da Compensação - {selectedCompensation?.holiday?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCompensation && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-center">
                {getStatusBadge(selectedCompensation.status)}
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Horas Declaradas:</span>
                  <p className="font-semibold text-lg">{selectedCompensation.declaredHours}h</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Horas Detectadas:</span>
                  <p className="font-semibold text-lg">{selectedCompensation.detectedHours}h</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Confiança da IA:</span>
                  <p className="font-semibold text-lg">{selectedCompensation.confidence}%</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Data da Solicitação:</span>
                  <p className="font-semibold">{formatDate(selectedCompensation.createdAt)}</p>
                </div>
              </div>

              {/* Motivo */}
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600 mb-1">Resultado da análise:</p>
                <p className="font-medium">{selectedCompensation.reason}</p>
              </div>

              {/* Comprovante */}
              <div>
                <h4 className="font-semibold mb-3">Comprovante Enviado</h4>
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
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="px-8"
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
