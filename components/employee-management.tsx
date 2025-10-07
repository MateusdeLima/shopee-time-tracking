"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Trash2, Download, User, Eye, Mail, Calendar, Hash } from "lucide-react"
import { getUsers, deleteUser } from "@/lib/db"
import { cn } from "@/lib/utils"
import Image from "next/image"

// Função utilitária para formatar CPF
function formatCPF(value: string) {
  value = value.replace(/\D/g, "");
  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, "$1.$2.$3-$4")
    .slice(0, 14);
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (employee) =>
          employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [searchTerm, employees])

  const loadEmployees = async () => {
    try {
      // Carregar apenas funcionários (não administradores)
      const allUsers = await getUsers()

      if (Array.isArray(allUsers)) {
        const onlyEmployees = allUsers.filter((user) => user.role === "employee")
        setEmployees(onlyEmployees)
        setFilteredEmployees(onlyEmployees)
      } else {
        console.error("getUsers() did not return an array:", allUsers)
        setEmployees([])
        setFilteredEmployees([])
      }
    } catch (error) {
      console.error("Error loading employees:", error)
      setEmployees([])
      setFilteredEmployees([])
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleDeleteEmployee = (employeeId: string) => {
    if (
      confirm(
        `Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita e todos os registros associados serão removidos.`,
      )
    ) {
      try {
        deleteUser(employeeId)
        toast({
          title: "Funcionário excluído",
          description: "O funcionário foi excluído com sucesso",
        })
        // Remover funcionário do estado imediatamente
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId))
        setFilteredEmployees((prev) => prev.filter((emp) => emp.id !== employeeId))
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao excluir o funcionário",
          variant: "destructive",
        })
      }
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    // Se vier no formato YYYY-MM-DD, tratar como local
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (regex.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(Number)
      // Mês no JS começa do zero
      const date = new Date(year, month - 1, day)
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    }
    // Outros formatos (ISO, etc)
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "-"
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const handleViewPhoto = (employee: any) => {
    setSelectedEmployee(employee)
    setIsPhotoDialogOpen(true)
  }

  const handleDownloadPhoto = (employee: any) => {
    if (!employee.profilePictureUrl) return

    // Extrair tipo de arquivo da string base64 ou URL
    let fileName = `foto_${employee.firstName}_${employee.lastName}`
    
    if (employee.profilePictureUrl.startsWith('data:')) {
      // É base64, extrair tipo
      const matches = employee.profilePictureUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const type = matches[1]
        const base64Data = matches[2]
        
        // Determinar extensão
        let extension = "jpg"
        if (type.includes("png")) extension = "png"
        else if (type.includes("gif")) extension = "gif"
        else if (type.includes("webp")) extension = "webp"
        
        fileName += `.${extension}`
        
        // Converter base64 para blob e fazer download
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type })
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } else {
      // É URL, fazer download direto
      fileName += ".jpg"
      const link = document.createElement("a")
      link.href = employee.profilePictureUrl
      link.download = fileName
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    toast({
      title: "Download iniciado",
      description: "A foto de perfil está sendo baixada",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-medium">Lista de Funcionários</h3>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Buscar funcionário" className="pl-8" value={searchTerm} onChange={handleSearchChange} />
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="text-center p-6">
          <p className="text-gray-500">
            {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
          </p>
        </div>
      ) : (
        <>
          {/* Versão Desktop - Tabela */}
          <div className="hidden lg:block overflow-x-auto">
            <Card>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Nome</TableHead>
                      <TableHead className="min-w-[180px]">User Único</TableHead>
                      <TableHead className="min-w-[220px]">Email</TableHead>
                      <TableHead className="min-w-[140px]">CPF</TableHead>
                      <TableHead className="min-w-[140px]">Data de Nascimento</TableHead>
                      <TableHead className="min-w-[120px]">Data de Cadastro</TableHead>
                      <TableHead className="min-w-[120px]">Foto de Perfil</TableHead>
                      <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>{employee.username}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.cpf ? formatCPF(employee.cpf) : "-"}</TableCell>
                        <TableCell>
                          {employee.birthDate ? formatDate(employee.birthDate) : "-"}
                        </TableCell>
                        <TableCell>{formatDate(employee.createdAt)}</TableCell>
                        <TableCell>
                          {employee.profilePictureUrl ? (
                            <div className="flex flex-col items-center gap-2">
                              <div 
                                className="relative cursor-pointer group"
                                onClick={() => handleViewPhoto(employee)}
                                title="Clique para visualizar foto"
                              >
                                <Image
                                  src={employee.profilePictureUrl}
                                  alt="Foto de perfil"
                                  width={50}
                                  height={50}
                                  className="rounded-full object-cover border-2 border-[#EE4D2D] group-hover:opacity-80 transition-opacity"
                                />
                                {/* Ícone de visualização no hover */}
                                <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleDownloadPhoto(employee)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Baixar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                              <span className="text-xs text-gray-500">Sem foto</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="lg:hidden space-y-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Foto de perfil */}
                  <div className="flex-shrink-0">
                    {employee.profilePictureUrl ? (
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => handleViewPhoto(employee)}
                        title="Clique para visualizar foto"
                      >
                        <Image
                          src={employee.profilePictureUrl}
                          alt="Foto de perfil"
                          width={60}
                          height={60}
                          className="rounded-full object-cover border-2 border-[#EE4D2D] group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-15 h-15 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Informações do funcionário */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-[#EE4D2D] truncate">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{employee.username}</span>
                        </div>
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex gap-2 flex-shrink-0">
                        {employee.profilePictureUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleDownloadPhoto(employee)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteEmployee(employee.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Detalhes em badges */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-700 truncate">{employee.email}</span>
                      </div>
                      
                      {employee.cpf && (
                        <div className="flex items-center gap-1 text-sm">
                          <Badge variant="outline" className="text-xs">
                            CPF: {formatCPF(employee.cpf)}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        {employee.birthDate && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Nasc: {formatDate(employee.birthDate)}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          Cadastro: {formatDate(employee.createdAt)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialog de visualização da foto de perfil */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de Perfil - {selectedEmployee?.firstName} {selectedEmployee?.lastName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Visualização da foto */}
            <div className="flex justify-center">
              {selectedEmployee?.profilePictureUrl ? (
                <Image
                  src={selectedEmployee.profilePictureUrl}
                  alt="Foto de perfil"
                  width={200}
                  height={200}
                  className="rounded-lg object-cover border-4 border-[#EE4D2D] shadow-lg"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg bg-gray-300 flex items-center justify-center border-4 border-[#EE4D2D]">
                  <User className="h-24 w-24 text-gray-600" />
                </div>
              )}
            </div>
            
            {/* Informações do funcionário */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">{selectedEmployee?.firstName} {selectedEmployee?.lastName}</p>
              <p className="text-sm text-gray-600">{selectedEmployee?.email}</p>
              <p className="text-sm text-gray-500">User: <strong>{selectedEmployee?.username}</strong></p>
            </div>
            
            {/* Botões de ação */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPhotoDialogOpen(false)}
              >
                Fechar
              </Button>
              {selectedEmployee?.profilePictureUrl && (
                <Button
                  className="flex-1 bg-[#EE4D2D] hover:bg-[#D23F20]"
                  onClick={() => {
                    handleDownloadPhoto(selectedEmployee)
                    setIsPhotoDialogOpen(false)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

