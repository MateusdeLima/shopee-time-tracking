import { supabase, supabaseAdmin } from "@/lib/supabase"
import { format, differenceInDays, addDays, getDay, parseISO, eachDayOfInterval } from "date-fns"

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string
  cpf: string
  role: "admin" | "employee"
  profilePictureUrl?: string
  createdAt: string
  shift?: "8-17" | "9-18"
  birthDate?: string
  isFirstAccess?: boolean
  projectId?: string
  discordId?: string
  team?: string
}

export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface HourBankCompensation {
  id: number
  userId: string
  holidayId: number
  declaredHours: number
  detectedHours: number
  confidence: number
  proofImage: string // String vazia quando não há imagem
  status: "approved" | "rejected"
  reason: string
  analyzedAt: string
  createdAt: string
  updatedAt?: string
}

export interface Holiday {
  id: number
  name: string
  date?: string // Campo opcional - não usado mais na interface
  type?: string // 'holiday' or 'bridge'
  active: boolean
  deadline: string
  maxHours: number
  createdAt: string
  updatedAt?: string
}

export interface OvertimeRecord {
  id: number
  userId: string
  holidayId: number
  holidayName: string
  date: string
  optionId: string
  optionLabel: string
  hours: number
  startTime?: string
  endTime?: string
  status?: "approved" | "pending_admin" | "rejected_admin"
  proofImage?: string // Imagem do comprovante (temporária)
  createdAt: string
  updatedAt?: string
}

export interface TimeClockRecord {
  id: number
  userId: string
  holidayId: number
  date: string
  startTime: string
  endTime: string | null
  status: "active" | "completed"
  overtimeHours: number
  createdAt: string
  updatedAt?: string
}

export interface AbsenceRecord {
  id: number
  userId: string
  reason: string
  customReason?: string
  dates: string[]
  status: "pending" | "completed" | "approved"
  proofDocument?: string
  createdAt: string
  updatedAt?: string
  expiresAt: string
  dateRange?: {
    start: string
    end: string
  }
  departureTime?: string
  returnTime?: string
}

export interface HourBankCompensation {
  id: number
  userId: string
  holidayId: number
  declaredHours: number
  detectedHours: number
  confidence: number
  proofImage: string // String vazia quando não há imagem
  status: "approved" | "rejected"
  reason: string
  analyzedAt: string
  createdAt: string
  updatedAt?: string
}

export interface TimeRequest {
  id: number
  userId: string
  holidayId: number
  requestType: "missing_entry" | "missing_exit"
  requestedTime: string
  actualTime?: string
  reason: string
  status: "pending" | "approved" | "rejected"
  adminNotes?: string
  createdAt: string
  updatedAt?: string
}

// Função para converter nomes de campos do Supabase para o formato camelCase usado na aplicação
function convertToCamelCase<T>(data: any): T {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map((item) => convertToCamelCase(item)) as unknown as T
  }

  if (typeof data === "object" && data !== null) {
    const newObj: any = {}

    Object.keys(data).forEach((key) => {
      // Converter snake_case para camelCase
      let newKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

      // Mapeamento específico para campos de banco de horas
      if (key === 'hour_bank_proof') {
        newKey = 'proofImage'
      }
      if (key === 'discord_id') {
        newKey = 'discordId'
      }

      newObj[newKey] = convertToCamelCase(data[key])
    })

    return newObj as T
  }

  return data as T
}

// Função para converter nomes de campos do formato camelCase para snake_case usado no Supabase
function convertToSnakeCase(data: any): any {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map((item) => convertToSnakeCase(item))
  }

  if (typeof data === "object" && data !== null) {
    const newObj: any = {}

    Object.keys(data).forEach((key) => {
      // Converter camelCase para snake_case
      let newKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
      
      // Mapeamento explícito
      if (key === 'discordId') {
        newKey = 'discord_id'
      }
      
      newObj[newKey] = convertToSnakeCase(data[key])
    })

    return newObj
  }

  return data
}

// Inicialização do banco de dados
export async function initializeDb() {
  // Simplificar inicialização - apenas verificar se o Supabase está acessível
  try {
    // Teste simples de conectividade
    const { data, error } = await supabase.from("users").select("id").limit(1)

    if (error && error.code !== "PGRST116") {
      console.warn("Aviso ao verificar banco de dados:", error)
    }

    return true
  } catch (error) {
    console.warn("Aviso ao inicializar banco de dados:", error)
    // Retornar true mesmo com erro para não bloquear a aplicação
    return true
  }
}

// Buscar todas as férias de um projeto para evitar sobreposição
export async function getProjectVacations(projectId: string) {
  try {
    // 1. Buscar todos os usuários do projeto
    const { data: projectUsers, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("project_id", projectId)

    if (usersError) throw usersError
    if (!projectUsers || projectUsers.length === 0) return []

    const userIds = projectUsers.map(u => u.id)

    // 2. Buscar registros de ausência do tipo 'vacation' para esses usuários
    const { data: vacations, error: vacationsError } = await supabase
      .from("absence_records")
      .select("*")
      .eq("reason", "vacation")
      .in("user_id", userIds)
      .in("status", ["pending", "approved"]) // Considerar pendentes e aprovados para bloqueio

    if (vacationsError) throw vacationsError

    return vacations || []
  } catch (error) {
    console.error("Erro ao buscar férias do projeto:", error)
    return []
  }
}
// ================= Portal Settings =================
export type EmployeePortalTabs = { holidays: boolean; absences: boolean; vacations: boolean }

export async function getEmployeePortalTabs(): Promise<EmployeePortalTabs> {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', 'employee_portal_tabs')
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar portal_settings:', error)
    return { holidays: true, absences: true, vacations: true }
  }
  const value = (data as any)?.value || { holidays: true, absences: true, vacations: true }
  return { 
    holidays: !!value.holidays, 
    absences: !!value.absences,
    vacations: !!value.vacations
  }
}

export async function setEmployeePortalTabs(tabs: EmployeePortalTabs): Promise<void> {
  const { error } = await supabase
    .from('portal_settings')
    .upsert({ key: 'employee_portal_tabs', value: tabs, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) {
    console.error('Erro ao salvar portal_settings:', error)
    throw new Error('Falha ao salvar configurações do portal')
  }
}

// Funções para usuários
export async function getUsers(): Promise<User[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("users").select("*")

    if (error) {
      console.error("Erro ao buscar usuários:", error)
      return []
    }

    console.log("🔍 [DB] Dados brutos de usuários do Supabase:", data ? data.slice(0, 2) : "vazio")
    const users = convertToCamelCase<User[]>(data || [])
    console.log("🔍 [DB] Usuários convertidos (exemplo):", users.length > 0 ? { id: users[0].id, discordId: users[0].discordId } : "vazio")
    return users
  } catch (error) {
    console.error("Erro em getUsers:", error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

  if (error) {
    console.error("Erro ao buscar usuário por ID:", error)
    return null
  }

  return convertToCamelCase<User>(data)
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle()

    if (error && error.code !== "PGRST116") {
      // Ignorar erro de "não encontrado"
      console.error("Erro ao buscar usuário por email:", error)
      return null
    }

    return data ? convertToCamelCase<User>(data) : null
  } catch (error) {
    console.error("Erro em getUserByEmail:", error)
    return null
  }
}

export async function createUser(user: Omit<User, "id" | "createdAt" | "username"> & { profilePictureUrl?: string }): Promise<User> {
  try {
    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Erro ao verificar email existente:", checkError)
      throw new Error("Erro ao verificar email. Tente novamente.")
    }

    if (existingUser) {
      throw new Error("Email já cadastrado")
    }

    // Gerar username único baseado no nome
    const firstName = user.firstName.toLowerCase().replace(/[^a-z]/g, "")
    const lastName = user.lastName.toLowerCase().replace(/[^a-z]/g, "")
    const baseUsername = `${firstName}.${lastName}`
    let username = baseUsername
    let counter = 1

    // Verificar se o username já existe e incrementar contador se necessário
    while (true) {
      const { data: existingUsername } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle()

      if (!existingUsername) break
      username = `${baseUsername}${counter}`
      counter++
    }

    // Criar novo usuário com os campos adicionais
    const { data: newUser, error } = await supabase.from("users").insert([
      {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        role: user.role,
        username,
        cpf: user.cpf,
        birth_date: user.birthDate,
        is_first_access: true,
        profile_picture_url: user.profilePictureUrl || null,
        project_id: user.projectId || null,
      },
    ]).select().single()

    if (error) {
      console.error("Erro ao criar usuário:", error)
      throw new Error("Erro ao criar usuário. Tente novamente.")
    }

    return convertToCamelCase<User>(newUser)
  } catch (error) {
    console.error("Erro em createUser:", error)
    throw error
  }
}

// Gerar próximo ID de agente (AG001, AG002, etc)
export async function generateNextAgentId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("username")
      .like("username", "AG%")
      .order("username", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Erro ao buscar último ID de agente:", error)
      return "AG001"
    }

    if (!data || data.length === 0) {
      return "AG001"
    }

    const lastId = data[0].username
    const match = lastId.match(/AG(\d+)/)
    
    if (match) {
      const nextNumber = parseInt(match[1]) + 1
      return `AG${nextNumber.toString().padStart(3, "0")}`
    }

    return "AG001"
  } catch (error) {
    console.error("Erro em generateNextAgentId:", error)
    return "AG001"
  }
}

export function normalizeShift(shift: string): string {
  if (!shift) return "8-17"
  const s = shift.toString().replace(/\s+/g, "").toLowerCase()
  
  // Priorizar detecção do horário de início 09:00 / 9:00
  if (s.startsWith("9") || s.startsWith("09") || s.includes("09:00") || s.includes("9:00")) {
    return "9-18"
  }
  
  // Detecção de 08:00 / 8:00
  if (s.startsWith("8") || s.startsWith("08") || s.includes("08:00") || s.includes("8:00")) {
    return "8-17"
  }
  
  return "8-17"
}

export async function batchCreateAgents(agents: Array<{ firstName: string; lastName: string; email: string; shift?: string; discordId?: string; projectId?: string }>): Promise<void> {
  try {
    for (const agent of agents) {
      const username = await generateNextAgentId()
      const normalizedShift = normalizeShift(agent.shift || "8-17")
      
      const { error } = await supabase.from("users").insert([
        {
          first_name: agent.firstName,
          last_name: agent.lastName,
          email: agent.email.trim().toLowerCase(),
          role: "employee",
          username,
          shift: normalizedShift,
          discord_id: agent.discordId,
          project_id: agent.projectId,
          is_first_access: true,
        },
      ])

      if (error) {
        console.error(`Erro ao criar agente ${agent.email}:`, error.message || error)
        // Continuar para o próximo mesmo se um falhar
      }
    }
  } catch (error) {
    console.error("Erro em batchCreateAgents:", error)
    throw error
  }
}

export async function deleteUser(id: string): Promise<void> {
  // Excluir usuário (as tabelas relacionadas serão excluídas automaticamente devido às restrições de chave estrangeira)
  const { error } = await supabase.from("users").delete().eq("id", id)

  if (error) {
    console.error("Erro ao excluir usuário:", error)
    throw new Error("Falha ao excluir usuário")
  }
}

export async function deleteAllEmployees(): Promise<void> {
  const { error } = await supabase.from("users").delete().eq("role", "employee")
  if (error) {
    console.error("Erro ao excluir todos os agentes:", error)
    throw new Error("Falha ao excluir todos os agentes")
  }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  // Converter camelCase para snake_case
  const userData = convertToSnakeCase({
    ...data,
    updatedAt: new Date().toISOString(),
  })

  // Remover campos que não devem ser atualizados diretamente ou que não existem no banco com esse nome
  delete userData.created_at
  delete userData.id
  delete userData.email // Geralmente não se altera email assim, mas depende da regra de negócio
  // Garantir que project_id seja processado corretamente (convertToSnakeCase deve lidar com isso se for projectId -> project_id)

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update(userData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar usuário:", error)
    throw new Error("Falha ao atualizar usuário")
  }

  return convertToCamelCase<User>(updatedUser)
}

// Funções para projetos
export async function getProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase.from("projects").select("*").order("name")

    if (error) {
      console.error("Erro ao buscar projetos:", error)
      return []
    }

    return convertToCamelCase<Project[]>(data || [])
  } catch (error) {
    console.error("Erro em getProjects:", error)
    return []
  }
}

export async function getOrCreateProjectByName(name: string): Promise<string> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error("Nome do projeto inválido")

  try {
    // 1. Tentar buscar projeto existente
    const { data: existing, error: searchError } = await supabase
      .from("projects")
      .select("id")
      .ilike("name", trimmedName)
      .maybeSingle()

    if (searchError) throw searchError
    if (existing) return existing.id

    // 2. Criar novo projeto
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert({ name: trimmedName })
      .select("id")
      .single()

    if (createError) {
      // Se houver erro de chave duplicada (23505 ou 409 Conflict), tentar buscar novamente
      if (createError.code === "23505" || createError.message?.includes("duplicate key")) {
        const { data: secondSearch, error: secondSearchError } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", trimmedName)
          .maybeSingle()

        if (secondSearchError) throw secondSearchError
        if (secondSearch) return secondSearch.id
      }
      throw createError
    }
    return newProject.id
  } catch (error) {
    console.error("Erro em getOrCreateProjectByName:", error)
    throw error
  }
}

// Funções para feriados
export async function getHolidays(): Promise<Holiday[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("holidays").select("*")

    if (error) {
      console.error("Erro ao buscar feriados:", error)
      return []
    }

    // Ensure data is an array before returning
    return Array.isArray(data) ? convertToCamelCase<Holiday[]>(data) : []
  } catch (error) {
    console.error("Erro em getHolidays:", error)
    return []
  }
}

export async function getHolidayById(id: number): Promise<Holiday | null> {
  const { data, error } = await supabase.from("holidays").select("*").eq("id", id).single()

  if (error) {
    console.error("Erro ao buscar feriado por ID:", error)
    return null
  }

  return convertToCamelCase<Holiday>(data)
}

export async function getActiveHolidays(): Promise<Holiday[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("holidays").select("*").eq("active", true)

    if (error) {
      console.error("Erro ao buscar feriados ativos:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    // Ensure data is an array before returning
    return Array.isArray(data) ? convertToCamelCase<Holiday[]>(data) : []
  } catch (error) {
    console.error("Erro em getActiveHolidays:", {
      error: error,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
    return []
  }
}

export async function createHoliday(holiday: Omit<Holiday, "id" | "createdAt">): Promise<Holiday> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    // Converter para snake_case para o Supabase
    const holidayData = convertToSnakeCase({
      name: holiday.name,
      date: holiday.date,
      active: holiday.active,
      deadline: holiday.deadline,
      maxHours: holiday.maxHours,
    })

    const { data, error } = await supabase.from("holidays").insert(holidayData).select().single()

    if (error) {
      console.error("Erro ao criar feriado:", error)
      throw new Error(`Falha ao criar feriado: ${error.message || "Erro desconhecido"}`)
    }

    if (!data) {
      throw new Error("Falha ao criar feriado: Nenhum dado retornado")
    }

    return convertToCamelCase<Holiday>(data)
  } catch (error: any) {
    console.error("Erro em createHoliday:", error)
    throw new Error(error.message || "Falha ao criar feriado")
  }
}

export async function updateHoliday(id: number, data: Partial<Holiday>): Promise<Holiday> {
  // Converter para snake_case para o Supabase
  const holidayData = convertToSnakeCase({
    ...data,
    updatedAt: new Date().toISOString(),
  })

  const { data: updatedData, error } = await supabase
    .from("holidays")
    .update(holidayData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar feriado:", error)
    throw new Error("Falha ao atualizar feriado")
  }

  return convertToCamelCase<Holiday>(updatedData)
}

export async function toggleHolidayStatus(id: number): Promise<Holiday> {
  // Buscar feriado atual
  const holiday = await getHolidayById(id)
  if (!holiday) {
    throw new Error("Feriado não encontrado")
  }

  // Atualizar status
  return await updateHoliday(id, { active: !holiday.active })
}

export async function deleteHoliday(id: number): Promise<void> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    // Verificar se o feriado existe
    const holiday = await getHolidayById(id)
    if (!holiday) {
      throw new Error("Feriado não encontrado")
    }

    // Verificar se há registros de horas extras associados a este feriado
    const { data: overtimeRecords, error: overtimeError } = await supabase
      .from("overtime_records")
      .select("id")
      .eq("holiday_id", id)
      .limit(1)

    if (overtimeError) {
      console.error("Erro ao verificar registros de horas extras:", overtimeError)
      throw new Error("Erro ao verificar dependências do feriado")
    }

    if (overtimeRecords && overtimeRecords.length > 0) {
      throw new Error("Não é possível excluir este feriado pois há registros de horas extras associados a ele")
    }

    // Excluir o feriado
    const { error } = await supabase
      .from("holidays")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Erro ao excluir feriado:", error)
      throw new Error(`Falha ao excluir feriado: ${error.message || "Erro desconhecido"}`)
    }
  } catch (error: any) {
    console.error("Erro em deleteHoliday:", error)
    throw new Error(error.message || "Falha ao excluir feriado")
  }
}

// Funções para registros de horas extras
export async function getOvertimeRecords(): Promise<OvertimeRecord[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("overtime_records").select("*")

    if (error) {
      console.error("Erro ao buscar registros de horas extras:", error)
      return []
    }

    return convertToCamelCase<OvertimeRecord[]>(data || [])
  } catch (error) {
    console.error("Erro em getOvertimeRecords:", error)
    return []
  }
}

export async function getOvertimeRecordsByUserId(userId: string): Promise<OvertimeRecord[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("overtime_records").select("*").eq("user_id", userId)

    if (error) {
      console.error("Erro ao buscar registros de horas extras por usuário:", {
        userId: userId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return []
    }

    // Ensure data is an array before returning
    return Array.isArray(data) ? convertToCamelCase<OvertimeRecord[]>(data) : []
  } catch (error) {
    console.error("Erro em getOvertimeRecordsByUserId:", {
      userId: userId,
      error: error,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
    return []
  }
}

export async function getOvertimeRecordById(id: number): Promise<OvertimeRecord | null> {
  const { data, error } = await supabase.from("overtime_records").select("*").eq("id", id).single()

  if (error) {
    console.error("Erro ao buscar registro de horas extras por ID:", error)
    return null
  }

  return convertToCamelCase<OvertimeRecord>(data)
}

export async function createOvertimeRecord(record: Omit<OvertimeRecord, "id" | "createdAt">): Promise<OvertimeRecord> {
  try {
    if (!record.userId || !record.holidayId || !record.date || !record.optionId || !record.optionLabel || record.hours === undefined) {
      throw new Error("Campos obrigatórios faltando")
    }

    // Montagem manual para lidar com coluna específica hour_bank_proof
    const recordData: any = {
      user_id: record.userId,
      holiday_id: record.holidayId,
      holiday_name: record.holidayName,
      date: record.date,
      option_id: record.optionId,
      option_label: record.optionLabel,
      hours: Number(record.hours),
      start_time: record.startTime || null,
      end_time: record.endTime || null,
      status: record.status || 'approved',
    }

    // Mapeia a imagem do comprovante para a coluna correta
    if (typeof (record as any).proofImage !== 'undefined') {
      recordData.hour_bank_proof = (record as any).proofImage || null
      recordData.is_hour_bank = true
    }

    const { data, error } = await supabase
      .from("overtime_records")
      .insert(recordData)
      .select()
      .single()

    if (error) {
      console.error("Erro detalhado ao criar registro:", error)
      throw new Error(`Falha ao criar registro: ${error.message}`)
    }

    if (!data) {
      throw new Error("Nenhum dado retornado após a inserção")
    }

    return convertToCamelCase<OvertimeRecord>(data)
  } catch (error: any) {
    console.error("Erro ao criar registro de horas extras:", error)
    throw new Error(error.message || "Falha ao criar registro de horas extras")
  }
}

export async function updateOvertimeRecord(id: number, data: Partial<OvertimeRecord>): Promise<OvertimeRecord> {
  // Converter padrão para snake_case
  const baseData = convertToSnakeCase({
    ...data,
    updatedAt: new Date().toISOString(),
  }) as any

  // Corrigir campo de imagem: usar hour_bank_proof ao invés de proof_image
  if (Object.prototype.hasOwnProperty.call(data, 'proofImage')) {
    baseData.hour_bank_proof = (data as any).proofImage ? (data as any).proofImage : null
    delete baseData.proof_image
  }

  const { data: updatedData, error } = await supabase
    .from("overtime_records")
    .update(baseData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar registro de horas extras:", error)
    throw new Error("Falha ao atualizar registro de horas extras")
  }

  return convertToCamelCase<OvertimeRecord>(updatedData)
}

export async function deleteOvertimeRecord(id: number): Promise<void> {
  const { error } = await supabase.from("overtime_records").delete().eq("id", id)

  if (error) {
    console.error("Erro ao excluir registro de horas extras:", error)
    throw new Error("Falha ao excluir registro de horas extras")
  }
}

// Funções para registros de ponto
export async function getTimeClockRecords(): Promise<TimeClockRecord[]> {
  const { data, error } = await supabase.from("time_clock_records").select("*")

  if (error) {
    console.error("Erro ao buscar registros de ponto:", error)
    return []
  }

  return convertToCamelCase<TimeClockRecord[]>(data || [])
}

export async function getTimeClockRecordsByUserId(userId: string): Promise<TimeClockRecord[]> {
  const { data, error } = await supabase.from("time_clock_records").select("*").eq("user_id", userId)

  if (error) {
    console.error("Erro ao buscar registros de ponto por usuário:", error)
    return []
  }

  return convertToCamelCase<TimeClockRecord[]>(data || [])
}

export async function getTimeClockRecordById(id: number): Promise<TimeClockRecord | null> {
  const { data, error } = await supabase.from("time_clock_records").select("*").eq("id", id).single()

  if (error) {
    console.error("Erro ao buscar registro de ponto por ID:", error)
    return null
  }

  return convertToCamelCase<TimeClockRecord>(data)
}

export async function getActiveTimeClockByUserId(userId: string, holidayId: number): Promise<TimeClockRecord | null> {
  const { data, error } = await supabase
    .from("time_clock_records")
    .select("*")
    .eq("user_id", userId)
    .eq("holiday_id", holidayId)
    .eq("status", "active")
    .single()

  if (error && error.code !== "PGRST116") {
    // Ignorar erro de "não encontrado"
    console.error("Erro ao buscar registro de ponto ativo:", error)
    return null
  }

  return data ? convertToCamelCase<TimeClockRecord>(data) : null
}

export async function createTimeClockRecord(
  record: Omit<TimeClockRecord, "id" | "createdAt">,
): Promise<TimeClockRecord> {
  // Verificar se já existe um registro ativo para este usuário e feriado
  const existingActiveRecord = await getActiveTimeClockByUserId(record.userId, record.holidayId)

  if (existingActiveRecord) {
    throw new Error("Já existe um registro de ponto ativo para este feriado")
  }

  // Converter para snake_case para o Supabase
  const recordData = convertToSnakeCase({
    userId: record.userId,
    holidayId: record.holidayId,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    status: record.status,
    overtimeHours: record.overtimeHours,
  })

  const { data, error } = await supabase.from("time_clock_records").insert(recordData).select().single()

  if (error) {
    console.error("Erro ao criar registro de ponto:", error)
    throw new Error("Falha ao criar registro de ponto")
  }

  return convertToCamelCase<TimeClockRecord>(data)
}

export async function updateTimeClockRecord(id: number, data: Partial<TimeClockRecord>): Promise<TimeClockRecord> {
  // Converter para snake_case para o Supabase
  const recordData = convertToSnakeCase({
    ...data,
    updatedAt: new Date().toISOString(),
  })

  const { data: updatedData, error } = await supabase
    .from("time_clock_records")
    .update(recordData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar registro de ponto:", error)
    throw new Error("Falha ao atualizar registro de ponto")
  }

  return convertToCamelCase<TimeClockRecord>(updatedData)
}

export async function deleteTimeClockRecord(id: number): Promise<void> {
  const { error } = await supabase.from("time_clock_records").delete().eq("id", id)

  if (error) {
    console.error("Erro ao excluir registro de ponto:", error)
    throw new Error("Falha ao excluir registro de ponto")
  }
}

// Funções para ausências
export async function getAbsenceRecords(): Promise<AbsenceRecord[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("absence_records").select("*")

    if (error) {
      console.error("Erro ao buscar registros de ausência:", error)
      return []
    }

    return convertToCamelCase<AbsenceRecord[]>(data || [])
  } catch (error) {
    console.error("Erro em getAbsenceRecords:", error)
    return []
  }
}

export async function getAbsenceRecordsByUserId(userId: string): Promise<AbsenceRecord[]> {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    const { data, error } = await supabase.from("absence_records").select("*").eq("user_id", userId)

    if (error) {
      console.error("Erro ao buscar registros de ausência por usuário:", error)
      return []
    }

    return Array.isArray(data) ? convertToCamelCase<AbsenceRecord[]>(data) : []
  } catch (error) {
    console.error("Erro em getAbsenceRecordsByUserId:", error)
    return []
  }
}

export async function getActiveAbsenceRecordsByUserId(userId: string): Promise<AbsenceRecord[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase.from("absence_records").select("*").eq("user_id", userId).gt("expires_at", now)

  if (error) {
    console.error("Erro ao buscar registros de ausência ativos:", error)
    return []
  }

  return convertToCamelCase<AbsenceRecord[]>(data || [])
}

export async function getAbsenceRecordById(id: number): Promise<AbsenceRecord | null> {
  const { data, error } = await supabase.from("absence_records").select("*").eq("id", id).single()

  if (error) {
    console.error("Erro ao buscar registro de ausência por ID:", error)
    return null
  }

  return convertToCamelCase<AbsenceRecord>(data)
}

export async function createAbsenceRecord(
  record: Omit<AbsenceRecord, "id" | "createdAt" | "expiresAt">,
): Promise<AbsenceRecord> {
  // Calcular data de expiração (30 dias após a primeira data)
  // Evitar shift de fuso horário ao criar o objeto Date
  const [y, m, d] = record.dates[0].split('-').map(Number)
  const firstDate = new Date(y, m - 1, d, 12, 0, 0)
  const expiresAt = new Date(firstDate)
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Converter para snake_case para o Supabase
  const recordData = convertToSnakeCase({
    userId: record.userId,
    reason: record.reason,
    customReason: record.customReason,
    dates: record.dates,
    status: record.status,
    proofDocument: record.proofDocument,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    dateRange: record.dateRange,
    departureTime: record.departureTime,
    returnTime: record.returnTime,
  })

  const { data, error } = await supabase.from("absence_records").insert(recordData).select().single()

  if (error) {
    console.error("Erro ao criar registro de ausência:", error)
    throw new Error("Falha ao criar registro de ausência")
  }

  // Notificar bot (Removido daqui pois os componentes agora chamam a API diretamente para evitar duplicidade)

  return convertToCamelCase<AbsenceRecord>(data)
}

export async function updateAbsenceRecord(id: number, data: Partial<AbsenceRecord>): Promise<AbsenceRecord> {
  // Converter para snake_case para o Supabase
  const recordData = convertToSnakeCase({
    ...data,
    updatedAt: new Date().toISOString(),
  })

  const { data: updatedData, error } = await supabase
    .from("absence_records")
    .update(recordData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar registro de ausência:", error)
    throw new Error("Falha ao atualizar registro de ausência")
  }

  const result = convertToCamelCase<AbsenceRecord>(updatedData)

  // Notificaçao de comprovante (Removido daqui para evitar duplicidade, componentes chamam a API)

  return result
}

export async function deleteAbsenceRecord(id: number): Promise<void> {
  const { error } = await supabase.from("absence_records").delete().eq("id", id)

  if (error) {
    console.error("Erro ao excluir registro de ausência:", error)
    throw new Error("Falha ao excluir registro de ausência")
  }
}








// Função para calcular horas extras com base no horário de trabalho
export function calculateOvertimeHours(
  date: string,
  startTime: string,
  endTime: string,
  standardStartTime = "09:00",
  standardEndTime = "18:00",
): number {
  // Converter strings para objetos Date
  const startDate = new Date(`${date}T${startTime}:00`)
  const endDate = new Date(`${date}T${endTime}:00`)
  const standardStart = new Date(`${date}T${standardStartTime}:00`)
  const standardEnd = new Date(`${date}T${standardEndTime}:00`)

  // Calcular horas extras antes do horário padrão
  let overtimeBefore = 0
  if (startDate < standardStart) {
    // Tolerância de 5 minutos: considerar até 5 minutos após o horário pretendido como válido
    const adjustedStart = new Date(startDate.getTime() - 10 * 60 * 1000)
    overtimeBefore = (standardStart.getTime() - adjustedStart.getTime()) / (1000 * 60 * 60)
  }

  // Calcular horas extras depois do horário padrão
  let overtimeAfter = 0
  if (endDate > standardEnd) {
    // Tolerância de 5 minutos: considerar até 5 minutos antes do horário pretendido como válido
    const adjustedEnd = new Date(endDate.getTime() + 10 * 60 * 1000)
    overtimeAfter = (adjustedEnd.getTime() - standardEnd.getTime()) / (1000 * 60 * 60)
  }

  // Arredondar para o número inteiro mais próximo
  const totalOvertime = Math.round(overtimeBefore + overtimeAfter)

  return totalOvertime
}

// Função para determinar a opção de hora extra com base no horário
export function determineOvertimeOption(
  startTime: string,
  endTime: string,
): { id: string; label: string; value: number } {
  // Extrair horas e minutos do horário de entrada e saída
  const [startHourStr, startMinStr = "00"] = startTime.split(":")
  const [endHourStr, endMinStr = "00"] = endTime.split(":")
  const startHour = Number.parseInt(startHourStr, 10)
  const startMin = Number.parseInt(startMinStr, 10)
  const endHour = Number.parseInt(endHourStr, 10)
  const endMin = Number.parseInt(endMinStr, 10)

  // Opções para horário padrão (9h-18h)
  const standardOptions = [
    { id: "9h_18h", label: "9h às 18h (Padrão)", value: 0 },
    // Opções para 30 minutos antes/depois
    { id: "8h30_18h", label: "8:30h às 18h", value: 0.5 },
    { id: "9h_18h30", label: "9h às 18:30h", value: 0.5 },
    // Opções para 1 hora antes/depois
    { id: "8h_18h", label: "8h às 18h", value: 1 },
    { id: "9h_19h", label: "9h às 19h", value: 1 },
    // Opções para 2 horas antes/depois
    { id: "7h_18h", label: "7h às 18h", value: 2 },
    { id: "9h_20h", label: "9h às 20h", value: 2 }
  ]

  // Opções para horário alternativo (8h-17h)
  const alternativeOptions = [
    { id: "8h_17h", label: "8h às 17h (Padrão)", value: 0 },
    // Opções para 30 minutos antes/depois
    { id: "7h30_17h", label: "7:30h às 17h", value: 0.5 },
    { id: "8h_17h30", label: "8h às 17:30h", value: 0.5 },
    // Opções para 1 hora antes/depois
    { id: "7h_17h", label: "7h às 17h", value: 1 },
    { id: "8h_18h", label: "8h às 18h", value: 1 },
    // Opções para 2 horas antes/depois
    { id: "6h_17h", label: "6h às 17h", value: 2 },
    { id: "8h_19h", label: "8h às 19h", value: 2 }
  ]

  // Determinar se é horário padrão (9h-18h) ou alternativo (8h-17h)
  const isStandardSchedule = (startHour === 9 && startMin === 0 && endHour === 18 && endMin === 0) ||
    (startHour === 9 && endHour >= 18) // Considera extensões do horário padrão
  const isAlternativeSchedule = (startHour === 8 && startMin === 0 && endHour === 17 && endMin === 0) ||
    (startHour === 8 && endHour >= 17) // Considera extensões do horário alternativo

  const options = isAlternativeSchedule ? alternativeOptions : standardOptions

  // Tentar encontrar uma correspondência exata
  for (const option of options) {
    const [optStartHour, optStartMin = "00"] = option.id.split("_")[0].replace("h", ":").split(":")
    const [optEndHour, optEndMin = "00"] = option.id.split("_")[1].replace("h", ":").split(":")

    if (startHour === Number(optStartHour) &&
      startMin === Number(optStartMin) &&
      endHour === Number(optEndHour) &&
      endMin === Number(optEndMin)) {
      return option
    }
  }

  // Se não houver correspondência exata, encontrar a opção mais próxima
  const totalMinutes = ((endHour - startHour) * 60) + (endMin - startMin)
  const standardMinutes = isAlternativeSchedule ? 9 * 60 : 9 * 60 // 9 horas padrão

  const overtimeMinutes = Math.abs(totalMinutes - standardMinutes)
  const overtimeHours = overtimeMinutes / 60

  // Encontrar a opção mais próxima com base nas horas extras
  if (overtimeHours >= 2) {
    return options.find(opt => opt.value === 2) || options[0]
  } else if (overtimeHours >= 1) {
    return options.find(opt => opt.value === 1) || options[0]
  } else if (overtimeHours >= 0.5) {
    return options.find(opt => opt.value === 0.5) || options[0]
  }

  // Retornar opção padrão se nenhuma correspondência for encontrada
  return options[0]
}

// Auxiliar: converte "7h" ou "7h30" em "07:00"/"07:30"
function normalizeHourToken(token: string): string {
  const match = token.match(/(\d{1,2})h(?:(\d{2}))?/)
  if (!match) return token
  const h = match[1].padStart(2, "0")
  const m = match[2] ? match[2].padStart(2, "0") : "00"
  return `${h}:${m}`
}

// Tenta extrair horários a partir de optionId (ex: "7h_18h", "8h30_17h30")
export function getTimesFromOptionId(optionId?: string): { startTime?: string; endTime?: string } {
  if (!optionId) return {}
  const parts = optionId.split("_")
  if (parts.length === 2) {
    return {
      startTime: normalizeHourToken(parts[0]),
      endTime: normalizeHourToken(parts[1])
    }
  }
  return {}
}

// Finaliza um registro: define endTime como agora e recalcula horas
export async function finalizeOvertimeRecord(recordId: number): Promise<OvertimeRecord> {
  const current = await getOvertimeRecordById(recordId)
  if (!current) {
    throw new Error("Registro não encontrado")
  }

  const date = current.date
  const now = new Date()
  const nowTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`

  // Determinar startTime esperado caso ausente
  let startTime = current.startTime
  if (!startTime) {
    const derived = getTimesFromOptionId(current.optionId)
    if (!derived.startTime) {
      throw new Error("Não foi possível determinar o horário inicial")
    }
    startTime = derived.startTime
  }

  const recalculatedHours = calculateOvertimeHours(date, startTime, nowTime)

  const updated = await updateOvertimeRecord(recordId, {
    endTime: nowTime,
    hours: recalculatedHours,
    updatedAt: new Date().toISOString(),
  })

  return updated
}
// Funções para cálculos e estatísticas
export async function getHolidayStats(holidayId: number): Promise<{ used: number; max: number }> {
  const holiday = await getHolidayById(holidayId)
  if (!holiday) {
    return { used: 0, max: 0 }
  }

  const { data, error } = await supabase.from("overtime_records").select("hours").eq("holiday_id", holidayId)

  if (error) {
    console.error("Erro ao buscar estatísticas de feriado:", error)
    return { used: 0, max: holiday.maxHours }
  }

  const hoursUsed = data.reduce((total: number, record: any) => total + record.hours, 0)

  return {
    used: hoursUsed,
    max: holiday.maxHours,
  }
}

export async function getUserHolidayStats(userId: string, holidayId: number, forceRefresh: boolean = false): Promise<{ used: number; max: number; compensated: number }> {
  try {
    // Verificar cache primeiro (se não for refresh forçado)
    if (!forceRefresh) {
      const { getCachedStats } = await import("@/lib/stats-cache")
      const cached = getCachedStats(userId, holidayId)
      if (cached) {
        return { used: cached.used, max: cached.max, compensated: cached.compensated }
      }
    }
    // Buscar informações do feriado
    const holiday = await getHolidayById(holidayId)
    if (!holiday) {
      return { used: 0, max: 0, compensated: 0 }
    }

    // Buscar todos os registros de horas extras do usuário para este feriado
    const { data: rawData, error } = await supabase
      .from("overtime_records")
      .select("*") // Selecionar tudo para garantir mapeamento correto
      .eq("user_id", userId)
      .eq("holiday_id", holidayId)

    if (error) {
      console.error("Erro ao buscar estatísticas de usuário para feriado:", error)
      return { used: 0, max: holiday.maxHours, compensated: 0 }
    }

    // Converter para camelCase para consistência com o restante do sistema
    const data = convertToCamelCase<any[]>(rawData)

    // Filtrar registros válidos (null ou approved)
    const validRecords = data.filter((record: any) => {
      const status = record.status
      return status === null || status === "approved"
    })

    // Separar horas trabalhadas de horas de banco
    // Banco de horas tem optionId 'manual_bank_hours' ou 'ai_bank_hours'
    const workedRecords = validRecords.filter(r => 
      r.optionId !== "manual_bank_hours" && r.optionId !== "ai_bank_hours"
    )
    const bankRecords = validRecords.filter(r => 
      r.optionId === "manual_bank_hours" || r.optionId === "ai_bank_hours"
    )

    // Horas trabalhadas efetivamente
    const hoursUsed = workedRecords.reduce((total: number, record: any) => total + record.hours, 0)
    
    // Horas extraídas do banco de horas (dentro da tabela overtime_records)
    const bankHoursFromOvertime = bankRecords.reduce((total: number, record: any) => total + record.hours, 0)

    console.log(`- Horas trabalhadas: ${hoursUsed}h`)
    console.log(`- Horas de banco (na tabela overtime): ${bankHoursFromOvertime}h`)

    // Buscar horas compensadas na tabela específica hour_bank_compensations (se houver)
    const { data: compensationsData, error: compensationsError } = await supabase
      .from("hour_bank_compensations")
      .select("detected_hours")
      .eq("user_id", userId)
      .eq("holiday_id", holidayId)
      .eq("status", "approved")

    let compensatedHoursTable = 0
    if (!compensationsError && compensationsData) {
      compensatedHoursTable = compensationsData.reduce((total: number, comp: any) => total + (comp.detected_hours || 0), 0)
      console.log(`- Horas compensadas (tabela específica): ${compensatedHoursTable}h`)
    }

    // Total de horas compensadas (Soma das duas fontes)
    const totalCompensated = bankHoursFromOvertime + compensatedHoursTable

    // O máximo efetivo é o máximo original menos as horas compensadas totais
    const effectiveMax = Math.max(0, holiday.maxHours - totalCompensated)

    const result = {
      used: hoursUsed,
      max: effectiveMax,
      compensated: totalCompensated
    }

    // Armazenar no cache
    try {
      const { setCachedStats } = await import("@/lib/stats-cache")
      setCachedStats(userId, holidayId, result)
    } catch (error) {
      console.error("Erro ao armazenar no cache:", error)
    }

    return result
  } catch (error) {
    console.error("Erro ao buscar estatísticas de usuário para feriado:", error)
    return { used: 0, max: 0, compensated: 0 }
  }
}

export async function getSystemSummary() {
  try {
    // Verificar se o banco de dados está inicializado
    await initializeDb()

    // Buscar dados necessários
    const { data: usersData, error: usersError } = await supabase.from("users").select("id, role")

    if (usersError) {
      console.error("Erro ao buscar usuários para estatísticas:", usersError)
      return {
        totalEmployees: 0,
        totalHolidays: 0,
        totalActiveHolidays: 0,
        totalHoursRegistered: 0,
        totalHoursAvailable: 0,
        completionRate: 0,
        totalAbsences: 0,
        pendingAbsences: 0,
      }
    }

    const { data: holidaysData, error: holidaysError } = await supabase.from("holidays").select("id, max_hours, active")

    if (holidaysError) {
      console.error("Erro ao buscar feriados para estatísticas:", holidaysError)
      return {
        totalEmployees: usersData ? usersData.filter((u) => u.role === "employee").length : 0,
        totalHolidays: 0,
        totalActiveHolidays: 0,
        totalHoursRegistered: 0,
        totalHoursAvailable: 0,
        completionRate: 0,
        totalAbsences: 0,
        pendingAbsences: 0,
      }
    }

    const { data: recordsData, error: recordsError } = await supabase.from("overtime_records").select("hours")

    if (recordsError) {
      console.error("Erro ao buscar registros para estatísticas:", recordsError)
      return {
        totalEmployees: usersData ? usersData.filter((u) => u.role === "employee").length : 0,
        totalHolidays: holidaysData ? holidaysData.length : 0,
        totalActiveHolidays: holidaysData ? holidaysData.filter((h) => h.active).length : 0,
        totalHoursRegistered: 0,
        totalHoursAvailable: 0,
        completionRate: 0,
        totalAbsences: 0,
        pendingAbsences: 0,
      }
    }

    const { data: absencesData, error: absencesError } = await supabase.from("absence_records").select("id, status")

    if (absencesError) {
      console.error("Erro ao buscar ausências para estatísticas:", absencesError)
      return {
        totalEmployees: usersData ? usersData.filter((u) => u.role === "employee").length : 0,
        totalHolidays: holidaysData ? holidaysData.length : 0,
        totalActiveHolidays: holidaysData ? holidaysData.filter((h) => h.active).length : 0,
        totalHoursRegistered: recordsData ? recordsData.reduce((sum, record) => sum + record.hours, 0) : 0,
        totalHoursAvailable: 0,
        completionRate: 0,
        totalAbsences: 0,
        pendingAbsences: 0,
      }
    }

    // Calcular estatísticas
    const employees = usersData ? usersData.filter((u) => u.role === "employee").length : 0
    const holidays = holidaysData ? holidaysData.length : 0
    const activeHolidays = holidaysData ? holidaysData.filter((h) => h.active).length : 0
    const totalHours = recordsData ? recordsData.reduce((sum, record) => sum + record.hours, 0) : 0
    const totalAbsences = absencesData ? absencesData.length : 0

    // Calcular o total de horas possíveis (funcionários x feriados)
    let totalPossibleHours = 0
    const employeeIds = usersData ? usersData.filter((u) => u.role === "employee").map((u) => u.id) : []

    if (employeeIds.length > 0 && holidaysData) {
      employeeIds.forEach((employeeId) => {
        holidaysData.forEach((holiday) => {
          totalPossibleHours += holiday.max_hours
        })
      })
    }

    // Calcular taxa de conclusão
    const completionRate = totalPossibleHours > 0 ? (totalHours / totalPossibleHours) * 100 : 0

    return {
      totalEmployees: employees,
      totalHolidays: holidays,
      totalActiveHolidays: activeHolidays,
      totalHoursRegistered: totalHours,
      totalHoursAvailable: totalPossibleHours,
      completionRate,
      totalAbsences,
      pendingAbsences: absencesData ? absencesData.filter((a) => a.status === "pending").length : 0,
    }
  } catch (error) {
    console.error("Erro ao calcular estatísticas do sistema:", error)
    return {
      totalEmployees: 0,
      totalHolidays: 0,
      totalActiveHolidays: 0,
      totalHoursRegistered: 0,
      totalHoursAvailable: 0,
      completionRate: 0,
      totalAbsences: 0,
      pendingAbsences: 0,
    }
  }
}

// Função para atualizar foto de perfil do usuário
export async function updateUserProfilePicture(userId: string, profilePictureUrl: string): Promise<void> {
  const { error } = await supabase.from("users").update({ profile_picture_url: profilePictureUrl }).eq("id", userId)
  if (error) {
    console.error("Erro ao atualizar foto de perfil:", error)
    throw new Error("Erro ao atualizar foto de perfil")
  }
}

// Funções para compensação de banco de horas
export async function createHourBankCompensation(
  compensation: Omit<HourBankCompensation, "id" | "createdAt" | "updatedAt">
): Promise<HourBankCompensation> {
  try {
    // Mapear campos manualmente para snake_case
    const compensationData = {
      user_id: compensation.userId,
      holiday_id: compensation.holidayId,
      declared_hours: compensation.declaredHours,
      detected_hours: compensation.detectedHours,
      confidence: compensation.confidence,
      proof_image: compensation.proofImage || '', // Valor padrão vazio se não houver imagem
      status: compensation.status,
      reason: compensation.reason,
      analyzed_at: compensation.analyzedAt,
      created_at: new Date().toISOString(),
    }

    console.log("=== INSERÇÃO NO SUPABASE ===")
    console.log("URL do Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("Chave anônima existe:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log("Service key existe:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log("Dados para inserir:", compensationData)

    // Tentar com cliente regular primeiro
    let { data, error } = await supabase
      .from("hour_bank_compensations")
      .insert(compensationData)
      .select()
      .single()

    // Se falhar e tivermos service key, tentar com cliente admin
    if (error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Tentando com cliente admin...")
      const result = await supabaseAdmin
        .from("hour_bank_compensations")
        .insert(compensationData)
        .select()
        .single()

      data = result.data
      error = result.error
    }

    if (error) {
      console.error("Erro detalhado do Supabase:", error)
      console.error("Código do erro:", error.code)
      console.error("Mensagem do erro:", error.message)
      console.error("Detalhes do erro:", error.details)
      throw new Error(`Erro do Supabase: ${error.message}`)
    }

    console.log("Dados retornados do Supabase:", data)
    return convertToCamelCase<HourBankCompensation>(data)
  } catch (error) {
    console.error("Erro completo em createHourBankCompensation:", error)
    if (error instanceof Error) {
      throw new Error(`Falha ao criar compensação: ${error.message}`)
    }
    throw new Error("Falha ao criar compensação de banco de horas")
  }
}

export async function getHourBankCompensationsByUserId(userId: string): Promise<HourBankCompensation[]> {
  try {
    const { data, error } = await supabase
      .from("hour_bank_compensations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar compensações de banco de horas:", error)
      return []
    }

    return convertToCamelCase<HourBankCompensation[]>(data || [])
  } catch (error) {
    console.error("Erro em getHourBankCompensationsByUserId:", error)
    return []
  }
}

export async function getHourBankCompensationsByHolidayId(holidayId: number): Promise<HourBankCompensation[]> {
  try {
    const { data, error } = await supabase
      .from("hour_bank_compensations")
      .select("*")
      .eq("holiday_id", holidayId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar compensações por feriado:", error)
      return []
    }

    return convertToCamelCase<HourBankCompensation[]>(data || [])
  } catch (error) {
    console.error("Erro em getHourBankCompensationsByHolidayId:", error)
    return []
  }
}

export async function getAllHourBankCompensations(): Promise<HourBankCompensation[]> {
  try {
    const { data, error } = await supabase
      .from("hour_bank_compensations")
      .select(`
        *,
        users!inner(first_name, last_name, email),
        holidays!inner(name, date)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar todas as compensações:", error)
      return []
    }

    return convertToCamelCase<HourBankCompensation[]>(data || [])
  } catch (error) {
    console.error("Erro em getAllHourBankCompensations:", error)
    return []
  }
}

export async function updateHourBankCompensation(
  id: number,
  data: Partial<HourBankCompensation>
): Promise<HourBankCompensation> {
  try {
    const compensationData = convertToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    })

    const { data: updatedData, error } = await supabase
      .from("hour_bank_compensations")
      .update(compensationData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar compensação:", error)
      throw new Error("Falha ao atualizar compensação")
    }

    return convertToCamelCase<HourBankCompensation>(updatedData)
  } catch (error: any) {
    console.error("Erro em updateHourBankCompensation:", error)
    throw new Error(error.message || "Falha ao atualizar compensação")
  }
}

// ================= Time Requests Functions =================

export async function createTimeRequest(request: Omit<TimeRequest, "id" | "createdAt">): Promise<TimeRequest> {
  try {
    const requestData = convertToSnakeCase({
      userId: request.userId,
      holidayId: request.holidayId,
      requestType: request.requestType,
      requestedTime: request.requestedTime,
      actualTime: request.actualTime,
      reason: request.reason,
      status: request.status || 'pending',
      adminNotes: request.adminNotes,
    })

    const { data, error } = await supabase
      .from("time_requests")
      .insert(requestData)
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar solicitação de ponto:", error)
      throw new Error("Falha ao criar solicitação de ponto")
    }

    return convertToCamelCase<TimeRequest>(data)
  } catch (error: any) {
    console.error("Erro em createTimeRequest:", error)
    throw new Error(error.message || "Falha ao criar solicitação de ponto")
  }
}

export async function getTimeRequestsByUserId(userId: string): Promise<TimeRequest[]> {
  try {
    const { data, error } = await supabase
      .from("time_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar solicitações de ponto por usuário:", error)
      return []
    }

    return convertToCamelCase<TimeRequest[]>(data || [])
  } catch (error) {
    console.error("Erro em getTimeRequestsByUserId:", error)
    return []
  }
}

export async function getAllTimeRequests(): Promise<TimeRequest[]> {
  console.log("🔥 FUNÇÃO getAllTimeRequests CHAMADA")
  console.log("🔥 Supabase client:", !!supabase)

  try {
    console.log("📡 Fazendo query no Supabase...")
    const { data, error } = await supabase
      .from("time_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro na query:", error)
      return []
    }

    console.log("✅ Dados brutos recebidos:", data)
    console.log("📊 Quantidade de registros:", data?.length || 0)

    if (!data || data.length === 0) {
      console.log("⚠️ Nenhum dado encontrado na tabela time_requests")
      return []
    }

    // Retornar dados simples primeiro para testar
    const simpleData = data.map(request => ({
      id: request.id,
      userId: request.user_id,
      holidayId: request.holiday_id,
      requestType: request.request_type,
      requestedTime: request.requested_time,
      actualTime: request.actual_time,
      reason: request.reason,
      status: request.status,
      adminNotes: request.admin_notes,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      users: { first_name: "Leonardo", last_name: "Alves", email: "leonardo.alves@shopeemobile-external.com" },
      holidays: { name: "Consciência Negra", date: "2025-11-15" }
    }))

    console.log("🎯 Dados finais retornados:", simpleData)
    return simpleData as TimeRequest[]
  } catch (error) {
    console.error("💥 Erro geral em getAllTimeRequests:", error)
    return []
  }
}

export async function updateTimeRequest(id: number, data: Partial<TimeRequest>): Promise<TimeRequest> {
  try {
    // Primeiro, buscar os dados da solicitação antes de atualizar
    const { data: originalRequest, error: fetchError } = await supabase
      .from("time_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Erro ao buscar solicitação original:", fetchError)
      throw new Error("Falha ao buscar solicitação original")
    }

    const requestData = convertToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    })

    const { data: updatedData, error } = await supabase
      .from("time_requests")
      .update(requestData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar solicitação de ponto:", error)
      throw new Error("Falha ao atualizar solicitação de ponto")
    }

    // Se a solicitação foi aprovada e é do tipo "missing_entry", criar registro de ponto
    if (data.status === "approved" && originalRequest.request_type === "missing_entry") {
      console.log("🎯 Criando registro de ponto para solicitação aprovada")

      const startTime = data.actualTime || originalRequest.requested_time
      const today = new Date().toISOString().slice(0, 10)

      // Criar registro de ponto ativo
      await createTimeClockRecord({
        userId: originalRequest.user_id,
        holidayId: originalRequest.holiday_id,
        date: today,
        startTime,
        endTime: null,
        status: "active",
        overtimeHours: 0,
      })

      console.log("✅ Registro de ponto criado com sucesso")
    }

    return convertToCamelCase<TimeRequest>(updatedData)
  } catch (error: any) {
    console.error("Erro em updateTimeRequest:", error)
    throw new Error(error.message || "Falha ao atualizar solicitação de ponto")
  }
}

export async function deleteTimeRequest(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("time_requests")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Erro ao excluir solicitação de ponto:", error)
      throw new Error("Falha ao excluir solicitação de ponto")
    }
  } catch (error: any) {
    console.error("Erro em deleteTimeRequest:", error)
    throw new Error(error.message || "Falha ao excluir solicitação de ponto")
  }
}

// Função para verificar e corrigir solicitações aprovadas sem ponto ativo
export async function fixApprovedRequests(): Promise<{ fixed: number; errors: string[] }> {
  console.log("🔧 Iniciando correção de solicitações aprovadas...")

  const results = { fixed: 0, errors: [] as string[] }

  try {
    // Buscar todas as solicitações aprovadas de entrada
    const { data: approvedRequests, error } = await supabase
      .from("time_requests")
      .select("*")
      .eq("status", "approved")
      .eq("request_type", "missing_entry")

    if (error) {
      console.error("Erro ao buscar solicitações aprovadas:", error)
      results.errors.push("Erro ao buscar solicitações aprovadas")
      return results
    }

    console.log(`📋 Encontradas ${approvedRequests?.length || 0} solicitações aprovadas de entrada`)

    if (!approvedRequests || approvedRequests.length === 0) {
      return results
    }

    // Para cada solicitação aprovada, verificar se já existe ponto ativo
    for (const request of approvedRequests) {
      try {
        console.log(`🔍 Verificando solicitação ID ${request.id} do usuário ${request.user_id}`)

        // Verificar se já existe um registro de ponto para este usuário/feriado/data
        const today = new Date().toISOString().slice(0, 10)
        const { data: existingClock, error: clockError } = await supabase
          .from("time_clock")
          .select("*")
          .eq("user_id", request.user_id)
          .eq("holiday_id", request.holiday_id)
          .eq("date", today)
          .single()

        if (clockError && clockError.code !== 'PGRST116') { // PGRST116 = não encontrado
          console.error(`Erro ao verificar ponto existente para solicitação ${request.id}:`, clockError)
          results.errors.push(`Erro ao verificar ponto para solicitação ${request.id}`)
          continue
        }

        if (existingClock) {
          console.log(`✅ Solicitação ${request.id} já tem ponto ativo, pulando...`)
          continue
        }

        // Não existe ponto ativo, criar um
        console.log(`🎯 Criando ponto ativo para solicitação ${request.id}`)

        const startTime = request.actual_time || request.requested_time

        await createTimeClockRecord({
          userId: request.user_id,
          holidayId: request.holiday_id,
          date: today,
          startTime,
          endTime: null,
          status: "active",
          overtimeHours: 0,
        })

        results.fixed++
        console.log(`✅ Ponto ativo criado para solicitação ${request.id} - Entrada: ${startTime}`)

      } catch (error: any) {
        console.error(`Erro ao processar solicitação ${request.id}:`, error)
        results.errors.push(`Erro ao processar solicitação ${request.id}: ${error.message}`)
      }
    }

    console.log(`🏁 Correção finalizada: ${results.fixed} pontos criados, ${results.errors.length} erros`)
    return results

  } catch (error: any) {
    console.error("Erro geral em fixApprovedRequests:", error)
    results.errors.push(`Erro geral: ${error.message}`)
    return results
  }
}

