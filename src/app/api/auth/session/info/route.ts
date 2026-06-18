import { NextResponse } from 'next/server'
import { getSessionInfo, getSessionMetadata, getSessionType, isSessionValid, formatSessionDuration } from '@/lib/session-utils'

/**
 * GET /api/auth/session/info
 * Get current session information including metadata
 */
export async function GET() {
  try {
    const sessionInfo = await getSessionInfo()
    return NextResponse.json(sessionInfo)
  } catch (error) {
    console.error('Error getting session info:', error)
    return NextResponse.json(
      { error: 'Failed to get session information' },
      { status: 500 }
    )
  }
}