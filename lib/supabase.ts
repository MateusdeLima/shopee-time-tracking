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

