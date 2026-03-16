import { NextResponse } from "next/server"
import { getUserById } from "@/lib/db"

// O Token do Bot do Discord fornecido pelo usuário a partir de variáveis de ambiente
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

async function sendDiscordDM(discordId: string, message: string) {
  try {
    // Passo 1: Abrir o canal de DM com o usuário
    const channelResponse = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient_id: discordId,
      }),
    })

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text()
      console.error(`[DISCORD] Erro ao abrir DM para ${discordId}:`, errorText)
      return { success: false, error: "Falha ao abrir canal DM", details: errorText }
    }

    const channelData = await channelResponse.json()
    const dmChannelId = channelData.id

    // Passo 2: Enviar a mensagem para o ID do canal criado
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    })

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error(`[DISCORD] Erro ao enviar mensagem para canal ${dmChannelId}:`, errorText)
      return { success: false, error: "Falha ao enviar mensagem DM", details: errorText }
    }

    console.log(`[DISCORD] Mensagem DM enviada com sucesso para Discord ID: ${discordId}`)
    return { success: true }

  } catch (error) {
    console.error(`[DISCORD] Exceção na função sendDiscordDM:`, error)
    return { success: false, error: "Erro interno no envio DM" }
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('🚀 [NOTIFY] Recebido payload:', JSON.stringify(body, null, 2))
    console.log('🔑 [NOTIFY] Token presente:', !!DISCORD_BOT_TOKEN)
    const { userId, reason, dates, customReason, startTime, endTime, hasProof, isProofUpdate, proofUrl } = body

    if (!userId) {
      return NextResponse.json({ error: "UserId required" }, { status: 400 })
    }

    // Buscar dados completos do usuário (incluindo o novo discord_id)
    const userIdStr = String(userId)
    const user = await getUserById(userIdStr)
    const userName = user ? `${user.firstName} ${user.lastName}` : "Agente"
    
    // Se o usuário não tiver um discord_id cadastrado, aborta o envio silenciosamente
    const discordId = user?.discordId
    console.log('🔍 [NOTIFY] Dados do usuário encontrados:', { id: userIdStr, email: user?.email, discordId })

    if (!user) {
      console.log('❌ [NOTIFY] Usuário não encontrado no DB:', userIdStr)
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!discordId) {
      console.log('⚠️ [NOTIFY] Usuário sem Discord ID:', user.email)
      return NextResponse.json({ success: false, error: 'Usuário sem Discord ID cadastrado' })
    }

    // Dicionário de motivos
    const ABSENCE_REASONS: Record<string, string> = {
      medical: "Consulta Médica",
      personal: "Energia/Internet",
      vacation: "Férias",
      certificate: "Atestado",
      other: "Outro"
    }

    const formatDate = (d: any) => {
      if (!d) return ""
      
      // Se for string no formato YYYY-MM-DD, tratar manualmente para evitar fuso horário
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        const [year, month, day] = d.split('T')[0].split('-')
        return `${day}/${month}/${year}`
      }

      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) return d
      
      // Se caiu aqui, usar UTC para garantir consistência
      const day = String(dateObj.getUTCDate()).padStart(2, '0')
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const year = dateObj.getUTCFullYear()
      return `${day}/${month}/${year}`
    }

    let startDateStr = ""
    let endDateStr = ""

    if (Array.isArray(dates) && dates.length > 0) {
      const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      startDateStr = formatDate(sortedDates[0])
      endDateStr = formatDate(sortedDates[sortedDates.length - 1])
    } else {
      startDateStr = formatDate(dates)
      endDateStr = startDateStr
    }

    const baseReason = ABSENCE_REASONS[reason] || reason
    const reasonText = customReason ? `${baseReason} - ${customReason}` : baseReason

    // ------------------------------------------------------------------
    // CASO 1: Atualização de Comprovante POSTERIOR (anexou depois)
    // ------------------------------------------------------------------
    if (isProofUpdate) {
      const message = `🔔 **Comprovante Anexado com Sucesso**\n\nOlá **${userName}**,\nSeu comprovante referente à ausência por **${reasonText}** (${startDateStr}) foi recebido pelo sistema. ✅`
      const result = await sendDiscordDM(discordId, message)
      return NextResponse.json({ success: result.success, type: "proof_update" })
    }

    // ------------------------------------------------------------------
    // CASO 2: Nova Ausência Registrada (Requisitos do Usuário)
    // ------------------------------------------------------------------
    const startTimeStr = startTime ? ` às ${startTime}` : ""
    const endTimeStr = endTime ? ` às ${endTime}` : ""
    let timeInfo = `**Início:** ${startDateStr}${startTimeStr}`
    
    if (startDateStr !== endDateStr || endTime) {
       timeInfo += `\n**Fim:** ${endDateStr}${endTimeStr}`
    }

    let message = ""
    
    if (hasProof) {
      // Regra 4: ausência + comprovante anexado na hora
      message = `✅ **Ausência Registrada com Sucesso**\n\nOlá **${userName}**,\nSua ausência por **${reasonText}** foi registrada e seu comprovante já foi processado pelo sistema. Não há pendências.\n\n${timeInfo}`
    } else {
      // Regra 5: ausência registrada, mas sem comprovante
      message = `⚠️ **Ausência Registrada (Aguardando Comprovante)**\n\nOlá **${userName}**,\nSua ausência por **${reasonText}** foi registrada no sistema.\n\n${timeInfo}\n\n🚨 **ATENÇÃO:** O comprovante não foi anexado. Você tem até **2 dias úteis** para anexar este documento no portal correspondente. O não cumprimento do prazo resultará na REJEIÇÃO do registro, sendo considerado falta injustificada.`
    }

    const dmResult = await sendDiscordDM(discordId, message)

    return NextResponse.json({ success: dmResult.success, result: dmResult })

  } catch (error) {
    console.error("Erro interno na rota /api/notify-absence:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
