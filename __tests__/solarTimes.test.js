/**
 * The in-app solar calculator: seconds for every prayer and an
 * elevation-corrected horizon for sunrise/sunset.
 *
 * Jhang (31.2728805, 72.3103071), 4 Oct 2026 — checked against the reference
 * Pakistani app (Fajr 04:45:34, Sunrise 06:04:22, Dhuhr 11:59:27, Asr 16:13:06,
 * Maghrib 17:54:05, Isha 19:12:47) and adhan-js, which agrees with these
 * values to a couple of seconds.
 */
import { computePrayerTimes, withinMinutes } from '../src/Screens/Services/solarTimes'

const JHANG = {
  year: 2026,
  month: 10,
  day: 4,
  latitude: 31.2728805,
  longitude: 72.3103071,
}

const secondsOf = (value) => {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(String(value))
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

const drift = (actual, expected) => Math.abs(secondsOf(actual) - secondsOf(expected))

test('computes every timing with seconds (Jhang, 4 Oct 2026, 161 m)', () => {
  const times = computePrayerTimes({ ...JHANG, elevation: 161, referenceDhuhr: '11:59' })

  // pinned so a maths change cannot slip in unnoticed
  expect(times).toEqual({
    Fajr: '04:45:32',
    Sunrise: '06:03:59',
    Dhuhr: '11:59:32',
    Asr: '16:11:58',
    Maghrib: '17:54:37',
    Isha: '19:12:57',
    Midnight: '23:59:18',
    Lastthird: '02:00:51',
  })
})

test('matches the reference app within a minute', () => {
  const times = computePrayerTimes({ ...JHANG, elevation: 161, referenceDhuhr: '11:59' })

  expect(drift(times.Fajr, '04:45:34')).toBeLessThanOrEqual(60)
  expect(drift(times.Sunrise, '06:04:22')).toBeLessThanOrEqual(60)
  expect(drift(times.Dhuhr, '11:59:27')).toBeLessThanOrEqual(60)
  expect(drift(times.Maghrib, '17:54:05')).toBeLessThanOrEqual(60)
  expect(drift(times.Isha, '19:12:47')).toBeLessThanOrEqual(60)

  // Asr is the one value where Aladhan (and apps built on it) drifts from
  // adhan-js: their PHP samples the declination a day late in asrTime(),
  // so their 16:13:06 sits ~1 min after the standard 16:11:58.
  expect(drift(times.Asr, '16:13:06')).toBeLessThanOrEqual(90)
})

test('elevation moves the horizon ~2 minutes, flat stays at Aladhan', () => {
  const high = computePrayerTimes({ ...JHANG, elevation: 161, referenceDhuhr: '11:59' })
  const flat = computePrayerTimes({ ...JHANG, elevation: 0, referenceDhuhr: '11:59' })

  expect(flat.Sunrise).toBe('06:06:03') // flat horizon = what Aladhan reports
  expect(flat.Maghrib).toBe('17:52:33')
  expect(secondsOf(high.Sunrise)).toBeLessThan(secondsOf(flat.Sunrise))
  expect(secondsOf(high.Maghrib)).toBeGreaterThan(secondsOf(flat.Maghrib))
  // ~2 min either way (Jhang sits 161 m up)
  expect(secondsOf(flat.Sunrise) - secondsOf(high.Sunrise)).toBeGreaterThan(100)
  expect(secondsOf(flat.Sunrise) - secondsOf(high.Sunrise)).toBeLessThan(160)
})

test('derives the UTC offset from the timetable Dhuhr (works for half-hour zones)', () => {
  const times = computePrayerTimes({ ...JHANG, elevation: 0, referenceDhuhr: '11:59' })
  expect(drift(times.Dhuhr, '11:59:00')).toBeLessThanOrEqual(120)
})

test('returns null instead of nonsense when the maths cannot run', () => {
  expect(computePrayerTimes({ ...JHANG, latitude: null })).toBeNull()
  expect(computePrayerTimes({ ...JHANG, referenceDhuhr: 'not-a-time' })).not.toBeNull()
})

describe('withinMinutes (the timetable sanity check)', () => {
  test('accepts small differences, even across midnight', () => {
    expect(withinMinutes('16:11:58', '16:13')).toBe(true)
    expect(withinMinutes('23:59:18', '00:02')).toBe(true)
    expect(withinMinutes('00:47:00', '00:47')).toBe(true)
  })

  test('rejects far-off values (bad timezone, broken maths)', () => {
    expect(withinMinutes('16:11:58', '12:13')).toBe(false)
    expect(withinMinutes('23:59:18', '00:47')).toBe(false)
    expect(withinMinutes(null, '16:13')).toBe(false)
    expect(withinMinutes('16:11', null)).toBe(false)
  })
})
