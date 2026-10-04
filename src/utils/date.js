const TIME_RE = /(\d{1,2}):(\d{2})(?::(\d{2}))?/

export function pad2(value) {
  return String(value).padStart(2, '0')
}

/** "04:45:32 (PKT)" -> { hours: 4, minutes: 45, seconds: 32 } (null when unparseable) */
export function parseTime(value) {
  const match = TIME_RE.exec(String(value == null ? '' : value))
  if (!match) return null
  return { hours: Number(match[1]), minutes: Number(match[2]), seconds: Number(match[3] || 0) }
}

/** "04:45:32" -> "4:45:32 AM" (timings are calculated with seconds) */
export function formatTime12(value) {
  const time = parseTime(value)
  if (!time) return '--:--'
  const suffix = time.hours >= 12 ? 'PM' : 'AM'
  const hours12 = time.hours % 12 === 0 ? 12 : time.hours % 12
  return `${hours12}:${pad2(time.minutes)}:${pad2(time.seconds)} ${suffix}`
}

/** "04:45:32" -> "04:45:32" (24h, used for compact rows) */
export function formatTime24(value) {
  const time = parseTime(value)
  if (!time) return '--:--'
  return `${pad2(time.hours)}:${pad2(time.minutes)}:${pad2(time.seconds)}`
}

/** "05:12" -> 312 (minutes since midnight, null when unparseable). */
export function minutesFromMidnight(value) {
  const time = parseTime(value)
  if (!time) return null
  return time.hours * 60 + time.minutes
}

/**
 * "06:06:03" + 20 -> "06:26:03"; wraps around midnight ("23:50" + 20 -> "00:10").
 * Seconds are kept so derived events (Ishraq, zawal…) stay precise.
 */
export function shiftMinutes(value, minutes) {
  const time = parseTime(value)
  const delta = Math.round(Number(minutes))
  if (!time || !Number.isFinite(delta) || delta === 0) return formatTime24(value)

  const total = time.hours * 3600 + time.minutes * 60 + time.seconds + delta * 60
  const normalized = ((total % 86400) + 86400) % 86400
  return `${pad2(Math.floor(normalized / 3600))}:${pad2(
    Math.floor((normalized % 3600) / 60),
  )}:${pad2(normalized % 60)}`
}

/**
 * Current wall-clock time inside an arbitrary IANA timezone.
 * Falls back to the device clock when Intl/timezone data is unavailable,
 * so the countdown still works (just assuming device tz == location tz).
 */
export function nowInTimeZone(timeZone) {
  const fallback = new Date()
  if (!timeZone || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return fallback
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(fallback)

    const get = (type) => Number(parts.find((part) => part.type === type)?.value)
    const hours = get('hour')
    const result = new Date(fallback)
    result.setFullYear(get('year'), get('month') - 1, get('day'))
    result.setHours(hours === 24 ? 0 : hours, get('minute'), get('second'), 0)
    return result
  } catch (e) {
    return fallback
  }
}

/** Same calendar day in `timeZone`, at the given prayer time. */
export function atTimeOn(base, time) {
  const parsed = parseTime(time)
  const result = new Date(base)
  if (!parsed) return result
  result.setHours(parsed.hours, parsed.minutes, parsed.seconds, 0)
  return result
}

export function formatCountdown(ms) {
  let total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  total -= days * 86400
  const hours = Math.floor(total / 3600)
  total -= hours * 3600
  const minutes = Math.floor(total / 60)
  const seconds = total - minutes * 60

  const clock = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return days > 0 ? `${days}d ${clock}` : clock
}

/**
 * "Sunday, 4 October 2026" in `locale` (see i18n's intlLocale); devices that
 * don't ship the requested locale fall back to English formatting.
 */
export function formatLongDate(date, locale = 'en-GB') {
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch (e) {
    try {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch (e2) {
      return date.toDateString()
    }
  }
}

export function formatWeekdayShort(date, locale = 'en-US') {
  try {
    return date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  } catch (e) {
    try {
      return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    } catch (e2) {
      return ''
    }
  }
}

/** "03-10-2026" (Aladhan's DD-MM-YYYY format) */
export function toDmy(date) {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`
}

/** Parse "dd-mm-yyyy" -> Date (UTC-safe; use getDay()/getDate() only). */
export function fromDmy(value) {
  const [day, month, year] = String(value).split('-').map(Number)
  if (!day || !month || !year) return null
  return new Date(Date.UTC(year, month - 1, day))
}

export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
