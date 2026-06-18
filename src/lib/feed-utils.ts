/**
 * Utility functions for the social feed feature.
 * French-localized time formatting and display helpers.
 */

/**
 * Returns a human-readable relative time string in French.
 * - "À l'instant" for < 1 minute
 * - "Il y a 5min" for < 1 hour
 * - "Il y a 2h" for < 24 hours
 * - "Il y a 3j" for < 7 days
 * - Formatted date string for older dates
 */
export function getTimeAgo(dateStr: string): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSeconds < 60) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Formats a byte count into a human-readable file size string.
 * e.g., "1.2 MB", "345 KB", "128 B"
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null) return ''

  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  // Show whole numbers when possible, otherwise 1 decimal
  const formatted = size % 1 === 0 ? size.toString() : size.toFixed(1)

  return `${formatted} ${units[i]}`
}

/**
 * Returns the number as a string if > 0, otherwise returns an empty string.
 * Useful for conditionally displaying counts in the UI.
 */
export function formatCount(n: number | undefined | null): string {
  if (!n || n <= 0) return ''
  return n.toString()
}

/**
 * Extracts initials (up to 2 characters) from a name string.
 * e.g., "Jean Dupont" -> "JD", "Marie" -> "MA"
 */
export function getInitials(name: string): string {
  if (!name) return '??'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/**
 * Truncates text to a maximum length, appending "..." if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}
