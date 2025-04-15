import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    console.log("Iniciando inicialização do banco de dados via API...")

    // Criar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Criar tabelas diretamente com SQL
    const createTables = async () => {
      try {
        // Criar tabela de usuários
        await supabase.query(`
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

        // Criar tabela de feriados
        await supabase.query(`
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

        // Criar tabela de registros de horas extras
        await supabase.query(`
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

        // Criar tabela de registros de ponto
        await supabase.query(`
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

        // Criar tabela de registros de ausências
        await supabase.query(`
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

        // Inserir feriados iniciais se não existirem
        const { data: holidaysExist } = await supabase.from("holidays").select("id").limit(1)

        if (!holidaysExist || holidaysExist.length === 0) {
          await supabase.from("holidays").insert([
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
        }

        return true
      } catch (error) {
        console.error("Erro ao criar tabelas via API:", error)
        return false
      }
    }

    const success = await createTables()

    if (success) {
      console.log("Banco de dados configurado com sucesso via API!")
      return NextResponse.json({ success: true, message: "Banco de dados configurado com sucesso!" })
    } else {
      console.error("Falha ao configurar banco de dados via API.")
      return NextResponse.json({ success: false, message: "Falha ao configurar banco de dados." }, { status: 500 })
    }
  } catch (error) {
    console.error("Erro ao configurar banco de dados via API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao configurar banco de dados.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

