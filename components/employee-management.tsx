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
import { Search, Trash2 } from "lucide-react"
import { getUsers, deleteUser } from "@/lib/db"

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
                    <TableHead className="min-w-[180px]">Nome</TableHead>
                    <TableHead className="min-w-[180px]">User Único</TableHead>
                    <TableHead className="min-w-[220px]">Email</TableHead>
                    <TableHead className="min-w-[140px]">CPF</TableHead>
                    <TableHead className="min-w-[140px]">Data de Nascimento</TableHead>
                    <TableHead className="min-w-[120px]">Data de Cadastro</TableHead>
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
      )}
    </div>
  )
}

