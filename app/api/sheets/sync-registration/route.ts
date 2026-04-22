import { NextResponse } from 'next/server'

const MOTIVOS_MAP: { [key: string]: string } = {
  medical: "Consulta médica // Exame médico (marcado antecipadamente)",
  personal: "Energia/Internet",
  certificate: "Atestado // Emergencial",
  other: "Outro",
  vacation: "Férias",
  holiday: "Feriado"
}

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwJqVpR9sMQOstDkOanbKat-qtlsfKu0dvDCFST03CugDr3reXeZbtHuWjbQknSBPxQ1w/exec'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📦 [SYNC] Payload recebido:', JSON.stringify(body, null, 2))
    
    // Suporte para payload antigo (absence) ou novo (data)
    const { action, type = 'absence', data, absence, user } = body
    const payload = data || absence

    if (!payload || !user) {
      return NextResponse.json({ error: 'Dados ausentes' }, { status: 400 })
    }

    // Função interna para formatar YYYY-MM-DD para DD/MM/YYYY
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return ''
      // Se já estiver formatada (ex: vindo de um range formatado), retorna como está
      if (dateStr.includes('/')) return dateStr
      
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length < 3) return dateStr
      const [y, m, d] = parts
      return `${d}/${m}/${y}`
    }

    // Formatar datas e horários conforme o tipo
    let formattedPayload = { ...payload }

    if (type === 'absence') {
      const startTimeFormatted = payload.dateRange?.start
        ? `${formatDate(payload.dateRange.start)}${payload.departureTime ? ' ' + payload.departureTime : ''}`
        : (payload.departureTime || '')

      const endTimeFormatted = payload.dateRange?.end
        ? `${formatDate(payload.dateRange.end)}${payload.returnTime ? ' ' + payload.returnTime : ''}`
        : (payload.returnTime || (payload.reason === 'personal' && !payload.returnTime ? 'Aguardando Protocolo' : ''))

      formattedPayload = {
        ...payload,
        reason: MOTIVOS_MAP[payload.reason] || payload.customReason || payload.reason,
        departureTime: startTimeFormatted,
        returnTime: endTimeFormatted
      }
    } 
    else if (type === 'vacation') {
      formattedPayload = {
        ...payload,
        departureTime: payload.departureTime || (payload.dateRange?.start ? formatDate(payload.dateRange.start) : (Array.isArray(payload.dates) ? formatDate(payload.dates[0]) : '')),
        returnTime: payload.returnTime || (payload.dateRange?.end ? formatDate(payload.dateRange.end) : (Array.isArray(payload.dates) ? formatDate(payload.dates[payload.dates.length - 1]) : ''))
      }
    }
    else if (type === 'holiday') {
      // Já deve vir com startTime e endTime ok
    }
    
    // TRATAMENTO PARA UPDATE_PROOF (Especialmente medical return time)
    if (action === 'update_proof' && payload.returnTime) {
      // Aqui só formatamos o returnTime se ele existir, pois o dateRange pode não estar vindo
      // Se tivermos a ausência original no payload, usamos a data de retorno dela
      const returnDate = payload.dateRange?.end || (Array.isArray(payload.dates) ? payload.dates[payload.dates.length - 1] : '');
      if (returnDate) {
        formattedPayload.returnTime = `${formatDate(returnDate)} ${payload.returnTime}`;
      } else {
        formattedPayload.returnTime = payload.returnTime;
      }
    }
    
    // Anexar o discord_id e team ao objeto de usuário
    const userWithExtras = {
      ...user,
      discord_id: user.discordId || null,
      team: user.team || "N/A"
    }

    // Enviar para o Apps Script do Google
    console.log(`🚀 [SYNC] Enviando ${type} (${action}) para Google Apps Script`)
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action, 
        type, 
        data: formattedPayload, 
        user: userWithExtras 
      }),
    })

    const responseText = await response.text()
    console.log('✅ [SYNC] Resposta Google Apps Script status:', response.status)
    console.log('📄 [SYNC] Resposta corpo:', responseText)

    if (!response.ok) {
      console.error('❌ [SYNC] Erro retornado pelo Google Apps Script:', responseText)
      throw new Error(`Apps Script retornou erro HTTP ${response.status}: ${responseText}`)
    }

    return NextResponse.json({ success: true, message: 'Dados sincronizados via Apps Script' })
  } catch (error: any) {
    console.error('ERRO SYNC APPS SCRIPT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
