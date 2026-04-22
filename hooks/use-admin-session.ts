"use client"

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'

interface AdminSession {
  user: any
  isAdmin: boolean
  isLoading: boolean
}

const ADMIN_SESSION_KEY = 'shopee_admin_session'
const SESSION_EXPIRY_HOURS = 24 * 7 // 7 dias

export function useAdminSession(): AdminSession {
  const [session, setSession] = useState<AdminSession>({
    user: null,
    isAdmin: false,
    isLoading: true
  })

  useEffect(() => {
    checkAdminSession()
  }, [])

  const checkAdminSession = async () => {
    try {
      // Verificar se há sessão salva no localStorage
      const savedSession = localStorage.getItem(ADMIN_SESSION_KEY)
      
      if (savedSession) {
        const { user, timestamp } = JSON.parse(savedSession)
        const now = Date.now()
        const sessionAge = now - timestamp
        const maxAge = SESSION_EXPIRY_HOURS * 60 * 60 * 1000

        // Se a sessão não expirou e o usuário é admin
        if (sessionAge < maxAge && user?.role === 'admin') {
          setSession({
            user,
            isAdmin: true,
            isLoading: false
          })
          return
        } else {
          // Sessão expirada, remover
          localStorage.removeItem(ADMIN_SESSION_KEY)
        }
      }

      // Tentar obter usuário atual
      const currentUser = await getCurrentUser()
      
      if (currentUser?.role === 'admin') {
        // Salvar sessão do admin
        const sessionData = {
          user: currentUser,
          timestamp: Date.now()
        }
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData))
        
        setSession({
          user: currentUser,
          isAdmin: true,
          isLoading: false
        })
      } else {
        setSession({
          user: currentUser,
          isAdmin: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Erro ao verificar sessão do admin:', error)
      setSession({
        user: null,
        isAdmin: false,
        isLoading: false
      })
    }
  }

  return session
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
