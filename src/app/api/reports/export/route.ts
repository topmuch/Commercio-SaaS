import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/reports/export - Export report to PDF
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const body = await request.json()
    const { type, period, startDate, endDate } = body

    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : now

    // Récupérer les données selon le type
    let data
    let filename
    let title

    switch (type) {
      case 'sales': {
        filename = `rapport_ventes_${now.toISOString().split('T')[0]}.pdf`
        title = 'Rapport des Ventes'

        const orders = await db.order.findMany({
          where: {
            companyId,
            createdAt: { gte: start, lte: end },
          },
          include: {
            client: {
              select: { companyName: true, contactName: true },
            },
            commercial: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        const invoices = await db.invoice.findMany({
          where: {
            companyId,
            status: 'paid',
            createdAt: { gte: start, lte: end },
          },
        })

        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)

        data = {
          period: { start, end },
          orders,
          invoices,
          totalRevenue,
          orderCount: orders.length,
        }
        break
      }

      case 'clients': {
        filename = `rapport_clients_${now.toISOString().split('T')[0]}.pdf`
        title = 'Rapport Clients'

        const clients = await db.client.findMany({
          where: { companyId },
          include: {
            _count: {
              select: {
                orders: true,
                quotes: true,
                invoices: true,
              },
            },
            invoices: {
              where: { status: 'paid' },
              select: { total: true },
            },
          },
        })

        // Calculer le CA par client
        const clientsWithRevenue = clients.map(client => ({
          ...client,
          totalRevenue: client.invoices.reduce((sum, inv) => sum + inv.total, 0),
        }))

        data = {
          period: { start, end },
          clients: clientsWithRevenue,
        }
        break
      }

      case 'products': {
        filename = `rapport_produits_${now.toISOString().split('T')[0]}.pdf`
        title = 'Rapport Produits'

        const products = await db.product.findMany({
          where: { companyId },
          include: {
            orderItems: {
              include: {
                order: {
                  where: { createdAt: { gte: start, lte: end } },
                },
              },
            },
          },
        })

        const productsWithStats = products.map(product => ({
          ...product,
          totalSold: product.orderItems.reduce((sum, item) => sum + item.quantity, 0),
          totalRevenue: product.orderItems.reduce((sum, item) => sum + item.totalPrice, 0),
        }))

        data = {
          period: { start, end },
          products: productsWithStats,
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Type de rapport invalide' }, { status: 400 })
    }

    // Générer le PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPos = 20

    // En-tête
    pdf.setFontSize(20)
    pdf.text(title, pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Période
    pdf.setFontSize(10)
    pdf.setTextColor(100)
    pdf.text(
      `Période: ${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    pdf.setTextColor(0)
    yPos += 15

    // Générer le contenu selon le type
    if (type === 'sales') {
      // Résumé
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Résumé', 15, yPos)
      yPos += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Commandes: ${data.orderCount}`, 20, yPos)
      yPos += 6
      pdf.text(`Revenu total: ${data.totalRevenue.toLocaleString()} FCFA`, 20, yPos)
      yPos += 15

      // Tableau des commandes
      const orderRows = data.orders.map((order: any) => [
        order.number,
        order.client.companyName,
        order.commercial?.name || '-',
        `${order.total.toLocaleString()} FCFA`,
        order.status,
        new Date(order.createdAt).toLocaleDateString('fr-FR'),
      ])

      autoTable(pdf, {
        startY: yPos,
        head: [['N° Commande', 'Client', 'Commercial', 'Total', 'Statut', 'Date']],
        body: orderRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })
    } else if (type === 'clients') {
      // Tableau des clients
      const clientRows = data.clients.map((client: any) => [
        client.companyName,
        client.contactName,
        client.city || '-',
        client._count.orders.toString(),
        client._count.quotes.toString(),
        `${client.totalRevenue.toLocaleString()} FCFA`,
      ])

      autoTable(pdf, {
        startY: yPos,
        head: [['Entreprise', 'Contact', 'Ville', 'Commandes', 'Devis', 'CA Total']],
        body: clientRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })
    } else if (type === 'products') {
      // Tableau des produits
      const productRows = data.products
        .filter((p: any) => p.totalSold > 0)
        .map((product: any) => [
          product.reference,
          product.name,
          product.totalSold.toString(),
          `${product.totalRevenue.toLocaleString()} FCFA`,
          product.stock.toString(),
        ])

      autoTable(pdf, {
        startY: yPos,
        head: [['Référence', 'Nom', 'Quantité Vendue', 'Revenu', 'Stock Actuel']],
        body: productRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })
    }

    // Pied de page
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(
        `Généré par Commercio le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
      pdf.text(`Page ${i} sur ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
    }

    // Convertir en base64
    const pdfBase64 = pdf.output('dataurlstring')

    return NextResponse.json({
      data: {
        filename,
        pdf: pdfBase64.split(',')[1], // Retirer le préfixe data:application/pdf;base64,
      },
    })
  } catch (error: unknown) {
    console.error('[POST /api/reports/export] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}