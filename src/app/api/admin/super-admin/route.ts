import { NextResponse } from 'next/server'
import { listSuperAdmins } from '@/lib/super-admin'

/**
 * GET /api/admin/super-admin
 * List all super admin users in the current company
 *
 * Only super admins can view this list
 */
export async function GET() {
  try {
    // Get the list of super admins
    const result = await listSuperAdmins()

    // Return appropriate response
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/admin/super-admin:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}