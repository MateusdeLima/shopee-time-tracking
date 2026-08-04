import { ensureTabExists, getSheetRows, appendSheetRow, SHEETS_TABS } from "../lib/google-sheets"

async function initSheetsDatabase() {
  console.log("🚀 Initializing Google Sheets database schema...")

  // 1. Users
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

  // Populate admin default user if empty
  const users = await getSheetRows(SHEETS_TABS.USERS)
  if (users.length === 0) {
    console.log("👤 Creating default admin user in Google Sheets...")
    await appendSheetRow(SHEETS_TABS.USERS, {
      id: "admin-1",
      firstName: "Admin",
      lastName: "Shopee",
      email: "admin@shopee.com",
      username: "admin",
      cpf: "000.000.000-00",
      role: "admin",
      profilePictureUrl: "",
      createdAt: new Date().toISOString(),
      shift: "8-17",
      birthDate: "1990-01-01",
      isFirstAccess: false,
      projectId: "proj-1",
      discordId: "",
      team: "Geral",
    })
  }

  // 2. Projects
  await ensureTabExists(SHEETS_TABS.PROJECTS, ["id", "name", "createdAt"])
  const projects = await getSheetRows(SHEETS_TABS.PROJECTS)
  if (projects.length === 0) {
    console.log("📁 Creating default project in Google Sheets...")
    await appendSheetRow(SHEETS_TABS.PROJECTS, {
      id: "proj-1",
      name: "Shopee Page Control",
      createdAt: new Date().toISOString(),
    })
  }

  // 3. Holidays
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

  // 4. Compensations
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

  // 5. Overtime Records
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

  // 6. Time Clock Records
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

  // 7. Absence Records
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

  // 8. Vacation Records
  await ensureTabExists(SHEETS_TABS.VACATION_RECORDS, [
    "id",
    "userId",
    "startDate",
    "endDate",
    "status",
    "notes",
    "createdAt",
    "updatedAt",
  ])

  // 9. Portal Settings
  await ensureTabExists(SHEETS_TABS.PORTAL_SETTINGS, ["key", "value", "updatedAt"])

  // 10. Image Uploads
  await ensureTabExists(SHEETS_TABS.IMAGE_UPLOADS, ["id", "data", "contentType", "createdAt"])

  console.log("✅ Google Sheets database setup complete!")


}

initSheetsDatabase().catch((err) => {
  console.error("❌ Setup failed:", err)
  process.exit(1)
})
