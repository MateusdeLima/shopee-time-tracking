import { ensureTabExists, appendSheetRowsBatch, getSheetRows, SHEETS_TABS } from "../lib/google-sheets"

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0]?.replace("https://", "") || "qhszrmzajdocwihuhtcm"
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ""
const QUERY_ENDPOINT = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`


async function runSupabaseQuery(sql: string): Promise<any[]> {
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

async function migrateData() {
  console.log("🚀 Starting BATCH data migration from Supabase to Google Sheets...\n")

  // 1. Users
  console.log("👤 Migrating USERS...")
  await ensureTabExists(SHEETS_TABS.USERS, [
    "id",
    "firstName",
    "lastName",
    "email",
    "username",
    "cpf",
    "role",
    "profilePictureUrl",
    "createdAt",
    "shift",
    "birthDate",
    "isFirstAccess",
    "projectId",
    "discordId",
    "team",
  ])
  const dbUsers = await runSupabaseQuery("SELECT * FROM users ORDER BY created_at ASC;")
  console.log(`   Found ${dbUsers.length} users in Supabase.`)

  const existingUsers = await getSheetRows(SHEETS_TABS.USERS)
  const existingUserIds = new Set(existingUsers.map((u) => u.id))

  const newUsersBatch = []
  for (const u of dbUsers) {
    const userId = u.id || u.username
    if (!existingUserIds.has(userId)) {
      newUsersBatch.push({
        id: userId,
        firstName: u.first_name || u.firstName || "",
        lastName: u.last_name || u.lastName || "",
        email: u.email || "",
        username: u.username || u.email?.split("@")[0] || "",
        cpf: u.cpf || "",
        role: u.role || "employee",
        profilePictureUrl: u.profile_picture_url || u.profilePictureUrl || "",
        createdAt: u.created_at || new Date().toISOString(),
        shift: u.shift || "8-17",
        birthDate: u.birth_date || u.birthDate || "",
        isFirstAccess: u.is_first_access ?? false,
        projectId: u.project_id || u.projectId || "",
        discordId: u.discord_id || u.discordId || "",
        team: u.team || "",
      })
    }
  }
  if (newUsersBatch.length > 0) {
    console.log(`   Inserting ${newUsersBatch.length} new users in 1 batch...`)
    await appendSheetRowsBatch(SHEETS_TABS.USERS, newUsersBatch)
  }
  console.log("   ✅ Users migration complete.\n")

  // 2. Projects
  console.log("📁 Migrating PROJECTS...")
  await ensureTabExists(SHEETS_TABS.PROJECTS, ["id", "name", "createdAt"])
  const dbProjects = await runSupabaseQuery("SELECT * FROM projects;")
  console.log(`   Found ${dbProjects.length} projects in Supabase.`)

  const existingProjects = await getSheetRows(SHEETS_TABS.PROJECTS)
  const existingProjIds = new Set(existingProjects.map((p) => p.id))

  const newProjBatch = []
  for (const p of dbProjects) {
    if (!existingProjIds.has(p.id)) {
      newProjBatch.push({
        id: p.id,
        name: p.name || "",
        createdAt: p.created_at || new Date().toISOString(),
      })
    }
  }
  if (newProjBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.PROJECTS, newProjBatch)
  }
  console.log("   ✅ Projects migration complete.\n")

  // 3. Holidays
  console.log("🎉 Migrating HOLIDAYS...")
  await ensureTabExists(SHEETS_TABS.HOLIDAYS, [
    "id",
    "name",
    "type",
    "active",
    "deadline",
    "maxHours",
    "createdAt",
    "updatedAt",
  ])
  const dbHolidays = await runSupabaseQuery("SELECT * FROM holidays ORDER BY id ASC;")
  console.log(`   Found ${dbHolidays.length} holidays in Supabase.`)

  const existingHolidays = await getSheetRows(SHEETS_TABS.HOLIDAYS)
  const existingHolidayIds = new Set(existingHolidays.map((h) => Number(h.id)))

  const newHolidayBatch = []
  for (const h of dbHolidays) {
    if (!existingHolidayIds.has(Number(h.id))) {
      newHolidayBatch.push({
        id: h.id,
        name: h.name || "",
        type: h.type || "holiday",
        active: h.active ?? true,
        deadline: h.deadline || "",
        maxHours: h.max_hours || h.maxHours || 8,
        createdAt: h.created_at || new Date().toISOString(),
        updatedAt: h.updated_at || "",
      })
    }
  }
  if (newHolidayBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.HOLIDAYS, newHolidayBatch)
  }
  console.log("   ✅ Holidays migration complete.\n")

  // 4. Hour Bank Compensations
  console.log("💰 Migrating COMPENSATIONS...")
  await ensureTabExists(SHEETS_TABS.COMPENSATIONS, [
    "id",
    "userId",
    "holidayId",
    "declaredHours",
    "detectedHours",
    "confidence",
    "proofImage",
    "status",
    "reason",
    "analyzedAt",
    "createdAt",
    "updatedAt",
  ])
  const dbCompensations = await runSupabaseQuery("SELECT * FROM hour_bank_compensations ORDER BY id ASC;")
  console.log(`   Found ${dbCompensations.length} compensations in Supabase.`)

  const existingCompensations = await getSheetRows(SHEETS_TABS.COMPENSATIONS)
  const existingCompIds = new Set(existingCompensations.map((c) => Number(c.id)))

  const newCompBatch = []
  for (const c of dbCompensations) {
    if (!existingCompIds.has(Number(c.id))) {
      newCompBatch.push({
        id: c.id,
        userId: c.user_id || c.userId,
        holidayId: c.holiday_id || c.holidayId,
        declaredHours: c.declared_hours || c.declaredHours || 0,
        detectedHours: c.detected_hours || c.detectedHours || 0,
        confidence: c.confidence || 0,
        proofImage: c.proof_image || c.hour_bank_proof || c.proofImage || "",
        status: c.status || "approved",
        reason: c.reason || "",
        analyzedAt: c.analyzed_at || c.analyzedAt || "",
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.updated_at || "",
      })
    }
  }
  if (newCompBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.COMPENSATIONS, newCompBatch)
  }
  console.log("   ✅ Compensations migration complete.\n")

  // 5. Overtime Records
  console.log("⏰ Migrating OVERTIME RECORDS...")
  await ensureTabExists(SHEETS_TABS.OVERTIME_RECORDS, [
    "id",
    "userId",
    "holidayId",
    "holidayName",
    "date",
    "optionId",
    "optionLabel",
    "hours",
    "startTime",
    "endTime",
    "status",
    "proofImage",
    "createdAt",
    "updatedAt",
  ])
  const dbOvertime = await runSupabaseQuery("SELECT * FROM overtime_records ORDER BY id ASC;")
  console.log(`   Found ${dbOvertime.length} overtime records in Supabase.`)

  const existingOvertime = await getSheetRows(SHEETS_TABS.OVERTIME_RECORDS)
  const existingOvertimeIds = new Set(existingOvertime.map((o) => Number(o.id)))

  const newOvertimeBatch = []
  for (const o of dbOvertime) {
    if (!existingOvertimeIds.has(Number(o.id))) {
      newOvertimeBatch.push({
        id: o.id,
        userId: o.user_id || o.userId,
        holidayId: o.holiday_id || o.holidayId,
        holidayName: o.holiday_name || o.holidayName || "",
        date: o.date || "",
        optionId: o.option_id || o.optionId || "",
        optionLabel: o.option_label || o.optionLabel || "",
        hours: o.hours || 0,
        startTime: o.start_time || o.startTime || "",
        endTime: o.end_time || o.endTime || "",
        status: o.status || "approved",
        proofImage: o.proof_image || o.proofImage || "",
        createdAt: o.created_at || new Date().toISOString(),
        updatedAt: o.updated_at || "",
      })
    }
  }
  if (newOvertimeBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.OVERTIME_RECORDS, newOvertimeBatch)
  }
  console.log("   ✅ Overtime records migration complete.\n")

  // 6. Time Clock Records
  console.log("⏱️ Migrating TIME CLOCK RECORDS...")
  await ensureTabExists(SHEETS_TABS.TIME_CLOCK_RECORDS, [
    "id",
    "userId",
    "holidayId",
    "date",
    "startTime",
    "endTime",
    "status",
    "overtimeHours",
    "createdAt",
    "updatedAt",
  ])
  const dbClock = await runSupabaseQuery("SELECT * FROM time_clock_records ORDER BY id ASC;")
  console.log(`   Found ${dbClock.length} time clock records in Supabase.`)

  const existingClock = await getSheetRows(SHEETS_TABS.TIME_CLOCK_RECORDS)
  const existingClockIds = new Set(existingClock.map((tc) => Number(tc.id)))

  const newClockBatch = []
  for (const tc of dbClock) {
    if (!existingClockIds.has(Number(tc.id))) {
      newClockBatch.push({
        id: tc.id,
        userId: tc.user_id || tc.userId,
        holidayId: tc.holiday_id || tc.holidayId,
        date: tc.date || "",
        startTime: tc.start_time || tc.startTime || "",
        endTime: tc.end_time || tc.endTime || "",
        status: tc.status || "completed",
        overtimeHours: tc.overtime_hours || tc.overtimeHours || 0,
        createdAt: tc.created_at || new Date().toISOString(),
        updatedAt: tc.updated_at || "",
      })
    }
  }
  if (newClockBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.TIME_CLOCK_RECORDS, newClockBatch)
  }
  console.log("   ✅ Time clock records migration complete.\n")

  // 7. Absence Records
  console.log("📋 Migrating ABSENCE RECORDS...")
  await ensureTabExists(SHEETS_TABS.ABSENCE_RECORDS, [
    "id",
    "userId",
    "reason",
    "customReason",
    "dates",
    "status",
    "proofDocument",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "dateRange",
    "departureTime",
    "returnTime",
  ])
  const dbAbsences = await runSupabaseQuery("SELECT * FROM absence_records ORDER BY id ASC;")
  console.log(`   Found ${dbAbsences.length} absence records in Supabase.`)

  const existingAbsences = await getSheetRows(SHEETS_TABS.ABSENCE_RECORDS)
  const existingAbsenceIds = new Set(existingAbsences.map((a) => Number(a.id)))

  const newAbsenceBatch = []
  for (const a of dbAbsences) {
    if (!existingAbsenceIds.has(Number(a.id))) {
      newAbsenceBatch.push({
        id: a.id,
        userId: a.user_id || a.userId,
        reason: a.reason || "",
        customReason: a.custom_reason || a.customReason || "",
        dates: a.dates || [],
        status: a.status || "approved",
        proofDocument: a.proof_document || a.proofDocument || "",
        createdAt: a.created_at || new Date().toISOString(),
        updatedAt: a.updated_at || "",
        expiresAt: a.expires_at || a.expiresAt || "",
        dateRange: a.date_range || a.dateRange || {},
        departureTime: a.departure_time || a.departureTime || "",
        returnTime: a.return_time || a.returnTime || "",
      })
    }
  }
  if (newAbsenceBatch.length > 0) {
    await appendSheetRowsBatch(SHEETS_TABS.ABSENCE_RECORDS, newAbsenceBatch)
  }
  console.log("   ✅ Absence records migration complete.\n")

  console.log("🎉 ALL DATA MIGRATION FROM SUPABASE TO GOOGLE SHEETS IS FULLY COMPLETED!")
}

migrateData().catch((err) => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})
