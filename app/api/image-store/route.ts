import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data, contentType = 'image/jpeg' } = body

    if (!data) {
      return NextResponse.json({ error: 'Dados da imagem são obrigatórios' }, { status: 400 })
    }

    const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Salvar na tabela image_uploads do Supabase
    const { error } = await (supabaseAdmin as any).from('image_uploads').insert([{
      id,
      data,
      content_type: contentType,
      created_at: new Date().toISOString()
    }])

    if (error) {
      console.error('❌ [IMAGE STORE] Erro ao salvar imagem no Supabase:', error)
      throw error
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = appUrl || `${protocol}://${host}`
    const imageUrl = `${baseUrl}/api/image-store?id=${id}`

    console.log(`📸 [IMAGE STORE] Imagem salva no Supabase com ID: ${id} -> URL: ${imageUrl}`)

    return NextResponse.json({ success: true, id, url: imageUrl })
  } catch (error: any) {
    console.error('❌ [IMAGE STORE] Erro ao salvar imagem:', error)
    return NextResponse.json({ error: error.message || 'Erro interno ao salvar imagem' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID da imagem ausente' }, { status: 400 })
    }

    const { data: imageRow, error } = await (supabaseAdmin as any)
      .from('image_uploads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !imageRow || !imageRow.data) {
      return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
    }

    let base64String = imageRow.data
    let contentType = imageRow.content_type || 'image/jpeg'

    if (base64String.includes(';base64,')) {
      const parts = base64String.split(';base64,')
      const mime = parts[0].replace('data:', '')
      if (mime) contentType = mime
      base64String = parts[1]
    }

    const buffer = Buffer.from(base64String, 'base64')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })

  } catch (error: any) {
    console.error('❌ [IMAGE STORE] Erro ao buscar imagem:', error)
    return NextResponse.json({ error: 'Erro ao carregar imagem' }, { status: 500 })
  }
}
