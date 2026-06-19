import { NextRequest, NextResponse } from 'next/server'
import { getClientById, updateClient, deleteClient } from '@/lib/clients'

/**
 * GET /api/clients/[clientId]
 * Get a client by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const result = await getClientById(clientId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 404 })
    }
  } catch (error) {
    console.error('[API] Error in /api/clients/[clientId] GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[clientId]
 * Update a client
 *
 * Request body: Partial<ClientData>
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const body = await request.json()
    const result = await updateClient(clientId, body)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/clients/[clientId] PATCH:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[clientId]
 * Delete a client
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const result = await deleteClient(clientId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 404 })
    }
  } catch (error) {
    console.error('[API] Error in /api/clients/[clientId] DELETE:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}