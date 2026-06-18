/**
 * Format phone number for WhatsApp (remove all non-digit characters)
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
}

/**
 * Create a WhatsApp w.me link with a pre-filled message
 * @param phone - Phone number (can include +, spaces, etc.)
 * @param message - Message text to send
 * @returns WhatsApp w.me URL
 */
export function createWhatsAppLink(
  phone: string | null | undefined,
  message: string
): string {
  const formattedPhone = formatWhatsAppNumber(phone)
  if (!formattedPhone) {
    return ''
  }

  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Generate invoice message for WhatsApp
 */
export function generateInvoiceMessage(invoice: {
  number: string
  total: number
  dueDate?: string | null
  status: string
}): string {
  const formattedTotal = new Intl.NumberFormat('fr-FR').format(Math.round(invoice.total))

  let message = `Bonjour, voici votre facture N°${invoice.number}.\n\n`
  message += `📄 *Montant Total:* ${formattedTotal} CFA\n`
  message += `📊 *Statut:* ${invoice.status}\n`

  if (invoice.dueDate) {
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    message += `📅 *Date d'échéance:* ${dueDate}\n`
  }

  message += `\nMerci pour votre confiance !`
  return message
}

/**
 * Generate quote message for WhatsApp
 */
export function generateQuoteMessage(quote: {
  number: string
  total: number
  validUntil?: string | null
  status: string
}): string {
  const formattedTotal = new Intl.NumberFormat('fr-FR').format(Math.round(quote.total))

  let message = `Bonjour, voici votre devis N°${quote.number}.\n\n`
  message += `💰 *Montant Total:* ${formattedTotal} CFA\n`
  message += `📊 *Statut:* ${quote.status}\n`

  if (quote.validUntil) {
    const validUntil = new Date(quote.validUntil).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    message += `📅 *Valide jusqu'au:* ${validUntil}\n`
  }

  message += `\nN'hésitez pas à revenir vers nous pour toute question.`
  return message
}

/**
 * Generate company access code message for WhatsApp
 */
export function generateAccessCodeMessage(
  companyName: string,
  accessCode: string,
  loginUrl?: string
): string {
  let message = `Bonjour, vous êtes invité à rejoindre ${companyName} sur notre plateforme.\n\n`
  message += `🔑 *Code d'accès:* ${accessCode}\n`

  if (loginUrl) {
    message += `🔗 *Lien de connexion:* ${loginUrl}\n`
  }

  message += `\nUtilisez ce code lors de votre première connexion.`
  return message
}