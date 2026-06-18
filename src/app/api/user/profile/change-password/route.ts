import { NextRequest, NextResponse } from 'next/server'
import { changeUserPassword } from '@/lib/user-profile'

/**
 * POST /api/user/profile/change-password
 * Change the current user's password
 *
 * Request body:
 * {
 *   currentPassword: string
 *   newPassword: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Current password and new password are required',
        },
        { status: 400 }
      )
    }

    const result = await changeUserPassword({ currentPassword, newPassword })

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/user/profile/change-password:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}