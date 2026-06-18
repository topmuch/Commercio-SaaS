/**
 * Session Management Utilities
 *
 * Provides utilities for managing user sessions, checking session validity,
 * handling token refresh, and tracking session activity.
 */

import { getAuthSession, getCompanyId, authOptions } from './auth'
import type { Session } from 'next-auth'
import { db } from './db'

/**
 * Get the current user session with enhanced data
 */
export async function getCurrentSession(): Promise<Session | null> {
  return await getAuthSession()
}

/**
 * Get the current user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getAuthSession()
  if (!session?.user) return null
  return (session.user as { id: string }).id || null
}

/**
 * Get the current user's role from session
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const session = await getAuthSession()
  if (!session?.user) return null
  return (session.user as { role: string }).role || null
}

/**
 * Get the current user's company ID from session
 */
export async function getCurrentCompanyId(): Promise<string> {
  return await getCompanyId()
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(requiredRoles: string | string[]): Promise<boolean> {
  const session = await getAuthSession()
  if (!session?.user) return false

  const userRole = (session.user as { role: string }).role
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  return roles.includes(userRole)
}

/**
 * Check if the current user is an admin or higher
 */
export async function isAdminOrHigher(): Promise<boolean> {
  return await hasRole(['admin', 'super_admin', 'director'])
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  return await hasRole('super_admin')
}

/**
 * Get the current user's full profile from database
 */
export async function getCurrentUserProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

/**
 * Get session metadata (expiration, issued at, etc.)
 */
export function getSessionMetadata(session: Session | null) {
  if (!session?.user) return null

  const user = session.user as {
    id: string
    email: string
    name: string
    iat?: number
    exp?: number
  }

  if (!user.iat || !user.exp) return null

  const now = Math.floor(Date.now() / 1000)
  const issuedAt = user.iat
  const expiresAt = user.exp
  const timeUntilExpiration = expiresAt - now
  const sessionAge = now - issuedAt
  const isExpired = now >= expiresAt

  return {
    issuedAt: new Date(issuedAt * 1000).toISOString(),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    sessionAge: sessionAge, // in seconds
    timeUntilExpiration: timeUntilExpiration, // in seconds
    isExpired,
    isExpiringSoon: timeUntilExpiration < 3600, // less than 1 hour
    expiresAtHours: Math.floor(timeUntilExpiration / 3600),
    expiresAtMinutes: Math.floor((timeUntilExpiration % 3600) / 60),
  }
}

/**
 * Update session data (e.g., after profile update)
 */
export async function updateSessionData(data: {
  name?: string
  avatar?: string
  phone?: string
}) {
  const session = await getAuthSession()
  if (!session) return false

  // Use NextAuth session update API if needed
  // This can be called from API routes that update user profile
  return true
}

/**
 * Check if user session is still valid (active user, not expired)
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getAuthSession()
  if (!session?.user) return false

  // Check if user is still active in database
  const userId = (session.user as { id: string }).id
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { active: true },
  })

  if (!user || !user.active) return false

  // Check session expiration
  const metadata = getSessionMetadata(session)
  if (metadata?.isExpired) return false

  return true
}

/**
 * Get session information for display
 */
export async function getSessionInfo() {
  const session = await getAuthSession()
  if (!session?.user) {
    return {
      authenticated: false,
      user: null,
      metadata: null,
    }
  }

  const user = session.user as {
    id: string
    email: string
    name: string
    role: string
    companyId: string
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
    metadata: getSessionMetadata(session),
  }
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60))
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((seconds % (60 * 60)) / 60)
  const secs = Math.floor(seconds % 60)

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Get session type (demo or authenticated)
 */
export async function getSessionType(): Promise<'demo' | 'authenticated'> {
  const session = await getAuthSession()
  return session?.user ? 'authenticated' : 'demo'
}