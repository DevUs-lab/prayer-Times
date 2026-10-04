/**
 * Tab switching must never reload a screen the user has already seen.
 *
 * A year of timetables is saved on the phone, so Home/Calendar should come
 * back with the data already on screen — no spinner, internet or not. The
 * shell keeps every opened tab mounted (hidden with display:none); this test
 * locks that in by killing the network after the first load: if a tab
 * remounted, it would be stuck on "Loading prayer times…".
 */
import React from 'react'
import ReactTestRenderer from 'react-test-renderer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Text } from 'react-native'

import { setActiveLang } from '../src/i18n/strings'

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react')
  return {
    SafeAreaProvider: ({ children }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    SafeAreaView: ({ children }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 24, left: 0, right: 0, bottom: 16 }),
  }
})

const flush = () => new Promise((resolve) => setImmediate(resolve))

async function settle() {
  for (let i = 0; i < 8; i += 1) await flush()
}

// Requests the test deliberately hangs. They are released before unmounting
// so http.js's timeout timers are cleared and Jest can exit cleanly.
const hangs = []

function hangFetch() {
  return new Promise((resolve, reject) => {
    hangs.push(reject)
  })
}

async function releaseHangs() {
  await ReactTestRenderer.act(async () => {
    while (hangs.length > 0) hangs.shift()(new TypeError('Network request failed'))
    await settle()
  })
}

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

/** Mount the shell as a returning user (language + location already saved). */
async function mountApp() {
  const Screens = require('../src/Screens').default
  const { LanguageProvider } = require('../src/i18n')

  let renderer
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LanguageProvider>
        <Screens />
      </LanguageProvider>,
    )
    await settle()
  })
  return renderer
}

async function unmount(renderer) {
  await ReactTestRenderer.act(async () => {
    renderer.unmount()
  })
}

function textOf(renderer) {
  const parts = []
  renderer.root.findAllByType(Text).forEach((node) => {
    const children = node.props.children
    const value = Array.isArray(children)
      ? children.map((child) => (typeof child === 'object' ? '' : String(child))).join(' ')
      : String(children)
    parts.push(value)
  })
  return parts.join(' | ')
}

/** The TabBar sets accessibilityLabel on each tab — that is the tap target. */
async function pressTab(renderer, label) {
  const tab = renderer.root
    .findAll((node) => node.props && typeof node.props.onPress === 'function')
    .find((node) => node.props.accessibilityLabel === label)
  expect(tab).toBeTruthy()
  await ReactTestRenderer.act(async () => {
    tab.props.onPress()
    await settle()
  })
}

beforeEach(async () => {
  await AsyncStorage.clear()
  await AsyncStorage.setItem('@pt/lang', 'en')
  await AsyncStorage.setItem('@pt/onboarded', '1')
  await AsyncStorage.setItem(
    'user_location',
    JSON.stringify({
      type: 'manual',
      latitude: 31.27,
      longitude: 72.31,
      label: 'Jhang, Punjab, Pakistan',
    }),
  )

  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('/v1/calendar/')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(monthlyPayload()) })
    }
    return Promise.reject(new Error('offline: ' + target))
  })
})

afterEach(async () => {
  // Safety net: a failed expectation must not leave hanging requests behind.
  await releaseHangs()
  setActiveLang('en')
})

test('coming back to a tab shows the saved data — no loading, no network needed', async () => {
  const app = await mountApp()

  // First visit: Home loads its day from the saved timetable.
  expect(textOf(app)).toContain('Jhang, Punjab, Pakistan')
  expect(textOf(app)).toContain('STARTS')
  expect(textOf(app)).not.toContain('Loading prayer times')

  // Internet gone: every later request hangs forever.
  global.fetch = jest.fn(() => hangFetch())

  await pressTab(app, 'Calendar')
  // Calendar is on its own first load — it may spin, Home must not be touched.
  expect(textOf(app)).toContain('Jhang, Punjab, Pakistan')

  await pressTab(app, 'Home')
  expect(textOf(app)).toContain('Jhang, Punjab, Pakistan')
  expect(textOf(app)).toContain('STARTS')
  expect(textOf(app)).not.toContain('Loading prayer times')

  await releaseHangs()
  await unmount(app)
})
