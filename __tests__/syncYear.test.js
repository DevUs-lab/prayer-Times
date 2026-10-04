/**
 * Offline-first storage: one refresh puts a whole year of timetables on the
 * phone, later opens update only when they should (missing months / 30 days
 * old / explicit pull), and a missing network never wipes saved data.
 *
 * "Now" is pinned to 4 Oct 2026 so the year logic (and the Nov/Dec rule that
 * also syncs next year) never depends on when the suite runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getMonthTimetable, syncIfNeeded, syncYear } from '../src/Screens/Services/prayerTimes'

const HOME = { latitude: 31.27, longitude: 72.31 }
const AWAY = { latitude: 10, longitude: 10 }
const FROZEN = new Date(2026, 9, 4, 12, 0, 0)

const HIJRI = {
  day: '23',
  month: { number: 4, en: 'Rabīʿ al-thānī', days: 30 },
  year: '1448',
}

function dayEntry(date) {
  const day = String(date.getDate()).padStart(2, '0')
  return {
    timings: { Fajr: '04:46 (PKT)', Dhuhr: '11:59 (PKT)', Isha: '19:12 (PKT)' },
    date: {
      hijri: HIJRI,
      gregorian: { day, month: { number: date.getMonth() + 1 }, year: String(date.getFullYear()) },
    },
    meta: { timezone: 'Asia/Karachi' },
  }
}

function monthlyPayload(year, month) {
  return { code: 200, status: 'OK', data: [dayEntry(new Date(year, month, 15))] }
}

let fetchCalls
let online

function installFetch() {
  fetchCalls = []
  global.fetch = jest.fn((url) => {
    const target = String(url)
    const match = /\/v1\/calendar\/(\d{4})\/(\d{1,2})/.exec(target)
    if (!match) return Promise.reject(new Error('offline: ' + target))
    fetchCalls.push(target)
    if (!online) return Promise.reject(new TypeError('Network request failed'))
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(monthlyPayload(Number(match[1]), Number(match[2]) - 1)),
    })
  })
}

const readMonth = (location, date) =>
  getMonthTimetable({ latitude: location.latitude, longitude: location.longitude, date })

beforeEach(async () => {
  jest.useFakeTimers()
  jest.setSystemTime(FROZEN)
  await AsyncStorage.clear()
  online = true
  installFetch()
})

afterEach(() => {
  jest.useRealTimers()
  global.fetch = undefined
})

test('one sync pulls all 12 months, every one readable with the network off', async () => {
  const result = await syncYear({ ...HOME, year: 2026 })

  expect(result).toEqual({ synced: 12, failed: 0 })
  expect(fetchCalls).toHaveLength(12)

  online = false
  for (let month = 0; month < 12; month += 1) {
    const data = await readMonth(HOME, new Date(2026, month, 15))
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
  }
  expect(fetchCalls).toHaveLength(12) // cache-first: not one request went out
})

test('fresh year is left alone; missing months are filled without re-downloading', async () => {
  await readMonth(HOME, new Date(2026, 5, 15)) // June already on the phone

  const first = await syncIfNeeded(HOME)
  expect(first).toEqual({ synced: 12, failed: 0 })
  expect(fetchCalls).toHaveLength(12) // 1 (June pehle se) + 11 missing

  const second = await syncIfNeeded(HOME)
  expect(second).toEqual({ synced: 0, failed: 0 })
  expect(fetchCalls).toHaveLength(12) // meta fresh → koi request nahi
})

test('force (pull-to-refresh) re-downloads all 12 months', async () => {
  await syncYear({ ...HOME, year: 2026 })
  fetchCalls.length = 0

  const result = await syncYear({ ...HOME, year: 2026, refreshAll: true })

  expect(result).toEqual({ synced: 12, failed: 0 })
  expect(fetchCalls).toHaveLength(12)
})

test('no network on a pull: keeps saved data, reports it, does not mark data stale', async () => {
  await syncYear({ ...HOME, year: 2026 }) // pehle sab save ho chuka hai
  fetchCalls.length = 0
  online = false

  await expect(syncIfNeeded({ ...HOME, force: true })).rejects.toThrow(/No internet/)

  fetchCalls.length = 0 // ab sirf cache se parhna hai — koi request nahi
  const data = await readMonth(HOME, new Date(2026, 0, 15)) // purana data wahi pada hai
  expect(data).toHaveLength(1)
  expect(fetchCalls).toHaveLength(0)

  // failed pull ne meta ko stale nahi banaya → agla open dobara koshish nahi karta
  const nextOpen = await syncIfNeeded(HOME)
  expect(nextOpen).toEqual({ synced: 0, failed: 0 })
  expect(fetchCalls).toHaveLength(0)
})

test('no cache and no network fails with a message the screen can show', async () => {
  online = false
  await expect(readMonth(HOME, new Date(2026, 9, 15))).rejects.toThrow(/No internet/)
})

test('two callers for the same month share a single request (aaj + kal)', async () => {
  const date = new Date(2026, 9, 15)
  const [today, tomorrow] = await Promise.all([readMonth(HOME, date), readMonth(HOME, date)])

  expect(fetchCalls).toHaveLength(1)
  expect(today).toBe(tomorrow)
})

test('force ignores the cache', async () => {
  const date = new Date(2026, 9, 15)
  await readMonth(HOME, date)
  await getMonthTimetable({ latitude: HOME.latitude, longitude: HOME.longitude, date, force: true })

  expect(fetchCalls).toHaveLength(2)
})

test('a new city syncs from scratch — its meta is not inherited', async () => {
  await syncIfNeeded(HOME)
  fetchCalls.length = 0

  const result = await syncIfNeeded(AWAY)

  expect(result).toEqual({ synced: 12, failed: 0 })
  expect(fetchCalls).toHaveLength(12)
})

test('cache keeps this city’s whole year but trims other cities and old years', async () => {
  await syncYear({ ...HOME, year: 2026 })

  // doosri jagah: door ka mahina + aaj ke qareeb ka mahina
  await AsyncStorage.setItem('@pt/tt/10.00/10.00/2026-01/1-1', '[]')
  await AsyncStorage.setItem('@pt/tt/10.00/10.00/2026-10/1-1', '[]')
  // apni jagah ka guzra hua saal
  await AsyncStorage.setItem('@pt/tt/31.27/72.31/2025-06/1-1', '[]')

  // ek mahine ka dobara download → prune chalta hai (October current key)
  await getMonthTimetable({
    latitude: HOME.latitude,
    longitude: HOME.longitude,
    date: new Date(2026, 9, 15),
    force: true,
  })

  const keys = await AsyncStorage.getAllKeys()
  expect(keys.filter((key) => key.startsWith('@pt/tt/31.27/72.31/2026-'))).toHaveLength(12)
  expect(keys.some((key) => key.includes('2025-06'))).toBe(false)
  expect(keys.some((key) => key.includes('10.00/10.00/2026-01'))).toBe(false)
  expect(keys.some((key) => key.includes('10.00/10.00/2026-10'))).toBe(true) // qareeb ka → raha
  expect(keys.some((key) => key.startsWith('@pt/meta/31.27/72.31/2026'))).toBe(true)
})

test('a far month download never deletes another city’s today month (sync moves the current key)', async () => {
  // Sync Jan…Dec chalta hai, isliye currentKey ka mahina bar-bar badalta hai.
  // "Aaj ka mahina" us key se nahi — aaj ki tareekh se bachna chahiye.
  await AsyncStorage.setItem('@pt/tt/10.00/10.00/2026-10/1-1', '[]') // aaj (doosri jagah)
  await AsyncStorage.setItem('@pt/tt/10.00/10.00/2026-02/1-1', '[]') // door ka (mitna chahiye)

  await getMonthTimetable({
    latitude: HOME.latitude,
    longitude: HOME.longitude,
    date: new Date(2026, 0, 15), // currentKey = 2026-01
    force: true,
  })

  const keys = await AsyncStorage.getAllKeys()
  expect(keys.some((key) => key.includes('10.00/10.00/2026-10'))).toBe(true) // aaj ka → zinda
  expect(keys.some((key) => key.includes('10.00/10.00/2026-02'))).toBe(false) // door ka → mit gaya
})

test('server failures report an http error, never "No internet"', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
  )

  let caught = null
  try {
    await syncIfNeeded({ ...HOME, force: true })
  } catch (e) {
    caught = e
  }

  expect(caught).toBeTruthy()
  expect(caught.code).toBe('http')
  expect(caught.key).toBe('err.times')
  expect(caught.message).not.toMatch(/No internet/)
})
