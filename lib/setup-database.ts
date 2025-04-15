import { supabase } from "./supabase"

// Função para criar as tabelas no Supabase
export async function createTables() {
  try {
    console.log("Iniciando criação de tabelas...")

    // Criar tabela de usuários
    try {
      const { error: usersError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `)

      if (usersError) {
        console.error("Erro ao criar tabela users:", usersError)
      } else {
        console.log("Tabela users criada com sucesso")
      }
    } catch (error) {
      console.error("Erro ao criar tabela users:", error)
    }

    // Criar tabela de feriados
    try {
      const { error: holidaysError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS holidays (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          date DATE NOT NULL,
          active BOOLEAN DEFAULT TRUE,
          deadline DATE NOT NULL,
          max_hours INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `)

      if (holidaysError) {
        console.error("Erro ao criar tabela holidays:", holidaysError)
      } else {
        console.log("Tabela holidays criada com sucesso")
      }
    } catch (error) {
      console.error("Erro ao criar tabela holidays:", error)
    }

    // Criar tabela de registros de horas extras
    try {
      const { error: overtimeError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS overtime_records (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          holiday_id INTEGER NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
          holiday_name TEXT NOT NULL,
          date DATE NOT NULL,
          option_id TEXT NOT NULL,
          option_label TEXT NOT NULL,
          hours INTEGER NOT NULL,
          start_time TEXT,
          end_time TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `)

      if (overtimeError) {
        console.error("Erro ao criar tabela overtime_records:", overtimeError)
      } else {
        console.log("Tabela overtime_records criada com sucesso")
      }
    } catch (error) {
      console.error("Erro ao criar tabela overtime_records:", error)
    }

    // Criar tabela de registros de ponto
    try {
      const { error: timeClockError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS time_clock_records (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          holiday_id INTEGER NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
          overtime_hours INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `)

      if (timeClockError) {
        console.error("Erro ao criar tabela time_clock_records:", timeClockError)
      } else {
        console.log("Tabela time_clock_records criada com sucesso")
      }
    } catch (error) {
      console.error("Erro ao criar tabela time_clock_records:", error)
    }

    // Criar tabela de registros de ausências
    try {
      const { error: absenceError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS absence_records (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          custom_reason TEXT,
          dates TEXT[] NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'approved')),
          proof_document TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          date_range JSONB
        );
      `)

      if (absenceError) {
        console.error("Erro ao criar tabela absence_records:", absenceError)
      } else {
        console.log("Tabela absence_records criada com sucesso")
      }
    } catch (error) {
      console.error("Erro ao criar tabela absence_records:", error)
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

