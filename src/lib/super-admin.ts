'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { getAuthSession } from '@/lib/auth'

export type SuperAdminResult = {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    createdAt: Date
  }
}

export type ListSuperAdminsResult = {
  success: boolean
  message: string
  users?: Array<{
    id: string
    email: string
    name: string
    role: string
    active: boolean
    companyId: string
    createdAt: Date
    updatedAt: Date
  }>
}

export type DeleteSuperAdminResult = {
  success: boolean
  message: string
}

/**
 * Check if the current user is a super admin
 */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return false
    }

    const role = (session.user as { role: string }).role
    return role === 'super_admin'
  } catch {
    return false
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if an email already exists in a company
 */
async function emailExistsInCompany(email: string, companyId: string): Promise<boolean> {
  const existingUser = await db.user.findFirst({
    where: {
      email: email.toLowerCase(),
      companyId,
    },
    select: { id: true },
  })

  return !!existingUser
}

/**
 * Create a new super admin user
 * Only existing super admins can create new super admins
 */
export async function createSuperAdminUser(
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<SuperAdminResult> {
  try {
    // 1. Verify the current user is a super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin()
    if (!isSuperAdmin) {
      return {
        success: false,
        message: 'Access denied. Only super admins can create super admin users.',
      }
    }

    // 2. Validate input
    if (!email || !password || !name) {
      return {
        success: false,
        message: 'Email, password, and name are required.',
      }
    }

    // 3. Validate email format
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email format.',
      }
    }

    // 4. Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return {
        success: false,
        message: `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
      }
    }

    // 5. Validate name length
    if (name.trim().length < 2) {
      return {
        success: false,
        message: 'Name must be at least 2 characters long.',
      }
    }

    // 6. Get the current user's company ID
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Session not found.',
      }
    }

    const creatorCompanyId = (session.user as { companyId: string }).companyId

    // 7. Check if email already exists in this company
    const emailExists = await emailExistsInCompany(email, creatorCompanyId)
    if (emailExists) {
      return {
        success: false,
        message: 'A user with this email already exists in your organization.',
      }
    }

    // 8. Hash the password
    const hashedPassword = await hashPassword(password)

    // 9. Create the super admin user
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        phone: phone?.trim(),
        role: 'super_admin',
        active: true,
        companyId: creatorCompanyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
      },
    })

    console.log(`[Super Admin] Created new super admin: ${newUser.email} (${newUser.id})`)

    return {
      success: true,
      message: 'Super admin user created successfully.',
      user: newUser,
    }
  } catch (error) {
    console.error('[Super Admin] Error creating super admin user:', error)
    return {
      success: false,
      message: 'An error occurred while creating the super admin user.',
    }
  }
}

/**
 * List all super admin users in the current company
 * Only super admins can view this list
 */
export async function listSuperAdmins(): Promise<ListSuperAdminsResult> {
  try {
    // 1. Verify the current user is a super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin()
    if (!isSuperAdmin) {
      return {
        success: false,
        message: 'Access denied. Only super admins can view super admin list.',
      }
    }

    // 2. Get the current user's company ID
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Session not found.',
      }
    }

    const companyId = (session.user as { companyId: string }).companyId

    // 3. Fetch all super admins in the company
    const superAdmins = await db.user.findMany({
      where: {
        companyId,
        role: 'super_admin',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return {
      success: true,
      message: 'Super admin list retrieved successfully.',
      users: superAdmins,
    }
  } catch (error) {
    console.error('[Super Admin] Error listing super admins:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving the super admin list.',
    }
  }
}

/**
 * Delete a super admin user
 * Only super admins can delete other super admins
 * A user cannot delete themselves
 */
export async function deleteSuperAdmin(userId: string): Promise<DeleteSuperAdminResult> {
  try {
    // 1. Verify the current user is a super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin()
    if (!isSuperAdmin) {
      return {
        success: false,
        message: 'Access denied. Only super admins can delete super admin users.',
      }
    }

    // 2. Get the current user's ID
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Session not found.',
      }
    }

    const currentUserId = (session.user as { id: string }).id

    // 3. Prevent self-deletion
    if (userId === currentUserId) {
      return {
        success: false,
        message: 'You cannot delete your own account.',
      }
    }

    // 4. Get the current user's company ID
    const companyId = (session.user as { companyId: string }).companyId

    // 5. Verify the target user is a super admin in the same company
    const targetUser = await db.user.findFirst({
      where: {
        id: userId,
        role: 'super_admin',
        companyId,
      },
      select: { id: true, email: true, name: true },
    })

    if (!targetUser) {
      return {
        success: false,
        message: 'Super admin user not found.',
      }
    }

    // 6. Check if this is the last super admin
    const superAdminCount = await db.user.count({
      where: {
        companyId,
        role: 'super_admin',
        active: true,
      },
    })

    if (superAdminCount <= 1) {
      return {
        success: false,
        message: 'Cannot delete the last super admin. At least one super admin must remain.',
      }
    }

    // 7. Delete the user
    await db.user.delete({
      where: { id: userId },
    })

    console.log(`[Super Admin] Deleted super admin: ${targetUser.email} (${targetUser.id})`)

    return {
      success: true,
      message: 'Super admin user deleted successfully.',
    }
  } catch (error) {
    console.error('[Super Admin] Error deleting super admin user:', error)
    return {
      success: false,
      message: 'An error occurred while deleting the super admin user.',
    }
  }
}

/**
 * Deactivate or activate a super admin user
 * Only super admins can manage other super admins
 */
export async function toggleSuperAdminStatus(userId: string, active: boolean): Promise<SuperAdminResult> {
  try {
    // 1. Verify the current user is a super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin()
    if (!isSuperAdmin) {
      return {
        success: false,
        message: 'Access denied. Only super admins can manage super admin users.',
      }
    }

    // 2. Get the current user's ID
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Session not found.',
      }
    }

    const currentUserId = (session.user as { id: string }).id

    // 3. Prevent self-deactivation
    if (userId === currentUserId && !active) {
      return {
        success: false,
        message: 'You cannot deactivate your own account.',
      }
    }

    // 4. Get the current user's company ID
    const companyId = (session.user as { companyId: string }).companyId

    // 5. Verify the target user is a super admin in the same company
    const targetUser = await db.user.findFirst({
      where: {
        id: userId,
        role: 'super_admin',
        companyId,
      },
      select: { id: true, email: true, name: true, active: true },
    })

    if (!targetUser) {
      return {
        success: false,
        message: 'Super admin user not found.',
      }
    }

    // 6. If deactivating, check if this is the last active super admin
    if (!active && targetUser.active) {
      const activeSuperAdminCount = await db.user.count({
        where: {
          companyId,
          role: 'super_admin',
          active: true,
        },
      })

      if (activeSuperAdminCount <= 1) {
        return {
          success: false,
          message: 'Cannot deactivate the last active super admin. At least one super admin must remain active.',
        }
      }
    }

    // 7. Update the user status
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { active },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
      },
    })

    const action = active ? 'activated' : 'deactivated'
    console.log(`[Super Admin] ${action} super admin: ${updatedUser.email} (${updatedUser.id})`)

    return {
      success: true,
      message: `Super admin user ${action} successfully.`,
      user: updatedUser,
    }
  } catch (error) {
    console.error('[Super Admin] Error toggling super admin status:', error)
    return {
      success: false,
      message: 'An error occurred while updating the super admin status.',
    }
  }
}