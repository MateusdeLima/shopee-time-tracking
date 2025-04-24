"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authenticateEmployee, setCurrentUser, isEmailRegistered } from "@/lib/auth"
import { initializeDb } from "@/lib/db"
import type { User } from "@/lib/db"

enum LoginStep {
  INITIAL = "initial",
  FIRST_ACCESS = "first_access",
  EMAIL_CHECK = "email_check",
  USERNAME_INPUT = "username_input",
}

export function EmployeeLoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState<LoginStep>(LoginStep.INITIAL)
  const [dbInitialized, setDbInitialized] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    cpf: "",
    birthDate: "",
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFirstAccess = () => {
    setCurrentStep(LoginStep.FIRST_ACCESS)
    setError("")
  }

  const handleEmailCheck = () => {
    setCurrentStep(LoginStep.EMAIL_CHECK)
    setError("")
  }

  const handleBack = () => {
    setCurrentStep(LoginStep.INITIAL)
    setError("")
  }

  const checkEmail = async () => {
    if (!dbInitialized) {
      setError("O sistema ainda está se conectando ao banco de dados. Aguarde um momento e tente novamente.")
      return
    }

    setIsLoading(true)
    setError("")

    // Validar email
    if (!formData.email.endsWith("@shopeemobile-external.com")) {
      setError("Por favor, utilize seu email corporativo (@shopeemobile-external.com)")
      setIsLoading(false)
      return
    }

    try {
      // Verificar se o email já está registrado
      const emailRegistered = await isEmailRegistered(formData.email)

      if (emailRegistered) {
        // Se o email estiver registrado, vamos para a etapa de inserir o username
        setCurrentStep(LoginStep.USERNAME_INPUT)
      } else {
        // Se o email não estiver registrado, vamos para a etapa de primeiro acesso
        setCurrentStep(LoginStep.FIRST_ACCESS)
      }
    } catch (error: any) {
      console.error("Erro ao verificar email:", error)
      setError(error.message || "Erro ao verificar email. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
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

      let user: User | undefined

      // Lógica baseada na etapa atual
      if (currentStep === LoginStep.FIRST_ACCESS) {
        // Validar CPF
        if (!formData.cpf || formData.cpf.length !== 11) {
          setError("Por favor, insira um CPF válido (11 dígitos)")
          setIsLoading(false)
          return
        }

        // Validar data de nascimento
        if (!formData.birthDate) {
          setError("Por favor, insira sua data de nascimento")
          setIsLoading(false)
          return
        }

        // Primeiro acesso - criar novo usuário
        user = await authenticateEmployee(
          formData.firstName, 
          formData.lastName, 
          formData.email, 
          undefined, 
          formData.cpf, 
          formData.birthDate
        )

        if (!user) {
          throw new Error("Falha ao criar usuário. Tente novamente.")
        }

        // Mostrar o username gerado para o usuário
        toast({
          title: "Conta criada com sucesso",
          description: `Seu user único é: ${user.username}. Guarde-o para futuros acessos.`,
        })

        // Salvar usuário e mostrar mensagem de boas-vindas
        setCurrentUser(user)
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo(a), ${user.firstName}!`,
        })
      } else if (currentStep === LoginStep.USERNAME_INPUT) {
        // Login com email e username
        user = await authenticateEmployee(undefined, undefined, formData.email, formData.username)

        if (!user) {
          throw new Error("Falha na autenticação. Tente novamente.")
        }

        // Salvar usuário e mostrar mensagem de boas-vindas
        setCurrentUser(user)
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo(a), ${user.firstName}!`,
        })
      }

      router.push("/employee/dashboard")
    } catch (error: any) {
      console.error("Erro ao fazer login:", error)
      setError(error.message || "Falha ao realizar login. Tente novamente.")
    } finally {
      setIsLoading(false)
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

  // Renderização baseada na etapa atual
  const renderStep = () => {
    switch (currentStep) {
      case LoginStep.INITIAL:
        return (
          <div className="grid gap-4">
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleEmailCheck}
                className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]"
                disabled={isLoading || !dbInitialized}
              >
                Entrar com Email
              </Button>
              <Button
                onClick={handleFirstAccess}
                variant="outline"
                className="w-full"
                disabled={isLoading || !dbInitialized}
              >
                Primeiro Acesso
              </Button>

              {!dbInitialized && (
                <Button
                  onClick={handleInitializeDatabase}
                  variant="outline"
                  className="w-full mt-4"
                  disabled={isLoading}
                >
                  Inicializar Banco de Dados
                </Button>
              )}
            </div>
          </div>
        )

      case LoginStep.EMAIL_CHECK:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Corporativo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu.nome@shopeemobile-external.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleBack} className="w-1/3" disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button
                type="button"
                className="w-2/3 bg-[#EE4D2D] hover:bg-[#D23F20]"
                onClick={checkEmail}
                disabled={isLoading}
              >
                {isLoading ? "Verificando..." : "Verificar Email"}
              </Button>
            </div>
          </div>
        )

      case LoginStep.USERNAME_INPUT:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Corporativo</Label>
              <Input id="email" name="email" type="email" value={formData.email} readOnly className="bg-gray-50" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">User Único</Label>
              <Input
                id="username"
                name="username"
                placeholder="Digite seu user único"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(LoginStep.EMAIL_CHECK)}
                className="w-1/3"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button type="submit" className="w-2/3 bg-[#EE4D2D] hover:bg-[#D23F20]" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </div>
        )

      case LoginStep.FIRST_ACCESS:
        return (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Digite seu nome"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Digite seu sobrenome"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Corporativo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seuemail@shopeemobile-external.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  placeholder="Digite seu CPF (apenas números)"
                  value={formData.cpf}
                  onChange={handleChange}
                  pattern="[0-9]{11}"
                  maxLength={11}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleBack} className="w-1/3" disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button type="submit" className="w-2/3 bg-[#EE4D2D] hover:bg-[#D23F20]" disabled={isLoading}>
                {isLoading ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !error && currentStep === LoginStep.INITIAL && (
        <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Conectando ao banco de dados, por favor aguarde...</AlertDescription>
        </Alert>
      )}

      {renderStep()}
    </form>
  )
}

