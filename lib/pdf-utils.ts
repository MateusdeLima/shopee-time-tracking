import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface User {
  firstName: string | null
  lastName: string | null
  email: string | null
}

interface Holiday {
  id: number
  name: string
}

interface OvertimeRecord {
  date: string
  hours: number
  optionLabel: string
  createdAt: string
  holidayId: number
}

export function generateHolidayPDF(user: User, holiday: Holiday, records: OvertimeRecord[]) {
  const doc = new jsPDF()
  
  // Filtrar apenas registros deste feriado (por segurança)
  const holidayRecords = records.filter(r => r.holidayId === holiday.id)
  
  if (holidayRecords.length === 0) return

  // Configurar fonte
  doc.setFont("helvetica")
  
  // Cabeçalho
  doc.setFontSize(16)
  doc.text(`Relatório de Horas Extras - ${holiday.name}`, 105, 15, { align: "center" })
  
  // Informações do Funcionário
  doc.setFontSize(12)
  doc.text(`Funcionário: ${user.firstName} ${user.lastName}`, 14, 25)
  doc.text(`Email: ${user.email}`, 14, 32)
  doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 14, 39)

  // Total de horas
  const totalHours = holidayRecords.reduce((sum, r) => sum + Number(r.hours), 0)
  doc.setFont("helvetica", "bold")
  doc.text(`Total de Horas: ${totalHours.toFixed(1)}h`, 14, 48)
  doc.setFont("helvetica", "normal")

  // Tabela de registros
  const tableData = holidayRecords.map(r => [
    format(parseISO(r.date), "dd/MM/yyyy"),
    `${Number(r.hours).toFixed(1)}h`,
    r.optionLabel || "Registro Manual",
    format(parseISO(r.createdAt), "dd/MM/yyyy HH:mm")
  ])

  autoTable(doc, {
    startY: 55,
    head: [["Data do Feriado", "Horas", "Período", "Registrado em"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [238, 77, 45] }, // Cor Shopee Orange
    styles: { font: "helvetica", fontSize: 10 },
  })

  // Salvar o arquivo
  const filename = `Horas_Extras_${holiday.name.replace(/\s+/g, '_')}_${user.firstName}_${format(new Date(), "yyyyMMdd")}.pdf`
  doc.save(filename)
}
