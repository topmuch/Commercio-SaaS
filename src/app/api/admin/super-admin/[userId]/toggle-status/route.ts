import { NextRequest, NextResponse } from 'next/server'
import { toggleSuperAdminStatus } from '@/lib/super-admin'

/**
 * PATCH /api/admin/super-admin/[userId]/toggle-status
 * Deactivate or activate a super admin user
 *
 * Request body:
 * {
 *   active: boolean
 * }
 *
 * Only super admins can manage other super admins
 * A user cannot deactivate themselves
 * Cannot deactivate the last active super admin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
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

    // Toggle the super admin status
    const result = await toggleSuperAdminStatus(userId, active)

    // Return appropriate response
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/admin/super-admin/[userId]/toggle-status:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}