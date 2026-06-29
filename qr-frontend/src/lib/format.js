export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value, locale = 'es-CO') {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return '—'
  }
}

export function formatNumber(value = 0, locale = 'es-CO') {
  return new Intl.NumberFormat(locale).format(Number(value || 0))
}

export function formatCurrency(value = 0, currency = 'USD', locale = 'es-CO') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value || 0))
}

export function getShortLink(qr) {
  if (!qr) return ''
  return qr.redirect_url || `${window.location.origin}/r/${qr.short_code}`
}

export function getDaysLeft(value) {
  if (!value) return null
  return Math.max(0, Math.ceil((new Date(value) - Date.now()) / 86400000))
}

export function normalizePlan(plan) {
  return String(plan || 'free').toLowerCase()
}

export const planLabels = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}
