import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { data, userEmail } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'Email do usuário é necessário' }, { status: 400 })
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

    // Criar nova planilha com duas abas
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Relatório de Ausências - ${new Date().toLocaleDateString('pt-BR')}`,
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
              title: 'Ausências Detalhadas',
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
    const detailsSheetId = spreadsheet.data.sheets?.[1].properties?.sheetId

    if (!spreadsheetId || !summarySheetId || !detailsSheetId) {
      throw new Error('Erro ao criar planilha')
    }

    // Compartilhar planilha
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'owner',
          type: 'user',
          emailAddress: userEmail,
        },
      })
    } catch (shareError) {
      console.error('Erro ao compartilhar:', shareError)
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: 'writer',
            type: 'anyone',
          },
        })
      } catch (secondError) {
        console.error('Erro na segunda tentativa:', secondError)
      }
    }

    // Calcular estatísticas
    const totalAusencias = data.length
    const porMotivo: { [key: string]: number } = {}
    const porStatus: { [key: string]: number } = {}
    
    data.forEach((row: any) => {
      porMotivo[row.motivo] = (porMotivo[row.motivo] || 0) + 1
      porStatus[row.status] = (porStatus[row.status] || 0) + 1
    })

    // Aba de Resumo
    const summaryValues = [
      ['RELATÓRIO DE AUSÊNCIAS - ADMIN'],
      [`Exportado em: ${new Date().toLocaleString('pt-BR')}`],
      [`Total de registros: ${totalAusencias}`],
      [],
      ['ESTATÍSTICAS POR MOTIVO'],
      ['Motivo', 'Quantidade'],
      ...Object.entries(porMotivo).map(([motivo, qtd]) => [motivo, qtd]),
      [],
      ['ESTATÍSTICAS POR STATUS'],
      ['Status', 'Quantidade'],
      ...Object.entries(porStatus).map(([status, qtd]) => [status, qtd]),
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Resumo!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: summaryValues,
      },
    })

    // Aba de Ausências Detalhadas
    const headers = [
      'Funcionário',
      'Motivo',
      'Período',
      'Data do Registro',
      'Status',
      'Comprovante'
    ]

    const detailsValues = [
      headers,
      ...data.map((row: any) => [
        row.funcionario,
        row.motivo,
        row.periodo,
        row.data_registro,
        row.status,
        row.comprovante
      ])
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Ausências Detalhadas!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: detailsValues,
      },
    })

    // Formatar Aba de Resumo
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
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
          {
            repeatCell: {
              range: {
                sheetId: summarySheetId,
                startRowIndex: 4,
                endRowIndex: 5,
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

    // Formatar Aba de Ausências Detalhadas
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: detailsSheetId,
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
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: detailsSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 6,
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
    console.error('Erro ao exportar:', {
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
