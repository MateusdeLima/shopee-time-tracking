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
import { authenticateEmployee, setCurrentUser, isEmailRegistered } from "@/lib/auth"
import { initializeDb, createUser, getUserByEmail, updateUser, getProjects } from "@/lib/db"
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
  const [dbInitialized, setDbInitialized] = useState(false)
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("")
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)

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

  useEffect(() => {
    // Inicializar o banco de dados quando o componente for montado
    async function initialize() {
      try {
        setIsLoading(true)
        setError("")
        console.log("Iniciando inicialização do banco de dados...")

        // Tentar inicializar o banco de dados
        const success = await initializeDb()
        if (success) {
          console.log("Banco de dados inicializado com sucesso!")
          setDbInitialized(true)
        } else {
          console.error("Falha ao inicializar o banco de dados.")
          setError("Falha ao conectar ao banco de dados. Tente novamente mais tarde.")
        }
      } catch (error) {
        console.error("Erro ao inicializar banco de dados:", error)
        setError("Erro ao conectar ao banco de dados. Tente novamente mais tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
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

    if (!dbInitialized) {
      setError("O sistema ainda está se conectando ao banco de dados. Aguarde um momento e tente novamente.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Inicializar o banco de dados primeiro
      await initializeDb()

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
      setShowLoadingScreen(true)
      setTimeout(() => {
        router.push("/employee/dashboard")
      }, 2000)

      // Mostrar tela de carregamento antes de redirecionar
      setShowLoadingScreen(true)

      // Simular carregamento por 2 segundos
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

  const handleInitializeDatabase = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Chamar a API para inicializar o banco de dados
      const response = await fetch("/api/init-db")
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Banco de dados inicializado",
          description: "Banco de dados inicializado com sucesso!",
        })
        setDbInitialized(true)
      } else {
        setError(data.message || "Falha ao inicializar o banco de dados.")
      }
    } catch (error) {
      console.error("Erro ao inicializar banco de dados:", error)
      setError("Erro ao inicializar o banco de dados. Tente novamente mais tarde.")
    } finally {
      setIsLoading(false)
    }
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
        </div>

        <Button 
          type="submit" 
          className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" 
          disabled={isLoading || !dbInitialized}
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

        {!dbInitialized && (
          <Button
            onClick={handleInitializeDatabase}
            variant="outline"
            className="w-full mt-2"
            disabled={isLoading}
          >
            Inicializar Banco de Dados
          </Button>
        )}
      </div>
    )
  }

  // Se estiver mostrando a tela de carregamento, renderizar apenas ela
  if (showLoadingScreen) {
    return <LoadingScreen message="Carregando portal..." />
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !error && currentStep === LoginStep.LOGIN && (
        <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Conectando ao banco de dados, por favor aguarde...</AlertDescription>
        </Alert>
      )}

      {renderStep()}

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
    </form>
  )
}

