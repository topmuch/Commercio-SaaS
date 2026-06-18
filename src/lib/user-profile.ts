'use server'

import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/auth'

export type UserProfile = {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: string
  active: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
  twoFactorEnabled: boolean
}

export type ProfileUpdateData = {
  name?: string
  phone?: string
  avatar?: string
}

export type PasswordChangeData = {
  currentPassword: string
  newPassword: string
}

export type ProfileResult<T = any> = {
  success: boolean
  message: string
  data?: T
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(): Promise<ProfileResult<UserProfile>> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const userId = (session.user as { id: string }).id

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    }
  } catch (error) {
    console.error('[Profile] Error getting user profile:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving profile',
    }
  }
}

/**
 * Update user profile information (name, phone, avatar)
 */
export async function updateUserProfile(data: ProfileUpdateData): Promise<ProfileResult<UserProfile>> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const userId = (session.user as { id: string }).id
    const { name, phone, avatar } = data

    // Validate name if provided
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return {
          success: false,
          message: 'Name must be at least 2 characters long',
        }
      }
      if (name.trim().length > 100) {
        return {
          success: false,
          message: 'Name must be less than 100 characters',
        }
      }
    }

    // Validate phone if provided
    if (phone !== undefined) {
      if (phone && phone.length > 20) {
        return {
          success: false,
          message: 'Phone number must be less than 20 characters',
        }
      }
    }

    // Validate avatar URL if provided
    if (avatar !== undefined) {
      if (avatar && avatar.length > 500) {
        return {
          success: false,
          message: 'Avatar URL must be less than 500 characters',
        }
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (avatar !== undefined) updateData.avatar = avatar?.trim() || null

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    })

    console.log(`[Profile] User profile updated: ${updatedUser.email}`)

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    }
  } catch (error) {
    console.error('[Profile] Error updating user profile:', error)
    return {
      success: false,
      message: 'An error occurred while updating profile',
    }
  }
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export async function validatePasswordStrength(password: string): Promise<{
  valid: boolean
  errors: string[]
}> {
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
 * Change user password
 */
export async function changeUserPassword(data: PasswordChangeData): Promise<ProfileResult> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const userId = (session.user as { id: string }).id
    const { currentPassword, newPassword } = data

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        message: 'Current password and new password are required',
      }
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return {
        success: false,
        message: 'New password must be different from current password',
      }
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return {
        success: false,
        message: `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
      }
    }

    // Get current user with password
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: 'Current password is incorrect',
      }
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    })

    console.log(`[Profile] Password changed for user: ${user.email}`)

    return {
      success: true,
      message: 'Password changed successfully',
    }
  } catch (error) {
    console.error('[Profile] Error changing password:', error)
    return {
      success: false,
      message: 'An error occurred while changing password',
    }
  }
}

/**
 * Get user by ID (accessible to admin and super admin roles)
 */
export async function getUserById(userId: string): Promise<ProfileResult<UserProfile>> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const currentUserRole = (session.user as { role: string }).role
    const currentUserId = (session.user as { id: string }).id

    // Allow users to view their own profile
    // Allow admins and super admins to view any profile
    if (userId !== currentUserId && !['admin', 'super_admin'].includes(currentUserRole)) {
      return {
        success: false,
        message: 'Access denied. You can only view your own profile.',
      }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Ensure company isolation
    const currentUserCompanyId = (session.user as { companyId: string }).companyId
    if (user.companyId !== currentUserCompanyId) {
      return {
        success: false,
        message: 'Access denied. User belongs to a different company.',
      }
    }

    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
    }
  } catch (error) {
    console.error('[Profile] Error getting user by ID:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving user profile',
    }
  }
}

/**
 * List all users in the company (accessible to admin and super admin roles)
 */
export async function listCompanyUsers(): Promise<ProfileResult<UserProfile[]>> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const currentUserRole = (session.user as { role: string }).role

    // Only admins and super admins can list all users
    if (!['admin', 'super_admin'].includes(currentUserRole)) {
      return {
        success: false,
        message: 'Access denied. Admin access required.',
      }
    }

    const companyId = (session.user as { companyId: string }).companyId

    const users = await db.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    }
  } catch (error) {
    console.error('[Profile] Error listing company users:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving users',
    }
  }
}

/**
 * Deactivate or activate a user (accessible to admin and super admin roles)
 */
export async function toggleUserStatus(userId: string, active: boolean): Promise<ProfileResult<UserProfile>> {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return {
        success: false,
        message: 'Not authenticated',
      }
    }

    const currentUserRole = (session.user as { role: string }).role
    const currentUserId = (session.user as { id: string }).id
    const companyId = (session.user as { companyId: string }).companyId

    // Only admins and super admins can manage user status
    if (!['admin', 'super_admin'].includes(currentUserRole)) {
      return {
        success: false,
        message: 'Access denied. Admin access required.',
      }
    }

    // Prevent self-deactivation
    if (userId === currentUserId && !active) {
      return {
        success: false,
        message: 'You cannot deactivate your own account.',
      }
    }

    // Find the target user
    const targetUser = await db.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    })

    if (!targetUser) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Prevent deactivating users with higher roles (for regular admins)
    if (currentUserRole === 'admin' && targetUser.role === 'super_admin') {
      return {
        success: false,
        message: 'Access denied. Cannot manage super admin users.',
      }
    }

    // If deactivating, check if this is the last admin
    if (!active && targetUser.active && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      const activeAdminCount = await db.user.count({
        where: {
          companyId,
          role: targetUser.role,
          active: true,
        },
      })

      if (activeAdminCount <= 1) {
        return {
          success: false,
          message: `Cannot deactivate the last active ${targetUser.role}. At least one ${targetUser.role} must remain active.`,
        }
      }
    }

    // Update user status
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { active },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    })

    const action = active ? 'activated' : 'deactivated'
    console.log(`[Profile] ${action} user: ${updatedUser.email}`)

    return {
      success: true,
      message: `User ${action} successfully`,
      data: updatedUser,
    }
  } catch (error) {
    console.error('[Profile] Error toggling user status:', error)
    return {
      success: false,
      message: 'An error occurred while updating user status',
    }
  }
}