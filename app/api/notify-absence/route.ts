
import { NextResponse } from "next/server"
import { getUserById } from "@/lib/db"

const SOPBOT_API_KEY = "h4ZSnkG287GzFmwQLXjer7X1eCJ10gIq"
const SOPBOT_CALLBACK_URL = "https://knowledge.alpha.insea.io/s2sapi/sopbot/callback/6597"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, reason, dates, customReason, startTime, endTime, hasProof, isProofUpdate, proofUrl } = body

        if (!userId) {
            return NextResponse.json({ error: "UserId required" }, { status: 400 })
        }

        // Buscar nome do usuário
        const user = await getUserById(userId)
        const userName = user ? `${user.firstName} ${user.lastName}` : "Usuário Desconhecido"

        // Dicionário de motivos
        const ABSENCE_REASONS: Record<string, string> = {
            medical: "Consulta Médica",
            personal: "Energia/Internet",
            vacation: "Férias",
            certificate: "Atestado",
            other: "Outro"
        }

        // Função auxiliar de formatação de data
        const formatDate = (d: any) => {
            if (!d) return ""
            const dateObj = new Date(d)
            if (isNaN(dateObj.getTime())) return d

            // Garantir formato DD/MM/YYYY
            const day = String(dateObj.getUTCDate()).padStart(2, '0')
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
            const year = dateObj.getUTCFullYear()
            return `${day}/${month}/${year}`
        }

        // Determinar Início e Fim
        let startDateStr = ""
        let endDateStr = ""

        if (Array.isArray(dates) && dates.length > 0) {
            // Ordenar datas para garantir pegar a primeira e a última corretamente
            const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            startDateStr = formatDate(sortedDates[0])
            endDateStr = formatDate(sortedDates[sortedDates.length - 1])
        } else {
            startDateStr = formatDate(dates)
            endDateStr = startDateStr
        }

        // ------------------------------------------------------------------
        // CENÁRIO 1: Notificação de Comprovante (Atualização)
        // ------------------------------------------------------------------

        // Traduzir motivo base
        const baseReason = ABSENCE_REASONS[reason] || reason
        const reasonText = customReason ? `${baseReason} - ${customReason}` : baseReason

        if (isProofUpdate) {
            const message = `🔔 *Comprovante Anexado*\n\n👤 *Agente:* ${userName}\n📝 *Referente à Ausência:* ${reasonText} em ${startDateStr}\n✅ *Status:* Comprovante recebido.`

            // Envio via Webhook
            const WEBHOOK_URL = "https://openapi.seatalk.io/webhook/group/thftc2yBTWqT1LKDa858lw"
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag: "text", text: { content: message } })
            })

            return NextResponse.json({ success: true, type: "proof_update" })
        }

        // ------------------------------------------------------------------
        // CENÁRIO 2: Nova Ausência
        // ------------------------------------------------------------------

        // Formatar Horários
        const startTimeStr = startTime ? ` às ${startTime}` : ""
        const endTimeStr = endTime ? ` às ${endTime}` : ""

        // Status do Comprovante
        const proofStatus = hasProof ? "✅ Anexado" : "⚠️ Pendente (Aguardando envio)"

        // Montar Mensagem Detalhada
        let message = `🔔 *Nova Ausência Registrada*\n\n`
        message += `👤 *Agente:* ${userName}\n`
        message += `📝 *Motivo:* ${reasonText}\n`
        message += `🚀 *Início:* ${startDateStr}${startTimeStr}\n`

        // Só mostrar fim se for diferente do início ou se tiver horário de fim
        if (startDateStr !== endDateStr || endTime) {
            message += `🏁 *Fim:* ${endDateStr}${endTimeStr}\n`
        }

        message += `📄 *Comprovante:* ${proofStatus}`


        // ---------------------------------------------------------
        // ESTRATÉGIA FINAL: Webhook SeaTalk (Simples e Direto)
        // ---------------------------------------------------------

        const WEBHOOK_URL = "https://openapi.seatalk.io/webhook/group/thftc2yBTWqT1LKDa858lw"

        console.log("🤖 [BOT] Enviando notificação via Webhook...")

        // 1. Enviar TEXTO
        const textResponse = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tag: "text",
                text: {
                    content: message
                }
            })
        })

        if (!textResponse.ok) {
            const errorText = await textResponse.text()
            console.error("🤖 [BOT] Falha no Webhook (Texto):", textResponse.status, errorText)
            return NextResponse.json({ success: false, error: "Falha no Webhook", details: errorText }, { status: 200 })
        }

        const textData = await textResponse.json()
        console.log("🤖 [BOT] Sucesso! Webhook respondeu ao texto:", textData)

        // Tentar capturar o message_id para responder em thread (se disponível)
        // A estrutura de resposta geralmente é { code: 0, message: "success", message_id: "..." }
        const parentMessageId = textData.message_id || null

        // 2. Enviar IMAGEM (se houver)
        let imageResult = null
        // Assegurar que proofUrl é válido e não vazio
        if (proofUrl && typeof proofUrl === "string") {
            let base64Image = ""

            if (proofUrl.startsWith("data:")) {
                // Caso 1: Já é Base64 (Data ID)
                console.log("🤖 [BOT] Identificado Data URL (Base64). Processando...")
                // Remover o prefixo "data:image/xxx;base64,"
                const matches = proofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
                if (matches && matches.length === 3) {
                    base64Image = matches[2]
                } else {
                    console.error("🤖 [BOT] Formato Data URL inválido")
                }
            } else if (proofUrl.startsWith("http")) {
                // Caso 2: É uma URL HTTP
                console.log("🤖 [BOT] Identificada URL HTTP. Baixando imagem...")
                try {
                    const imageFetch = await fetch(proofUrl)
                    if (imageFetch.ok) {
                        const imageBuffer = await imageFetch.arrayBuffer()
                        base64Image = Buffer.from(imageBuffer).toString('base64')
                    } else {
                        console.error("🤖 [BOT] Falha ao baixar imagem:", imageFetch.status)
                    }
                } catch (err) {
                    console.error("🤖 [BOT] Erro ao buscar imagem:", err)
                }
            }

            if (base64Image) {
                try {
                    // Enviar payload de Imagem para o Webhook
                    const imagePayload = {
                        tag: "image",
                        image: {
                            base64: base64Image
                        }
                    }

                    const imageResponse = await fetch(WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(imagePayload)
                    })

                    if (imageResponse.ok) {
                        imageResult = await imageResponse.json()
                        console.log("🤖 [BOT] Imagem enviada com sucesso!")
                    } else {
                        const imgErr = await imageResponse.text()
                        console.error("🤖 [BOT] Falha ao enviar imagem:", imageResponse.status, imgErr)
                        imageResult = { error: imgErr }
                    }
                } catch (sendErr) {
                    console.error("🤖 [BOT] Erro ao enviar payload de imagem:", sendErr)
                }
            }
        }

        return NextResponse.json({ success: true, webhookResult: textData, imageResult })

    } catch (error) {
        console.error("Erro interno ao notificar ausência:", error)
        return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
    }
}
