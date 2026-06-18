import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { regenerateBackupCodes, getRemainingBackupCodesCount } from '@/lib/two-factor'

/**
 * POST /api/auth/2fa/backup-codes
 * Regenerate backup codes (requires TOTP verification)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const { token } = body

    // Validate token
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      )
    }

    // Regenerate backup codes
    const result = await regenerateBackupCodes(userId, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
        backupCodes: result.backupCodes,
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error regenerating backup codes:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/2fa/backup-codes
 * Get remaining backup codes count
 */
export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get remaining codes count
    const count = await getRemainingBackupCodesCount(userId)

    return NextResponse.json({
      count,
    })
  } catch (error) {
    console.error('Error getting backup codes count:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}