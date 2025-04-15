import { supabase } from "./supabase"

// Método alternativo para criar tabelas usando a API do Supabase
export async function createTablesAlt() {
  try {
    console.log("Usando método alternativo para criar tabelas...")

    // Criar tabela de usuários
    try {
      const { error: usersError } = await supabase
        .from("users")
        .insert({
          id: "00000000-0000-0000-0000-000000000000",
          first_name: "Admin",
          last_name: "System",
          email: "admin@system.com",
          username: "admin",
          role: "admin",
        })
        .select()

      if (usersError && !usersError.message.includes("duplicate key")) {
        console.error("Erro ao criar tabela users (método alternativo):", usersError)
      } else {
        console.log("Tabela users verificada/criada com sucesso (método alternativo)")
      }
    } catch (error) {
      console.error("Erro ao criar tabela users (método alternativo):", error)
    }

    // Criar tabela de feriados
    try {
      const { error: holidaysError } = await supabase
        .from("holidays")
        .insert({
          name: "Teste",
          date: new Date().toISOString().split("T")[0],
          active: true,
          deadline: new Date().toISOString().split("T")[0],
          max_hours: 1,
        })
        .select()

      if (holidaysError && !holidaysError.message.includes("duplicate key")) {
        console.error("Erro ao criar tabela holidays (método alternativo):", holidaysError)
      } else {
        console.log("Tabela holidays verificada/criada com sucesso (método alternativo)")
      }
    } catch (error) {
      console.error("Erro ao criar tabela holidays (método alternativo):", error)
    }

    // Inserir feriados iniciais se não existirem
    try {
      const { data: holidaysExist, error: checkError } = await supabase.from("holidays").select("id").limit(1)

      if (checkError) {
        console.error("Erro ao verificar feriados existentes (método alternativo):", checkError)
      } else if (!holidaysExist || holidaysExist.length === 0) {
        const { error: holidaysInsertError } = await supabase.from("holidays").insert([
          {
            name: "Natal",
            date: "2023-12-25",
            active: true,
            deadline: "2024-01-10",
            max_hours: 2,
          },
          {
            name: "Ano Novo",
            date: "2024-01-01",
            active: true,
            deadline: "2024-01-15",
            max_hours: 2,
          },
          {
            name: "Carnaval",
            date: "2024-02-13",
            active: true,
            deadline: "2024-02-28",
            max_hours: 2,
          },
        ])

        if (holidaysInsertError) {
          console.error("Erro ao inserir feriados iniciais (método alternativo):", holidaysInsertError)
        } else {
          console.log("Feriados iniciais inseridos com sucesso (método alternativo)!")
        }
      }
    } catch (error) {
      console.error("Erro ao verificar/inserir feriados iniciais (método alternativo):", error)
    }

    console.log("Processo de criação de tabelas concluído (método alternativo)!")
    return true
  } catch (error) {
    console.error("Erro ao criar tabelas (método alternativo):", error)
    return false
  }
}

