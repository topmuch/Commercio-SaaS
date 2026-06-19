/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting functionality for API endpoints to prevent abuse,
 * brute force attacks, and ensure fair usage of resources.
 *
 * Uses a hybrid approach:
 * - In-memory cache for fast checks
 * - Database for persistent tracking and cleanup
 */

import { db } from './db'
import { headers } from 'next/headers'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

/**
 * Rate limit types and their configurations
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  two_factor: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  api_calls: {
    maxAttempts: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  user_registration: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  isBlocked: boolean
  blockedUntil?: Date
  attempts: number
  maxAttempts: number
}

/**
 * In-memory rate limit cache (for performance)
 */
interface MemoryCacheEntry {
  attempts: number
  firstAttemptAt: number
  lastAttemptAt: number
  isBlocked: boolean
  blockedUntil?: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()

/**
 * Get client IP address from headers
 */
export async function getClientIP(): Promise<string> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (realIP) {
      return realIP.trim()
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Generate rate limit key
 */
function generateRateLimitKey(identifier: string, type: string): string {
  return `rate_limit:${type}:${identifier}`
}

/**
 * Check if entry is expired
 */
function isExpired(entry: MemoryCacheEntry, windowMs: number): boolean {
  const now = Date.now()
  return now - entry.lastAttemptAt > windowMs
}

/**
 * Check if block is expired
 */
function isBlockExpired(entry: MemoryCacheEntry): boolean {
  if (!entry.isBlocked || !entry.blockedUntil) {
    return true
  }
  return Date.now() > entry.blockedUntil
}

/**
 * Record a rate limit attempt
 */
export async function recordRateLimitAttempt(
  identifier: string,
  type: string,
  metadata?: Record<string, unknown>
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[type] || RATE_LIMIT_CONFIGS.api_calls

  // Get or create memory cache entry
  const cacheKey = generateRateLimitKey(identifier, type)
  let entry = memoryCache.get(cacheKey)

  const now = Date.now()
  const expiresAt = new Date(now + config.windowMs)

  // Create new entry if doesn't exist
  if (!entry) {
    entry = {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      isBlocked: false,
    }
    memoryCache.set(cacheKey, entry)

    // Also create database entry (using upsert to avoid conflicts)
    await db.rateLimitEntry.upsert({
      where: {
        identifier_type: {
          identifier,
          type,
        },
      },
      create: {
        identifier,
        type,
        attempts: 1,
        firstAttemptAt: new Date(now),
        lastAttemptAt: new Date(now),
        expiresAt,
        isBlocked: false,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      update: {}, // Entry already exists in memory, just sync
    })

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: expiresAt,
      isBlocked: false,
      attempts: 1,
      maxAttempts: config.maxAttempts,
    }
  }

  // Check if entry is expired
  if (isExpired(entry, config.windowMs)) {
    // Reset entry
    entry.attempts = 1
    entry.firstAttemptAt = now
    entry.lastAttemptAt = now
    entry.isBlocked = false
    delete entry.blockedUntil

    memoryCache.set(cacheKey, entry)

    // Update database entry
    await db.rateLimitEntry.upsert({
      where: {
        identifier_type: {
          identifier,
          type,
        },
      },
      update: {
        attempts: 1,
        firstAttemptAt: new Date(now),
        lastAttemptAt: new Date(now),
        expiresAt,
        isBlocked: false,
        blockedUntil: null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      create: {
        identifier,
        type,
        attempts: 1,
        firstAttemptAt: new Date(now),
        lastAttemptAt: new Date(now),
        expiresAt,
        isBlocked: false,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: expiresAt,
      isBlocked: false,
      attempts: 1,
      maxAttempts: config.maxAttempts,
    }
  }

  // Check if blocked
  if (entry.isBlocked && !isBlockExpired(entry)) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil!),
      isBlocked: true,
      blockedUntil: new Date(entry.blockedUntil!),
      attempts: entry.attempts,
      maxAttempts: config.maxAttempts,
    }
  }

  // Increment attempts
  entry.attempts++
  entry.lastAttemptAt = now

  // Check if should be blocked
  if (entry.attempts >= config.maxAttempts) {
    entry.isBlocked = true
    entry.blockedUntil = now + config.blockDurationMs

    // Update database
    await db.rateLimitEntry.upsert({
      where: {
        identifier_type: {
          identifier,
          type,
        },
      },
      update: {
        attempts: entry.attempts,
        lastAttemptAt: new Date(now),
        isBlocked: true,
        blockedUntil: new Date(entry.blockedUntil),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      create: {
        identifier,
        type,
        attempts: entry.attempts,
        firstAttemptAt: new Date(entry.firstAttemptAt),
        lastAttemptAt: new Date(now),
        expiresAt,
        isBlocked: true,
        blockedUntil: new Date(entry.blockedUntil),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil!),
      isBlocked: true,
      blockedUntil: new Date(entry.blockedUntil!),
      attempts: entry.attempts,
      maxAttempts: config.maxAttempts,
    }
  }

  // Update database
  await db.rateLimitEntry.upsert({
    where: {
      identifier_type: {
        identifier,
        type,
      },
    },
    update: {
      attempts: entry.attempts,
      lastAttemptAt: new Date(now),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
    create: {
      identifier,
      type,
      attempts: entry.attempts,
      firstAttemptAt: new Date(entry.firstAttemptAt),
      lastAttemptAt: new Date(now),
      expiresAt,
      isBlocked: false,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts,
    resetAt: expiresAt,
    isBlocked: false,
    attempts: entry.attempts,
    maxAttempts: config.maxAttempts,
  }
}

/**
 * Check rate limit status without recording attempt
 */
export async function checkRateLimit(
  identifier: string,
  type: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[type] || RATE_LIMIT_CONFIGS.api_calls
  const cacheKey = generateRateLimitKey(identifier, type)
  const entry = memoryCache.get(cacheKey)

  const now = Date.now()

  // No entry exists
  if (!entry) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(now + config.windowMs),
      isBlocked: false,
      attempts: 0,
      maxAttempts: config.maxAttempts,
    }
  }

  // Entry is expired
  if (isExpired(entry, config.windowMs)) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(now + config.windowMs),
      isBlocked: false,
      attempts: 0,
      maxAttempts: config.maxAttempts,
    }
  }

  // Check if blocked
  if (entry.isBlocked && !isBlockExpired(entry)) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil!),
      isBlocked: true,
      blockedUntil: new Date(entry.blockedUntil!),
      attempts: entry.attempts,
      maxAttempts: config.maxAttempts,
    }
  }

  // Return current status
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts,
    resetAt: new Date(entry.firstAttemptAt + config.windowMs),
    isBlocked: false,
    attempts: entry.attempts,
    maxAttempts: config.maxAttempts,
  }
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(identifier: string, type: string): Promise<void> {
  const cacheKey = generateRateLimitKey(identifier, type)

  // Remove from memory cache
  memoryCache.delete(cacheKey)

  // Remove from database
  await db.rateLimitEntry.deleteMany({
    where: {
      identifier,
      type,
    },
  })
}

/**
 * Clean up expired entries from memory cache
 */
export function cleanupMemoryCache(): number {
  let cleanedCount = 0
  const now = Date.now()

  for (const [key, entry] of memoryCache.entries()) {
    const config = RATE_LIMIT_CONFIGS[key.split(':')[1]] || RATE_LIMIT_CONFIGS.api_calls

    if (isExpired(entry, config.windowMs) || (entry.isBlocked && isBlockExpired(entry))) {
      memoryCache.delete(key)
      cleanedCount++
    }
  }

  return cleanedCount
}

/**
 * Clean up expired entries from database
 */
export async function cleanupDatabaseExpired(): Promise<number> {
  const result = await db.rateLimitEntry.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}

/**
 * Get rate limit stats for an identifier
 */
export async function getRateLimitStats(identifier: string, type: string) {
  const entry = await db.rateLimitEntry.findUnique({
    where: {
      identifier_type: {
        identifier,
        type,
      },
    },
    select: {
      attempts: true,
      firstAttemptAt: true,
      lastAttemptAt: true,
      expiresAt: true,
      isBlocked: true,
      blockedUntil: true,
      createdAt: true,
      metadata: true,
    },
  })

  if (!entry) {
    return null
  }

  return {
    ...entry,
    metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
  }
}

/**
 * Middleware function for rate limiting
 */
export async function checkRateLimitForRequest(
  type: string,
  identifier?: string
): Promise<RateLimitResult> {
  const id = identifier || await getClientIP()

  if (id === 'unknown') {
    // If we can't identify the request, allow it but log warning
    console.warn('[RateLimit] Could not identify request, allowing without tracking')
    return {
      allowed: true,
      remaining: 100,
      resetAt: new Date(Date.now() + 60000),
      isBlocked: false,
      attempts: 0,
      maxAttempts: 100,
    }
  }

  return await checkRateLimit(id, type)
}

/**
 * Record failed attempt (for login, etc.)
 */
export async function recordFailedAttempt(
  identifier: string,
  type: string,
  reason?: string
): Promise<RateLimitResult> {
  return await recordRateLimitAttempt(identifier, type, {
    reason,
    success: false,
  })
}

/**
 * Record successful attempt (resets counter if needed)
 */
export async function recordSuccessfulAttempt(
  identifier: string,
  type: string
): Promise<void> {
  // Reset rate limit on success (optional, depending on use case)
  await resetRateLimit(identifier, type)
}

/**
 * Get rate limit status for response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.maxAttempts.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
    ...(result.isBlocked ? {
      'X-RateLimit-Blocked': 'true',
      'X-RateLimit-Retry-After': Math.floor((result.blockedUntil!.getTime() - Date.now()) / 1000).toString(),
    } : {}),
  }
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupMemoryCache()
    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries from memory cache`)
    }
  }, 5 * 60 * 1000)
}