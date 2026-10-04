/**
 * Home screen: prayer table + the NOW/NEXT card, which merges prayers with
 * the day events (Talu-e-Aftab, Ishraq, Duha, zawal…). Renders against the
 * real Aladhan monthly payload shape.
 */
import React from 'react'
import ReactTestRenderer from 'react-test-renderer'

import { setActiveLang } from '../src/i18n/strings'

// Freeze "now" so the assertions never depend on the wall clock the suite
// happens to run at. Individual tests can override it via global.__FROZEN_NOW__.
jest.mock('../src/utils/date', () => {
  const actual = jest.requireActual('../src/utils/date')
  return {
    ...actual,
    nowInTimeZone: () => global.__FROZEN_NOW__ || new Date(2026, 9, 4, 5, 0, 0),
  }
})

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react')
  return {
    SafeAreaProvider: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    SafeAreaView: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 24, left: 0, right: 0, bottom: 16 }),
  }
})

// Prayer times are calculated in-app now (see solarTimes.js). This test is
// about rendering, not astronomy, so hand the screen one fixed day — seconds
// included — instead of values that shift with the date it runs on.
jest.mock('../src/Screens/Services/solarTimes', () => ({
  ...jest.requireActual('../src/Screens/Services/solarTimes'),
  computePrayerTimes: () => ({
    Fajr: '04:45:34',
    Sunrise: '06:04:22',
    Dhuhr: '11:59:27',
    Asr: '16:13:06',
    Maghrib: '17:54:05',
    Isha: '19:12:47',
    Midnight: '23:59:18',
    Lastthird: '02:00:51',
  }),
}))

const HIJRI = {
  date: '23-04-1448',
  day: '23',
  weekday: { en: 'Al Ahad' },
  month: { number: 4, en: 'Rabīʿ al-thānī', days: 30 },
  year: '1448',
}

const TIMINGS = {
  Fajr: '04:46 (PKT)',
  Sunrise: '06:06 (PKT)',
  Dhuhr: '11:59 (PKT)',
  Asr: '16:13 (PKT)',
  Maghrib: '17:52 (PKT)',
  Isha: '19:12 (PKT)',
  Midnight: '00:47 (PKT)',
  Lastthird: '02:15 (PKT)',
}

function dayEntry(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return {
    timings: TIMINGS,
    date: {
      hijri: HIJRI,
      gregorian: {
        day,
        month: { number: date.getMonth() + 1 },
        year: String(date.getFullYear()),
        date: `${day}-${month}-${date.getFullYear()}`,
      },
    },
    meta: { timezone: 'Asia/Karachi', latitude: 31.27, longitude: 72.31 },
  }
}

function monthlyPayload() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { code: 200, status: 'OK', data: [dayEntry(today), dayEntry(tomorrow)] }
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

/** Flatten every <Text> content into one searchable string (avoids React's circular props). */
function renderedText(renderer) {
  const { Text } = require('react-native')
  const parts = []
  const walk = (node) => {
    if (node == null) return
    if (typeof node === 'string' || typeof node === 'number') {
      parts.push(String(node))
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node === 'object') walk(node.props && node.props.children)
  }
  renderer.root.findAllByType(Text).forEach((node) => walk(node.props.children))
  return parts.join(' | ')
}

const HOME_LOCATION = {
  type: 'manual',
  latitude: 31.27,
  longitude: 72.31,
  label: 'Jhang, Punjab, Pakistan',
}

/** Mount Home, let it settle, hand the live renderer to `run`, always unmount (1s interval). */
async function withHome(run, location = HOME_LOCATION) {
  const Home = require('../src/Screens/Frontend/index.jsx').default

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Home location={location} onOpenSettings={jest.fn()} />,
    )
    await flush()
    await flush()
    await flush()
    await flush()
  })

  try {
    return await run(renderer)
  } finally {
    await ReactTestRenderer.act(async () => {
      renderer.unmount()
    })
  }
}

/** Mount Home, let it settle, return its text — always unmounts (1s interval). */
async function renderHome() {
  return withHome(async (renderer) => renderedText(renderer))
}

beforeEach(() => {
  global.__FROZEN_NOW__ = null
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('/v1/calendar/')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(monthlyPayload()) })
    }
    // weather: rejected on purpose — the screen must survive without it
    return Promise.reject(new Error('offline: ' + target))
  })
})

afterEach(() => {
  global.__FROZEN_NOW__ = null
  setActiveLang('en') // a test that switches languages must not leak it
})

test('Home shows the prayer table and Talu-e-Aftab as what comes after Fajr', async () => {
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 5, 0, 0) // 5:00 AM — Fajr is running
  const rendered = await renderHome()

  // header + prayer table
  expect(rendered).toContain('Prayer Times')
  expect(rendered).toContain('Jhang, Punjab, Pakistan')
  expect(rendered).toContain('STARTS')
  expect(rendered).toContain('Fajr')

  // NO separate "baqi auqat" list — everything lives in the NOW/NEXT card
  expect(rendered).not.toContain('AAJ KE BAQI AUQAT')
  expect(rendered).toContain('NOW') // the running prayer
  expect(rendered).toContain('Talu-e-Aftab') // NEXT line: sunrise takes over
  expect(rendered).toContain('Fajr ends in')
  expect(rendered).toContain('Ends')
  expect(rendered).toContain('6:04:22 AM') // calculated sunrise, seconds and all
  expect(rendered).toContain('01:04:22') // frozen clock: 5:00:00 → 6:04:22
  // an event never steals the prayer table's highlight
  expect(rendered).toContain('Dhuhr')
})

test('during Zuhr the card counts "Dhuhr ends in" down to Asr', async () => {
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 12, 2, 0, 0) // just after Dhuhr
  const rendered = await renderHome()

  expect(rendered).toContain('NOW')
  expect(rendered).toContain('Dhuhr') // the row
  expect(rendered).toContain('Noon') // its English gloss (sublabel)
  expect(rendered).toContain('Dhuhr ends in')
  expect(rendered).toContain('04:11:06') // 12:02:00 → 16:13:06
  expect(rendered).toContain('Asr') // NEXT line
  expect(rendered).toContain('4:13:06 PM')
})

test('pull-to-refresh without network: saved times stay, a note explains', async () => {
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 5, 0, 0)
  await withHome(async (renderer) => {
    const before = renderedText(renderer)
    expect(before).toContain('4:45:34 AM') // pehle se saved times

    // network gaya — ab har download fail hoga
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')))

    const { ICONS } = require('../src/Components/icons')
    // Pressable RN ke andar memo/forwardRef hai, isliye type se nahi — us node
    // ko dhoondein jiske paas onPress ho aur refresh icon uske andar ho.
    const refreshButton = renderer.root
      .findAll((node) => node.props && typeof node.props.onPress === 'function')
      .find(
        (node) =>
          node.findAll((child) => child.props && child.props.name === ICONS.refresh).length > 0,
      )
    expect(refreshButton).toBeTruthy()

    await ReactTestRenderer.act(async () => {
      refreshButton.props.onPress() // wahi raasta jo pull-to-refresh bhi kholta hai
      await flush()
      await flush()
      await flush()
      await flush()
    })

    const after = renderedText(renderer)
    expect(after).toContain('No internet') // note screen par
    expect(after).toContain('4:45:34 AM') // purana data wahi pada hai
    expect(after).not.toContain('Loading prayer times')
  })
})

test('during Duha-e-Kubra the Now card shows it (an event, never a table row)', async () => {
  // sunrise 6:04:22 + maghrib 17:54:05 → ¼ daylight ≈ 9:01, zawal ≈ 11:49
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 10, 0, 0)
  const rendered = await renderHome()

  expect(rendered).toContain('NOW')
  expect(rendered).toContain('Duha-e-Kubra') // the running segment
  expect(rendered).toContain('Duha-e-Kubra ends in') // its countdown caption
  expect(rendered).toContain('Zawal (Makrooh)') // NEXT line: zawal takes over
})

test('Roman Urdu mode speaks the legacy captions and headings again', async () => {
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 12, 2, 0, 0)
  setActiveLang('rom')
  try {
    const rendered = await renderHome()
    expect(rendered).toContain('Zuhr ka waqt khatam hone mein')
    expect(rendered).toContain('Zuhr') // Dhuhr's Roman-Urdu sublabel
    expect(rendered).toContain('baqi waqt')
    expect(rendered).toContain('Aaj ki nawazein · Hanafi Asr')
    expect(rendered).not.toContain('Dhuhr ends in')
  } finally {
    setActiveLang('en')
  }
})

test('an IP (approximate) location shows no warning — that feature is gone', async () => {
  // Auto-detect ab sirf GPS hai; purana IP-wala save data ho to bhi koi
  // "approximate" banner nahi dikhta.
  await withHome(
    async (renderer) => {
      expect(renderedText(renderer)).not.toContain('Location is approximate')
    },
    { type: 'ip', latitude: 30.0, longitude: 71.0, label: 'Pakistan' },
  )

  // aam (GPS/manual) jagah par bhi wahi — kabhi nahi
  const normal = await renderHome()
  expect(normal).not.toContain('Location is approximate')
})

test('a load error re-translates when the language changes (key, not a frozen string)', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  await AsyncStorage.clear() // koi cache na ho — load ko fail hi hona hai
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')))
  const Home = require('../src/Screens/Frontend/index.jsx').default

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Home location={HOME_LOCATION} onOpenSettings={jest.fn()} />,
    )
    await flush()
    await flush()
    await flush()
    await flush()
  })

  try {
    expect(renderedText(renderer)).toContain('No internet — the first download is needed')

    // state wahi hai (koi dobara load nahi) — sirf render par dobara bana
    setActiveLang('ur')
    await ReactTestRenderer.act(async () => {
      renderer.update(<Home location={HOME_LOCATION} onOpenSettings={jest.fn()} />)
      await flush()
    })
    expect(renderedText(renderer)).toContain('انٹرنیٹ نہیں — پہلی بار ڈاؤن لوڈ ضروری ہے')
  } finally {
    setActiveLang('en')
    await ReactTestRenderer.act(async () => {
      renderer.unmount()
    })
  }
})

test('a quick location change keeps only the newest city’s answer', async () => {
  global.__FROZEN_NOW__ = new Date(2026, 9, 4, 5, 0, 0)

  const OLD = { type: 'manual', latitude: 11.11, longitude: 22.22, label: 'Old City' }
  const NEW = { type: 'manual', latitude: 33.33, longitude: 44.44, label: 'New City' }

  // Pehli jagah ka jawab rok kar rakho — bilkul wahi race jo phone par hota hai
  let releaseOld
  const oldAnswer = new Promise((resolve) => {
    releaseOld = resolve
  })

  const payloadFor = (hijriMonth) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const entry = (date) => {
      const base = dayEntry(date)
      return {
        ...base,
        date: {
          ...base.date,
          hijri: {
            ...HIJRI,
            month: { number: hijriMonth === 'Muharram' ? 1 : 4, en: hijriMonth, days: 30 },
          },
        },
      }
    }
    return { code: 200, status: 'OK', data: [entry(today), entry(tomorrow)] }
  }

  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('/v1/calendar/')) {
      const isOld = target.includes('latitude=11.11')
      const body = payloadFor(isOld ? 'Muharram' : 'Rabīʿ al-thānī')
      const answer = () => ({ ok: true, status: 200, json: () => Promise.resolve(body) })
      return isOld ? oldAnswer.then(answer) : Promise.resolve(answer())
    }
    return Promise.reject(new Error('offline: ' + target))
  })

  const Home = require('../src/Screens/Frontend/index.jsx').default

  await withHome(
    async (renderer) => {
      // jagah badli — nayi jagah ka jawab foran aata hai
      await ReactTestRenderer.act(async () => {
        renderer.update(<Home location={NEW} onOpenSettings={jest.fn()} />)
        await flush()
        await flush()
        await flush()
        await flush()
      })
      expect(renderedText(renderer)).toContain('Rabīʿ al-thānī') // nayi jagah

      // ab purana (rok kar rakha) jawab pohanchta hai
      await ReactTestRenderer.act(async () => {
        releaseOld()
        await flush()
        await flush()
        await flush()
        await flush()
      })

      const after = renderedText(renderer)
      expect(after).toContain('Rabīʿ al-thānī') // wahi rehna chahiye
      expect(after).not.toContain('Muharram') // purana jawab dobara na chhape
    },
    OLD,
  )
})
