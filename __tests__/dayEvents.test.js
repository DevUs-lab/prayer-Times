/**
 * Derived day events (Talu-e-Aftab, Ishraq, Duha, Zawal, night markers) and
 * the time arithmetic behind them. The app calculates prayer times itself now,
 * so every derived event must carry seconds too: Ishraq = sunrise + 20 min is
 * 06:23:59, not 06:24:00.
 */
import { buildDayEvents } from '../src/Screens/Services/prayerTimes'
import { minutesFromMidnight, shiftMinutes } from '../src/utils/date'

const day = {
  times: [
    { key: 'Fajr', time: '04:45:32' },
    { key: 'Sunrise', time: '06:03:59' },
    { key: 'Dhuhr', time: '11:59:32' },
    { key: 'Asr', time: '16:11:58' },
    { key: 'Maghrib', time: '17:54:37' },
    { key: 'Isha', time: '19:12:57' },
  ],
  extras: { midnight: '23:59:18', lastthird: '02:00:51' },
}

describe('shiftMinutes / minutesFromMidnight', () => {
  test('adds and subtracts minutes, keeping seconds', () => {
    expect(shiftMinutes('06:03:59', 20)).toBe('06:23:59')
    expect(shiftMinutes('11:59:32', -10)).toBe('11:49:32')
    expect(shiftMinutes('16:11:58', 0)).toBe('16:11:58')
    // minute-only input (Aladhan's raw string) still works
    expect(shiftMinutes('06:06', 20)).toBe('06:26:00')
  })

  test('wraps around midnight in both directions', () => {
    expect(shiftMinutes('23:50:30', 20)).toBe('00:10:30')
    expect(shiftMinutes('00:05:45', -10)).toBe('23:55:45')
    expect(shiftMinutes('00:47', 1440)).toBe('00:47:00')
  })

  test('keeps unparsable input untouched', () => {
    expect(shiftMinutes('nonsense', 5)).toBe('--:--')
    expect(shiftMinutes(null, 5)).toBe('--:--')
  })

  test('minutesFromMidnight parses and rejects', () => {
    expect(minutesFromMidnight('05:12')).toBe(312)
    expect(minutesFromMidnight('23:59:18 (PKT)')).toBe(1439)
    expect(minutesFromMidnight('')).toBeNull()
  })
})

describe('day events (next-prayer section)', () => {
  const events = buildDayEvents(day)
  const find = (key) => events.find((event) => event.key === key)

  test('includes sunrise, Ishraq, both Duhas, zawal and the night markers', () => {
    expect(events.map((event) => event.key)).toEqual([
      'lastthird',
      'talu',
      'ishraq',
      'duhaSughra',
      'duhaKubra',
      'zawal',
      'midnight',
    ])
    expect(find('talu').time).toBe('06:03:59')
    expect(find('talu').urdu).toBe('طلوع آفتاب')
  })

  test('window rules match the documented conventions, seconds included', () => {
    const daylight = minutesFromMidnight('17:54:37') - minutesFromMidnight('06:03:59') // 711
    const quarter = shiftMinutes('06:03:59', Math.round(daylight / 4)) // 09:01:59

    expect(find('ishraq').time).toBe('06:23:59') // sunrise + 20
    expect(find('duhaSughra')).toMatchObject({ time: '06:23:59', end: quarter, kind: 'window' })
    expect(find('duhaKubra')).toMatchObject({ time: quarter, end: '11:49:32', kind: 'window' })
    expect(find('zawal')).toMatchObject({ time: '11:49:32', end: '11:59:32', kind: 'window' })
    expect(find('midnight').time).toBe('23:59:18')
    expect(find('lastthird').time).toBe('02:00:51')
  })

  test('night markers come straight from the day extras', () => {
    expect(find('midnight').kind).toBe('point')
    expect(find('lastthird').hint).toBe('Baqi raat ka behtareen waqt')
  })

  test('survives a missing day / missing extras', () => {
    expect(buildDayEvents(null)).toEqual([])
    expect(buildDayEvents({ times: [{ key: 'Fajr', time: '04:46' }] })).toEqual([])
  })
})
