import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, tab, id, idFieldName, data, ...restPayload } = body

    const targetId = id !== undefined ? id : data?.id !== undefined ? data.id : restPayload?.id
    const targetIdFieldName = idFieldName || data?.idFieldName || restPayload?.idFieldName || "id"
    const fieldName = targetIdFieldName.replace(/([A-Z])/g, "_$1").toLowerCase()

    switch (action) {
      case "getRows": {
        const { data: rows, error } = await (supabaseAdmin as any).from(tab).select("*").order("id", { ascending: true })
        if (error) {
          console.error(`[API /api/db] Error fetching ${tab}:`, error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        const mappedRows = (rows || []).map(toCamelCaseObj)
        return NextResponse.json({ success: true, data: mappedRows })
      }
      case "appendRow": {
        const rawData = data !== undefined ? data : restPayload
        const rowData = toSnakeCaseObj(rawData)
        const { data: inserted, error } = await (supabaseAdmin as any).from(tab).insert([rowData]).select()
        if (error) {
          console.error(`[API /api/db] Error inserting to ${tab}:`, error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        const resultObj = inserted?.[0] ? toCamelCaseObj(inserted[0]) : rawData
        return NextResponse.json({ success: true, data: resultObj })
      }
      case "updateRow": {
        const rawData = data !== undefined ? data : restPayload
        const updateData = toSnakeCaseObj(rawData)
        if (targetId === undefined) {
          return NextResponse.json({ error: "ID ausente para atualização" }, { status: 400 })
        }
        const { error } = await (supabaseAdmin as any).from(tab).update(updateData).eq(fieldName, targetId)
        if (error) {
          console.error(`[API /api/db] Error updating ${tab}:`, error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }
      case "deleteRow": {
        if (targetId === undefined) {
          return NextResponse.json({ error: "ID ausente para exclusão" }, { status: 400 })
        }
        const { error } = await (supabaseAdmin as any).from(tab).delete().eq(fieldName, targetId)
        if (error) {
          console.error(`[API /api/db] Error deleting from ${tab}:`, error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[API /api/db] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
