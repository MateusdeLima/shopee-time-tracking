import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📦 [SYNC] Recebido (Google Sheets desativado, operando 100% no Supabase):', JSON.stringify(body, null, 2))
    return NextResponse.json({ success: true, message: 'Operando 100% no Supabase. Sincronização de planilha desativada.' })
  } catch (error: any) {
    console.error('ERRO SYNC ABSENCE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
