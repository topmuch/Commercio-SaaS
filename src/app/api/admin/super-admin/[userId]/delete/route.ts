import { NextRequest, NextResponse } from 'next/server'
import { deleteSuperAdmin } from '@/lib/super-admin'

/**
 * DELETE /api/admin/super-admin/[userId]/delete
 * Delete a super admin user
 *
 * Only super admins can delete other super admins
 * A user cannot delete themselves
 * Cannot delete the last super admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // Delete the super admin user
    const result = await deleteSuperAdmin(userId)

    // Return appropriate response
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/admin/super-admin/[userId]/delete:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}