import { supabase } from "./supabase"

// Função para criar as tabelas no Supabase
// NOTA: As tabelas já foram criadas via Supabase Dashboard/Migrations
// Este código está comentado para evitar erros no cliente
export async function createTables() {
  try {
    console.log("Verificando tabelas existentes...")
    
    // As tabelas já existem no Supabase, não precisamos criá-las via cliente
    // O Supabase client não suporta queries SQL diretas no navegador
    // Todas as tabelas devem ser criadas via Supabase Dashboard ou Migrations
    
    console.log("Tabelas já existem no Supabase")

    // Verificar se a tabela hour_bank_compensations existe
    try {
      const { data: compensationsExist, error: compensationsCheckError } = await supabase
        .from("hour_bank_compensations")
        .select("id")
        .limit(1)

      if (compensationsCheckError) {
        console.log("Tabela hour_bank_compensations não existe ainda, será criada via migrations")
      } else {
        console.log("Tabela hour_bank_compensations já existe")
      }
    } catch (e) {
      console.log("Tabela hour_bank_compensations será criada via migrations")
    }

    // Inserir feriados iniciais se não existirem
    try {
      const { data: holidaysExist, error: checkError } = await supabase.from("holidays").select("id").limit(1)

      if (checkError) {
        console.error("Erro ao verificar feriados existentes:", checkError)
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
          console.error("Erro ao inserir feriados iniciais:", holidaysInsertError)
        } else {
          console.log("Feriados iniciais inseridos com sucesso!")
        }
      }
    } catch (error) {
      console.error("Erro ao verificar/inserir feriados iniciais:", error)
    }

    console.log("Processo de criação de tabelas concluído!")
    return true
  } catch (error) {
    console.error("Erro ao criar tabelas:", error)
    return false
  }
}

