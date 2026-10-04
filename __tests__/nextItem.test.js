/**
 * The Home "next" card: one merged timeline of prayers + day events, so that
 * after Fajr the next entry is Talu-e-Aftab (not Dhuhr), and the countdown
 * runs to the end of the running prayer's waqt — e.g. at 12:02 English shows
 * "Dhuhr ends in 04:11:00" while Roman Urdu keeps
 * "Zuhr ka waqt khatam hone mein 04:11:00".
 */
import { buildDayEvents, computeNextItem, withWindows } from '../src/Screens/Services/prayerTimes'
import { setActiveLang } from '../src/i18n/strings'

const TIMES = [
  { key: 'Fajr', label: 'Fajr', urdu: 'Fajr', icon: 'weather-night', isPrayer: true, time: '04:46' },
  {
    key: 'Sunrise',
    label: 'Sunrise',
    urdu: 'Suraj charhta hai',
    icon: 'weather-sunset-up',
    isPrayer: false,
    time: '06:06',
  },
  { key: 'Dhuhr', label: 'Dhuhr', urdu: 'Zuhr', icon: 'weather-sunny', isPrayer: true, time: '11:59' },
  {
    key: 'Asr',
    label: 'Asr',
    urdu: 'Asr (Hanafi)',
    icon: 'weather-partly-cloudy',
    isPrayer: true,
    time: '16:13',
  },
  {
    key: 'Maghrib',
    label: 'Maghrib',
    urdu: 'Maghrib',
    icon: 'weather-sunset-down',
    isPrayer: true,
    time: '17:52',
  },
  {
    key: 'Isha',
    label: 'Isha',
    urdu: 'Isha',
    icon: 'moon-waning-crescent',
    isPrayer: true,
    time: '19:12',
  },
]

const EXTRAS = { midnight: '00:47', lastthird: '02:15' }
const TOMORROW_FAJR = '04:46'

const windows = () => withWindows(TIMES, TOMORROW_FAJR)
const events = () => buildDayEvents({ times: TIMES, extras: EXTRAS })
const at = (hours, minutes) => new Date(2026, 9, 4, hours, minutes, 0, 0) // 4 Oct 2026
const minutes = (value) => value * 60 * 1000

const next = (hours, minutesOfDay) =>
  computeNextItem(windows(), events(), TOMORROW_FAJR, at(hours, minutesOfDay))

describe('computeNextItem', () => {
  test('during Fajr the next entry is Talu-e-Aftab, not Dhuhr', () => {
    const result = next(5, 0)

    expect(result.current.key).toBe('Fajr')
    expect(result.target.key).toBe('talu') // deduped against the Sunrise row
    expect(result.target.label).toBe('Talu-e-Aftab')
    expect(result.caption).toBe('Fajr ends in')
    expect(result.remaining).toBe(minutes(66)) // 5:00 → 6:06
    expect(result.nextPrayer.label).toBe('Dhuhr') // table highlight
    expect(result.progress).toBeCloseTo(14 / 80, 5) // 14 min into Fajr's 80
  })

  test('during Zuhr the countdown runs to Asr (the waqt that is ending)', () => {
    const result = next(12, 2)

    expect(result.current.key).toBe('Dhuhr')
    expect(result.target.label).toBe('Asr')
    expect(result.caption).toBe('Dhuhr ends in')
    expect(result.remaining).toBe(minutes(4 * 60 + 11)) // 12:02 → 16:13
    expect(result.nextPrayer.label).toBe('Asr')
  })

  test('between sunrise and Ishraq the events lead', () => {
    const result = next(6, 10)

    expect(result.current.label).toBe('Talu-e-Aftab')
    expect(result.target.label).toBe('Ishraq')
    expect(result.caption).toBe('Talu-e-Aftab ends in')
    expect(result.remaining).toBe(minutes(16)) // 6:10 → 6:26
    expect(result.nextPrayer.label).toBe('Dhuhr')
  })

  test('during the zawal window the countdown stops at Dhuhr', () => {
    const result = next(11, 52)

    expect(result.current.label).toBe('Zawal (Makrooh)')
    expect(result.target.label).toBe('Dhuhr')
    expect(result.target.urdu).toBe('Zuhr')
    expect(result.caption).toBe('Zawal (Makrooh) ends in')
    expect(result.remaining).toBe(minutes(7)) // 11:52 → 11:59
  })

  test('during Isha it counts down to tomorrow\u2019s Fajr, skipping the night markers', () => {
    const result = next(20, 0)

    expect(result.current.label).toBe('Isha')
    expect(result.target.key).toBe('Fajr')
    expect(result.caption).toBe('Isha ends in')
    expect(result.remaining).toBe(minutes(8 * 60 + 46)) // 20:00 → 04:46
  })

  test('before Fajr the night markers of last night are still running', () => {
    const result = next(1, 0)

    // Nisf al-Layl started at 00:47 and runs until the aakhri third at 02:15,
    // so at 1 a.m. the card speaks for that segment, not for a prayer.
    expect(result.current.label).toBe('Nisf al-Layl')
    expect(result.target.label).toBe('Aakhri third')
    expect(result.caption).toBe('Nisf al-Layl ends in')
    expect(result.nextPrayer.label).toBe('Fajr')
    expect(result.progress).toBeGreaterThan(0)
    expect(result.progress).toBeLessThan(1)
  })

  test('late at night the night markers are skipped — the countdown ends at Fajr', () => {
    const night = next(23, 0)

    expect(night.current.label).toBe('Isha')
    expect(night.target.label).toBe('Fajr')
    expect(night.caption).toBe('Isha ends in')

    const afterMidnight = computeNextItem(windows(), events(), TOMORROW_FAJR, at(1, 30))
    expect(afterMidnight.current.label).toBe('Nisf al-Layl')
    expect(afterMidnight.target.label).toBe('Aakhri third')
  })

  test('Roman Urdu keeps the legacy caption ("Zuhr ka waqt khatam hone mein")', () => {
    setActiveLang('rom')
    try {
      const result = next(12, 2)
      expect(result.caption).toBe('Zuhr ka waqt khatam hone mein')
    } finally {
      setActiveLang('en')
    }
  })

  test('handles an empty day', () => {
    expect(computeNextItem([], [], null, at(12, 0)).target).toBeNull()
  })
})
