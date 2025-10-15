import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { data, month, stats, mode } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Configurar autenticação do Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    // Criar nova planilha
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Dashboard - ${month} - ${new Date().toLocaleDateString('pt-BR')}`,
        },
        sheets: [
          {
            properties: {
              title: 'Resumo',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
          {
            properties: {
              title: 'Dados Completos',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId
    const summarySheetId = spreadsheet.data.sheets?.[0].properties?.sheetId
    const dataSheetId = spreadsheet.data.sheets?.[1].properties?.sheetId

    if (!spreadsheetId || !summarySheetId || !dataSheetId) {
      throw new Error('Erro ao criar planilha')
    }

    // Compartilhar com qualquer pessoa com o link
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      })
    } catch (shareError) {
      console.error('Erro ao compartilhar:', shareError)
    }

    // Aba de Resumo
    const summaryValues = [
      ['DASHBOARD - SHOPEE PAGE CONTROL'],
      [`Período: ${month}`],
      [`Exportado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['ESTATÍSTICAS'],
      ['Métrica', 'Valor'],
      ['Total de Ausências', stats.totalAbsences],
      ['Total de Horas Extras', `${stats.totalOvertime}h`],
      ['Total de Funcionários', stats.totalUsers],
      ['Total de Feriados', stats.totalHolidays],
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Resumo!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: summaryValues,
      },
    })

    // Aba de Dados Completos (suporta 2 esquemas)
    const isHourBankSummary = mode === 'hour_bank_summary'

    const headers = isHourBankSummary
      ? ['Feriado', 'Funcionário', 'Horas Totais do Feriado', 'Horas Feitas (Funcionário)']
      : [
          'Tipo',
          'Funcionário',
          'Descrição',
          'Período',
          'Horas',
          'Status',
          'Data do Registro',
          'Horas Totais do Feriado',
          'Horas Feitas (Funcionário)'
        ]

    const dataValues = isHourBankSummary
      ? [
          headers,
          ...data.map((row: any) => [
            row.holiday,
            row.funcionario,
            row.horas_totais,
            row.horas_feitas,
          ])
        ]
      : [
          headers,
          ...data.map((row: any) => [
            row.tipo,
            row.funcionario,
            row.descricao,
            row.periodo,
            row.horas,
            row.status,
            row.data_registro,
            row.horas_totais || '',
            row.horas_feitas || ''
          ])
        ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Dados Completos!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: dataValues,
      },
    })

    // Formatar Aba de Resumo
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Formatar título
          {
            repeatCell: {
              range: {
                sheetId: summarySheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.93, green: 0.30, blue: 0.18 },
                  textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Formatar cabeçalho de estatísticas
          {
            repeatCell: {
              range: {
                sheetId: summarySheetId,
                startRowIndex: 5,
                endRowIndex: 6,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.8, green: 0.8, blue: 0.8 },
                  textFormat: { bold: true },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto-resize colunas
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: summarySheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 2,
              },
            },
          },
        ],
      },
    })

    // Formatar Aba de Dados Completos
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Formatar cabeçalho
          {
            repeatCell: {
              range: {
                sheetId: dataSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.93, green: 0.30, blue: 0.18 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto-resize colunas
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: dataSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: isHourBankSummary ? 4 : 9,
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })
  } catch (error: any) {
    console.error('Erro ao exportar dashboard:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: `Erro ao gerar relatório: ${error.message}` },
      { status: 500 }
    )
  }
}
