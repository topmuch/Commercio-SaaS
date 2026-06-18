import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import {
  checkRateLimitForRequest,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  getClientIP,
} from '@/lib/rate-limit'

/**
 * Gracefully get companyId from session, or fallback to demo company.
 * This allows the app to work in demo mode without login,
 * while supporting multi-tenant isolation when auth is active.
 */
const DEMO_COMPANY_ID = 'comp_1'
const DEMO_COMPANY_EMAIL = 'contact@distribusn.com'

/**
 * Ensures a valid companyId exists in the database using atomic upsert.
 * This is safe even under concurrent requests.
 */
async function ensureValidCompanyId(companyId: string): Promise<string> {
  try {
    // Try to find the requested company first
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (company) return companyId

    // Fall back to the first company in the DB
    const firstCompany = await db.company.findFirst({ select: { id: true } })
    if (firstCompany) return firstCompany.id

    // No company exists — atomically create a default one (avoids race conditions)
    const newCompany = await db.company.upsert({
      where: { email: DEMO_COMPANY_EMAIL },
      update: {},
      create: {
        id: DEMO_COMPANY_ID,
        name: 'DistribuSN – Distribution Générale',
        email: DEMO_COMPANY_EMAIL,
        phone: '+221 33 800 00 01',
        address: 'Dakar, Sénégal',
        plan: 'enterprise',
      },
    })
    return newCompany.id
  } catch (err) {
    console.error('[ensureValidCompanyId] Error:', err)
    // Last resort: try to find ANY company
    try {
      const anyCompany = await db.company.findFirst({ select: { id: true } })
      if (anyCompany) return anyCompany.id
    } catch {
      // DB completely unavailable
    }
    return DEMO_COMPANY_ID
  }
}

/**
 * Ensures at least one default user exists for the given company.
 * Returns the user ID. This is needed for features like posts that require an author.
 */
export async function ensureDefaultUser(companyId: string): Promise<string> {
  try {
    // Check if any user exists for this company
    const existingUser = await db.user.findFirst({
      where: { companyId },
      select: { id: true },
    })
    if (existingUser) return existingUser.id

    // No user exists — create a default admin
    const newUser = await db.user.create({
      data: {
        email: 'admin@distribusn.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Administrateur',
        phone: '+221 77 000 00 00',
        role: 'admin',
        active: true,
        companyId,
      },
    })
    console.log(`[ensureDefaultUser] Created default admin user: ${newUser.id}`)
    return newUser.id
  } catch (err) {
    console.error('[ensureDefaultUser] Error:', err)
    throw new Error('Impossible de créer un utilisateur par défaut. Vérifiez que l\'entreprise existe.')
  }
}

export async function getCompanyId(): Promise<string> {
  try {
    const { getServerSession } = await import('next-auth')
    const session = await getServerSession(authOptions)
    if (session?.user) {
      const companyId = (session.user as { companyId: string }).companyId || DEMO_COMPANY_ID
      return await ensureValidCompanyId(companyId)
    }
  } catch {
    // next-auth not configured or session unavailable
  }
  // In demo mode, ensure the demo company exists
  return await ensureValidCompanyId(DEMO_COMPANY_ID)
}

export async function getAuthSession() {
  try {
    const { getServerSession } = await import('next-auth')
    return await getServerSession(authOptions)
  } catch {
    return null
  }
}

/**
 * Returns the user role from session, or 'admin' in demo mode.
 * This allows admin-only endpoints to work without login (demo mode).
 */
export function getRoleOrDemo(session: Awaited<ReturnType<typeof getAuthSession>>): string {
  if (session?.user) {
    const role = (session.user as { role: string }).role
    if (role) return role
  }
  // Demo mode: assume admin
  return 'admin'
}

/**
 * Check if the current user has admin-level access.
 * Returns true for admin/director/super_admin roles, or in demo mode.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getAuthSession()
    const role = getRoleOrDemo(session)
    const adminRoles = ['admin', 'director', 'super_admin']
    return adminRoles.includes(role)
  } catch {
    // In case of error, allow in demo mode
    return true
  }
}

// ==========================================
// Session Configuration
// ==========================================

// Session duration settings
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds
const SESSION_UPDATE_AGE = 24 * 60 * 60 // 24 hours in seconds (refresh session if older than this)

// JWT settings
const JWT_MAX_AGE = SESSION_MAX_AGE

/**
 * Check if a JWT token needs refresh based on its expiration time
 */
export function shouldRefreshToken(tokenIssuedAt?: number): boolean {
  if (!tokenIssuedAt) return true
  const now = Math.floor(Date.now() / 1000)
  const tokenAge = now - tokenIssuedAt
  return tokenAge >= SESSION_UPDATE_AGE
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limit for login attempts (by email)
        const rateLimitCheck = await checkRateLimitForRequest('login', credentials.email.toLowerCase())
        if (!rateLimitCheck.allowed) {
          console.log(`[Auth] Login rate limit exceeded for ${credentials.email}: ${rateLimitCheck.attempts} attempts`)
          return null
        }

        const user = await db.user.findFirst({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            role: true,
            active: true,
            companyId: true,
            password: true,
          },
        })

        if (!user || !user.active) {
          // Record failed attempt for non-existent or inactive user
          await recordFailedAttempt(credentials.email.toLowerCase(), 'login', 'User not found or inactive')
          return null
        }

        // Secure password verification with bcrypt
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          // Record failed attempt
          await recordFailedAttempt(credentials.email.toLowerCase(), 'login', 'Invalid password')
          return null
        }

        // Record successful attempt and reset rate limit
        await recordSuccessfulAttempt(credentials.email.toLowerCase(), 'login')

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          phone: user.phone,
          avatar: user.avatar,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: JWT_MAX_AGE,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as unknown as { role: string }).role
        token.companyId = (user as unknown as { companyId: string }).companyId
        token.phone = (user as unknown as { phone?: string }).phone
        token.avatar = (user as unknown as { avatar?: string }).avatar
        token.iat = Math.floor(Date.now() / 1000)
        token.exp = Math.floor(Date.now() / 1000) + JWT_MAX_AGE
      }

      // Handle session updates (e.g., profile updates)
      if (trigger === 'update' && session) {
        token.name = session.name
        token.avatar = session.avatar
        token.phone = session.phone
      }

      // Refresh token if needed
      if (shouldRefreshToken(token.iat as number)) {
        // Refresh user data from database to get latest info
        try {
          const freshUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              avatar: true,
              role: true,
              active: true,
              companyId: true,
            },
          })

          if (freshUser && freshUser.active) {
            token.id = freshUser.id
            token.email = freshUser.email
            token.name = freshUser.name
            token.role = freshUser.role
            token.companyId = freshUser.companyId
            token.phone = freshUser.phone
            token.avatar = freshUser.avatar
            token.iat = Math.floor(Date.now() / 1000)
            token.exp = Math.floor(Date.now() / 1000) + JWT_MAX_AGE
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        (session.user as { email: string }).email = token.email as string
        (session.user as { name: string }).name = token.name as string
        (session.user as { role: string }).role = token.role as string
        (session.user as { companyId: string }).companyId = token.companyId as string
        (session.user as { phone?: string }).phone = token.phone as string | undefined
        (session.user as { avatar?: string }).avatar = token.avatar as string | undefined
        (session.user as { iat?: number }).iat = token.iat as number
        (session.user as { exp?: number }).exp = token.exp as number
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Track sign-in events
      console.log(`[Auth] User signed in: ${user.email} (${user.id})`)
    },
    async signOut({ token, session }) {
      // Track sign-out events
      console.log(`[Auth] User signed out: ${token?.email}`)
    },
    async session({ session, token }) {
      // Track session creation
      console.log(`[Auth] Session created for: ${session?.user?.email}`)
    },
  },
}

// ==========================================
// Password Hashing & Verification
// ==========================================

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hashedPassword - Hashed password to compare against
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * Check if a password is already hashed (starts with $2a$, $2b$, or $2y$)
 * @param password - Password to check
 * @returns True if password appears to be hashed
 */
export function isHashedPassword(password: string): boolean {
  return /^\$2[aby]\$/.test(password)
}
