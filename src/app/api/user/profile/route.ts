import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, updateUserProfile } from '@/lib/user-profile'

/**
 * GET /api/user/profile
 * Get the current user's profile
 */
export async function GET() {
  try {
    const result = await getCurrentUserProfile()

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 401 })
    }
  } catch (error) {
    console.error('[API] Error in /api/user/profile:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Update the current user's profile information
 *
 * Request body:
 * {
 *   name?: string
 *   phone?: string
 *   avatar?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, avatar } = body

    const result = await updateUserProfile({ name, phone, avatar })

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/user/profile PATCH:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}