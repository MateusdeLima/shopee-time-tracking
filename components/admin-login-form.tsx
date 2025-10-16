"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authenticateAdmin, setCurrentUser } from "@/lib/auth"
import { initializeDb } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import { LoadingScreen } from "@/components/loading-screen"

export function AdminLoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [dbInitialized, setDbInitialized] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    // Inicializar o banco de dados quando o componente for montado
    async function initialize() {
      try {
        setIsLoading(true)
        setError("")
        console.log("Iniciando inicialização do banco de dados...")

        // Primeiro, verificar se já podemos acessar o banco de dados
        try {
          const { data, error } = await supabase.from("users").select("id").limit(1)
          if (!error) {
            console.log("Banco de dados já está acessível!")
            setDbInitialized(true)
            setIsLoading(false)
            return
          }
        } catch (e) {
          console.log("Banco de dados ainda não está acessível, tentando inicializar...")
        }

        // Se não conseguimos acessar, tentar inicializar
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dbInitialized) {
      setError("O sistema ainda está se conectando ao banco de dados. Aguarde um momento e tente novamente.")
      return
    }

    setIsLoading(true)
    setError("")

    // Simulate authentication
    try {
      // Autenticar usando o serviço de autenticação
      const user = await authenticateAdmin(formData.email, formData.password)

      // Salvar usuário autenticado
      setCurrentUser(user)

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao painel administrativo!",
        duration: 2000,
      })

      // Mostrar tela de carregamento antes de redirecionar
      setShowLoadingScreen(true)
      
      // Simular carregamento por 2 segundos
      setTimeout(() => {
        router.push("/admin/dashboard")
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao fazer login:", error)
      setError(error.message || "Falha ao realizar login. Tente novamente.")
      setIsLoading(false)
      setShowLoadingScreen(false)
    }
  }

  // Se estiver mostrando a tela de carregamento, renderizar apenas ela
  if (showLoadingScreen) {
    return <LoadingScreen message="Carregando admin..." />
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !error && (
        <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Conectando ao banco de dados, por favor aguarde...</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email Administrativo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@seudominio.com"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading || !dbInitialized}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Digite a senha"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading || !dbInitialized}
          />
        </div>

        <Button type="submit" className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" disabled={isLoading || !dbInitialized}>
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </div>
    </form>
  )
}

