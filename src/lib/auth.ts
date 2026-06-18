import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
          return null
        }

        // Secure password verification with bcrypt
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as unknown as { role: string }).role
        token.companyId = (user as unknown as { companyId: string }).companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        (session.user as { role: string }).role = token.role as string
        (session.user as { companyId: string }).companyId = token.companyId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
