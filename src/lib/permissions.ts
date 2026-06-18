import type { PageId, Role } from '@/lib/store'

/**
 * Role-based access control (RBAC)
 * 
 * Each role has a set of allowed pages.
 * Pages NOT in the list are denied for that role.
 * 
 * Roles hierarchy:
 * - super_admin: full access (platform level)
 * - admin: full access (company owner)
 * - director: full access (company director)
 * - commercial: field sales - CRM, orders, quotes, invoices, boutique
 * - accountant: invoices, stock, reports, read-only CRM
 */

// Admin/director roles get full access
const adminPages: PageId[] = [
  'dashboard',
  'clients',
  'client-detail',
  'commercials',
  'products',
  'stock',
  'orders',
  'quotes',
  'invoices',
  'discussions',
  'map-stores',
  'map-sales',
  'boutique',
  'boutique-settings',
  'reports',
  'ai-assistant',
  'support-tickets',
  'api-keys',
  'settings',
  'users',
  'install-app',
]

// Super admin specific pages (platform level)
const superAdminPages: PageId[] = [
  ...adminPages,
  'super-admin-companies',
  'super-admin-settings',
]

// Commercial: field sales agent
const commercialPages: PageId[] = [
  'dashboard',
  'clients',
  'client-detail',
  'orders',
  'quotes',
  'invoices',
  'discussions',
  'map-stores',    // see client locations on map
  'boutique',
  'install-app',
]

// Accountant: financial access
const accountantPages: PageId[] = [
  'dashboard',
  'clients',
  'client-detail',
  'orders',
  'quotes',
  'invoices',
  'stock',
  'reports',
]

export const rolePermissions: Record<Role, PageId[]> = {
  super_admin: superAdminPages,
  admin: adminPages,
  director: adminPages,
  commercial: commercialPages,
  accountant: accountantPages,
}

/**
 * Check if a role has access to a specific page
 */
export function hasAccess(role: Role | undefined, pageId: PageId): boolean {
  if (!role) return true // No role = demo mode, allow everything
  const allowed = rolePermissions[role] || []
  return allowed.includes(pageId)
}

/**
 * Get the allowed pages for a role
 */
export function getAllowedPages(role: Role | undefined): PageId[] {
  if (!role) return adminPages // Demo mode = full access
  return rolePermissions[role] || []
}

/**
 * Check if a role can create clients (used for mobile inline creation)
 */
export function canCreateClients(role: Role | undefined): boolean {
  if (!role) return true
  return ['super_admin', 'admin', 'director', 'commercial'].includes(role)
}

/**
 * Check if a role can manage other commercials
 */
export function canManageCommercials(role: Role | undefined): boolean {
  if (!role) return true
  return ['super_admin', 'admin', 'director'].includes(role)
}

/**
 * Check if a role can manage settings
 */
export function canManageSettings(role: Role | undefined): boolean {
  if (!role) return true
  return ['super_admin', 'admin', 'director'].includes(role)
}

/**
 * Check if a role can manage products and stock
 */
export function canManageProducts(role: Role | undefined): boolean {
  if (!role) return true
  return ['super_admin', 'admin', 'director', 'accountant'].includes(role)
}

/**
 * Get role display label in French
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    director: 'Directeur',
    commercial: 'Commercial',
    accountant: 'Comptable',
  }
  return labels[role] || role
}
