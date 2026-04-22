// Utilitários para conversão de banco de horas

/**
 * Converte formato HH:MM para decimal
 * @param timeString - String no formato "02:00", "02:30", etc.
 * @returns Número decimal (ex: 2.0, 2.5)
 */
export function convertTimeToDecimal(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') {
    return 0
  }

  // Limpar string e extrair horas e minutos
  const cleanTime = timeString.trim()
  const match = cleanTime.match(/^(\d{1,2}):(\d{2})$/)
  
  if (!match) {
    // Tentar outros formatos comuns
    const hourMatch = cleanTime.match(/^(\d{1,2})h?(\d{0,2})$/)
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10)
      const minutes = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0
      return hours + (minutes / 60)
    }
    return 0
  }

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  
  // Validar valores
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0
  }

  return hours + (minutes / 60)
}

/**
 * Converte decimal para formato HH:MM
 * @param decimal - Número decimal (ex: 2.5)
 * @returns String no formato "02:30"
 */
export function convertDecimalToTime(decimal: number): string {
  if (typeof decimal !== 'number' || decimal < 0) {
    return "00:00"
  }

  const hours = Math.floor(decimal)
  const minutes = Math.round((decimal - hours) * 60)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Valida se uma string está no formato de tempo válido
 * @param timeString - String a ser validada
 * @returns true se válida
 */
export function isValidTimeFormat(timeString: string): boolean {
  if (!timeString || typeof timeString !== 'string') {
    return false
  }

  const cleanTime = timeString.trim()
  
  // Formato HH:MM
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
  }

  // Formato Hh ou H
  const hourMatch = cleanTime.match(/^(\d{1,2})h?$/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    return hours >= 0 && hours <= 23
  }

  return false
}

/**
 * Formata horas para exibição amigável
 * @param decimal - Número decimal de horas
 * @returns String formatada (ex: "2h", "2h 30min")
 */
export function formatHoursForDisplay(decimal: number): string {
  if (typeof decimal !== 'number' || decimal <= 0) {
    return "0h"
  }

  const hours = Math.floor(decimal)
  const minutes = Math.round((decimal - hours) * 60)
  
  if (minutes === 0) {
    return `${hours}h`
  } else if (hours === 0) {
    return `${minutes}min`
  } else {
    return `${hours}h ${minutes}min`
  }
}

/**
 * Calcula a diferença entre horas declaradas e detectadas
 * @param declared - Horas declaradas pelo usuário
 * @param detected - Horas detectadas pela IA
 * @returns Objeto com diferença e se está dentro do limite aceitável
 */
export function calculateHourDiscrepancy(declared: number, detected: number) {
  const difference = Math.abs(declared - detected)
  const isAcceptable = difference <= 0.5 // Máximo 30 minutos de diferença
  
  return {
    difference,
    isAcceptable,
    percentage: detected > 0 ? (difference / detected) * 100 : 0
  }
}

/**
 * Exemplos de conversão para ajudar o usuário
 */
export const TIME_CONVERSION_EXAMPLES = [
  { time: "02:00", decimal: 2.0, display: "2h" },
  { time: "02:30", decimal: 2.5, display: "2h 30min" },
  { time: "04:15", decimal: 4.25, display: "4h 15min" },
  { time: "01:45", decimal: 1.75, display: "1h 45min" },
  { time: "08:00", decimal: 8.0, display: "8h" }
]
