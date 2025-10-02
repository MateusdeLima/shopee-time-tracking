"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function DashboardLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Senha fixa: dashpage
      if (password === "dashpage") {
        // Salvar flag de autenticação do dashboard
        localStorage.setItem("dashboardAuth", "true")
        router.push("/dashboard")
      } else {
        setError("Senha incorreta")
      }
    } catch (err) {
      setError("Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="Digite a senha do dashboard"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full bg-[#EE4D2D] hover:bg-[#D23F20]" disabled={loading}>
        {loading ? "Entrando..." : "Acessar Dashboard"}
      </Button>
    </form>
  )
}
