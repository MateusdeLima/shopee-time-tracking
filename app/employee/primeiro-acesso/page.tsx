"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { uploadProfilePicture } from "@/lib/supabase"
import { updateUserProfilePicture } from "@/lib/db"
import { getCurrentUser, setCurrentUser } from "@/lib/auth"

export default function PrimeiroAcesso() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const user = getCurrentUser()
  if (!user) {
    router.push("/")
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!file) {
      setError("Selecione uma foto 3x4 para continuar.")
      return
    }
    setLoading(true)
    try {
      const url = await uploadProfilePicture(user.id, file)
      if (!url) throw new Error("Falha ao fazer upload da foto.")
      await updateUserProfilePicture(user.id, url)
      // Atualizar localStorage
      const updatedUser = { ...user, profilePictureUrl: url, isFirstAccess: false }
      setCurrentUser(updatedUser)
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
        <p className="mb-4 text-center">Para continuar, envie uma foto de perfil tipo retrato 3x4.<br/>Essa foto será usada para identificação interna.</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-2"
          required
        />
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <button
          type="submit"
          className="bg-[#EE4D2D] text-white px-4 py-2 rounded hover:bg-[#d23f20] w-full"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  )
} 