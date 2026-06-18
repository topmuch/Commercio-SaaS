import { NextRequest, NextResponse } from 'next/server'
import {
  createSuperAdminUser,
  isCurrentUserSuperAdmin,
} from '@/lib/super-admin'

/**
 * POST /api/admin/super-admin/create
 * Create a new super admin user
 *
 * Request body:
 * {
 *   email: string
 *   password: string
 *   name: string
 *   phone?: string
 * }
 *
 * Only existing super admins can create new super admins
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, password, name, phone } = body

    // Create the super admin user
    const result = await createSuperAdminUser(email, password, name, phone)

    // Return appropriate response
    if (result.success) {
      return NextResponse.json(result, { status: 201 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/admin/super-admin/create:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}