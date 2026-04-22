"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Clock } from "lucide-react"
import { getSystemSummary } from "@/lib/db"

export function AdminSummary() {
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalHolidays: 0,
    totalActiveHolidays: 0,
    totalHoursRegistered: 0,
    totalHoursAvailable: 0,
    completionRate: 0,
  })

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summaryData = await getSystemSummary()
        if (summaryData) {
          setSummary(summaryData)
        } else {
          console.error("getSystemSummary não retornou dados.")
        }
      } catch (error) {
        console.error("Erro ao buscar resumo do sistema:", error)
      }
    }

    fetchSummary()
  }, [])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
          <Users className="h-4 w-4 text-[#EE4D2D]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalEmployees}</div>
          <p className="text-xs text-gray-500">Funcionários registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Feriados</CardTitle>
          <Calendar className="h-4 w-4 text-[#EE4D2D]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalActiveHolidays} / {summary.totalHolidays}
          </div>
          <p className="text-xs text-gray-500">Feriados ativos / total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Horas Registradas</CardTitle>
          <Clock className="h-4 w-4 text-[#EE4D2D]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalHoursRegistered}h</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-gray-200 h-1.5 rounded-full w-full">
              <div className="bg-[#EE4D2D] h-1.5 rounded-full" style={{ width: `${summary.completionRate}%` }}></div>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{Math.round(summary.completionRate)}%</span>
          </div>
          <p className="text-xs text-gray-500">
            {summary.totalHoursRegistered}h de {summary.totalHoursAvailable}h possíveis
          </p>
        </CardContent>
      </Card>
    </>
  )
}

