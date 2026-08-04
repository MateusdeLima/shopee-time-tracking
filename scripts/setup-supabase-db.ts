import { getSheetRows, SHEETS_TABS } from "../lib/google-sheets"

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0]?.replace("https://", "") || "nlnfdcrxncckhcdtckxr"
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ""
const QUERY_ENDPOINT = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`


async function runSupabaseQuery(sql: string): Promise<any> {
  const res = await fetch(QUERY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase Query Error (${res.status}): ${text}`)
  }

  return await res.json()
}

async function main() {
  console.log("🛠️  Criando tabelas e esquema no novo projeto Supabase...")

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS public.users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      cpf TEXT,
      role TEXT DEFAULT 'agent',
      profile_picture_url TEXT,
      shift TEXT,
      birth_date TEXT,
      is_first_access BOOLEAN DEFAULT false,
      project_id TEXT,
      discord_id TEXT,
      team TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.projects (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.holidays (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      max_hours NUMERIC DEFAULT 8,
      status TEXT DEFAULT 'active',
      is_mandatory BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.holidays DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.absence_records (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      custom_reason TEXT,
      dates JSONB DEFAULT '[]'::jsonb,
      date_range JSONB DEFAULT '{}'::jsonb,
      departure_time TEXT,
      return_time TEXT,
      has_proof BOOLEAN DEFAULT false,
      proof_url TEXT,
      proof_required BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'pending',
      expires_at TIMESTAMPTZ,
      certificate_days INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.absence_records DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.vacation_records (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      dates JSONB DEFAULT '[]'::jsonb,
      date_range JSONB DEFAULT '{}'::jsonb,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.vacation_records DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.time_clock_records (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.time_clock_records DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.overtime_records (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      holiday_id TEXT,
      hours NUMERIC DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.overtime_records DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.compensations (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hours NUMERIC DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.compensations DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.portal_settings (
      id BIGSERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.portal_settings DISABLE ROW LEVEL SECURITY;

    CREATE TABLE IF NOT EXISTS public.image_uploads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      content_type TEXT DEFAULT 'image/jpeg',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.image_uploads DISABLE ROW LEVEL SECURITY;
  `

  await runSupabaseQuery(schemaSql)
  console.log("✅ Tabelas criadas no Supabase com sucesso!")

  // Importar dados da planilha Google Sheets para o novo Supabase
  console.log("📦 Importando dados do Google Sheets para o novo Supabase...")

  // 1. Users
  const users = await getSheetRows(SHEETS_TABS.USERS)
  console.log(`👤 Importando ${users.length} usuários...`)
  for (const u of users) {
    if (!u.id) continue
    const sql = `
      INSERT INTO public.users (id, email, username, first_name, last_name, cpf, role, profile_picture_url, shift, birth_date, is_first_access, project_id, discord_id, team)
      VALUES ($$${u.id}$$, $$${u.email || ''}$$, $$${u.username || ''}$$, $$${u.firstName || ''}$$, $$${u.lastName || ''}$$, $$${u.cpf || ''}$$, $$${u.role || 'agent'}$$, $$${u.profilePictureUrl || ''}$$, $$${u.shift || ''}$$, $$${u.birthDate || ''}$$, ${u.isFirstAccess ? 'true' : 'false'}, $$${u.projectId || ''}$$, $$${u.discordId || ''}$$, $$${u.team || ''}$$)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        profile_picture_url = EXCLUDED.profile_picture_url,
        discord_id = EXCLUDED.discord_id,
        team = EXCLUDED.team;
    `
    try { await runSupabaseQuery(sql) } catch (e) { console.warn(`Warn user ${u.id}:`, e) }
  }

  // 2. Absence Records
  const absences = await getSheetRows(SHEETS_TABS.ABSENCE_RECORDS)
  console.log(`📋 Importando ${absences.length} ausências...`)
  for (const a of absences) {
    if (!a.id || !a.userId) continue
    const datesJson = JSON.stringify(a.dates || [])
    const dateRangeJson = JSON.stringify(a.dateRange || {})
    const sql = `
      INSERT INTO public.absence_records (id, user_id, reason, custom_reason, dates, date_range, departure_time, return_time, has_proof, proof_url, proof_required, status, certificate_days)
      VALUES (${a.id}, $$${a.userId}$$, $$${a.reason || ''}$$, $$${a.customReason || ''}$$, '${datesJson}'::jsonb, '${dateRangeJson}'::jsonb, $$${a.departureTime || ''}$$, $$${a.returnTime || ''}$$, ${a.hasProof ? 'true' : 'false'}, $$${a.proofUrl || ''}$$, ${a.proofRequired ? 'true' : 'false'}, $$${a.status || 'pending'}$$, ${a.certificateDays || 0})
      ON CONFLICT (id) DO UPDATE SET
        reason = EXCLUDED.reason,
        status = EXCLUDED.status,
        proof_url = EXCLUDED.proof_url;
    `
    try { await runSupabaseQuery(sql) } catch (e) { console.warn(`Warn absence ${a.id}:`, e) }
  }

  // Set sequence val for serial columns
  await runSupabaseQuery(`SELECT setval(pg_get_serial_sequence('absence_records', 'id'), COALESCE((SELECT MAX(id) FROM absence_records), 1));`)

  console.log("🎉 Processo de setup do Supabase concluído com sucesso!")
}

main().catch(console.error)
