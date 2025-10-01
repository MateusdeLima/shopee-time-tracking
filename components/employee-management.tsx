"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Trash2, Download, Edit2 } from "lucide-react"
import { getUsers, deleteUser, updateUser } from "@/lib/db"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Função utilitária para formatar CPF
function formatCPF(value: string) {
  value = value.replace(/\D/g, "");
  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, "$1.$2.$3-$4")
    .slice(0, 14);
}

// Função utilitária para gerar URL da foto de perfil com cache busting
function getProfilePictureUrl(employee: any) {
  if (!employee?.profilePictureUrl) return ""
  return employee.profilePictureUrl + '?t=' + (employee.updatedAt ? new Date(employee.updatedAt).getTime() : Date.now())
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null)
  const [editForm, setEditForm] = useState<{ shift: "8-17" | "9-18"; username: string }>({ shift: "8-17", username: "" })

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

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return
      try {
      await deleteUser(employeeToDelete.id)
        toast({
          title: "Funcionário excluído",
          description: "O funcionário foi excluído com sucesso",
        })
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id))
      setFilteredEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id))
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao excluir o funcionário",
          variant: "destructive",
        })
    } finally {
      setIsDeleteDialogOpen(false)
      setEmployeeToDelete(null)
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

  const handleEditClick = (employee: any) => {
    setEmployeeToEdit(employee)
    setEditForm({ shift: (employee.shift === "9-18" ? "9-18" : "8-17"), username: employee.username })
    setIsEditDialogOpen(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditSave = async () => {
    if (!employeeToEdit) return
    try {
      // updateUser deve ser implementada no db/index.ts
      await updateUser(employeeToEdit.id, { shift: editForm.shift, username: editForm.username })
      toast({
        title: "Funcionário atualizado",
        description: "Os dados do funcionário foram atualizados com sucesso",
      })
      // Atualizar na lista local
      setEmployees((prev) => prev.map((emp) => emp.id === employeeToEdit.id ? { ...emp, shift: editForm.shift, username: editForm.username } : emp))
      setFilteredEmployees((prev) => prev.map((emp) => emp.id === employeeToEdit.id ? { ...emp, shift: editForm.shift, username: editForm.username } : emp))
      setIsEditDialogOpen(false)
      setEmployeeToEdit(null)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao atualizar o funcionário",
        variant: "destructive",
      })
    }
  }

  // Adicionar função para baixar a foto de perfil diretamente
  const handleDownloadProfilePicture = async (employee: any) => {
    try {
      const url = getProfilePictureUrl(employee)
      if (!url) return
      const response = await fetch(url)
      const blob = await response.blob()
      // Determinar extensão
      let extension = "jpg"
      if (blob.type.includes("png")) extension = "png"
      else if (blob.type.includes("jpeg")) extension = "jpg"
      else if (blob.type.includes("gif")) extension = "gif"
      // Criar link temporário
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `foto_perfil_${employee.firstName}_${employee.lastName}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      toast({
        title: "Erro ao baixar foto",
        description: "Não foi possível baixar a foto de perfil.",
        variant: "destructive",
      })
    }
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
        <div className="overflow-x-auto">
          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px] text-center">Foto</TableHead>
                    <TableHead className="min-w-[180px]">Nome</TableHead>
                    <TableHead className="min-w-[180px]">User Único</TableHead>
                    <TableHead className="min-w-[220px]">Email</TableHead>
                    <TableHead className="min-w-[140px]">CPF</TableHead>
                    <TableHead className="min-w-[140px]">Data de Nascimento</TableHead>
                    <TableHead className="min-w-[120px]">Turno</TableHead>
                    <TableHead className="text-right min-w-[140px] align-middle text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="text-center">
                        {employee.profilePictureUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <a
                              href={getProfilePictureUrl(employee)}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group"
                            >
                              <Avatar className="w-12 h-16 rounded-md border-2 border-gray-300 group-hover:border-blue-500 transition cursor-pointer">
                                <AvatarImage
                                  src={getProfilePictureUrl(employee)}
                                  alt={employee.firstName}
                                  className="object-cover w-12 h-16 rounded-md"
                                />
                                <AvatarFallback>{employee.firstName[0]}</AvatarFallback>
                              </Avatar>
                            </a>
                            <a
                              href="#"
                              onClick={e => {
                                e.preventDefault();
                                handleDownloadProfilePicture(employee);
                              }}
                              className="w-full flex justify-center"
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-blue-600 border-blue-200 hover:text-blue-800 hover:bg-blue-50 flex items-center gap-1 w-full"
                                asChild
                              >
                                <span>
                                  <Download className="h-4 w-4 mr-2" /> Baixar Foto
                                </span>
                              </Button>
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sem foto</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </TableCell>
                      <TableCell>{employee.username}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.cpf ? formatCPF(employee.cpf) : "-"}</TableCell>
                      <TableCell>
                        {employee.birthDate ? formatDate(employee.birthDate) : "-"}
                      </TableCell>
                      <TableCell>
                        {employee.shift === "9-18" ? "9h às 18h" : "8h às 17h"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditClick(employee)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setEmployeeToDelete(employee)
                              setIsDeleteDialogOpen(true)
                            }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Funcionário</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Você está prestes a excluir o funcionário <strong>{employeeToDelete?.firstName} {employeeToDelete?.lastName}</strong> ({employeeToDelete?.email}).</p>
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados a este funcionário serão permanentemente excluídos.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Turno</label>
              <select
                name="shift"
                value={editForm.shift}
                onChange={handleEditChange}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="8-17">8h às 17h</option>
                <option value="9-18">9h às 18h</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">User Único</label>
              <input
                name="username"
                value={editForm.username}
                onChange={handleEditChange}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={handleEditSave}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

