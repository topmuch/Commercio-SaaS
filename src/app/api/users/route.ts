import { NextResponse } from 'next/server'
import { listCompanyUsers } from '@/lib/user-profile'

/**
 * GET /api/users
 * List all users in the current company
 *
 * Only admins and super admins can list all users
 */
export async function GET() {
  try {
    const result = await listCompanyUsers()

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 403 })
    }
  } catch (error) {
    console.error('[API] Error in /api/users:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}