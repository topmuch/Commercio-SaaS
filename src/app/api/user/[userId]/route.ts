import { NextResponse } from 'next/server'
import { getUserById } from '@/lib/user-profile'

/**
 * GET /api/user/[userId]
 * Get a user's profile by ID
 * Users can view their own profile
 * Admins and super admins can view any profile in their company
 */
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const result = await getUserById(userId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 403 })
    }
  } catch (error) {
    console.error('[API] Error in /api/user/[userId]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}