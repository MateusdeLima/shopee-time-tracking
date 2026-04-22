'use client'

import { useState, useEffect } from 'react'
import { X, Bell, User, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface NotificationData {
  id: string
  title: string
  message: string
  userName: string
  reason: string
  time: string
  date: string
  onClose: () => void
  onClick?: () => void
}

interface CustomNotificationPopupProps {
  notification: NotificationData | null
  onClose: () => void
}

export function CustomNotificationPopup({ notification, onClose }: CustomNotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Auto-close após 8 segundos
      const timer = setTimeout(() => {
        handleClose()
      }, 8000)

      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }

  const handleClick = () => {
    if (notification?.onClick) {
      notification.onClick()
    }
    handleClose()
  }

  if (!notification || !isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Popup */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <Card 
          className={`w-96 shadow-2xl border-0 bg-white transform transition-all duration-300 ${
            isAnimating 
              ? 'translate-x-0 opacity-100 scale-100' 
              : 'translate-x-full opacity-0 scale-95'
          }`}
          onClick={handleClick}
          style={{ cursor: notification.onClick ? 'pointer' : 'default' }}
        >
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{notification.title}</h3>
                    <p className="text-xs text-blue-100">localhost:3000</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose()
                  }}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {notification.userName}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {notification.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 pl-13">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {notification.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {notification.time}
                </div>
              </div>

              {notification.onClick && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Clique para ir para a aba de ausências
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
