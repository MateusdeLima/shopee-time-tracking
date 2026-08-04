import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
export const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente Supabase para operações do servidor (com service key)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase

let dbInitialized = false

// Função para criar as tabelas necessárias
export async function setupDatabase() {
  dbInitialized = true
  return true
}


// Auxiliar para conversão e compressão Base64 (garante que fique bem abaixo do limite de 50.000 caracteres do Google Sheets)
function fileToBase64(file: File | Blob, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      if (!dataUrl) {
        reject(new Error("Falha ao ler arquivo"))
        return
      }

      // Se for imagem, fazemos a compressão via Canvas no navegador
      if (typeof window !== "undefined" && file.type?.startsWith("image/")) {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            let width = img.width
            let height = img.height

            if (width > maxWidth || height > maxWidth) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width)
                width = maxWidth
              } else {
                width = Math.round((width * maxWidth) / height)
                height = maxWidth
              }
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext("2d")
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height)
              const compressed = canvas.toDataURL("image/jpeg", quality)
              resolve(compressed)
              return
            }
          } catch (e) {
            console.warn("Erro ao comprimir imagem via canvas:", e)
          }
          resolve(dataUrl)
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
      } else {
        resolve(dataUrl)
      }

    }
    reader.onerror = () => reject(new Error("Erro na leitura do arquivo"))
    reader.readAsDataURL(file)
  })
}


// Auxiliar para salvar a imagem Base64 como um Link de URL oficial
async function convertBase64ToUrlLink(base64Data: string): Promise<string> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const res = await fetch(`${origin}/api/image-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: base64Data,
        contentType: base64Data.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
      })
    })
    const json = await res.json()
    if (json.url) return json.url
  } catch (err) {
    console.error('Erro ao converter imagem em link de URL:', err)
  }
  return base64Data
}

// Função para upload de arquivo de perfil (com geração de link URL oficial)
export async function uploadProfilePicture(userId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}.${fileExt}`
    const { data, error } = await supabase.storage.from('profile-pictures').upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    })
    
    if (!error) {
      const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
      const publicUrl = publicUrlData?.publicUrl
      if (publicUrl) return publicUrl
    }
  } catch (err) {
    console.warn("[Storage] Supabase Storage bloqueado/indisponível. Gerando link URL alternativo.")
  }

  const base64 = await fileToBase64(file)
  return await convertBase64ToUrlLink(base64)
}

// Função para upload de comprovantes (com geração de link URL oficial)
export async function uploadCertificate(userId: string, file: File | Blob, fileName?: string): Promise<string | null> {
  try {
    const fileExt = fileName ? fileName.split('.').pop() : 'png'
    const randomName = Math.random().toString(36).substring(7)
    const filePath = `${userId}/${Date.now()}_${randomName}.${fileExt}`
    
    const { data, error } = await supabase.storage.from('certificates').upload(filePath, file, {
      upsert: true,
      contentType: (file as File).type || 'image/png',
    })
    
    if (!error) {
      const { data: publicUrlData } = supabase.storage.from('certificates').getPublicUrl(filePath)
      const publicUrl = publicUrlData?.publicUrl
      if (publicUrl) return publicUrl
    }
  } catch (err) {
    console.warn("[Storage] Supabase Storage bloqueado/indisponível. Gerando link URL alternativo.")
  }

  const base64 = await fileToBase64(file)
  return await convertBase64ToUrlLink(base64)
}



// Função para obter a URL pública da foto de perfil
export function getProfilePictureUrl(userId: string, ext: string = 'jpg'): string {
  const filePath = `${userId}.${ext}`
  const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
  return data?.publicUrl || ''
}


