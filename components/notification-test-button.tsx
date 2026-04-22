"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createAbsenceRecord } from '@/lib/db'
import { toast } from '@/components/ui/use-toast'

interface NotificationTestButtonProps {
  user: any
}

export function NotificationTestButton({ user }: NotificationTestButtonProps) {
  const [isCreating, setIsCreating] = useState(false)

  const createTestAbsence = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      console.log('🧪 Criando ausência de teste para:', user.firstName)
      
      // Criar ausência de teste
      const testAbsence = await createAbsenceRecord({
        userId: user.id,
        reason: "medical",
        dates: [new Date().toISOString().split('T')[0]], // Hoje
        status: "pending",
        departureTime: "14:00",
        returnTime: "16:00"
      })

      toast({
        title: "✅ Ausência de teste criada!",
        description: "Uma notificação deve aparecer no dashboard do admin em tempo real.",
        duration: 5000
      })

      console.log('🧪 Ausência de teste criada:', testAbsence)
    } catch (error) {
      console.error('Erro ao criar ausência de teste:', error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a ausência de teste.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
      <h3 className="font-semibold text-yellow-800 mb-2">🧪 Teste de Notificações</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Clique no botão abaixo para simular o registro de uma ausência e testar as notificações em tempo real para o admin.
      </p>
      <Button 
        onClick={createTestAbsence}
        disabled={isCreating}
        variant="outline"
        className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
      >
        {isCreating ? "Criando..." : "🔔 Criar Ausência de Teste"}
      </Button>
    </div>
  )
}
