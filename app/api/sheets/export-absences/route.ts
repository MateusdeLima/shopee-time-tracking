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

    // Log para debug
    console.log('Credenciais:', {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      has_private_key: !!process.env.GOOGLE_PRIVATE_KEY
    })

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
          title: `Relatório de Ausências - ${new Date().toLocaleDateString('pt-BR')}`,
        },
        sheets: [
          {
            properties: {
              title: 'Ausências',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId
    const sheetId = spreadsheet.data.sheets?.[0].properties?.sheetId

    if (!spreadsheetId) {
      throw new Error('Erro ao criar planilha')
    }

    if (!sheetId) {
      throw new Error('Erro ao obter ID da aba da planilha')
    }

    // Tentar diferentes abordagens de compartilhamento
    try {
      // Primeira tentativa: compartilhar diretamente com o usuário
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'owner',  // Tentar tornar o usuário proprietário
          type: 'user',
          emailAddress: userEmail,
        },
      })
    } catch (shareError) {
      console.error('Erro na primeira tentativa de compartilhamento:', shareError)
      
      try {
        // Segunda tentativa: compartilhar com qualquer pessoa com o link
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: 'writer',
            type: 'anyone',
          },
        })
      } catch (secondError) {
        console.error('Erro na segunda tentativa de compartilhamento:', secondError)
        // Continuar mesmo se falhar, pois ainda podemos tentar acessar via URL
      }
    }

    // Cabeçalho da planilha
    const headers = [
      'Funcionário',
      'Motivo',
      'Período',
      'Data do Registro',
      'Status',
      'Comprovante'
    ]

    // Preparar dados para inserção
    const values = [
      headers,
      ...data.map(row => [
        row.funcionario,
        row.motivo,
        row.periodo,
        row.data_registro,
        row.status,
        row.comprovante
      ])
    ]

    // Adicionar dados à planilha
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Ausências!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    })

    // Formatar cabeçalho usando o sheetId correto
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
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
                sheetId: sheetId,
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
    console.error('Erro ao exportar para o Google Sheets:', {
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