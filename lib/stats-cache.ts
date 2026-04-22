// Cache para estatísticas de feriados para evitar cálculos desnecessários
// e garantir que as atualizações sejam refletidas imediatamente

interface HolidayStats {
  used: number
  max: number
  compensated: number
  lastUpdated: number
}

const statsCache = new Map<string, HolidayStats>()
const CACHE_DURATION = 30000 // 30 segundos

export function getCacheKey(userId: string, holidayId: number): string {
  return `${userId}-${holidayId}`
}

export function getCachedStats(userId: string, holidayId: number): HolidayStats | null {
  const key = getCacheKey(userId, holidayId)
  const cached = statsCache.get(key)
  
  if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
    console.log(`[Cache] Retornando estatísticas em cache para ${key}`)
    return cached
  }
  
  return null
}

export function setCachedStats(userId: string, holidayId: number, stats: Omit<HolidayStats, 'lastUpdated'>): void {
  const key = getCacheKey(userId, holidayId)
  const cachedStats: HolidayStats = {
    ...stats,
    lastUpdated: Date.now()
  }
  
  console.log(`[Cache] Armazenando estatísticas para ${key}:`, cachedStats)
  statsCache.set(key, cachedStats)
}

export function invalidateCache(userId: string, holidayId: number): void {
  const key = getCacheKey(userId, holidayId)
  console.log(`[Cache] Invalidando cache para ${key}`)
  statsCache.delete(key)
}

export function clearAllCache(): void {
  console.log(`[Cache] Limpando todo o cache (${statsCache.size} entradas)`)
  statsCache.clear()
}

// Função para debug
export function debugCache(): void {
  console.log(`[Cache] Estado atual do cache:`)
  statsCache.forEach((stats, key) => {
    const age = Date.now() - stats.lastUpdated
    console.log(`  ${key}: used=${stats.used}, max=${stats.max}, compensated=${stats.compensated}, age=${age}ms`)
  })
}
