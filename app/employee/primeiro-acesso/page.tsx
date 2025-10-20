"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { uploadProfilePicture } from "@/lib/supabase"
import { updateUserProfilePicture } from "@/lib/db"
import { getCurrentUser, setCurrentUser } from "@/lib/auth"

export default function PrimeiroAcesso() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }
    setUser(currentUser)
    setIsChecking(false)
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D] mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Primeiro Acesso</h2>
          <p className="text-gray-600">Adicione uma foto de perfil para identificação</p>
        </div>
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative group mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#EE4D2D] bg-gray-100 flex items-center justify-center">
              {file && typeof window !== "undefined" ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Pré-visualização" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              )}
            </div>
            <label 
              htmlFor="profile-picture" 
              className="absolute -bottom-2 -right-2 bg-[#EE4D2D] text-white p-2 rounded-full cursor-pointer hover:bg-[#d23f20] transition-colors"
              title="Alterar foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
          </div>
          
          <p className="text-sm text-gray-500 text-center mb-2">
            Formato recomendado: JPG ou PNG
            <br />
            Tamanho máximo: 5MB
          </p>
          
          {file && (
            <p className="text-sm text-green-600 font-medium">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex flex-col space-y-3">
          <button
            type="submit"
            className="w-full bg-[#EE4D2D] hover:bg-[#d23f20] text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center"
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              'Salvar e continuar'
            )}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 text-center"
            disabled={loading}
          >
            Voltar para o login
          </button>
        </div>
      </form>
    </div>
  )
} 