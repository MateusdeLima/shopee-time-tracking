"use client"

import { useState, useEffect, useRef } from 'react'
import { Bell, X, User, Calendar, Clock, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { getUserById } from '@/lib/db'
import { CustomNotificationPopup } from './custom-notification-popup'

interface AbsenceNotification {
  id: string
  userId: string
  userName: string
  reason: string
  customReason?: string
  dates: string[]
  hasProof: boolean
  createdAt: string
  departureTime?: string
  returnTime?: string
}

const ABSENCE_REASONS = [
  { id: "medical", label: "Consulta Médica" },
  { id: "personal", label: "Compromisso Pessoal" },

  { id: "certificate", label: "Atestado" },
  { id: "other", label: "Outro" },
]

interface AdminNotificationsProps {
  isAdmin: boolean
}

export function AdminNotifications({ isAdmin }: AdminNotificationsProps) {
  const [notifications, setNotifications] = useState<AbsenceNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [customPopup, setCustomPopup] = useState<any>(null)
  const processedIds = useRef(new Set<string>())
  const channelRef = useRef<any>(null)
  const lastCheckedId = useRef<string>('0')

  // Funções auxiliares
  const getReasonLabel = (reason: string, customReason?: string) => {
    if (reason === 'other' && customReason) {
      return customReason
    }
    const reasonObj = ABSENCE_REASONS.find(r => r.id === reason)
    return reasonObj ? reasonObj.label : 'Motivo não especificado'
  }

  const formatDatesText = (dates: string[]) => {
    if (dates.length === 1) {
      return format(parseISO(dates[0]), "dd/MM/yyyy", { locale: ptBR })
    } else if (dates.length === 2) {
      return `${format(parseISO(dates[0]), "dd/MM", { locale: ptBR })} a ${format(parseISO(dates[1]), "dd/MM/yyyy", { locale: ptBR })}`
    } else {
      return `${dates.length} dias`
    }
  }

  const getTimeText = (notification: AbsenceNotification) => {
    if (notification.departureTime && notification.returnTime) {
      return ` das ${notification.departureTime} às ${notification.returnTime}`
    } else if (notification.departureTime) {
      return ` a partir das ${notification.departureTime}`
    }
    return ''
  }

  const playNotificationSound = () => {
    try {
      // Som simples usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('🔔 Som de notificação não pôde ser reproduzido:', error)
    }
  }

  useEffect(() => {
    if (!isAdmin) return

    console.log('🔔 AdminNotifications: Iniciando sistema para admin')

    // Solicitar permissão para notificações do navegador
    requestNotificationPermission()

    // Função de polling dentro do useEffect
    const checkForNewAbsencesLocal = async () => {
      try {
        // Buscar ausências mais recentes que o último ID verificado
        const { data, error } = await supabase
          .from('absence_records')
          .select('*')
          .gt('id', lastCheckedId.current)
          .order('id', { ascending: true })
          .limit(10)

        if (error) {
          console.error('🔔 POLLING: Erro ao verificar ausências:', error)
          return
        }

        if (data && data.length > 0) {
          // Filtrar ausências que foram limpas permanentemente
          const clearedIds = JSON.parse(localStorage.getItem('admin_notifications_cleared') || '[]')
          const filteredData = data.filter(record => !clearedIds.includes(record.id.toString()))
          
          console.log(`🔔 POLLING: Encontradas ${data.length} novas ausências, ${filteredData.length} após filtrar limpas`)
          
          for (const record of filteredData) {
            console.log(`🔔 POLLING: Processando ausência ID: ${record.id}`)
            await handleNewAbsence(record)
          }
          
          // Atualizar último ID verificado
          lastCheckedId.current = data[data.length - 1].id.toString()
          console.log(`🔔 POLLING: Último ID verificado atualizado para: ${lastCheckedId.current}`)
        }
      } catch (error) {
        console.error('🔔 POLLING: Erro no polling:', error)
      }
    }

    // Limpar canal anterior se existir
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // Configurar listener para novos registros de ausência
    channelRef.current = supabase
      .channel('admin_absence_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'absence_records'
        },
        async (payload) => {
          console.log('🔔 REALTIME: Nova ausência detectada:', payload.new.id)
          await handleNewAbsence(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('🔔 REALTIME: Status da conexão:', status)
        if (status === 'SUBSCRIBED') {
          console.log('🔔 REALTIME: ✅ Conectado com sucesso ao canal de ausências!')
        } else if (status === 'CHANNEL_ERROR') {
          console.log('🔔 REALTIME: ❌ Erro na conexão do canal')
        } else if (status === 'TIMED_OUT') {
          console.log('🔔 REALTIME: ⏰ Timeout na conexão')
        } else if (status === 'CLOSED') {
          console.log('🔔 REALTIME: 🔴 Conexão fechada')
        }
      })

    // Sistema de polling como backup (verifica a cada 5 segundos)
    const pollingInterval = setInterval(async () => {
      console.log('🔔 POLLING: Verificando novas ausências...')
      await checkForNewAbsencesLocal()
    }, 5000)

    // Salvar referência do interval para limpeza
    const cleanup = () => {
      console.log('🔔 AdminNotifications: Limpando recursos')
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      clearInterval(pollingInterval)
    }

    // Carregar notificações existentes
    loadRecentNotifications()

    return cleanup
  }, [isAdmin])

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        console.log('🔔 Permissão de notificação:', permission)
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error)
      }
    }
  }

  const loadRecentNotifications = async () => {
    try {
      console.log('🔔 Carregando notificações recentes...')
      
      // Buscar ausências dos últimos 3 dias para evitar sobrecarga
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const { data, error } = await supabase
        .from('absence_records')
        .select('*')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20) // Limitar a 20 registros

      if (error) {
        console.error('Erro ao carregar notificações:', error)
        return
      }

      if (!data || data.length === 0) {
        console.log('🔔 Nenhuma notificação encontrada')
        return
      }

      // Filtrar notificações que foram limpas permanentemente
      const clearedIds = JSON.parse(localStorage.getItem('admin_notifications_cleared') || '[]')
      const filteredData = data.filter(record => !clearedIds.includes(record.id.toString()))
      
      console.log(`🔔 LOAD: ${data.length} notificações encontradas, ${filteredData.length} após filtrar limpas`)

      const notificationsWithUsers = await Promise.all(
        filteredData.map(async (record: any) => {
          // Marcar como processado para evitar duplicação
          processedIds.current.add(record.id.toString())
          
          const user = await getUserById(record.user_id)
          return {
            id: record.id.toString(),
            userId: record.user_id,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Usuário não encontrado',
            reason: record.reason,
            customReason: record.custom_reason,
            dates: record.dates,
            hasProof: !!record.proof_document,
            createdAt: record.created_at,
            departureTime: record.departure_time,
            returnTime: record.return_time
          }
        })
      )

      setNotifications(notificationsWithUsers)
      
      // Inicializar último ID verificado com o mais recente
      if (data.length > 0) {
        const maxId = Math.max(...data.map(record => record.id))
        lastCheckedId.current = maxId.toString()
        console.log(`🔔 INIT: Último ID inicializado com: ${lastCheckedId.current}`)
      }
      
      // Calcular não lidas baseado no timestamp
      const lastReadTimestamp = localStorage.getItem('admin_notifications_last_read')
      let unreadCount = 0
      
      if (lastReadTimestamp) {
        const lastRead = new Date(lastReadTimestamp)
        unreadCount = notificationsWithUsers.filter(n => 
          new Date(n.createdAt) > lastRead
        ).length
      } else {
        // Se nunca marcou como lido, considerar últimas 24h como não lidas
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        unreadCount = notificationsWithUsers.filter(n => 
          new Date(n.createdAt) > oneDayAgo
        ).length
      }
      
      setUnreadCount(unreadCount)
      console.log(`🔔 Carregadas ${notificationsWithUsers.length} notificações, ${unreadCount} não lidas`)
    } catch (error) {
      console.error('Erro ao carregar notificações recentes:', error)
    }
  }

  const handleNewAbsence = async (absenceRecord: any) => {
    try {
      const recordId = absenceRecord.id.toString()
      
      // Verificar se já foi processado para evitar duplicação
      if (processedIds.current.has(recordId)) {
        console.log(`🔔 Ausência ${recordId} já foi processada, ignorando`)
        return
      }

      // Verificar se a notificação foi limpa permanentemente
      const clearedIds = JSON.parse(localStorage.getItem('admin_notifications_cleared') || '[]')
      if (clearedIds.includes(recordId)) {
        console.log(`🔔 Ausência ${recordId} foi limpa permanentemente, ignorando`)
        return
      }

      console.log(`🔔 Processando nova ausência: ${recordId}`)
      
      // Marcar como processado
      processedIds.current.add(recordId)
      
      // Buscar dados do usuário
      const user = await getUserById(absenceRecord.user_id)
      
      const notification: AbsenceNotification = {
        id: recordId,
        userId: absenceRecord.user_id,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Usuário não encontrado',
        reason: absenceRecord.reason,
        customReason: absenceRecord.custom_reason,
        dates: absenceRecord.dates,
        hasProof: !!absenceRecord.proof_document,
        createdAt: absenceRecord.created_at,
        departureTime: absenceRecord.departure_time,
        returnTime: absenceRecord.return_time
      }

      // Adicionar à lista de notificações (evitar duplicação)
      setNotifications(prev => {
        const exists = prev.some(n => n.id === recordId)
        if (exists) {
          console.log(`🔔 Notificação ${recordId} já existe na lista`)
          return prev
        }
        return [notification, ...prev.slice(0, 19)] // Manter apenas 20 mais recentes
      })
      
      setUnreadCount(prev => prev + 1)

      // Mostrar notificações
      showNotificationToast(notification)
      showCustomNotification(notification)
      playNotificationSound()

      console.log(`🔔 ✅ Ausência ${recordId} processada com sucesso`)
    } catch (error) {
      console.error('Erro ao processar nova ausência:', error)
    }
  }

  const showNotificationToast = (notification: AbsenceNotification) => {
    const reasonLabel = getReasonLabel(notification.reason, notification.customReason)
    const datesText = formatDatesText(notification.dates)
    const timeText = getTimeText(notification)
    const proofText = notification.hasProof ? " (com comprovante)" : ""
    const fullMessage = `${notification.userName} registrou ausência por ${reasonLabel}${timeText} - ${datesText}${proofText}`

    // Toast no sistema
    toast({
      title: "🔔 Nova Ausência Registrada",
      description: fullMessage,
    })
  }

  const showCustomNotification = (notification: AbsenceNotification) => {
    console.log('🔔 POPUP: Mostrando popup personalizado...')
    
    const handleRedirect = () => {
      console.log('🔔 CLICK: Redirecionando para aba de ausências...')
      
      // URL da página admin com aba de ausências
      const adminUrl = `${window.location.origin}/admin/dashboard?tab=absences`
      
      try {
        // Tentar focar na aba existente primeiro
        window.focus()
        
        // Verificar se já estamos na página admin
        if (window.location.pathname === '/admin/dashboard') {
          console.log('🔔 CLICK: Já na página admin, mudando aba...')
          
          // Atualizar URL sem recarregar
          window.history.pushState({}, '', adminUrl)
          
          // Disparar evento personalizado para atualizar a aba ativa
          window.dispatchEvent(new CustomEvent('admin-tab-change', { 
            detail: { tab: 'absences' } 
          }))
          
          // Scroll para o topo da página
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          console.log('🔔 CLICK: Navegando para página admin...')
          // Se não estamos no admin, navegar para lá
          window.location.href = adminUrl
        }
        
        // Mostrar feedback visual
        toast({
          title: "📍 Redirecionado",
          description: "Você foi direcionado para a aba de ausências.",
          duration: 2000,
        })
        
      } catch (error) {
        console.error('🔔 CLICK: Erro ao redirecionar:', error)
        // Fallback: abrir em nova aba se houver erro
        window.open(adminUrl, '_blank')
      }
    }

    const popupData = {
      id: notification.id,
      title: "Nova Ausência Registrada",
      message: `${notification.userName} registrou uma ausência`,
      userName: notification.userName,
      reason: getReasonLabel(notification.reason, notification.customReason),
      time: format(parseISO(notification.createdAt), "HH:mm", { locale: ptBR }),
      date: format(parseISO(notification.createdAt), "dd/MM/yyyy", { locale: ptBR }),
      onClose: () => setCustomPopup(null),
      onClick: handleRedirect
    }

    setCustomPopup(popupData)
    console.log('🔔 POPUP: ✅ Popup personalizado criado com sucesso!')
  }




  const markAsRead = () => {
    setUnreadCount(0)
    localStorage.setItem('admin_notifications_last_read', new Date().toISOString())
  }

  const markAllAsRead = () => {
    setUnreadCount(0)
    localStorage.setItem('admin_notifications_last_read', new Date().toISOString())
    setShowOnlyUnread(true) // Mostrar apenas não lidas após marcar como lida
    
    toast({
      title: "✅ Notificações marcadas como vistas",
      description: "Agora mostrando apenas notificações não lidas.",
      duration: 3000,
    })
  }

  const getFilteredNotifications = () => {
    if (!showOnlyUnread) {
      return notifications
    }

    const lastReadTimestamp = localStorage.getItem('admin_notifications_last_read')
    if (!lastReadTimestamp) {
      return notifications
    }

    const lastRead = new Date(lastReadTimestamp)
    return notifications.filter(notification => 
      new Date(notification.createdAt) > lastRead
    )
  }

  const toggleShowAll = () => {
    setShowOnlyUnread(!showOnlyUnread)
  }

  const clearNotifications = () => {
    // Salvar IDs das notificações que foram limpas para nunca mais mostrar
    const clearedIds = notifications.map(n => n.id)
    const existingClearedIds = JSON.parse(localStorage.getItem('admin_notifications_cleared') || '[]')
    const allClearedIds = [...new Set([...existingClearedIds, ...clearedIds])]
    
    localStorage.setItem('admin_notifications_cleared', JSON.stringify(allClearedIds))
    
    // Limpar da interface
    setNotifications([])
    setUnreadCount(0)
    processedIds.current.clear()
    
    console.log(`🔔 CLEAR: ${clearedIds.length} notificações marcadas como limpas permanentemente`)
    console.log(`🔔 CLEAR: Total de notificações limpas: ${allClearedIds.length}`)
    
    toast({
      title: "🗑️ Notificações limpas",
      description: "As notificações foram removidas permanentemente e não aparecerão mais.",
      duration: 4000,
    })
  }

  // Função para resetar histórico de limpeza (para debug/admin)
  const resetClearedHistory = () => {
    localStorage.removeItem('admin_notifications_cleared')
    console.log('🔔 RESET: Histórico de notificações limpas foi resetado')
    loadRecentNotifications() // Recarregar notificações
  }

  if (!isAdmin) return null

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) markAsRead()
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <h3 className="font-semibold">Notificações de Ausências</h3>
                {showOnlyUnread && (
                  <Badge variant="secondary" className="text-xs">
                    Apenas não lidas
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    ✅ Marcar como visto
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleShowAll}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {showOnlyUnread ? "Ver todas" : "Só não lidas"}
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lista de notificações */}
            <div className="max-h-80 overflow-y-auto">
              {getFilteredNotifications().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {showOnlyUnread 
                      ? "Nenhuma notificação não lida" 
                      : "Nenhuma ausência registrada recentemente"
                    }
                  </p>
                  {showOnlyUnread && notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleShowAll}
                      className="mt-2 text-xs text-blue-600"
                    >
                      Ver todas as notificações
                    </Button>
                  )}
                </div>
              ) : (
                getFilteredNotifications().map((notification, index) => (
                  <div key={`${notification.id}-${index}`} className="p-4 border-b hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{notification.userName}</p>
                          {notification.hasProof && (
                            <FileText className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>{getReasonLabel(notification.reason, notification.customReason)}</strong>
                          {getTimeText(notification)}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDatesText(notification.dates)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(notification.createdAt), "HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Popup personalizado */}
      <CustomNotificationPopup 
        notification={customPopup}
        onClose={() => setCustomPopup(null)}
      />
    </div>
  )
}
