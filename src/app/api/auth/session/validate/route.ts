import { NextResponse } from 'next/server'
import { isSessionValid, getCurrentUserId, getCurrentUserRole, getCurrentCompanyId } from '@/lib/session-utils'

/**
 * GET /api/auth/session/validate
 * Validate the current session and return user details
 */
export async function GET() {
  try {
    const isValid = await isSessionValid()
    const userId = await getCurrentUserId()
    const userRole = await getCurrentUserRole()
    const companyId = await getCurrentCompanyId()

    return NextResponse.json({
      valid: isValid,
      userId,
      userRole,
      companyId,
    })
  } catch (error) {
    console.error('Error validating session:', error)
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    )
  }
}