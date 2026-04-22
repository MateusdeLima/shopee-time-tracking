"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, ArrowLeft, Upload, X, Eye, EyeOff, Loader2, ShieldCheck, Copy, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { authenticateEmployee, setCurrentUser, isEmailRegistered, getUsernameByEmail } from "@/lib/auth"
import { createUser, getUserByEmail, updateUser, getProjects } from "@/lib/db"
import type { User } from "@/lib/db"
import { uploadProfilePicture } from "@/lib/supabase"
import { LoadingScreen } from "@/components/loading-screen"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

enum LoginStep {
  LOGIN = "login",
}

// Função utilitária para formatar CPF
function formatCPF(value: string) {
  value = value.replace(/\D/g, "");
  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, "$1.$2.$3-$4")
    .slice(0, 14);
}

export function EmployeeLoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState<LoginStep>(LoginStep.LOGIN)
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false)
  const [generatedId, setGeneratedId] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("")
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false)
  const [recoveryForm, setRecoveryForm] = useState({ email: "", fullName: "" })
  const [recoveredId, setRecoveredId] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    cpf: "",
    birthDate: "",
    shift: "9-18", // valor padrão
    password: "",
    confirmPassword: "",
    role: "employee" as "admin" | "employee",
    projectId: "",
  })
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    // Carregar projetos ao iniciar
    getProjects().then(setProjects)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setProfilePicture(file)
    if (file) {
      setProfilePicturePreview(URL.createObjectURL(file))
    } else {
      setProfilePicturePreview("")
    }
  }

  const handleModalClose = async () => {
    if (formData.email) {
      // Marcar como não sendo mais o primeiro acesso após ver o modal
      try {
        const user = await getUserByEmail(formData.email)
        if (user) {
          await updateUser(user.id, { isFirstAccess: false })
          router.push("/employee/dashboard")
        }
      } catch (err) {
        console.error("Erro ao marcar primeiro acesso:", err)
        router.push("/employee/dashboard")
      }
    }
    setShowFirstAccessModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setError("")

    try {
      // Login com email e opcional username
      const user = await authenticateEmployee(undefined, undefined, formData.email, formData.username)

      if (!user) {
        throw new Error("Falha na autenticação. Tente novamente.")
      }

      // Salvar usuário
      setCurrentUser(user)

      // Se for primeiro acesso, mostrar modal
      if (user.isFirstAccess) {
        setGeneratedId(user.username || "")
        setShowFirstAccessModal(true)
        return // Não redirecionar ainda
      }

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${user.firstName}!`,
        duration: 2000,
      })

      // Redirecionar
      // Redirecionar
      setShowLoadingScreen(true)
      setTimeout(() => {
        router.push("/employee/dashboard")
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao fazer login:", error)
      setError(error.message || "Falha ao realizar login. Tente novamente.")
      setIsLoading(false)
      setShowLoadingScreen(false)
    }
  }



  const handleRecoverId = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRecovering(true)
    setRecoveredId(null)

    try {
      const id = await getUsernameByEmail(recoveryForm.email)
      if (id) {
        setRecoveredId(id)
        toast({
          title: "ID encontrado!",
          description: "Seu ID foi recuperado com sucesso.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Não encontrado",
          description: "E-mail não cadastrado no sistema.",
        })
      }
    } catch (err) {
      console.error("Erro na recuperação:", err)
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao recuperar seu ID.",
      })
    } finally {
      setIsRecovering(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast({
      title: "Copiado!",
      description: "ID copiado para a área de transferência.",
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Renderização principal do Login
  const renderStep = () => {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email Corporativo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="username">ID (Senha)</Label>
          </div>
          <Input
            id="username"
            name="username"
            placeholder="Seu ID único (ex: AG001)"
            value={formData.username}
            onChange={handleChange}
            autoComplete="off"
          />
          <p className="text-[10px] text-gray-500 italic">
            * Se é seu primeiro login, coloque apenas o seu e-mail.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryModalOpen(true)
                setRecoveredId(null)
                setRecoveryForm({ email: "", fullName: "" })
              }}
              className="text-[10px] text-[#EE4D2D] hover:underline font-medium"
            >
              Esqueci meu ID
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>


      </div>
    )
  }

  // Se estiver mostrando a tela de carregamento, renderizar apenas ela
  if (showLoadingScreen) {
    return <LoadingScreen message="Carregando portal..." />
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {renderStep()}
    </form>

      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Seu Primeiro Acesso!</DialogTitle>
            <DialogDescription className="text-center">
              Seja bem-vindo(a). Para sua segurança, geramos um ID único que servirá como sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border-2 border-dashed border-gray-200 my-4 text-center overflow-hidden">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Seu ID de Acesso</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#EE4D2D] font-mono break-all px-2">
              {generatedId}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>IMPORTANTE:</strong> Guarde este ID em um lugar seguro. Você precisará dele para todos os seus próximos acessos ao sistema.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" 
              onClick={handleModalClose}
            >
              Entendi, salvar e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRecoveryModalOpen} onOpenChange={setIsRecoveryModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Recuperar meu ID</DialogTitle>
            <DialogDescription>
              Informe seu e-mail corporativo para recuperar seu ID de acesso.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRecoverId} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recover-email">E-mail Corporativo</Label>
              <Input
                id="recover-email"
                type="email"
                placeholder="seu@email.com"
                value={recoveryForm.email}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, email: e.target.value })}
                required
              />
            </div>
            
            {!recoveredId && (
              <Button 
                type="submit" 
                className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" 
                disabled={isRecovering}
              >
                {isRecovering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  "Buscar meu ID"
                )}
              </Button>
            )}
          </form>

          {recoveredId && (
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-sm text-orange-800 font-medium">Seu ID foi recuperado:</p>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-2xl font-bold text-[#EE4D2D] font-mono tracking-wider">
                  {recoveredId}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                  onClick={() => copyToClipboard(recoveredId)}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-orange-600 italic">
                Use este ID no campo "ID (Senha)" para entrar.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setIsRecoveryModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

