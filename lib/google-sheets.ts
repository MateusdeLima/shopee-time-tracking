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
  IMAGE_UPLOADS: "image_uploads",
}

export async function ensureTabExists(tabName: string, headers: string[]) {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (ensureTabExists: ${tabName})`)
}

export function invalidateSheetsCache(tabName?: string) {}

export async function getSheetRows<T = Record<string, any>>(tabName: string, skipCache = false): Promise<T[]> {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (getSheetRows: ${tabName})`)
  return []
}

export async function appendSheetRowsBatch(tabName: string, rowObjs: Record<string, any>[]): Promise<void> {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (appendSheetRowsBatch: ${tabName})`)
}

export async function appendSheetRow(tabName: string, rowObj: Record<string, any>): Promise<void> {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (appendSheetRow: ${tabName})`)
}

export async function updateSheetRow(
  tabName: string,
  idFieldName: string,
  idValue: string | number,
  updatedFields: Record<string, any>
): Promise<void> {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (updateSheetRow: ${tabName})`)
}

export async function deleteSheetRow(
  tabName: string,
  idFieldName: string,
  idValue: string | number
): Promise<void> {
  console.log(`[GoogleSheets] Desativado em favor do Supabase (deleteSheetRow: ${tabName})`)
}
