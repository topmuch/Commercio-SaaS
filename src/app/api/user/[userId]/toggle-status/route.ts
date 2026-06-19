import { NextRequest, NextResponse } from 'next/server'
import { toggleUserStatus } from '@/lib/user-profile'

/**
 * PATCH /api/user/[userId]/toggle-status
 * Deactivate or activate a user
 *
 * Request body:
 * {
 *   active: boolean
 * }
 *
 * Only admins and super admins can manage user status
 * A user cannot deactivate themselves
 * Cannot deactivate the last admin or super admin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await request.json()
    const { active } = body

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body. "active" must be a boolean.',
        },
        { status: 400 }
      )
    }

    const result = await toggleUserStatus(userId, active)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 403 })
    }
  } catch (error) {
    console.error('[API] Error in /api/user/[userId]/toggle-status:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}