// ─── Teranga Biz PDF Generator ─────────────────────────────────────────────
// Professional PDF templates for invoices and quotes
// Style: Sénégal enterprise, emerald/charcoal branding, FCFA currency

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Invoice, InvoiceItem, Quote, QuoteItem } from './types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string
}

interface ClientInfo {
  companyName: string
  contactName: string
  phone?: string
  email?: string
  address?: string
  city?: string
}

interface DocumentData {
  type: 'invoice' | 'quote'
  number: string
  date: string
  dueDate?: string
  validUntil?: string
  status?: string
  company: CompanyInfo
  client: ClientInfo
  commercial?: string
  items: Array<{
    name: string
    reference: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  discount: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  total: number
  paid?: number
  remaining?: number
  notes?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'PAYÉE',
  partially_paid: 'PARTIELLEMENT PAYÉE',
  unpaid: 'IMPAYÉE',
  overdue: 'EN RETARD',
  draft: 'BROUILLON',
  sent: 'ENVOYÉ',
  accepted: 'ACCEPTÉ',
  refused: 'REFUSÉ',
}

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case 'paid':
    case 'accepted':
      return [16, 185, 129] // emerald-500
    case 'partially_paid':
    case 'sent':
      return [59, 130, 246] // blue-500
    case 'overdue':
    case 'refused':
      return [239, 68, 68] // red-500
    case 'unpaid':
    case 'draft':
    default:
      return [100, 116, 139] // slate-500
  }
}

// ─── Main PDF Generator ────────────────────────────────────────────────────

export function generateDocumentPDF(data: DocumentData): jsPDF {
  const doc = new jsPDF({ format: 'a4', putOnlyUsedFonts: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // ── Colors ──
  const PRIMARY: [number, number, number] = [16, 185, 129] // emerald-500
  const DARK: [number, number, number] = [15, 23, 42] // slate-900
  const GRAY: [number, number, number] = [100, 116, 139] // slate-500
  const LIGHT: [number, number, number] = [241, 245, 249] // slate-100
  const WHITE: [number, number, number] = [255, 255, 255]

  // ── Header: Company info ──
  let yPos = 15

  // Company name
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(data.company.name || 'Teranga Biz', margin, yPos)

  // Company details
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  yPos += 6
  if (data.company.address) {
    doc.text(data.company.address, margin, yPos)
    yPos += 4
  }
  if (data.company.phone) {
    doc.text(`Tél: ${data.company.phone}`, margin, yPos)
    yPos += 4
  }
  if (data.company.email) {
    doc.text(`Email: ${data.company.email}`, margin, yPos)
    yPos += 4
  }

  // ── Header: Document title + number (right side) ──
  const titleText = data.type === 'invoice' ? 'FACTURE' : 'DEVIS'
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text(titleText, pageWidth - margin, 15, { align: 'right' })

  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(data.number, pageWidth - margin, 22, { align: 'right' })

  // Status badge (if available)
  if (data.status) {
    const statusLabel = STATUS_LABELS[data.status] || data.status.toUpperCase()
    const statusColor = getStatusColor(data.status)
    const badgeWidth = doc.getTextWidth(statusLabel) + 12
    const badgeX = pageWidth - margin - badgeWidth

    doc.setFillColor(...statusColor)
    doc.roundedRect(badgeX, 27, badgeWidth, 7, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(statusLabel, badgeX + badgeWidth / 2, 31.5, { align: 'center' })
  }

  // ── Divider ──
  yPos = Math.max(yPos + 5, 42)
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(1.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // ── Client & Date boxes ──
  const boxHeight = 42

  // Client box (left)
  doc.setFillColor(...LIGHT)
  doc.roundedRect(margin, yPos, contentWidth * 0.55, boxHeight, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('FACTURÉ À', margin + 6, yPos + 7)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(data.client.companyName, margin + 6, yPos + 15)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  let clientY = yPos + 20
  if (data.client.contactName) {
    doc.text(`Contact: ${data.client.contactName}`, margin + 6, clientY)
    clientY += 4
  }
  if (data.client.address || data.client.city) {
    const addr = [data.client.address, data.client.city].filter(Boolean).join(', ')
    doc.text(addr, margin + 6, clientY)
    clientY += 4
  }
  if (data.client.phone) {
    doc.text(`Tél: ${data.client.phone}`, margin + 6, clientY)
    clientY += 4
  }
  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, margin + 6, clientY)
  }

  // Info box (right)
  const infoX = margin + contentWidth * 0.6
  const infoWidth = contentWidth * 0.4

  doc.setFillColor(...LIGHT)
  doc.roundedRect(infoX, yPos, infoWidth, boxHeight, 3, 3, 'F')

  const infoItems = [
    { label: 'Date', value: formatDate(data.date) },
    ...(data.type === 'invoice'
      ? [{ label: 'Échéance', value: data.dueDate ? formatDate(data.dueDate) : '—' }]
      : [{ label: 'Validité', value: data.validUntil ? formatDate(data.validUntil) : '—' }]),
    ...(data.commercial ? [{ label: 'Commercial', value: data.commercial }] : []),
  ]

  let infoY = yPos + 7
  for (const item of infoItems) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(item.label, infoX + 6, infoY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(item.value, infoX + infoWidth - 6, infoY, { align: 'right' })
    infoY += 8
  }

  // ── Items table ──
  yPos += boxHeight + 15

  const tableBody = data.items.map((item, idx) => [
    String(idx + 1),
    item.reference || '—',
    item.name,
    String(item.quantity),
    formatCFA(item.unitPrice),
    formatCFA(item.totalPrice),
  ])

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['#', 'Réf.', 'Désignation', 'Qté', 'Prix unit.', 'Total']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: DARK,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 32 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  // ── Totals section ──
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? yPos + data.items.length * 10 + 30

  const totalsX = pageWidth - margin - 80
  let totalY = finalY + 8

  const totalsRows = [
    { label: 'Sous-total', value: formatCFA(data.subtotal), bold: false },
    ...(data.discount > 0
      ? [{ label: `Remise (${data.discount}%)`, value: `- ${formatCFA(data.discountAmount)}`, bold: false, color: [239, 68, 68] }]
      : []),
    { label: `TVA (${data.taxRate}%)`, value: formatCFA(data.taxAmount), bold: false },
  ]

  for (const row of totalsRows) {
    doc.setFontSize(8)
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    doc.setTextColor(...GRAY)
    doc.text(row.label, totalsX, totalY)
    const c: [number, number, number] = (row.color as [number, number, number] | undefined) ?? DARK
    doc.setTextColor(...c)
    doc.text(row.value, pageWidth - margin, totalY, { align: 'right' })
    totalY += 6
  }

  // Total line
  doc.setDrawColor(...DARK)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalY + 1, pageWidth - margin, totalY + 1)
  totalY += 5

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text('TOTAL TTC', totalsX, totalY)
  doc.text(formatCFA(data.total), pageWidth - margin, totalY, { align: 'right' })

  // Payment info for invoices
  if (data.type === 'invoice' && data.paid !== undefined) {
    totalY += 12
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Paiement', totalsX, totalY)
    totalY += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Payé', totalsX, totalY)
    doc.setTextColor(...PRIMARY)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCFA(data.paid), pageWidth - margin, totalY, { align: 'right' })
    totalY += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Reste à payer', totalsX, totalY)
    const payColor: [number, number, number] = (data.remaining && data.remaining > 0 ? [239, 68, 68] : PRIMARY)
    doc.setTextColor(...payColor)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCFA(data.remaining ?? 0), pageWidth - margin, totalY, { align: 'right' })
  }

  // ── Notes section ──
  totalY += 15
  if (data.notes) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Notes', margin, totalY)
    totalY += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    const lines = doc.splitTextToSize(data.notes, contentWidth)
    doc.text(lines, margin, totalY)
    totalY += lines.length * 4
  }

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 25

  // Divider
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(
    `${data.company.name || 'Teranga Biz'} — ${data.company.address || 'Dakar, Sénégal'} — ${data.company.phone || ''}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  )
  doc.text(
    `N° ${data.type === 'invoice' ? 'Enregistrement' : 'Devis'}: ${data.number} | Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    footerY + 10,
    { align: 'center' }
  )
  doc.text(
    'Teranga Biz — L\'ERP qui comprend votre commerce | terangabiz.sn',
    pageWidth / 2,
    footerY + 15,
    { align: 'center' }
  )

  return doc
}

// ─── Invoice PDF Convenience ─────────────────────────────────────────────

export function generateInvoicePDF(invoice: Invoice & { company?: { name: string; address?: string; phone?: string; email?: string } }): jsPDF {
  const items = (invoice.items || []).map((item: InvoiceItem) => ({
    name: item.product?.name || 'Produit',
    reference: item.product?.reference || '—',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }))

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const discountAmount = (subtotal * invoice.discount) / 100
  const taxRate = 18
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100

  return generateDocumentPDF({
    type: 'invoice',
    number: invoice.number,
    date: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    company: {
      name: invoice.company?.name || 'Teranga Biz',
      address: invoice.company?.address,
      phone: invoice.company?.phone,
      email: invoice.company?.email,
    },
    client: {
      companyName: invoice.client?.companyName || 'Client',
      contactName: invoice.client?.contactName || '',
      phone: (invoice.client as { phone?: string })?.phone,
      email: (invoice.client as { email?: string })?.email,
      address: (invoice.client as { address?: string })?.address,
      city: (invoice.client as { city?: string })?.city,
    },
    commercial: invoice.commercial?.name,
    items,
    subtotal,
    discount: invoice.discount,
    discountAmount,
    taxRate,
    taxAmount,
    total: invoice.total,
    paid: invoice.paid,
    remaining: invoice.total - invoice.paid,
    notes: invoice.notes,
  })
}

// ─── Quote PDF Convenience ─────────────────────────────────────────────────

export function generateQuotePDF(quote: Quote & { company?: { name: string; address?: string; phone?: string; email?: string } }): jsPDF {
  const items = (quote.items || []).map((item: QuoteItem) => ({
    name: item.product?.name || 'Produit',
    reference: item.product?.reference || '—',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }))

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const discountAmount = (subtotal * quote.discount) / 100
  const taxRate = 18
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100

  return generateDocumentPDF({
    type: 'quote',
    number: quote.number,
    date: quote.createdAt,
    validUntil: quote.validUntil,
    status: quote.status,
    company: {
      name: quote.company?.name || 'Teranga Biz',
      address: quote.company?.address,
      phone: quote.company?.phone,
      email: quote.company?.email,
    },
    client: {
      companyName: quote.client?.companyName || 'Client',
      contactName: quote.client?.contactName || '',
      phone: (quote.client as { phone?: string })?.phone,
      email: (quote.client as { email?: string })?.email,
      address: (quote.client as { address?: string })?.address,
      city: (quote.client as { city?: string })?.city,
    },
    commercial: quote.commercial?.name,
    items,
    subtotal,
    discount: quote.discount,
    discountAmount,
    taxRate,
    taxAmount,
    total: quote.total,
    notes: quote.notes,
  })
}
