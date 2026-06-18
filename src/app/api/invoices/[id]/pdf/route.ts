import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/pdf-generator'

// GET /api/invoices/[id]/pdf - Generate and download invoice as PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id, companyId },
      include: {
        client: { select: { companyName: true, contactName: true, phone: true, email: true, address: true, city: true } },
        commercial: { select: { name: true } },
        company: { select: { name: true, address: true, phone: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, reference: true } },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    const pdf = generateInvoicePDF(invoice as unknown as Parameters<typeof generateInvoicePDF>[0])
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    const fileName = `Facture-${invoice.number}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la génération du PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
