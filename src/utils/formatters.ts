export const formatCurrency = (amount: number): string => {
  const num = Number(amount) || 0
  return `PKR ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export const formatNumber = (num: number): string => {
  return Number(num || 0).toLocaleString('en-PK')
}

export const formatDate = (dateStr: string): string => {
  try {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Error'
  }
}

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getDateString = (date: Date | string | number = new Date()): string => {
  try {
    let d: Date
    if (date instanceof Date) {
      d = date
    } else if (typeof date === 'string' || typeof date === 'number') {
      d = new Date(date)
    } else {
      d = new Date()
    }
    if (isNaN(d.getTime())) {
      d = new Date()
    }
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

export const getDateTimeString = (date: Date | string = new Date()): string => {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Get relative time string (e.g., "2 days ago", "Yesterday", "Today")
 * Used in receipt modals to show last payment info
 */
export const getRelativeTime = (date: Date | string): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return '-'
  
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  // Future dates
  if (diffMs < 0) {
    const absDays = Math.abs(diffDays)
    const absHours = Math.abs(diffHours)
    
    if (absDays === 0 && absHours === 0) return 'in a moment'
    if (absDays === 0) return `in ${absHours} hour${absHours !== 1 ? 's' : ''}`
    if (absDays === 1) return 'Tomorrow'
    if (absDays < 7) return `in ${absDays} days`
    if (absDays < 30) return `in ${Math.floor(absDays / 7)} week${Math.floor(absDays / 7) !== 1 ? 's' : ''}`
    return `in ${Math.floor(absDays / 30)} month${Math.floor(absDays / 30) !== 1 ? 's' : ''}`
  }
  
  // Past dates
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`
}

/**
 * Format percentage value
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }
  return `${parseFloat(String(value)).toFixed(decimals)}%`
}