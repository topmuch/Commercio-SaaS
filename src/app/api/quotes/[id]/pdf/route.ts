import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/pdf-generator'

// GET /api/quotes/[id]/pdf - Generate and download quote as PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    const quote = await db.quote.findUnique({
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

    if (!quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 })
    }

    const pdf = generateQuotePDF(quote as unknown as Parameters<typeof generateQuotePDF>[0])
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    const fileName = `Devis-${quote.number}.pdf`

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
