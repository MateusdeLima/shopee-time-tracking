import { NextRequest, NextResponse } from 'next/server'
import { updateUserProfilePicture } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId, profilePicture } = await request.json()

    if (!userId || !profilePicture) {
      return NextResponse.json(
        { error: 'userId e profilePicture são obrigatórios' },
        { status: 400 }
      )
    }

    // Atualizar a foto de perfil no banco de dados
    await updateUserProfilePicture(userId, profilePicture)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar foto de perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
