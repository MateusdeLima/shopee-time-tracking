import { NextResponse } from "next/server"
import { getUserById } from "@/lib/db"

// O Token do Bot do Discord e Webhook do SeaTalk agora são acessados dentro do handler para evitar cache

async function sendSeaTalkMessage(message: string, isVacation: boolean = false) {
  const seatalkUrl = process.env.SEATALK_WEBHOOK_URL
  if (!seatalkUrl) {
    console.warn('[SEATALK] Webhook URL não configurada (.env.local missing SEATALK_WEBHOOK_URL)')
    return { success: false, error: "URL não configurada" }
  }

  try {
    const finalMessage = message

    const response = await fetch(seatalkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: "text",
        text: {
          content: finalMessage,
          at_all: isVacation // SeaTalk suporte para menção geral
        }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[SEATALK] Erro ao enviar webhook:', err)
      return { success: false, error: err }
    }

    console.log('[SEATALK] Mensagem enviada com sucesso')
    return { success: true }
  } catch (error: any) {
    console.error('[SEATALK] Exceção:', error)
    return { success: false, error: error.message }
  }
}

async function sendDiscordDM(discordId: string, message: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return { success: false, error: "Bot Token não configurado" }
  }

  try {
    // Passo 1: Abrir o canal de DM com o usuário
    const channelResponse = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
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
        "Authorization": `Bot ${botToken}`,
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
    console.log('🔑 [NOTIFY] Token presente:', !!process.env.DISCORD_BOT_TOKEN)
    console.log('🔗 [NOTIFY] SeaTalk Webhook presente:', !!process.env.SEATALK_WEBHOOK_URL)

    const {
      userId,
      userName: bodyUserName,
      discordId: bodyDiscordId,
      type,
      reason,
      dates,
      customReason,
      startTime,
      endTime,
      hasProof,
      isProofUpdate,
      proofUrl,
      status,
      timeInfo: bodyTimeInfo,
      reasonText: customReasonText,
      details,
      userEmail,
      stats,
      isFirst,
      isLast,
      isCancellation,
      cancelReason,
      returnTime: bodyReturnTime,
      isCorrection,
      oldProofUrl,
      newProofUrl,
      certificateDays,
      proofUrl: bodyProofUrl
    } = body

    if (!userId) {
      return NextResponse.json({ error: "UserId required" }, { status: 400 })
    }

    // Buscar dados do usuário do DB
    const user = await getUserById(String(userId))
    const userName = bodyUserName || (user ? `${user.firstName} ${user.lastName}` : "Agente")
    const discordId = bodyDiscordId || user?.discordId

    if (!discordId) {
      console.log('⚠️ [NOTIFY] Usuário sem Discord ID:', userEmail || user?.email || 'N/A')
      // Se não tem Discord ID, ainda podemos tentar enviar SeaTalk se a URL estiver configurada
    }

    // 1. Lidar com atualizações de status (Aprovação/Rejeição)
    if (status) {
      const statusIcon = status === 'approved' ? '✅' : '❌'
      const statusText = status === 'approved' ? 'APROVADA' : 'REJEITADA'

      const discordMsg = reason === 'vacation' && status === 'approved'
        ? "férias aprovadas!!! 🥳🥳🏖️☀️"
        : `${statusIcon} **Atualização de Solicitação**\n\nOlá **${userName}**,\nSua solicitação de **${reason === 'vacation' ? 'Férias' : 'Ausência'}** foi **${statusText}** pela administração.`

      const seaTalkMsg = `${statusIcon} Status de Solicitação Atualizado\n\nAgente: ${userName}\nTipo: ${reason === 'vacation' ? 'Férias' : 'Ausência'}\nNovo Status: ${statusText}`

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false, error: 'Sem Discord ID' }

      // Não enviar para SeaTalk se for aprovação de férias
      if (!(reason === 'vacation' && status === 'approved')) {
        await sendSeaTalkMessage(seaTalkMsg, reason === 'vacation')
      }
      return NextResponse.json({ success: discordResult.success, type: "status_update" })
    }

    // 2. Novos tipos de eventos (Ponto, Banco de Horas, etc)
    if (type === 'clock_in' || type === 'clock_out' || type === 'time_request' || type === 'hour_bank') {
      let title = ""
      let emoji = ""

      switch (type) {
        case 'clock_in': title = "Ponto de Entrada Registrado"; emoji = "📥"; break;
        case 'clock_out': title = "Ponto de Saída Registrado"; emoji = "📤"; break;
        case 'time_request': title = "Solicitação de Alteração de Ponto"; emoji = "📝"; break;
        case 'hour_bank': title = "Comprovante de Banco de Horas Enviado"; emoji = "📸"; break;
      }

      const discordMsg = `${emoji} **${title}**\n\nOlá **${userName}**,\nSeu registro de **${title}** foi processado com sucesso em ${new Date().toLocaleString('pt-BR')}.`
      const seaTalkMsg = `${emoji} Novo Evento de Agente\n\nAgente: ${userName}\nEvento: ${title}\nDetalhes: ${details || 'N/A'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false, error: 'Sem Discord ID' }
      const seatalkResult = await sendSeaTalkMessage(seaTalkMsg)

      return NextResponse.json({ success: seatalkResult.success, type, discord: discordResult })
    }

    // Dicionário de motivos
    const ABSENCE_REASONS: Record<string, string> = {
      medical: "Consulta médica // Exame médico (marcado antecipadamente)",
      personal: "Energia/Internet",
      vacation: "Férias",
      holiday: "Trabalho em Feriado",
      certificate: "Atestado // Emergencial",
      other: "Outro"
    }

    const formatDate = (d: any) => {
      if (!d) return ""
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        const [year, month, day] = d.split('T')[0].split('-')
        return `${day}/${month}/${year}`
      }
      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) return d
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
    const finalReasonText = customReasonText || (customReason ? `${baseReason} - ${customReason}` : baseReason)

    // ------------------------------------------------------------------
    // NOVO: Cancelamento / Exclusão de Ausência
    // ------------------------------------------------------------------
    if (isCancellation) {
      const discordMsg = `🚨 **Ausência Cancelada**\n\nOlá **${userName}**,\nSeu registro de ausência por **${finalReasonText}** referente à data **${startDateStr}** foi **cancelado/excluído**.\n\n**Motivo do Cancelamento:** ${cancelReason || 'Não informado'}`
      const seaTalkMsg = `🚨 Ausência Cancelada\n\nAgente: ${userName}\nMotivo da Ausência: ${finalReasonText}\nData: ${startDateStr}\n\n**Motivo do Cancelamento:** ${cancelReason || 'Não informado'}`

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false }
      const seatalkResult = await sendSeaTalkMessage(seaTalkMsg)
      return NextResponse.json({ success: (discordId ? discordResult.success : true) && seatalkResult.success, type: "cancellation" })
    }

    // ------------------------------------------------------------------
    // NOVO: Alteração de Data/Horário de Ausência Futura
    // ------------------------------------------------------------------
    const isEdit = body.isEdit
    if (isEdit) {
      const editReason = body.editReason
      const timeInfo = (body.startTime && body.endTime) ? ` das ${body.startTime} às ${body.endTime}` : (body.startTime ? ` a partir das ${body.startTime}` : '')
      const newDateStr = startDateStr === endDateStr ? startDateStr : `de ${startDateStr} até ${endDateStr}`
      
      const discordMsg = `🔄 **Alteração de Horário/Data**\n\nOlá **${userName}**,\nSeu registro de ausência por **${finalReasonText}** foi reagendado para **${newDateStr}${timeInfo}**.\n\n**Motivo da Alteração:** ${editReason || 'Não informado'}`
      const seaTalkMsg = `🔄 Alteração de Horário/Data\n\nAgente: ${userName}\nMotivo: ${finalReasonText}\nNova Data: ${newDateStr}${timeInfo}\n\n**Motivo da Alteração:** ${editReason || 'Não informado'}`

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false }
      const seatalkResult = await sendSeaTalkMessage(seaTalkMsg)
      return NextResponse.json({ success: (discordId ? discordResult.success : true) && seatalkResult.success, type: "edit" })
    }

    // ------------------------------------------------------------------
    // CASO 3: Atualização de Comprovante POSTERIOR / CORREÇÃO
    // ------------------------------------------------------------------
    if (isProofUpdate || isCorrection) {
      const returnTimeInfo = (reason === 'medical' && bodyReturnTime) ? `\nHorário de retorno: ${bodyReturnTime}` : ""
      
      let discordMsg = ""
      let seaTalkMsg = ""

      if (isCorrection) {
        // Correção de comprovante (Apenas SeaTalk conforme pedido)
        seaTalkMsg = `⚠️ Comprovante Alterado/Corrigido\n\nAgente: ${userName}\nMotivo: ${finalReasonText}\nData: ${startDateStr}${returnTimeInfo}\n\n🔗 Link Anterior: ${oldProofUrl || 'N/A'}\n✨ Novo Link: ${newProofUrl || proofUrl || 'Anexo'}`
        // Para o Discord, podemos enviar uma mensagem mais simples ou omitir
        discordMsg = `🔔 **Comprovante Alterado**\n\nOlá **${userName}**,\nSeu comprovante referente à ausência por **${finalReasonText}** foi atualizado. ✅`
      } else {
        // Upload inicial de comprovante posterior
        const certificateInfo = (reason === 'certificate' && certificateDays && certificateDays > 0) ? `\nDuração: ${certificateDays === 1 ? 'Dia de hoje' : `${certificateDays} dias`}` : ""
        
        discordMsg = `🔔 **Comprovante Anexado com Sucesso**\n\nOlá **${userName}**,\nSeu comprovante referente à ausência por **${finalReasonText}** (${startDateStr}) foi recebido pelo sistema. ✅${returnTimeInfo.replace('\n', '\n\n')}`
        seaTalkMsg = `🔔 Novo Comprovante Anexado\n\nAgente: ${userName}\nMotivo: ${finalReasonText}\nData: ${startDateStr}${returnTimeInfo}${certificateInfo}\nLink: ${proofUrl || 'Anexo'}`
      }

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false }
      await sendSeaTalkMessage(seaTalkMsg)
      return NextResponse.json({ success: discordResult.success, type: isCorrection ? "proof_correction" : "proof_update" })
    }

    // ------------------------------------------------------------------
    // CASO 4: Nova Ausência/Férias/Feriado Registrada
    // ------------------------------------------------------------------
    const startTimeStr = startTime ? ` às ${startTime}` : ""
    const endTimeStr = endTime ? ` às ${endTime}` : ""
    let timeInfo = bodyTimeInfo || `**Início:** ${startDateStr}${startTimeStr}`

    // Para consultas médicas, omitimos a informação de "Fim" no registro inicial
    if (!bodyTimeInfo && reason !== 'medical' && (startDateStr !== endDateStr || endTime)) {
      timeInfo += `\n**Fim:** ${endDateStr}${endTimeStr}`
    }

    let discordMsg = ""
    let seaTalkMsg = ""

    if (reason === 'vacation') {
      discordMsg = `📅 **Solicitação de Férias Registrada**\n\nOlá **${userName}**,\nSua solicitação de férias foi registrada e aguarda aprovação da administração.\n\n${timeInfo}\n\n🚨 **ATENÇÃO:** Você tem até **5 dias úteis** para anexar o comprovante (print do portal/e-mail) para que sua solicitação seja processada. O não cumprimento do prazo resultará no cancelamento da solicitação.`
      seaTalkMsg = `📅 Nova Solicitação de Férias\n\nAgente: ${userName}\nPeríodo: ${startDateStr} a ${endDateStr}\nStatus: Aguardando Aprovação`
      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false }
      const seatalkResult = await sendSeaTalkMessage(seaTalkMsg, true) // Always send for vacation
      
      return NextResponse.json({ 
        success: (discordId ? discordResult.success : true) && seatalkResult.success,
        discord: discordResult,
        seatalk: seatalkResult
      })
    } else if (reason === 'holiday') {
      const remaining = stats ? Math.max(0, stats.max - stats.used) : 0
      
      // Discord DM (Sempre enviado)
      let discordMsg = `🚩 **Registro de Feriado Confirmado**\n\nOlá **${userName}**,\nSeu horário para o feriado de **${customReason || 'hoje'}** foi registrado com sucesso.\n\n**Horário Selecionado:** ${startTime} até ${endTime}\n`
      
      if (remaining > 0) {
        discordMsg += `\nFaltam **${remaining}h** para completar sua meta de hoje.`
      } else {
        discordMsg += `\n✅ **Parabéns!** Você concluiu todas as horas do feriado.`
      }
      discordMsg += `\n\nBom trabalho! 🚀`

      // SeaTalk (Apenas no primeiro ou no último registro)
      let seatalkResult = { success: true }
      if (isFirst || isLast) {
        const title = isLast ? "Fim do registro de Feriado" : "Início do registro de Feriado"
        const seaTalkMsg = `🚩 ${title}\nAgente: ${userName}\nFeriado: ${customReason || 'N/A'}\nInicio: ${startTime} - ${endTime}`
        // Para o Fim, podemos opcionalmente mudar o último campo para "Fim" se preferir, 
        // mas o usuário pediu "Inicio: [data/hora]" no exemplo para ambos.
        seatalkResult = await sendSeaTalkMessage(seaTalkMsg)
      }

      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false }
      
      console.log('🚩 [NOTIFY] Resultado Feriado:', { discord: discordResult.success, seatalk: seatalkResult.success })
      return NextResponse.json({ 
        success: (discordId ? discordResult.success : true) && (seatalkResult as any).success,
        discord: discordResult,
        seatalk: seatalkResult
      })
    } else {
      // ------------------------------------------------------------------
      // CASO 5: Ausências Genéricas (Médica, Pessoal, Atestado, Outro)
      // ------------------------------------------------------------------
      const proofInfo = hasProof 
        ? "Seu comprovante foi recebido e anexado ao registro. ✅" 
        : "⚠️ **Lembrete:** Não esqueça de anexar o comprovante no sistema para que sua ausência seja validada pela administração."
      
      discordMsg = `✅ **Registro concluído com sucesso**\n\nOlá **${userName}**,\nSua ausência por **${finalReasonText}** foi registrada com sucesso.\n\n${timeInfo}\n\n${proofInfo}`
      
      const timeInfoClean = timeInfo.replace(/\*\*/g, '')
      const finalProofUrl = bodyProofUrl || proofUrl
      const proofLinkInfo = finalProofUrl ? `\nLink do comprovante: ${finalProofUrl}` : ""
      const durationInfo = (reason === 'certificate' && certificateDays && certificateDays > 1) ? `\nAtestado: ${certificateDays} dias` : ""

      seaTalkMsg = `📢 Nova Ausência Registrada\n\nAgente: ${userName}\nMotivo: ${finalReasonText}\nData: ${startDateStr}${endDateStr !== startDateStr ? ' a ' + endDateStr : ''}${durationInfo}\n${timeInfoClean}${proofLinkInfo}`
    }

    const seaTalkMsgClean = (seaTalkMsg || "").replace(/\*\*/g, '').replace(/__/g, '')
    console.log('📝 [NOTIFY] Conteúdo final:', { discordMsg, seaTalkMsg: seaTalkMsgClean })

    try {
      const discordResult = discordId ? await sendDiscordDM(discordId, discordMsg) : { success: false, error: 'Sem Discord ID' }
      const seatalkResult = await sendSeaTalkMessage(seaTalkMsgClean, reason === 'vacation')

      console.log('🏁 [NOTIFY] Resultados finais:', { discord: discordResult, seatalk: seatalkResult })

      return NextResponse.json({
        success: (discordId ? discordResult.success : true) && seatalkResult.success,
        discord: discordResult,
        seatalk: seatalkResult
      })
    } catch (sendError: any) {
      console.error('💥 [NOTIFY] Erro crítico no envio:', sendError)
      return NextResponse.json({ error: "Erro no envio das notificações", details: sendError.message }, { status: 500 })
    }

  } catch (error) {
    console.error("Erro interno na rota /api/notify-absence:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error instanceof Error ? error.message : "Desconhecido" }, { status: 500 })
  }
}
