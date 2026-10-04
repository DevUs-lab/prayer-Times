import {
  formatCountdown,
  formatTime12,
  fromDmy,
  parseTime,
  toDmy,
} from '../src/utils/date'
import { computeNextPrayer, withWindows } from '../src/Screens/Services/prayerTimes'

describe('date helpers', () => {
  test('parseTime strips the timezone suffix Aladhan returns', () => {
    expect(parseTime('05:12 (EET)')).toEqual({ hours: 5, minutes: 12, seconds: 0 })
    expect(parseTime('23:05')).toEqual({ hours: 23, minutes: 5, seconds: 0 })
    expect(parseTime('04:45:32 (PKT)')).toEqual({ hours: 4, minutes: 45, seconds: 32 })
    expect(parseTime(null)).toBeNull()
    expect(parseTime('not a time')).toBeNull()
  })

  test('formatTime12 renders a 12-hour clock with seconds', () => {
    expect(formatTime12('05:12 (EET)')).toBe('5:12:00 AM')
    expect(formatTime12('13:05')).toBe('1:05:00 PM')
    expect(formatTime12('00:30')).toBe('12:30:00 AM')
    expect(formatTime12('12:00')).toBe('12:00:00 PM')
    expect(formatTime12('04:45:32')).toBe('4:45:32 AM')
    expect(formatTime12(undefined)).toBe('--:--')
  })

  test('formatCountdown formats hours, minutes and seconds', () => {
    expect(formatCountdown(3661000)).toBe('01:01:01')
    expect(formatCountdown(0)).toBe('00:00:00')
    expect(formatCountdown(-5000)).toBe('00:00:00')
    expect(formatCountdown(90061000)).toBe('1d 01:01:01')
  })

  test('DD-MM-YYYY round trip', () => {
    expect(toDmy(new Date(2026, 9, 3))).toBe('03-10-2026')
    const parsed = fromDmy('03-10-2026')
    expect(parsed.getUTCDate()).toBe(3)
    expect(parsed.getUTCMonth()).toBe(9)
    expect(parsed.getUTCFullYear()).toBe(2026)
  })
})

describe('withWindows (start + end timings)', () => {
  const times = [
    { key: 'Fajr', label: 'Fajr', isPrayer: true, time: '05:12' },
    { key: 'Sunrise', label: 'Sunrise', isPrayer: false, time: '06:30' },
    { key: 'Dhuhr', label: 'Dhuhr', isPrayer: true, time: '12:20' },
    { key: 'Asr', label: 'Asr', isPrayer: true, time: '15:45' },
    { key: 'Maghrib', label: 'Maghrib', isPrayer: true, time: '18:10' },
    { key: 'Isha', label: 'Isha', isPrayer: true, time: '19:30' },
  ]

  test('each prayer ends when the next entry begins', () => {
    const windows = withWindows(times, '05:14')
    const byKey = Object.fromEntries(windows.map((item) => [item.key, item]))

    expect(byKey.Fajr.end).toBe('06:30') // Fajr ends at sunrise
    expect(byKey.Dhuhr.end).toBe('15:45') // Dhuhr ends at Asr
    expect(byKey.Asr.end).toBe('18:10') // Asr ends at Maghrib
    expect(byKey.Maghrib.end).toBe('19:30') // Maghrib ends at Isha
    expect(byKey.Isha.end).toBe('05:14') // Isha ends at tomorrow's Fajr
  })

  test('the end time carries through to the next-prayer card', () => {
    const windows = withWindows(times, '05:14')
    const now = new Date(2026, 9, 3, 13, 0)
    const result = computeNextPrayer(windows, null, now)

    expect(result.next.key).toBe('Asr')
    expect(result.next.end).toBe('18:10')
  })

  test('missing tomorrow Fajr leaves the last end unknown', () => {
    const windows = withWindows(times, null)
    expect(windows[windows.length - 1].end).toBeNull()
  })
})

describe('computeNextPrayer', () => {
  const times = [
    { key: 'Fajr', label: 'Fajr', isPrayer: true, time: '05:12' },
    { key: 'Sunrise', label: 'Sunrise', isPrayer: false, time: '06:30' },
    { key: 'Dhuhr', label: 'Dhuhr', isPrayer: true, time: '12:20' },
    { key: 'Asr', label: 'Asr', isPrayer: true, time: '15:45' },
    { key: 'Maghrib', label: 'Maghrib', isPrayer: true, time: '18:10' },
    { key: 'Isha', label: 'Isha', isPrayer: true, time: '19:30' },
  ]
  const tomorrowFajr = {
    key: 'Fajr',
    label: 'Fajr',
    isPrayer: true,
    time: '05:14',
    at: new Date(2026, 9, 4, 5, 14),
  }

  test('picks the next prayer and the one before it', () => {
    const now = new Date(2026, 9, 3, 13, 0)
    const result = computeNextPrayer(times, tomorrowFajr, now)

    expect(result.next.key).toBe('Asr')
    expect(result.previous.key).toBe('Dhuhr')
    expect(result.progress).toBeGreaterThan(0)
    expect(result.progress).toBeLessThan(1)
  })

  test('sunrise is shown but never counts as a prayer', () => {
    const now = new Date(2026, 9, 3, 5, 30)
    const result = computeNextPrayer(times, tomorrowFajr, now)

    expect(result.next.key).toBe('Dhuhr')
    expect(result.previous.key).toBe('Fajr')
  })

  test('falls back to tomorrow Fajr once Isha has passed', () => {
    const now = new Date(2026, 9, 3, 20, 0)
    const result = computeNextPrayer(times, tomorrowFajr, now)

    expect(result.next).toBe(tomorrowFajr)
    expect(result.previous.key).toBe('Isha')
  })

  test('no previous prayer before Fajr', () => {
    const now = new Date(2026, 9, 3, 4, 0)
    const result = computeNextPrayer(times, tomorrowFajr, now)

    expect(result.next.key).toBe('Fajr')
    expect(result.previous).toBeNull()
    expect(result.progress).toBe(0)
  })
})
