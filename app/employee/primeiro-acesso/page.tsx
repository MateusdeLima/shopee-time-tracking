"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
// removido upload de foto de perfil
import { getCurrentUser, setCurrentUser } from "@/lib/auth"

export default function PrimeiroAcesso() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const user = getCurrentUser()
  if (!user) {
    router.push("/")
    return null
  }

  // fluxo anterior não exigia upload de foto

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const updatedUser = { ...user, isFirstAccess: false }
      router.push("/employee/dashboard")
    } catch (err: any) {
      setError(err.message || "Erro ao salvar foto de perfil.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold mb-2">Primeiro acesso</h2>
        <p className="mb-4 text-center">Confirme para concluir o primeiro acesso.</p>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <button
          type="submit"
          className="bg-[#EE4D2D] text-white px-4 py-2 rounded hover:bg-[#d23f20] w-full"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Concluir"}
        </button>
      </form>
    </div>
  )
} 