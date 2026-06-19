
import { db } from '@/lib/db'
import { getAuthSession, getCompanyId } from '@/lib/auth'

export type ClientStatus = 'lead_rouge' | 'negotiation_orange' | 'client_vert'
export type ClientType = 'boutique' | 'revendeur' | 'supermarche' | 'grossiste'

export type ClientData = {
  companyName: string
  contactName: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  region?: string
  latitude?: number | null
  longitude?: number | null
  sector?: string
  type?: ClientType
  status?: ClientStatus
  notes?: string
  commercialId?: string
}

export type ClientFilterOptions = {
  search?: string
  status?: ClientStatus
  type?: ClientType
  commercialId?: string
  sector?: string
  city?: string
  region?: string
  sortBy?: 'companyName' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export type ClientResult<T = any> = {
  success: boolean
  message: string
  data?: T
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Validate client data
 */
export function validateClientData(data: ClientData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Company name validation
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.push('Company name must be at least 2 characters long')
  }
  if (data.companyName && data.companyName.trim().length > 200) {
    errors.push('Company name must be less than 200 characters')
  }

  // Contact name validation
  if (!data.contactName || data.contactName.trim().length < 2) {
    errors.push('Contact name must be at least 2 characters long')
  }
  if (data.contactName && data.contactName.trim().length > 100) {
    errors.push('Contact name must be less than 100 characters')
  }

  // Phone validation (required)
  if (!data.phone || data.phone.trim().length < 5) {
    errors.push('Phone number is required and must be at least 5 characters')
  }
  if (data.phone && data.phone.length > 20) {
    errors.push('Phone number must be less than 20 characters')
  }

  // WhatsApp validation (optional)
  if (data.whatsapp && data.whatsapp.length > 20) {
    errors.push('WhatsApp number must be less than 20 characters')
  }

  // Email validation (optional)
  if (data.email && data.email.length > 150) {
    errors.push('Email must be less than 150 characters')
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  // Address validation (optional)
  if (data.address && data.address.length > 500) {
    errors.push('Address must be less than 500 characters')
  }

  // City validation (optional)
  if (data.city && data.city.length > 100) {
    errors.push('City must be less than 100 characters')
  }

  // Region validation (optional)
  if (data.region && data.region.length > 100) {
    errors.push('Region must be less than 100 characters')
  }

  // Sector validation (optional)
  if (data.sector && data.sector.length > 100) {
    errors.push('Sector must be less than 100 characters')
  }

  // Type validation (optional)
  const validTypes: ClientType[] = ['boutique', 'revendeur', 'supermarche', 'grossiste']
  if (data.type && !validTypes.includes(data.type)) {
    errors.push('Invalid client type. Must be: boutique, revendeur, supermarche, or grossiste')
  }

  // Status validation (optional)
  const validStatuses: ClientStatus[] = ['lead_rouge', 'negotiation_orange', 'client_vert']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push('Invalid client status. Must be: lead_rouge, negotiation_orange, or client_vert')
  }

  // Notes validation (optional)
  if (data.notes && data.notes.length > 2000) {
    errors.push('Notes must be less than 2000 characters')
  }

  // Latitude/longitude validation (optional)
  if (data.latitude !== undefined && data.latitude !== null && (data.latitude < -90 || data.latitude > 90)) {
    errors.push('Latitude must be between -90 and 90')
  }
  if (data.longitude !== undefined && data.longitude !== null && (data.longitude < -180 || data.longitude > 180)) {
    errors.push('Longitude must be between -180 and 180')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a new client
 */
export async function createClient(data: ClientData): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()

    // Validate client data
    const validation = validateClientData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      }
    }

    // If commercialId is provided, verify it exists and belongs to the same company
    if (data.commercialId) {
      const commercial = await db.user.findFirst({
        where: {
          id: data.commercialId,
          companyId,
          role: { in: ['commercial', 'admin', 'super_admin', 'director'] },
          active: true,
        },
        select: { id: true },
      })

      if (!commercial) {
        return {
          success: false,
          message: 'Commercial not found or does not belong to your company',
        }
      }
    }

    // Create the client
    const newClient = await db.client.create({
      data: {
        companyName: data.companyName.trim(),
        contactName: data.contactName.trim(),
        phone: data.phone.trim(),
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        region: data.region?.trim() || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        sector: data.sector?.trim() || null,
        type: data.type || 'boutique',
        status: data.status || 'lead_rouge',
        notes: data.notes?.trim() || null,
        commercialId: data.commercialId || null,
        companyId,
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        sector: true,
        type: true,
        status: true,
        notes: true,
        commercialId: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    console.log(`[Client] Created new client: ${newClient.companyName} (${newClient.id})`)

    return {
      success: true,
      message: 'Client created successfully',
      data: newClient,
    }
  } catch (error) {
    console.error('[Client] Error creating client:', error)
    return {
      success: false,
      message: 'An error occurred while creating the client',
    }
  }
}

/**
 * Get a client by ID
 */
export async function getClientById(clientId: string): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()

    const client = await db.client.findFirst({
      where: {
        id: clientId,
        companyId,
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        sector: true,
        type: true,
        status: true,
        notes: true,
        commercialId: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        commercial: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!client) {
      return {
        success: false,
        message: 'Client not found',
      }
    }

    return {
      success: true,
      message: 'Client retrieved successfully',
      data: client,
    }
  } catch (error) {
    console.error('[Client] Error getting client by ID:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving the client',
    }
  }
}

/**
 * List clients with filtering and pagination
 */
export async function listClients(options: ClientFilterOptions = {}): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()
    const session = await getAuthSession()
    const currentUserRole = (session?.user as { role: string })?.role
    const currentUserId = (session?.user as { id: string })?.id

    const {
      search,
      status,
      type,
      commercialId,
      sector,
      city,
      region,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options

    // Build where clause
    const where: any = { companyId }

    // Search in company name, contact name, or phone
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by type
    if (type) {
      where.type = type
    }

    // Filter by sector
    if (sector) {
      where.sector = { contains: sector, mode: 'insensitive' }
    }

    // Filter by city
    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    // Filter by region
    if (region) {
      where.region = { contains: region, mode: 'insensitive' }
    }

    // Filter by commercial (admin/super_admin/director can see all, others only their own)
    if (commercialId) {
      if (['admin', 'super_admin', 'director'].includes(currentUserRole)) {
        where.commercialId = commercialId
      } else if (commercialId !== currentUserId) {
        return {
          success: false,
          message: 'Access denied. You can only view your own clients.',
        }
      }
    } else if (!['admin', 'super_admin', 'director'].includes(currentUserRole)) {
      // Non-admins can only see their own clients
      where.commercialId = currentUserId
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count
    const total = await db.client.count({ where })

    // Get clients
    const clients = await db.client.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        email: true,
        city: true,
        region: true,
        sector: true,
        type: true,
        status: true,
        commercialId: true,
        createdAt: true,
        updatedAt: true,
        commercial: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      message: 'Clients retrieved successfully',
      data: clients,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('[Client] Error listing clients:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving clients',
    }
  }
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, data: Partial<ClientData>): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()

    // Validate client data
    const validation = validateClientData(data as ClientData)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      }
    }

    // Check if client exists and belongs to the company
    const existingClient = await db.client.findFirst({
      where: {
        id: clientId,
        companyId,
      },
      select: { id: true },
    })

    if (!existingClient) {
      return {
        success: false,
        message: 'Client not found',
      }
    }

    // If commercialId is provided, verify it exists and belongs to the same company
    if (data.commercialId) {
      const commercial = await db.user.findFirst({
        where: {
          id: data.commercialId,
          companyId,
          role: { in: ['commercial', 'admin', 'super_admin', 'director'] },
          active: true,
        },
        select: { id: true },
      })

      if (!commercial) {
        return {
          success: false,
          message: 'Commercial not found or does not belong to your company',
        }
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (data.companyName !== undefined) updateData.companyName = data.companyName.trim()
    if (data.contactName !== undefined) updateData.contactName = data.contactName.trim()
    if (data.phone !== undefined) updateData.phone = data.phone.trim()
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp?.trim() || null
    if (data.email !== undefined) updateData.email = data.email?.trim().toLowerCase() || null
    if (data.address !== undefined) updateData.address = data.address?.trim() || null
    if (data.city !== undefined) updateData.city = data.city?.trim() || null
    if (data.region !== undefined) updateData.region = data.region?.trim() || null
    if (data.latitude !== undefined) updateData.latitude = data.latitude
    if (data.longitude !== undefined) updateData.longitude = data.longitude
    if (data.sector !== undefined) updateData.sector = data.sector?.trim() || null
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
    if (data.commercialId !== undefined) updateData.commercialId = data.commercialId || null

    // Update the client
    const updatedClient = await db.client.update({
      where: { id: clientId },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        sector: true,
        type: true,
        status: true,
        notes: true,
        commercialId: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    console.log(`[Client] Updated client: ${updatedClient.companyName} (${updatedClient.id})`)

    return {
      success: true,
      message: 'Client updated successfully',
      data: updatedClient,
    }
  } catch (error) {
    console.error('[Client] Error updating client:', error)
    return {
      success: false,
      message: 'An error occurred while updating the client',
    }
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()

    // Check if client exists and belongs to the company
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        companyId,
      },
      select: {
        id: true,
        companyName: true,
      },
    })

    if (!client) {
      return {
        success: false,
        message: 'Client not found',
      }
    }

    // Delete the client
    await db.client.delete({
      where: { id: clientId },
    })

    console.log(`[Client] Deleted client: ${client.companyName} (${client.id})`)

    return {
      success: true,
      message: 'Client deleted successfully',
    }
  } catch (error) {
    console.error('[Client] Error deleting client:', error)
    return {
      success: false,
      message: 'An error occurred while deleting the client',
    }
  }
}

/**
 * Get client statistics
 */
export async function getClientStatistics(): Promise<ClientResult> {
  try {
    const companyId = await getCompanyId()

    // Get counts by status
    const statusCounts = await db.client.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
    })

    // Get counts by type
    const typeCounts = await db.client.groupBy({
      by: ['type'],
      where: { companyId },
      _count: { id: true },
    })

    // Get total clients
    const totalClients = await db.client.count({
      where: { companyId },
    })

    // Get recent clients (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentClients = await db.client.count({
      where: {
        companyId,
        createdAt: { gte: sevenDaysAgo },
      },
    })

    // Get clients without assigned commercial
    const unassignedClients = await db.client.count({
      where: {
        companyId,
        commercialId: null,
      },
    })

    const statusMap: Record<string, number> = {}
    statusCounts.forEach(item => {
      statusMap[item.status] = item._count.id
    })

    const typeMap: Record<string, number> = {}
    typeCounts.forEach(item => {
      typeMap[item.type] = item._count.id
    })

    return {
      success: true,
      message: 'Client statistics retrieved successfully',
      data: {
        total: totalClients,
        recent: recentClients,
        unassigned: unassignedClients,
        byStatus: statusMap,
        byType: typeMap,
      },
    }
  } catch (error) {
    console.error('[Client] Error getting client statistics:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving client statistics',
    }
  }
}