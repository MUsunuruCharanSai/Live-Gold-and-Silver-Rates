export function parseAmount(value) {
  if (value == null) return 0

  const cleaned = String(value).replace(/[^\d.]/g, '')
  if (!cleaned) return 0

  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

export function formatInr(value, fractionDigits = 2) {
  if (value == null || !Number.isFinite(value)) return '—'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatNumber(value, fractionDigits = 2) {
  if (value == null || !Number.isFinite(value)) return '—'

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatGrams(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value === 0) return '0.000 g'

  const digits = value >= 10 ? 3 : 4
  return `${formatNumber(value, digits)} g`
}

export function formatTime(date) {
  if (!date) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}
