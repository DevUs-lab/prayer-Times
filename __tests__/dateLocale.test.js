/**
 * Home shows the gregorian date and the weekday strip in the chosen language,
 * so date.js must hand the locale it is given to the device (`intlLocale`).
 * A device without that locale's data must fall back to English and finally to
 * `toDateString` — never throw, never render an empty date.
 */
import { formatLongDate, formatWeekdayShort } from '../src/utils/date'

const DATE = new Date(2026, 9, 4) // Sunday, 4 October 2026

test('passes the given locale through to toLocaleDateString', () => {
  const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('formatted')
  try {
    expect(formatLongDate(DATE, 'ur-PK')).toBe('formatted')
    expect(spy).toHaveBeenLastCalledWith('ur-PK', expect.objectContaining({ weekday: 'long' }))

    expect(formatWeekdayShort(DATE, 'hi-IN')).toBe('formatted')
    expect(spy).toHaveBeenLastCalledWith('hi-IN', expect.objectContaining({ weekday: 'short' }))
  } finally {
    spy.mockRestore()
  }
})

test('a device with no Intl data falls back to English, then toDateString', () => {
  const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
    throw new Error('no Intl data for this locale')
  })
  try {
    expect(formatLongDate(DATE)).toBe(DATE.toDateString()) // "Sun Oct 04 2026"
    expect(formatWeekdayShort(DATE)).toBe('Sun')
  } finally {
    spy.mockRestore()
  }
})

test('ur-PK and hi-IN come back readable — English when the device has no data', () => {
  expect(formatLongDate(DATE, 'ur-PK')).not.toBe('')
  expect(formatLongDate(DATE, 'hi-IN')).not.toBe('')
  expect(formatWeekdayShort(DATE, 'ur-PK')).not.toBe('')
  expect(formatWeekdayShort(DATE, 'hi-IN')).not.toBe('')
  expect(formatLongDate(DATE, 'not-a-locale')).not.toBe('')
})
