/**
 * Regression test for the calendar crash: the hToGCalendar endpoint returns
 * days as { hijri, gregorian } — there is NO `date` wrapper (that shape only
 * belongs to the monthly prayer-times endpoint). Reading `day.date.gregorian`
 * used to throw and take the whole Calendar tab down.
 */
import React from 'react'
import ReactTestRenderer from 'react-test-renderer'

// The native safe-area module has no meaning in this test — stub it out.
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react')
  return {
    SafeAreaProvider: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    SafeAreaView: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 24, left: 0, right: 0, bottom: 16 }),
  }
})

const HIJRI_MONTH = { number: 4, en: 'Rabīʿ al-thānī', days: 30, ar: 'رَبيع الثاني' }

// Real hToGCalendar shape (verified against api.aladhan.com).
const realHToGCalendarResponse = {
  code: 200,
  status: 'OK',
  data: Array.from({ length: 30 }, (_, index) => {
    const day = index + 1
    return {
      hijri: {
        date: `${String(day).padStart(2, '0')}-04-1448`,
        day: String(day),
        weekday: { en: 'Al Ahad', ar: 'الاحد' },
        month: HIJRI_MONTH,
        year: '1448',
      },
      gregorian: {
        date: `${String(day).padStart(2, '0')}-09-2026`,
        day: String(day),
        weekday: { en: 'Sunday' },
        month: { number: 9, en: 'September' },
        year: '2026',
      },
    }
  }),
}

// Today, as returned by the gToH endpoint.
const realGToHResponse = {
  code: 200,
  status: 'OK',
  data: {
    hijri: {
      date: '23-04-1448',
      day: '23',
      weekday: { en: 'Al Ahad', ar: 'الاحد' },
      month: HIJRI_MONTH,
      year: '1448',
    },
    gregorian: { date: '23-09-2026' },
  },
}

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('/gToH/')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(realGToHResponse) })
    }
    if (target.includes('/hToGCalendar/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(realHToGCalendarResponse),
      })
    }
    return Promise.reject(new Error('unexpected url: ' + target))
  })
})

const flush = () => new Promise((resolve) => setImmediate(resolve))

test('Calendar screen renders the real hToGCalendar payload', async () => {
  const CalendarScreen = require('../src/Screens/Frontend/Calendar/index.jsx').default

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CalendarScreen />)
    await flush()
    await flush()
  })

  const rendered = JSON.stringify(renderer.toJSON())

  expect(rendered).toBeTruthy()
  expect(rendered).toContain("Rabi' al-Thani") // month title from HIJRI_MONTHS
  // 1 tareekh ka month marker — poora naam, 3 harf ka tukda nahi
  expect(rendered).toContain('Rabīʿ al-thānī')
  expect(rendered).toContain('1448')
  expect(rendered).toContain('Change month')
  expect(rendered).toContain('1 Sept 2026') // Gregorian range of the Hijri month
  expect(rendered).toContain('#D9B45B') // today's cell is highlighted in gold
})

/** Screen ke Text nodes ke baray strings (header, titles, labels). */
function textNodes(renderer) {
  return renderer.root
    .findAll((node) => typeof node.props.children === 'string')
    .map((node) => node.props.children)
}

test('first open with no internet: “—” header, never "Month null" / "null AH"', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  await AsyncStorage.clear() // koi saved Hijri date na ho — sab network se
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')))

  const CalendarScreen = require('../src/Screens/Frontend/Calendar/index.jsx').default
  const { ErrorState } = require('../src/Components/ui')

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CalendarScreen />)
    await flush()
    await flush()
    await flush()
  })

  const texts = textNodes(renderer)
  expect(renderer.root.findAllByType(ErrorState)).toHaveLength(1)
  expect(texts).toContain('—') // mahina/mahina abhi pata nahi
  expect(texts.some((text) => text.includes('Month '))).toBe(false) // "Month null" nahi
  expect(texts.some((text) => text.includes('AH'))).toBe(false) // "null AH" nahi

  await ReactTestRenderer.act(async () => {
    renderer.unmount()
  })
})

test('a hidden Calendar loads nothing; it loads as soon as its tab opens', async () => {
  const CalendarScreen = require('../src/Screens/Frontend/Calendar/index.jsx').default

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CalendarScreen active={false} />)
    await flush()
    await flush()
    await flush()
  })
  expect(textNodes(renderer)).toContain('—') // chhupi hui → initToday nahi chala

  await ReactTestRenderer.act(async () => {
    renderer.update(<CalendarScreen active />)
    await flush()
    await flush()
    await flush()
  })
  expect(textNodes(renderer)).toContain("Rabi' al-Thani") // ab khul gaya

  await ReactTestRenderer.act(async () => {
    renderer.unmount()
  })
})
