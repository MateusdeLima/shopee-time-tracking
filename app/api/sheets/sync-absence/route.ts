import { NextResponse } from 'next/server'

const MOTIVOS_MAP: { [key: string]: string } = {
  medical: "Consulta Médica",
  personal: "Energia/Internet",
  vacation: "Férias",
  certificate: "Atestado",
  other: "Outro",
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJX9EkF6tMePFkfSNSjvBiD4dtdAUw2jroJMrX5Ikjp4heFsNpbzSeXDhtmVexicl3HA/exec'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📦 [SYNC] Payload recebido:', JSON.stringify(body, null, 2))
    const { action, absence, user } = body

    if (!absence || !user) {
      return NextResponse.json({ error: 'Dados ausentes' }, { status: 400 })
    }

    // Função interna para formatar YYYY-MM-DD para DD/MM/YYYY
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return ''
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }

    // Formatar datas e horários para as colunas D e E da planilha
    const startTimeFormatted = absence.dateRange?.start
      ? `${formatDate(absence.dateRange.start)}${absence.departureTime ? ' ' + absence.departureTime : ''}`
      : (absence.departureTime || '')

    const endTimeFormatted = absence.dateRange?.end
      ? `${formatDate(absence.dateRange.end)}${absence.returnTime ? ' ' + absence.returnTime : ''}`
      : (absence.returnTime || (absence.reason === 'personal' && !absence.returnTime ? 'Aguardando Protocolo' : ''))

    // Mapear o motivo para um rótulo amigável e injetar as datas formatadas
    const absenceWithFormattedData = {
      ...absence,
      reason: MOTIVOS_MAP[absence.reason] || absence.customReason || absence.reason,
      departureTime: startTimeFormatted, // Substitui pelo formato amigável para a coluna D
      returnTime: endTimeFormatted      // Substitui pelo formato amigável para a coluna E
    }
    
    // Anexar o discord_id ao objeto de usuário
    const userWithDiscordId = {
      ...user,
      discord_id: user.discordId || null
    }

    // Enviar para o Apps Script do Google
    console.log('🚀 [SYNC] Enviando para Google Apps Script com Discord ID:', userWithDiscordId.discord_id)
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, absence: absenceWithFormattedData, user: userWithDiscordId }),
    })

    const responseText = await response.text()
    console.log('✅ [SYNC] Resposta Google Apps Script status:', response.status)
    console.log('📄 [SYNC] Resposta Google Apps Script corpo:', responseText)

    if (!response.ok) {
      throw new Error(`Apps Script retornou erro HTTP ${response.status}: ${responseText}`)
    }

    try {
      const result = JSON.parse(responseText)
      if (result.result === 'error') {
        throw new Error(`Erro no Apps Script: ${result.message}`)
      }
    } catch (parseError) {
      console.warn('⚠️ [SYNC] Não foi possível parsear a resposta como JSON, mas o status foi OK')
    }

    return NextResponse.json({ success: true, message: 'Dados sincronizados via Apps Script' })
  } catch (error: any) {
    console.error('ERRO SYNC APPS SCRIPT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
