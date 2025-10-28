"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAbsenceRecord } from '@/lib/db'
import { toast } from '@/components/ui/use-toast'

interface AbsenceTestTriggerProps {
  user: any
}

export function AbsenceTestTrigger({ user }: AbsenceTestTriggerProps) {
  const [isCreating, setIsCreating] = useState(false)

  const createTestAbsence = async () => {
    if (!user?.id) return

    setIsCreating(true)
    try {
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
        title: "Ausência de teste criada!",
        description: "Uma notificação deve aparecer no dashboard do admin.",
      })

      console.log("Ausência de teste criada:", testAbsence)
    } catch (error) {
      console.error("Erro ao criar ausência de teste:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a ausência de teste.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🧪 Teste de Notificações</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Clique no botão abaixo para simular o registro de uma ausência e testar as notificações em tempo real para o admin.
        </p>
        <Button 
          onClick={createTestAbsence}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? "Criando..." : "🔔 Criar Ausência de Teste"}
        </Button>
      </CardContent>
    </Card>
  )
}
