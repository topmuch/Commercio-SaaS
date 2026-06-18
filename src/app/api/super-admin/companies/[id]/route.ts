import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH - Update company status or details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, plan, phone, whatsapp, address, name, logo } = body

    // Check if company exists
    const company = await db.company.findUnique({
      where: { id: params.id },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (plan !== undefined) updateData.plan = plan
    if (phone !== undefined) updateData.phone = phone || null
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null
    if (address !== undefined) updateData.address = address || null
    if (name !== undefined) updateData.name = name
    if (logo !== undefined) updateData.logo = logo || null

    // Update company
    const updatedCompany = await db.company.update({
      where: { id: params.id },
      data: updateData,
    })

    // If suspending or deactivating, also deactivate all users
    if (status === 'suspended') {
      await db.user.updateMany({
        where: { companyId: params.id },
        data: { active: false },
      })
    }

    // If reactivating, also reactivate the admin user
    if (status === 'active') {
      await db.user.updateMany({
        where: {
          companyId: params.id,
          role: 'admin',
        },
        data: { active: true },
      })
    }

    return NextResponse.json({
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        email: updatedCompany.email,
        phone: updatedCompany.phone,
        whatsapp: updatedCompany.whatsapp,
        address: updatedCompany.address,
        logo: updatedCompany.logo,
        plan: updatedCompany.plan,
        status: updatedCompany.status,
        createdAt: updatedCompany.createdAt,
        updatedAt: updatedCompany.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entreprise' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a company (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if company exists
    const company = await db.company.findUnique({
      where: { id: params.id },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      )
    }

    // Soft delete by setting status to 'deleted'
    await db.company.update({
      where: { id: params.id },
      data: { status: 'deleted' },
    })

    // Deactivate all users
    await db.user.updateMany({
      where: { companyId: params.id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entreprise' },
      { status: 500 }
    )
  }
}