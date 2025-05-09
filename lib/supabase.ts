import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey)

let dbInitialized = false

// Função para criar as tabelas necessárias
export async function setupDatabase() {
  if (dbInitialized) {
    console.log("Banco de dados já inicializado, pulando configuração.")
    return true
  }

  try {
    console.log("Iniciando configuração do banco de dados...")

    // Verificar se as tabelas já existem
    try {
      const { data, error } = await supabase.from("users").select("id").limit(1)

      if (!error) {
        console.log("Tabelas já existem, pulando criação.")
        dbInitialized = true
        return true
      }
    } catch (e) {
      console.log("Erro ao verificar tabelas existentes:", e)
    }

    // Importar a função createTables de setup-database.ts
    const { createTables } = await import("./setup-database")

    // Chamar a função para criar as tabelas
    let success = await createTables()

    // Se falhar, tentar o método alternativo
    if (!success) {
      console.log("Tentando método alternativo para criar tabelas...")
      const { createTablesAlt } = await import("./setup-database-alt")
      success = await createTablesAlt()
    }

    if (success) {
      console.log("Configuração do banco de dados concluída com sucesso!")
      dbInitialized = true
    } else {
      console.error("Falha na configuração do banco de dados.")
    }

    return success
  } catch (error) {
    console.error("Erro ao configurar banco de dados:", error)
    return false
  }
}

<<<<<<< HEAD
// Função para upload de imagem de perfil
export async function uploadProfilePicture(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const filePath = `profile-pictures/${userId}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

=======
// Função para upload de arquivo no Supabase Storage
export async function uploadProfilePicture(userId: string, file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const filePath = `profile-pictures/${userId}.${fileExt}`
  const { data, error } = await supabase.storage.from('profile-pictures').upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  })
>>>>>>> 7b01d9cd7610a9cf476e10aa40e92871b824f302
  if (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error)
    return null
  }
<<<<<<< HEAD

  // Gerar URL pública
  const { data: publicUrlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(filePath)

  return publicUrlData?.publicUrl || null
}

=======
  // Gerar URL pública
  const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
  return publicUrlData?.publicUrl || null
}

// Função para obter a URL pública da foto de perfil
export function getProfilePictureUrl(userId: string, ext: string = 'jpg'): string {
  const filePath = `profile-pictures/${userId}.${ext}`
  const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
  return data?.publicUrl || ''
}

>>>>>>> 7b01d9cd7610a9cf476e10aa40e92871b824f302
