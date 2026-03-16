"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Search, Trash2, User, Mail, Plus, Upload, FileSpreadsheet, Edit, Check, X } from "lucide-react"
import { getUsers, deleteUser, getProjects, updateUser, batchCreateAgents, normalizeShift } from "@/lib/db"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as XLSX from "xlsx"

const DiscordIdCell = ({ employee, onSave }: { employee: any, onSave: (id: string) => Promise<void> }) => {
  const [value, setValue] = useState(employee.discordId || "")
  const [isChanged, setIsChanged] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Sincronizar estado local se o employee mudar (ex: após loadEmployees)
  useEffect(() => {
    setValue(employee.discordId || "")
    setIsChanged(false)
  }, [employee.discordId])

  const handleSave = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await onSave(value)
      setIsChanged(false)
    } catch (err) {
      // O toast de erro já é disparado pelo pai, apenas paramos o loading
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setValue(employee.discordId || "")
    setIsChanged(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setIsChanged(e.target.value !== (employee.discordId || ""))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') handleCancel()
        }}
        placeholder="ID..."
        className={`h-8 max-w-[110px] text-xs font-mono transition-all ${isChanged ? 'border-orange-500 ring-1 ring-orange-500/20' : ''}`}
      />
      {isChanged && (
        <div className="flex gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleSave}
            disabled={isLoading}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function AccessControl() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newDiscordId, setNewDiscordId] = useState("")
  const [newShift, setNewShift] = useState<"8-17" | "9-18">("8-17")
  const [pendingImportData, setPendingImportData] = useState<any[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadEmployees()
  }, [])


  const loadEmployees = async () => {
    try {
      const allUsers = await getUsers()
      if (Array.isArray(allUsers)) {
        const onlyEmployees = allUsers.filter((user) => user.role === "employee")
        setEmployees(onlyEmployees)
        setFilteredEmployees(onlyEmployees)
      }
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (employee) =>
          employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [searchTerm, employees])

  const handleDeleteEmployee = async (employeeId: string) => {
    if (confirm(`Tem certeza que deseja excluir este agente?`)) {
      try {
        await deleteUser(employeeId)
        toast({ title: "Agente excluído", description: "O agente foi removido com sucesso" })
        loadEmployees()
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" })
      }
    }
  }

  const handleManualAdd = async () => {
    if (!newName || !newEmail) {
      toast({ title: "Campos obrigatórios", description: "Preencha o nome e e-mail.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const names = newName.trim().split(" ")
      const firstName = names[0]
      const lastName = names.slice(1).join(" ") || ""
      
      await batchCreateAgents([{ firstName, lastName, email: newEmail.trim(), shift: newShift, discordId: newDiscordId.trim() || undefined }])
      
      toast({ title: "Agente adicionado", description: "O agente foi criado com sucesso." })
      setIsAddModalOpen(false)
      setNewName("")
      setNewEmail("")
      setNewDiscordId("")
      loadEmployees()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: "A" }) as any[]

        // Espera-se: A=Nome, B=Email, C=Horario (ex: 8-17 ou 9-18), D=Discord ID Opcional
        const agentsToCreate = data.slice(1).map(row => {
          const fullName = row.A || ""
          const names = fullName.trim().split(" ")
          return {
            firstName: names[0],
            lastName: names.slice(1).join(" ") || "",
            email: (row.B || "").toString().trim(),
            shift: normalizeShift((row.C || "8-17").toString().trim()),
            discordId: row.D ? String(row.D).trim() : undefined
          }
        }).filter(a => a.firstName && a.email)

        if (agentsToCreate.length === 0) {
          toast({ title: "Arquivo inválido", description: "Nenhum dado válido encontrado.", variant: "destructive" })
          return
        }

        setPendingImportData(agentsToCreate)
        setIsAddModalOpen(false) // Fecha o modal de adição para mostrar o de preview
      } catch (error: any) {
        toast({ title: "Erro no import", description: error.message, variant: "destructive" })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmImport = async () => {
    if (!pendingImportData) return

    setIsLoading(true)
    try {
      await batchCreateAgents(pendingImportData)
      toast({ title: "Importação concluída", description: `${pendingImportData.length} agentes foram importados.` })
      setPendingImportData(null)
      loadEmployees()
    } catch (error: any) {
      toast({ title: "Erro ao importar", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShiftChange = async (userId: string, shift: "8-17" | "9-18") => {
    try {
      await updateUser(userId, { shift })
      toast({ title: "Horário atualizado" })
      loadEmployees()
    } catch (error) {
      toast({ title: "Erro ao atualizar horário", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">Adicionar Agentes</CardTitle>
            <CardDescription>Adicione agentes manualmente ou importe via planilha</CardDescription>
          </div>
          <Button 
            className="bg-[#EE4D2D] hover:bg-[#D23F20] text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Agentes
          </Button>
        </CardHeader>
        <CardContent>
           <div className="flex items-center gap-4 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por nome, ID ou email..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Agentes Cadastrados ({filteredEmployees.length} de {employees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700">ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">E-mail</TableHead>
                  <TableHead className="font-semibold text-gray-700">Discord ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Horário</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Nenhum agente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-mono">
                          {emp.username}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>
                        <DiscordIdCell 
                          employee={emp} 
                          onSave={async (newId) => {
                            try {
                              await updateUser(emp.id, { discordId: newId })
                              toast({ title: "Discord ID salvo", description: `O ID para ${emp.firstName} foi atualizado.` })
                              loadEmployees() // Recarregar para sincronizar o estado
                            } catch (error: any) {
                              toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" })
                              throw error // Repassar para o componente tratar o loading
                            }
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={emp.shift || "8-17"}
                          onValueChange={(val: any) => handleShiftChange(emp.id, val)}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8-17">08:00 - 17:00</SelectItem>
                            <SelectItem value="9-18">09:00 - 18:00</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleDeleteEmployee(emp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Agentes</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium leading-none">Entrada Manual</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Nome Completo</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: João Silva" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">E-mail</label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@shopee.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Discord ID (Opcional)</label>
                  <Input value={newDiscordId} onChange={(e) => setNewDiscordId(e.target.value)} placeholder="Ex: 713928374928374" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Horário</label>
                  <Select value={newShift} onValueChange={(val: any) => setNewShift(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8-17">08:00 - 17:00</SelectItem>
                      <SelectItem value="9-18">09:00 - 18:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" 
                onClick={handleManualAdd}
                disabled={isLoading}
              >
                {isLoading ? "Adicionando..." : "Adicionar Manualmente"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Ou importe um arquivo</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium leading-none">Importar XLSX</h4>
              <p className="text-xs text-gray-500">
                O arquivo deve conter as colunas: <strong>A: Nome, B: E-mail, C: Horário (8-17 ou 9-18), D: Discord ID (Opcional)</strong>
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                className="w-full border-dashed border-2 h-20 flex flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="h-6 w-6 text-gray-400" />
                <span>{isLoading ? "Processando..." : "Clique para selecionar arquivo .xlsx"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingImportData} onOpenChange={(open) => !open && setPendingImportData(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Importação</DialogTitle>
            <CardDescription>
              Confira os dados abaixo antes de confirmar a importação de {pendingImportData?.length} agentes.
            </CardDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-4 border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Discord ID</TableHead>
                  <TableHead>Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingImportData?.map((agent, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2 text-sm">{agent.firstName} {agent.lastName}</TableCell>
                    <TableCell className="py-2 text-sm">{agent.email}</TableCell>
                    <TableCell className="py-2 text-sm font-mono text-gray-500">{agent.discordId || "-"}</TableCell>
                    <TableCell className="py-2 text-sm">
                      <Badge variant="outline" className="font-normal">{agent.shift}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPendingImportData(null)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button className="bg-[#EE4D2D] hover:bg-[#D23F20]" onClick={handleConfirmImport} disabled={isLoading}>
              {isLoading ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
