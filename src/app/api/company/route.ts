import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// GET /api/company — Récupérer les informations de l'entreprise
export async function GET() {
  try {
    const companyId = await getCompanyId()

    const company = await db.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: company })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Échec de la récupération des informations de l\'entreprise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/company — Mettre à jour les informations de l'entreprise
export async function PUT(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const { name, email, phone, address } = body

    // Vérifier que l'entreprise existe
    const existing = await db.company.findUnique({
      where: { id: companyId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // Ne mettre à jour que les champs fournis
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone
    if (address !== undefined) data.address = address

    const company = await db.company.update({
      where: { id: companyId },
      data,
    })

    return NextResponse.json({ data: company })
  } catch (error: unknown) {
    console.error('Error updating company:', error)
    const message = error instanceof Error ? error.message : 'Échec de la mise à jour des informations de l\'entreprise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
