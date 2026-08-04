import { supabaseAdmin } from "@/lib/supabase"

export const SHEETS_TABS = {

  USERS: "users",
  PROJECTS: "projects",
  HOLIDAYS: "holidays",
  COMPENSATIONS: "compensations",
  OVERTIME_RECORDS: "overtime_records",
  TIME_CLOCK_RECORDS: "time_clock_records",
  ABSENCE_RECORDS: "absence_records",
  VACATION_RECORDS: "vacation_records",
  PORTAL_SETTINGS: "portal_settings",
}



export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string
  password?: string
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

export interface Holiday {
  id: number
  name: string
  date?: string
  type?: string
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
  proofImage?: string
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
  status: "pending" | "completed" | "approved" | "rejected"
  proofDocument?: string
  createdAt: string
  updatedAt?: string
  expiresAt?: string
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
  proofImage: string
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

function toSnakeCaseObj(obj: Record<string, any>): Record<string, any> {

  if (!obj || typeof obj !== "object") return obj
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    let snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
    if (key === "userId" || key === "user_id") snakeKey = "user_id"
    if (key === "profilePictureUrl" || key === "profilePicture") snakeKey = "profile_picture_url"
    if (key === "firstName") snakeKey = "first_name"
    if (key === "lastName") snakeKey = "last_name"
    if (key === "isFirstAccess") snakeKey = "is_first_access"
    if (key === "projectId") snakeKey = "project_id"
    if (key === "discordId") snakeKey = "discord_id"
    if (key === "dateRange") snakeKey = "date_range"
    if (key === "departureTime") snakeKey = "departure_time"
    if (key === "returnTime") snakeKey = "return_time"
    if (key === "hasProof") snakeKey = "has_proof"
    if (key === "proofUrl" || key === "proofDocument" || key === "proofImage") snakeKey = "proof_url"
    if (key === "proofRequired") snakeKey = "proof_required"
    if (key === "certificateDays") snakeKey = "certificate_days"
    if (key === "customReason") snakeKey = "custom_reason"
    if (key === "holidayId") snakeKey = "holiday_id"
    if (key === "maxHours") snakeKey = "max_hours"
    if (key === "isMandatory") snakeKey = "is_mandatory"
    if (key === "startTime") snakeKey = "start_time"
    if (key === "endTime") snakeKey = "end_time"
    if (key === "startDate") snakeKey = "start_date"
    if (key === "endDate") snakeKey = "end_date"
    result[snakeKey] = obj[key]
  }
  return result
}

function toCamelCaseObj(row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== "object") return row
  const result: Record<string, any> = { ...row }
  if (row.user_id !== undefined) result.userId = row.user_id
  if (row.first_name !== undefined) result.firstName = row.first_name
  if (row.last_name !== undefined) result.lastName = row.last_name
  if (row.profile_picture_url !== undefined) {
    result.profilePictureUrl = row.profile_picture_url
    result.profilePicture = row.profile_picture_url
  }
  if (row.is_first_access !== undefined) result.isFirstAccess = row.is_first_access
  if (row.project_id !== undefined) result.projectId = row.project_id
  if (row.discord_id !== undefined) result.discordId = row.discord_id
  if (row.date_range !== undefined) result.dateRange = row.date_range
  if (row.departure_time !== undefined) result.departureTime = row.departure_time
  if (row.return_time !== undefined) result.returnTime = row.return_time
  if (row.has_proof !== undefined) result.hasProof = row.has_proof
  if (row.proof_url !== undefined) {
    result.proofUrl = row.proof_url
    result.proofDocument = row.proof_url
    result.proofImage = row.proof_url
  }
  if (row.proof_required !== undefined) result.proofRequired = row.proof_required
  if (row.certificate_days !== undefined) result.certificateDays = row.certificate_days
  if (row.custom_reason !== undefined) result.customReason = row.custom_reason
  if (row.holiday_id !== undefined) result.holidayId = row.holiday_id
  if (row.max_hours !== undefined) result.maxHours = row.max_hours
  if (row.is_mandatory !== undefined) result.isMandatory = row.is_mandatory
  if (row.start_time !== undefined) result.startTime = row.start_time
  if (row.end_time !== undefined) result.endTime = row.end_time
  if (row.start_date !== undefined) result.startDate = row.start_date
  if (row.end_date !== undefined) result.endDate = row.end_date
  if (row.created_at !== undefined) result.createdAt = row.created_at
  if (row.updated_at !== undefined) result.updatedAt = row.updated_at
  return result
}


// Universal DB runner (Server-side Supabase / Client-side fetch API)
async function dbQuery<T = any>(action: string, tab: string, payload?: any): Promise<T> {
  if (typeof window === "undefined") {
    if (action === "getRows") {
      const { data: rows, error } = await (supabaseAdmin as any).from(tab).select("*").order("id", { ascending: true })
      if (error) throw error
      return (rows || []).map(toCamelCaseObj) as unknown as T
    }
    if (action === "appendRow") {
      const rawData = payload?.data !== undefined ? payload.data : payload
      const rowData = toSnakeCaseObj(rawData)
      const { data: inserted, error } = await (supabaseAdmin as any).from(tab).insert([rowData]).select()
      if (error) throw error
      return (inserted?.[0] ? toCamelCaseObj(inserted[0]) : rawData) as unknown as T
    }
    if (action === "updateRow") {
      const idFieldName = payload?.idFieldName ? payload.idFieldName.replace(/([A-Z])/g, "_$1").toLowerCase() : "id"
      const id = payload?.id
      const rawData = payload?.data !== undefined ? payload.data : payload
      const updateData = toSnakeCaseObj(rawData)
      const { error } = await (supabaseAdmin as any).from(tab).update(updateData).eq(idFieldName, id)
      if (error) throw error
      return true as unknown as T
    }
    if (action === "deleteRow") {
      const idFieldName = payload?.idFieldName ? payload.idFieldName.replace(/([A-Z])/g, "_$1").toLowerCase() : "id"
      const id = payload?.id
      const { error } = await (supabaseAdmin as any).from(tab).delete().eq(idFieldName, id)
      if (error) throw error
      return true as unknown as T
    }
  } else {

    const bodyPayload = payload && typeof payload === "object" && !payload.data ? { data: payload } : payload
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, tab, ...bodyPayload }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error || "DB query error")
    return json.data as T
  }
  return [] as unknown as T
}

export async function initializeDb() {
  return true
}

export async function getProjectVacations(projectId: string) {
  try {
    const users = await getUsers()
    const projectUsers = users.filter((u) => u.projectId === projectId)
    if (projectUsers.length === 0) return []

    const userIds = projectUsers.map((u) => u.id)
    const absences = await getAbsenceRecords()
    return absences.filter(
      (a) => a.reason === "vacation" && userIds.includes(a.userId) && ["pending", "approved"].includes(a.status)
    )
  } catch (error) {
    console.error("Erro ao buscar férias do projeto:", error)
    return []
  }
}

export type EmployeePortalTabs = { holidays: boolean; absences: boolean; vacations: boolean }
let memoryPortalTabs: EmployeePortalTabs = { holidays: true, absences: true, vacations: true }

export async function getEmployeePortalTabs(): Promise<EmployeePortalTabs> {
  try {
    const rows = await dbQuery<any[]>("getRows", SHEETS_TABS.PORTAL_SETTINGS)
    const settingsRow = (rows || []).find((r) => r && r.key === "employee_portal_tabs")
    if (settingsRow && settingsRow.value) {
      const parsed = typeof settingsRow.value === "string" ? JSON.parse(settingsRow.value) : settingsRow.value
      const result = {
        holidays: Boolean(parsed.holidays),
        absences: Boolean(parsed.absences),
        vacations: Boolean(parsed.vacations),
      }
      memoryPortalTabs = result
      return result
    }
  } catch (error) {
    console.error("Erro ao buscar abas do portal na planilha:", error)
  }
  return memoryPortalTabs
}

export async function setEmployeePortalTabs(tabs: EmployeePortalTabs): Promise<void> {
  memoryPortalTabs = tabs
  try {
    const rows = await dbQuery<any[]>("getRows", SHEETS_TABS.PORTAL_SETTINGS)
    const settingsRow = (rows || []).find((r) => r && r.key === "employee_portal_tabs")
    const valueStr = JSON.stringify(tabs)
    if (settingsRow) {
      await dbQuery("updateRow", SHEETS_TABS.PORTAL_SETTINGS, {
        idFieldName: "key",
        id: "employee_portal_tabs",
        data: {
          value: valueStr,
          updatedAt: new Date().toISOString(),
        },
      })
    } else {
      await dbQuery("appendRow", SHEETS_TABS.PORTAL_SETTINGS, {
        data: {
          key: "employee_portal_tabs",
          value: valueStr,
          updatedAt: new Date().toISOString(),
        },
      })
    }
  } catch (error) {
    console.error("Erro ao salvar abas do portal na planilha:", error)
  }
}




// ================= USERS =================

export async function getUsers(): Promise<User[]> {
  try {
    return await dbQuery<User[]>("getRows", SHEETS_TABS.USERS)
  } catch (error) {
    console.error("Erro em getUsers:", error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.id === id) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase()) || null
}

export async function createUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
  const newId = userData.username ? `usr-${userData.username}` : `usr-${Date.now()}`
  const newObj: User = {
    ...userData,
    id: newId,
    createdAt: new Date().toISOString(),
    isFirstAccess: userData.isFirstAccess ?? true,
  }
  await dbQuery("appendRow", SHEETS_TABS.USERS, { data: newObj })
  return newObj
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  await dbQuery("updateRow", SHEETS_TABS.USERS, { id, data: userData })
  return getUserById(id)
}

export async function updateUserProfilePicture(userId: string, url: string): Promise<User | null> {
  return updateUser(userId, { profilePictureUrl: url })
}

export async function deleteUser(id: string): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.USERS, { id })
  return true
}

export async function deleteAllEmployees(): Promise<boolean> {
  const users = await getUsers()
  const employees = users.filter((u) => u.role === "employee")
  for (const emp of employees) {
    await deleteUser(emp.id)
  }
  return true
}

// ================= PROJECTS =================

export async function getProjects(): Promise<Project[]> {
  return await dbQuery<Project[]>("getRows", SHEETS_TABS.PROJECTS)
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getProjects()
  return projects.find((p) => p.id === id) || null
}

export async function createProject(projectData: { name: string }): Promise<Project> {
  const newObj: Project = {
    id: `proj-${Date.now()}`,
    name: projectData.name,
    createdAt: new Date().toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.PROJECTS, { data: newObj })
  return newObj
}

export async function updateProject(id: string, projectData: { name: string }): Promise<Project | null> {
  await dbQuery("updateRow", SHEETS_TABS.PROJECTS, { id, data: projectData })
  return getProjectById(id)
}

export async function deleteProject(id: string): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.PROJECTS, { id })
  return true
}

// ================= HOLIDAYS =================

export async function getHolidays(): Promise<Holiday[]> {
  return await dbQuery<Holiday[]>("getRows", SHEETS_TABS.HOLIDAYS)
}

export async function getHolidayById(id: number): Promise<Holiday | null> {
  const holidays = await getHolidays()
  return holidays.find((h) => Number(h.id) === Number(id)) || null
}

export async function getActiveHolidays(): Promise<Holiday[]> {
  const holidays = await getHolidays()
  return holidays.filter((h) => h.active)
}

export async function createHoliday(holidayData: Omit<Holiday, "id" | "createdAt">): Promise<Holiday> {
  const holidays = await getHolidays()
  const nextId = holidays.length > 0 ? Math.max(...holidays.map((h) => Number(h.id))) + 1 : 1
  const newObj: Holiday = {
    ...holidayData,
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.HOLIDAYS, { data: newObj })
  return newObj
}

export async function updateHoliday(id: number, holidayData: Partial<Holiday>): Promise<Holiday | null> {
  await dbQuery("updateRow", SHEETS_TABS.HOLIDAYS, {
    id,
    data: { ...holidayData, updatedAt: new Date().toISOString() },
  })
  return getHolidayById(id)
}

export async function toggleHolidayStatus(id: number): Promise<Holiday> {
  const holiday = await getHolidayById(id)
  if (!holiday) throw new Error("Feriado não encontrado")
  const updated = await updateHoliday(id, { active: !holiday.active })
  if (!updated) throw new Error("Falha ao atualizar feriado")
  return updated
}


export async function deleteHoliday(id: number): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.HOLIDAYS, { id })
  return true
}

// ================= OVERTIME RECORDS =================

export async function getOvertimeRecords(): Promise<OvertimeRecord[]> {
  return await dbQuery<OvertimeRecord[]>("getRows", SHEETS_TABS.OVERTIME_RECORDS)
}

export async function getOvertimeRecordsByUserId(userId: string): Promise<OvertimeRecord[]> {
  const records = await getOvertimeRecords()
  return records.filter((r) => r.userId === userId)
}

export async function getOvertimeRecordById(id: number): Promise<OvertimeRecord | null> {
  const records = await getOvertimeRecords()
  return records.find((r) => Number(r.id) === Number(id)) || null
}

export async function createOvertimeRecord(recordData: Omit<OvertimeRecord, "id" | "createdAt">): Promise<OvertimeRecord> {
  const records = await getOvertimeRecords()
  const nextId = records.length > 0 ? Math.max(...records.map((r) => Number(r.id))) + 1 : 1
  const newObj: OvertimeRecord = {
    ...recordData,
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.OVERTIME_RECORDS, { data: newObj })
  return newObj
}

export async function updateOvertimeRecord(id: number, recordData: Partial<OvertimeRecord>): Promise<OvertimeRecord | null> {
  await dbQuery("updateRow", SHEETS_TABS.OVERTIME_RECORDS, {
    id,
    data: { ...recordData, updatedAt: new Date().toISOString() },
  })
  return getOvertimeRecordById(id)
}

export async function deleteOvertimeRecord(id: number): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.OVERTIME_RECORDS, { id })
  return true
}

export function getTimesFromOptionId(optionId: string): { startTime: string; endTime: string } {
  const map: Record<string, { startTime: string; endTime: string }> = {
    "8-12": { startTime: "08:00", endTime: "12:00" },
    "13-17": { startTime: "13:00", endTime: "17:00" },
    "8-17": { startTime: "08:00", endTime: "17:00" },
    "9-18": { startTime: "09:00", endTime: "18:00" },
  }
  return map[optionId] || { startTime: "08:00", endTime: "17:00" }
}

// ================= TIME CLOCK RECORDS =================

export async function getTimeClockRecords(): Promise<TimeClockRecord[]> {
  return await dbQuery<TimeClockRecord[]>("getRows", SHEETS_TABS.TIME_CLOCK_RECORDS)
}

export async function getTimeClockRecordsByUserId(userId: string): Promise<TimeClockRecord[]> {
  const records = await getTimeClockRecords()
  return records.filter((r) => r.userId === userId)
}

export async function getTimeClockRecordById(id: number): Promise<TimeClockRecord | null> {
  const records = await getTimeClockRecords()
  return records.find((r) => Number(r.id) === Number(id)) || null
}

export async function createTimeClockRecord(recordData: Omit<TimeClockRecord, "id" | "createdAt">): Promise<TimeClockRecord> {
  const records = await getTimeClockRecords()
  const nextId = records.length > 0 ? Math.max(...records.map((r) => Number(r.id))) + 1 : 1
  const newObj: TimeClockRecord = {
    ...recordData,
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.TIME_CLOCK_RECORDS, { data: newObj })
  return newObj
}

export async function updateTimeClockRecord(id: number, recordData: Partial<TimeClockRecord>): Promise<TimeClockRecord | null> {
  await dbQuery("updateRow", SHEETS_TABS.TIME_CLOCK_RECORDS, {
    id,
    data: { ...recordData, updatedAt: new Date().toISOString() },
  })
  return getTimeClockRecordById(id)
}

export async function deleteTimeClockRecord(id: number): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.TIME_CLOCK_RECORDS, { id })
  return true
}

// ================= ABSENCE RECORDS =================

export async function getAbsenceRecords(): Promise<AbsenceRecord[]> {
  return await dbQuery<AbsenceRecord[]>("getRows", SHEETS_TABS.ABSENCE_RECORDS)
}

export async function getAbsenceRecordsByUserId(userId: string): Promise<AbsenceRecord[]> {
  const records = await getAbsenceRecords()
  const user = (await getUserById(userId)) || (await getUserByEmail(userId)) || (await getUserByUsername(userId))

  const allowedIds = new Set<string>()
  if (userId) allowedIds.add(String(userId).toLowerCase())

  if (user) {
    if (user.id) allowedIds.add(String(user.id).toLowerCase())
    if (user.username) allowedIds.add(String(user.username).toLowerCase())
    if (user.email) allowedIds.add(String(user.email).toLowerCase())
  }

  return records.filter((r) => {
    if (!r || !r.userId) return false
    const rId = String(r.userId).toLowerCase()
    return allowedIds.has(rId)
  })
}


export async function getActiveAbsencesByUserId(userId: string): Promise<AbsenceRecord[]> {
  const records = await getAbsenceRecordsByUserId(userId)
  const now = new Date().toISOString()
  return records.filter((r) => r.expiresAt && r.expiresAt > now)
}

export async function getAbsenceRecordById(id: number): Promise<AbsenceRecord | null> {
  const records = await getAbsenceRecords()
  return records.find((r) => Number(r.id) === Number(id)) || null
}

export async function createAbsenceRecord(recordData: Omit<AbsenceRecord, "id" | "createdAt">): Promise<AbsenceRecord> {
  const records = await getAbsenceRecords()
  const nextId = records.length > 0 ? Math.max(...records.map((r) => Number(r.id))) + 1 : 1
  
  const defaultExpires = new Date()
  defaultExpires.setDate(defaultExpires.getDate() + 30)

  const newObj: AbsenceRecord = {
    ...recordData,
    id: nextId,
    createdAt: new Date().toISOString(),
    expiresAt: recordData.expiresAt || defaultExpires.toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.ABSENCE_RECORDS, { data: newObj })
  return newObj
}


export async function updateAbsenceRecord(id: number, recordData: Partial<AbsenceRecord>): Promise<AbsenceRecord | null> {
  await dbQuery("updateRow", SHEETS_TABS.ABSENCE_RECORDS, {
    id,
    data: { ...recordData, updatedAt: new Date().toISOString() },
  })
  return getAbsenceRecordById(id)
}

export async function deleteAbsenceRecord(id: number): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.ABSENCE_RECORDS, { id })
  return true
}

// ================= COMPENSATIONS =================

export async function getHourBankCompensations(): Promise<HourBankCompensation[]> {
  return await dbQuery<HourBankCompensation[]>("getRows", SHEETS_TABS.COMPENSATIONS)
}

export async function getAllHourBankCompensations(): Promise<HourBankCompensation[]> {
  return getHourBankCompensations()
}

export async function getHourBankCompensationsByUserId(userId: string): Promise<HourBankCompensation[]> {
  const rows = await getHourBankCompensations()
  return rows.filter((r) => r.userId === userId)
}

export async function createHourBankCompensation(data: Omit<HourBankCompensation, "id" | "createdAt">): Promise<HourBankCompensation> {
  const rows = await getHourBankCompensations()
  const nextId = rows.length > 0 ? Math.max(...rows.map((r) => Number(r.id))) + 1 : 1
  const newObj: HourBankCompensation = {
    ...data,
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  await dbQuery("appendRow", SHEETS_TABS.COMPENSATIONS, { data: newObj })
  return newObj
}

export async function updateHourBankCompensation(id: number, data: Partial<HourBankCompensation>): Promise<HourBankCompensation | null> {
  await dbQuery("updateRow", SHEETS_TABS.COMPENSATIONS, {
    id,
    data: { ...data, updatedAt: new Date().toISOString() },
  })
  const rows = await getHourBankCompensations()
  return rows.find((r) => Number(r.id) === Number(id)) || null
}

export async function deleteHourBankCompensation(id: number): Promise<boolean> {
  await dbQuery("deleteRow", SHEETS_TABS.COMPENSATIONS, { id })
  return true
}

export async function batchCreateAgents(
  agents: Array<Partial<User> & { firstName: string; lastName: string; email: string }>
): Promise<User[]> {
  const created: User[] = []
  for (const agent of agents) {
    const username = agent.username || agent.email.split("@")[0]
    const newUser = await createUser({
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      username: username,
      cpf: agent.cpf || "000.000.000-00",
      role: agent.role || "employee",
      shift: agent.shift || "8-17",
      birthDate: agent.birthDate || "",
      profilePictureUrl: agent.profilePictureUrl || "",
      projectId: agent.projectId,
      discordId: agent.discordId,
      team: agent.team,
      isFirstAccess: agent.isFirstAccess ?? true,
    })
    created.push(newUser)
  }
  return created
}


export async function getSystemSummary() {
  const users = await getUsers()
  const holidays = await getHolidays()
  const activeHolidays = holidays.filter((h) => h.active)
  const overtimes = await getOvertimeRecords()
  const totalEmployees = users.filter((u) => u.role === "employee").length
  const totalHoursRegistered = overtimes.reduce((acc, curr) => acc + (curr.hours || 0), 0)
  const totalHoursAvailable = activeHolidays.reduce((acc, curr) => acc + (curr.maxHours || 0) * totalEmployees, 0)
  const completionRate = totalHoursAvailable > 0 ? Math.round((totalHoursRegistered / totalHoursAvailable) * 100) : 0

  return {
    totalUsers: users.length,
    totalEmployees,
    totalHolidays: holidays.length,
    totalActiveHolidays: activeHolidays.length,
    totalHoursRegistered,
    totalHoursAvailable,
    completionRate,
  }
}


export async function getUserHolidayStats(userId: string, holidayId: number, includePending?: boolean) {
  const holiday = await getHolidayById(holidayId)
  const maxHours = holiday?.maxHours || 0
  const overtimes = await getOvertimeRecordsByUserId(userId)
  const holidayOvertimes = overtimes.filter((o) => Number(o.holidayId) === Number(holidayId))
  const used = holidayOvertimes.reduce((acc, curr) => acc + (curr.hours || 0), 0)
  return { max: maxHours, used, compensated: 0, totalHours: used, count: holidayOvertimes.length }
}




export async function finalizeOvertimeRecord(id: number): Promise<OvertimeRecord> {
  const updated = await updateOvertimeRecord(id, { status: "approved" })
  if (!updated) throw new Error("Registro de hora extra não encontrado")
  return updated
}


export async function getOrCreateProjectByName(name: string): Promise<string> {
  const projects = await getProjects()
  const existing = projects.find((p) => p.name && p.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id
  const newProject = await createProject({ name })
  return newProject.id
}


export function normalizeShift(shift?: string): "8-17" | "9-18" {
  if (!shift) return "8-17"
  if (shift.includes("9")) return "9-18"
  return "8-17"
}

export function calculateOvertimeHours(
  dateOrStart: string,
  startTimeOrEnd?: string,
  endTime?: string,
  standardStart?: string,
  standardEnd?: string
): number {
  let start = dateOrStart
  let end = startTimeOrEnd || ""
  if (endTime) {
    start = startTimeOrEnd || ""
    end = endTime
  }
  if (!start || !end) return 0
  const [startH, startM] = start.split(":").map(Number)
  const [endH, endM] = end.split(":").map(Number)
  const startMins = (startH || 0) * 60 + (startM || 0)
  const endMins = (endH || 0) * 60 + (endM || 0)
  const diff = (endMins - startMins) / 60
  return diff > 0 ? Number(diff.toFixed(2)) : 0
}


export function determineOvertimeOption(startTime: string, endTime: string) {
  const hours = calculateOvertimeHours(startTime, endTime)
  return {
    id: `${startTime ? startTime.split(":")[0] : "8"}-${endTime ? endTime.split(":")[0] : "17"}`,
    label: `${startTime || "08:00"} às ${endTime || "17:00"}`,
    hours,
  }
}

export async function getActiveTimeClockByUserId(userId: string, holidayId?: number): Promise<TimeClockRecord | null> {
  const records = await getTimeClockRecordsByUserId(userId)
  return records.find((r) => r.status === "active" && (!holidayId || Number(r.holidayId) === Number(holidayId))) || null
}


export async function createTimeRequest(data: Omit<TimeRequest, "id" | "createdAt">): Promise<TimeRequest> {
  const nextId = Date.now()
  const newObj: TimeRequest = {
    ...data,
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  return newObj
}

export async function getAllTimeRequests(): Promise<TimeRequest[]> {
  return []
}

export async function updateTimeRequest(id: number, data: Partial<TimeRequest>): Promise<TimeRequest> {
  const req: TimeRequest = {
    id,
    userId: "usr-1",
    holidayId: 1,
    requestType: "missing_entry",
    requestedTime: "08:00",
    reason: "Ajuste",
    status: (data.status as any) || "approved",
    createdAt: new Date().toISOString(),
    ...data,
  }
  return req
}

export async function fixApprovedRequests(): Promise<{ fixed: number; errors: string[] }> {
  return { fixed: 0, errors: [] }
}





