/**
 * Prayer times calculated inside the app (NOAA / PrayTimes-style solar math).
 *
 * Why not just use Aladhan? Because Aladhan hands back rounded **minutes**
 * (Fajr "04:46") while a proper app shows seconds — 4:45:34 — and because a
 * flat horizon puts sunrise 2 minutes late for a city like Jhang (161 m up).
 * Both come out of the same astronomy:
 *
 *   • declination + equation of time from the sun's apparent longitude
 *   • hour angle for a given altitude → Fajr/Isha (18°, Karachi method),
 *     sunrise/sunset (0.833° + 0.0347·√metres — the elevation dip),
 *     Dhuhr (solar noon) and Asr (Hanafi shadow factor 2)
 *
 * Every value is returned as local "HH:MM:SS". The UTC offset is pinned to a
 * wall-clock reference from the timetable (rounded to 15 minutes), so times
 * are right for half-hour timezones too and never depend on the device zone.
 */

const DEG = Math.PI / 180

const sin = (deg) => Math.sin(deg * DEG)
const cos = (deg) => Math.cos(deg * DEG)
const tan = (deg) => Math.tan(deg * DEG)
const asinDeg = (value) => Math.asin(value) / DEG
const acosDeg = (value) => Math.acos(value) / DEG
const atan2Deg = (y, x) => Math.atan2(y, x) / DEG

const fixAngle = (deg) => ((deg % 360) + 360) % 360
const fixHour = (hour) => ((hour % 24) + 24) % 24

/** Julian day number at 0h UT for a Gregorian calendar date. */
export function julianDay(year, month, day) {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const century = Math.floor(y / 100)
  const correction = 2 - century + Math.floor(century / 4)
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + correction - 1524.5
  )
}

/**
 * Sun's declination (degrees) and the equation of time (hours) at `jd`.
 * `equation` follows "apparent − mean", so solar noon = 12 − eqt − lon/15 UT.
 */
export function sunPosition(jd) {
  const d = jd - 2451545.0
  const anomaly = fixAngle(357.529 + 0.98560028 * d)
  const meanLongitude = fixAngle(280.459 + 0.98564736 * d)
  const longitude = fixAngle(meanLongitude + 1.915 * sin(anomaly) + 0.02 * sin(2 * anomaly))
  const obliquity = 23.439 - 0.00000036 * d
  const rightAscension = atan2Deg(cos(obliquity) * sin(longitude), cos(longitude)) / 15
  // signed, in [-12, 12) hours
  const equation = (((meanLongitude / 15 - rightAscension + 12) % 24) + 24) % 24 - 12
  return { declination: asinDeg(sin(obliquity) * sin(longitude)), equation }
}

/** "11:59" or "11:59:27" -> 11.983… hours (null when unparseable). */
function hoursOf(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(value == null ? '' : value))
  if (!match) return null
  return Number(match[1]) + Number(match[2]) / 60 + Number(match[3] || 0) / 3600
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Hours (local, may exceed 24 or be negative) -> "HH:MM:SS". */
function formatClock(hours) {
  if (hours == null || !Number.isFinite(hours)) return null
  const total = Math.round(fixHour(hours) * 3600)
  const h = Math.floor(total / 3600) % 24
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

/**
 * Local prayer times for one date.
 *
 * @param {object} options
 * @param {number} options.year / month / day — Gregorian date at the location
 * @param {number} options.latitude, options.longitude — decimal degrees
 * @param {number} [options.elevation] metres above sea level (horizon dip)
 * @param {number} [options.timezoneOffset] hours east of UTC; when omitted it
 *   is derived from `referenceDhuhr` (the timetable's rounded solar noon),
 *   falling back to the device clock.
 * @param {string} [options.referenceDhuhr] "11:59"
 * @returns {object|null} Fajr/Sunrise/Dhuhr/Asr/Maghrib/Isha/Midnight/Lastthird
 */
export function computePrayerTimes({
  year,
  month,
  day,
  latitude,
  longitude,
  elevation = 0,
  timezoneOffset,
  referenceDhuhr,
  fajrAngle = 18,
  ishaAngle = 18,
  asrFactor = 2,
}) {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) >= 89.9
  ) {
    return null
  }

  const jd0 = julianDay(year, month, day)
  const declinationAt = (utcHours) => sunPosition(jd0 + utcHours / 24).declination

  // Solar noon (UT hours): apparent noon = 12h − equation of time − lon/15.
  let noonUtc = 12 - longitude / 15
  for (let i = 0; i < 2; i += 1) {
    noonUtc = 12 - longitude / 15 - sunPosition(jd0 + noonUtc / 24).equation
  }

  // 0.833° = refraction + the sun's disc; the rest is the observer's height.
  const horizon = 0.833 + 0.0347 * Math.sqrt(Math.max(0, elevation))

  /** UT hours of the moment the sun sits at `altitude` (negative = below). */
  const atAltitude = (altitude, beforeNoon) => {
    let utc = noonUtc + (beforeNoon ? -3 : 3)
    for (let i = 0; i < 3; i += 1) {
      const value =
        (sin(altitude) - sin(latitude) * sin(declinationAt(utc))) /
        (cos(latitude) * cos(declinationAt(utc)))
      if (value < -1 || value > 1) return null // the sun never gets that far
      const hourAngle = acosDeg(value) / 15
      utc = noonUtc + (beforeNoon ? -hourAngle : hourAngle)
    }
    return utc
  }

  /** Asr: the shadow is `asrFactor` times the object + its no-shadow length.
   *  The sun is still *above* the horizon — atan gives that altitude. */
  const asrUtc = () => {
    let utc = noonUtc + 4
    for (let i = 0; i < 3; i += 1) {
      const declination = declinationAt(utc)
      const altitude = Math.atan(1 / (asrFactor + tan(Math.abs(latitude - declination)))) / DEG
      const eventUtc = atAltitude(altitude, false)
      if (eventUtc == null) return null
      utc = eventUtc
    }
    return utc
  }

  const fajr = atAltitude(-fajrAngle, true)
  const sunrise = atAltitude(-horizon, true)
  const maghrib = atAltitude(-horizon, false)
  const isha = atAltitude(-ishaAngle, false)
  const asr = asrUtc()

  // UTC offset: pinned to the timetable's Dhuhr so it matches the location
  // (15-minute rounding absorbs the timetable's minute-level precision).
  let timezone = timezoneOffset
  if (!Number.isFinite(timezone)) {
    const reference = hoursOf(referenceDhuhr)
    timezone =
      reference != null
        ? Math.round((reference - noonUtc) * 4) / 4
        : -new Date().getTimezoneOffset() / 60
  }

  const local = (utc) => (utc == null ? null : utc + timezone)

  // The night runs from today's sunset to tomorrow's sunrise.
  let midnight = null
  let lastthird = null
  if (maghrib != null && sunrise != null) {
    const sunsetLocal = maghrib + timezone
    const sunriseLocal = sunrise + timezone
    const nightEnd = sunriseLocal > sunsetLocal ? sunriseLocal : sunriseLocal + 24
    const night = nightEnd - sunsetLocal
    if (Number.isFinite(night) && night > 0) {
      midnight = sunsetLocal + night / 2
      lastthird = sunsetLocal + (night * 2) / 3
    }
  }

  const result = {
    Fajr: formatClock(local(fajr)),
    Sunrise: formatClock(local(sunrise)),
    Dhuhr: formatClock(local(noonUtc)),
    Asr: formatClock(local(asr)),
    Maghrib: formatClock(local(maghrib)),
    Isha: formatClock(local(isha)),
    Midnight: formatClock(midnight),
    Lastthird: formatClock(lastthird),
  }

  return result.Fajr && result.Dhuhr && result.Asr ? result : null
}

/**
 * True when two "HH:MM[:SS]" clock strings sit within `limit` minutes of each
 * other (wrapping past midnight). Used before swapping a calculated time in
 * for the fetched one: it lets ±2 minutes of horizon/elevation difference
 * through while catching a wrong timezone or broken maths (those land hours
 * away, not minutes).
 */
export function withinMinutes(calculated, reference, limit = 30) {
  const a = hoursOf(calculated)
  const b = hoursOf(reference)
  if (a == null || b == null) return false
  const diff = Math.abs(a - b) * 60
  return Math.min(diff, 1440 - diff) <= limit
}
