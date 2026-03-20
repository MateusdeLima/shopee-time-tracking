"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { getProjectVacations, createAbsenceRecord, getAbsenceRecordsByUserId, updateAbsenceRecord, deleteAbsenceRecord } from "@/lib/db"
import { uploadCertificate } from "@/lib/supabase"
import { format, addDays, isWithinInterval, parseISO, eachDayOfInterval, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Loader2, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

interface VacationCalendarProps {
  user: any
}

export function VacationCalendar({ user }: VacationCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [teamVacations, setTeamVacations] = useState<any[]>([])
  const [myVacations, setMyVacations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"solicitar" | "consultar">("solicitar")
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.projectId) {
      loadTeamVacations()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (activeTab === "consultar" && user?.id) {
      loadMyVacations()
    }
  }, [activeTab, user])

  const loadMyVacations = async () => {
    try {
      const records = await getAbsenceRecordsByUserId(user.id)
      if (Array.isArray(records)) {
        // Obter apenas as de vacation
        const vacs = records.filter(r => r.reason === "vacation")
        // Ordenar pela data de início
        vacs.sort((a, b) => {
          if (!a.dateRange?.start || !b.dateRange?.start) return 0
          return new Date(b.dateRange.start).getTime() - new Date(a.dateRange.start).getTime()
        })
        setMyVacations(vacs)
      }
    } catch (error) {
      console.error("Erro ao carregar minhas férias:", error)
    }
  }

  const handleFileUpload = async (vacationId: number, file: File | null | undefined) => {
    if (!file) return

    setUploadingId(vacationId)
    try {
      const publicUrl = await uploadCertificate(user.id, file, `ferias_${vacationId}_${file.name}`)
      if (!publicUrl) throw new Error("Falha ao gerar link público para a imagem")

      // 4. Atualizar registro no banco
      await updateAbsenceRecord(vacationId, {
        proofDocument: publicUrl,
      })

      // Find the vacation record to get its dates for the notification
      const vacation = myVacations.find(v => v.id === vacationId);

      // 5. Notificar via Discord que o comprovante foi recebido
      try {
        await fetch('/api/notify-absence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            isProofUpdate: true,
            reason: 'vacation',
            dates: vacation?.dates, // Usar as datas das férias para a mensagem
            proofUrl: publicUrl
          })
        })
      } catch (notifyErr) {
        console.error('Erro ao enviar notificação de comprovante:', notifyErr)
      }

      setMyVacations(prev => prev.map(v => v.id === vacationId ? { ...v, proofDocument: publicUrl } : v))
      toast({ title: "Comprovante enviado", description: "O print do sistema PAGE foi anexado com sucesso." })

    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao enviar o comprovante", variant: "destructive" })
    } finally {
      setUploadingId(null)
    }
  }

  const loadTeamVacations = async () => {
    try {
      setLoading(true)
      const vacations = await getProjectVacations(user.projectId)
      setTeamVacations(vacations)
    } catch (error) {
      console.error("Erro ao carregar férias do time:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as férias do time.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Obter todas as datas bloqueadas (já ocupadas por outros do time)
  const blockedDates = teamVacations
    .filter(v => v.user_id !== user.id) // Ignorar as próprias férias na listagem de bloqueios do time (o shadcn já bloqueia overlapping nas validações)
    .flatMap(v => {
      if (Array.isArray(v.dates)) {
        return v.dates.map((d: string) => {
          // Parse manual seguro para o fuso local (YYYY-MM-DD)
          const [y, m, day] = d.split('-')
          if (y && m && day) {
            return new Date(Number(y), Number(m) - 1, Number(day), 0, 0, 0)
          }
          return startOfDay(parseISO(d))
        })
      }
      return []
    })

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      setDateRange(undefined)
      return
    }

    // Verificar se no intervalo selecionado existe alguma data bloqueada
    if (range.from && range.to) {
      const interval = eachDayOfInterval({ start: range.from, end: range.to })
      const hasOverlap = interval.some(day => 
        blockedDates.some(blocked => blocked.getTime() === day.getTime())
      )

      if (hasOverlap) {
        toast({
          title: "Data Indisponível",
          description: "O período selecionado contém datas já reservadas por outro colega do seu projeto.",
          variant: "destructive"
        })
        return
      }
    }

    setDateRange(range)
  }

  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione um intervalo de datas para suas férias.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const dates = eachDayOfInterval({ 
        start: dateRange.from as Date, 
        end: dateRange.to as Date 
      }).map((d: Date) => format(d, 'yyyy-MM-dd'))

      const record = await createAbsenceRecord({
        userId: user.id,
        reason: "vacation",
        dates: dates,
        status: "pending",
        dateRange: {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        }
      })

      // Sincronizar com Planilha
      fetch('/api/sheets/sync-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create',
          type: 'vacation',
          data: record,
          user 
        }),
      }).catch(err => console.error('Erro ao sincronizar planilha (vacation):', err))

      // Notificar via Discord
      fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: 'vacation',
          dates: dates,
          hasProof: false
        })
      }).catch(err => console.error('Erro ao enviar notificação Discord (vacation):', err))

      toast({
        title: "Solicitação Enviada",
        description: "Suas férias foram solicitadas com sucesso e estão aguardando aprovação.",
      })
      
      setDateRange(undefined)
      loadTeamVacations() // Recarregar para mostrar as novas datas (pendentes também bloqueiam)
    } catch (error) {
      console.error("Erro ao solicitar férias:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua solicitação de férias.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#EE4D2D]" />
        <span className="ml-3 text-gray-600">Carregando calendário...</span>
      </div>
    )
  }

  if (!user?.projectId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">Você ainda não está vinculado a nenhum projeto. Entre em contato com o administrador.</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Aprovada</Badge>
      case 'rejected': return <Badge variant="destructive">Rejeitada</Badge>
      default: return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Aguardando Aprovação</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-orange-100 shadow-lg">
        <CardHeader className="bg-orange-50/50 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#EE4D2D]" />
            <CardTitle>Gestão de Férias</CardTitle>
          </div>
          <CardDescription>
            {activeTab === "solicitar" 
              ? "Selecione as datas desejadas no calendário. Datas ocupadas por colegas do seu time não podem ser selecionadas."
              : "Consulte o status das suas férias solicitadas e anexe comprovantes do sistema PAGE."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-100 rounded-lg p-1 w-full max-w-[400px]">
              <button
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "solicitar" ? "bg-[#EE4D2D] text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("solicitar")}
              >
                Solicitar Férias
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "consultar" ? "bg-[#EE4D2D] text-white" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("consultar")}
              >
                Consultar Férias
              </button>
            </div>
          </div>

          {activeTab === "solicitar" ? (
            <div className="flex flex-col xl:flex-row gap-8 items-start justify-center">
              <div className="flex-1 w-full p-6 border rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelect}
                disabled={blockedDates}
                locale={ptBR}
                numberOfMonths={1}
                defaultMonth={new Date(2026, new Date().getMonth())}
                className="w-full"
                classNames={{
                  months: "w-full space-y-4",
                  month: "w-full space-y-6",
                  caption: "flex justify-center py-4 relative items-center mb-4",
                  caption_label: "text-2xl font-bold text-gray-800 capitalize",
                  nav: "flex items-center gap-1",
                  nav_button: "h-10 w-10 bg-white border shadow-sm hover:bg-gray-50",
                  table: "w-full border-collapse",
                  head_row: "flex w-full justify-center gap-1 mb-4",
                  head_cell: "text-gray-500 rounded-md w-14 font-bold text-sm uppercase text-center",
                  row: "flex w-full justify-center gap-1 mt-2",
                  cell: "h-14 w-14 text-center text-lg p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-xl [&:has([aria-selected].day-outside)]:bg-transparent [&:has([aria-selected])]:bg-orange-50 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl focus-within:relative focus-within:z-20",
                  day: "h-14 w-14 p-0 font-semibold aria-selected:opacity-100 rounded-xl transition-all hover:scale-105 active:scale-95",
                  day_today: "bg-gray-100 text-[#EE4D2D] ring-2 ring-[#EE4D2D]/20",
                  day_selected: "bg-[#EE4D2D] text-white hover:bg-[#D23F20] focus:bg-[#EE4D2D] shadow-md z-10",
                  day_disabled: "text-red-800 bg-red-100 border border-red-200 cursor-not-allowed disabled:opacity-100 relative after:absolute after:inset-0 after:flex after:items-center after:justify-center after:content-['/'] after:text-red-300 after:text-2xl after:font-light z-10",
                  disabled: "text-red-800 bg-red-100 border border-red-200 cursor-not-allowed disabled:opacity-100 relative after:absolute after:inset-0 after:flex after:items-center after:justify-center after:content-['/'] after:text-red-300 after:text-2xl after:font-light z-10",
                  day_range_middle: "bg-orange-50 text-[#EE4D2D] aria-selected:bg-orange-50 aria-selected:text-[#EE4D2D] rounded-none",
                  day_outside: "day-outside text-gray-200 opacity-20 aria-selected:bg-transparent aria-selected:text-gray-200 pointer-events-none",
                }}
                modifiersClassNames={{
                  disabled: "text-red-800 bg-red-100 border border-red-200 cursor-not-allowed disabled:opacity-100 relative after:absolute after:inset-0 after:flex after:items-center after:justify-center after:content-['/'] after:text-red-300 after:text-2xl after:font-light z-10"
                }}
              />
            </div>

            <div className="flex-1 max-w-sm space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EE4D2D]" />
                  Resumo da Seleção
                </h3>
                
                {dateRange?.from && dateRange?.to ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-200">
                      <span className="text-gray-500">Início:</span>
                      <span className="font-medium">{format(dateRange.from, "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-200">
                      <span className="text-gray-500">Fim:</span>
                      <span className="font-medium">{format(dateRange.to, "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-semibold text-[#EE4D2D]">
                        {eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).length} dias
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nenhum período selecionado.</p>
                )}

                <Button 
                  className="w-full bg-[#EE4D2D] hover:bg-[#D23F20] h-11"
                  disabled={!dateRange?.from || !dateRange?.to || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Confirmar Solicitação"
                  )}
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Legenda:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <div className="w-3 h-3 rounded bg-white border border-gray-200" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-red-700">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-200 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-[1px] bg-red-300 rotate-45" />
                      </div>
                    </div>
                    <span>Ocupado por alguém do time</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {myVacations.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mb-3 ml-auto mr-auto" />
                  <p>Você ainda não possui solicitações de férias.</p>
                </div>
              ) : (
                myVacations.map(vacation => (
                  <div key={vacation.id} className="p-5 border border-gray-100 rounded-xl bg-white shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition-all hover:border-orange-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <CalendarIcon className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-gray-900">
                          {vacation.dateRange?.start && vacation.dateRange?.end 
                            ? `${format(parseISO(vacation.dateRange.start), "dd/MM/yyyy")} até ${format(parseISO(vacation.dateRange.end), "dd/MM/yyyy")}` 
                            : "Datas Indisponíveis"}
                        </span>
                        {getStatusBadge(vacation.status || "pending")}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 ml-7">
                        Criado em: <span className="font-medium text-gray-700">{vacation.createdAt ? format(parseISO(vacation.createdAt), "dd/MM/yyyy") : "-"}</span>
                      </p>
                    </div>

                    <div className="w-full md:w-auto mt-2 md:mt-0 flex flex-col md:items-end gap-2">
                      {!vacation.proofDocument ? (
                        uploadingId === vacation.id ? (
                          <Button disabled variant="outline" className="w-full md:w-auto min-w-[180px]">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </Button>
                        ) : (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <Input 
                              type="file" 
                              accept="image/*" 
                              id={`proof-${vacation.id}`}
                              className="hidden"
                              onChange={(e) => handleFileUpload(vacation.id, e.target.files?.[0])}
                            />
                            <Label 
                              htmlFor={`proof-${vacation.id}`}
                              className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg cursor-pointer transition-colors text-sm font-semibold whitespace-nowrap"
                            >
                              <Upload className="w-4 h-4" />
                              Anexar Print (PAGE)
                            </Label>
                            <span className="text-[10px] text-gray-400 font-medium tracking-wide">Comprovante obrigatório</span>
                          </div>
                        )
                      ) : (
                        <a href={vacation.proofDocument} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                          <Button variant="outline" className="w-full text-blue-700 border-blue-200 hover:bg-blue-50 bg-white">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Ver Comprovante Anexado
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
