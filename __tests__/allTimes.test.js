/**
 * "All times" — modal NAHI: Home ke prayer-table ki EZAFATI sorted view.
 * SectionTitle ka action ("All times" ⇄ "Show five prayers") use expand /
 * collapse karta hai, `LayoutAnimation` se smooth transition ke saath.
 * Service ka `buildAllTimesList` poora din EK list mein sort karta hai —
 * paanch namazein + sunrise, dono school (Shafi Asr = saya 1×, Isha = suraj
 * 12°), din ke events (Ishraq, Duha, Nisf al-Layl, Afzal waqt) aur guraiz ke
 * khitte — sab table ke hi style ki rows mein.
 */
import React from 'react'
import ReactTestRenderer, { act } from 'react-test-renderer'
import { LayoutAnimation, Modal, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import AllTimesPanel from '../src/Components/AllTimes'
import { colors } from '../src/Components/theme'
import {
  PRAYER_LIST,
  buildAllTimesList,
  buildDayEvents,
  getPrayerDay,
  withWindows,
} from '../src/Screens/Services/prayerTimes'
import { computePrayerTimes } from '../src/Screens/Services/solarTimes'
import { setActiveLang, translate } from '../src/i18n/strings'

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

// Wahi fixed din har test mein (rendering ka test hai, astronomy ka nahi) —
// lekin school ke hisaab se: asrFactor 1 → pehle wala Asr, ishaAngle 12 →
// pehle wala Isha, warna Shafi/Hanafi same kaise dikhein.
jest.mock('../src/Screens/Services/solarTimes', () => ({
  ...jest.requireActual('../src/Screens/Services/solarTimes'),
  computePrayerTimes: jest.fn((opts = {}) => ({
    Fajr: '04:45:34',
    Sunrise: '06:04:22',
    Dhuhr: '11:59:27',
    Asr: opts.asrFactor === 1 ? '15:29:11' : '16:13:06',
    Maghrib: '17:54:05',
    Isha: opts.ishaAngle === 12 ? '18:50:44' : '19:12:47',
    Midnight: '23:59:18',
    Lastthird: '02:00:51',
  })),
}))

const HIJRI = {
  date: '23-04-1448',
  day: '23',
  weekday: { en: 'Al Ahad' },
  month: { number: 4, en: 'Rabīʿ al-thānī', days: 30 },
  year: '1448',
}

// Aladhan jaisa raw — in mein Asr/Isha ke minutes hamare hisaab se milte hain
// (test 2 inhe door kar kar ke trust-fail dikhayega).
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
const TIMINGS_COPY = { ...TIMINGS }

function dayEntry(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return {
    timings: { ...TIMINGS },
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

const SERVICE_LOCATION = { latitude: 31.27, longitude: 72.31, label: 'Jhang' }

const flush = () => new Promise((resolve) => setImmediate(resolve))

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Sirf un nodes ka text jinke children seedha string hain. RN ka Text
 * composite + host dono se milta hai, isliye har cell ek hi baar chahiye
 * (warna "Fajr Fajr Dawn Dawn" — row ke cells ka substring toot jata hai).
 */
function texts(root) {
  const seen = []
  root
    .findAll((node) => typeof node.props.children === 'string')
    .forEach((node) => {
      const value = node.props.children
      if (seen.length === 0 || seen[seen.length - 1] !== value) seen.push(value)
    })
  return seen
}

function pressText(root, label) {
  const candidates = root
    .findAll((node) => typeof node.props.onPress === 'function')
    .filter((button) =>
      button
        .findAll((child) => typeof child.props.children === 'string')
        .some((child) => child.props.children === label),
    )
  expect(candidates.length).toBeGreaterThan(0)
  act(() => {
    candidates[candidates.length - 1].props.onPress()
  })
}

// Composite (Pressable) ka raw style bhi mil jata — sirf host nodes.
function styled(root, prop, value) {
  return root.findAll((node) => {
    if (typeof node.type !== 'string') return false
    const style = StyleSheet.flatten(node.props.style) || {}
    return style[prop] === value
  })
}

/** Row ka naam (fontSize 16) — past honi chahiye ya nahi, yahi check karte hain. */
function nameColor(root, label, occurrence = 0) {
  const nodes = root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.children === label &&
      (StyleSheet.flatten(node.props.style) || {}).fontSize === 16,
  )
  expect(nodes.length).toBeGreaterThan(occurrence)
  return (StyleSheet.flatten(nodes[occurrence].props.style) || {}).color
}

/** Kisi bhi text cell ka rang (START waqt kabhi blur nahi hota — table rule). */
function cellColor(root, label, occurrence = 0) {
  const nodes = root.findAll(
    (node) => typeof node.type === 'string' && node.props.children === label,
  )
  expect(nodes.length).toBeGreaterThan(occurrence)
  return (StyleSheet.flatten(nodes[occurrence].props.style) || {}).color
}

/** Home ka poora din: withWindows + buildDayEvents + dono school ke extras. */
function buildFixture() {
  const CALC = {
    Fajr: '04:45:34',
    Sunrise: '06:04:22',
    Dhuhr: '11:59:27',
    Asr: '16:13:06',
    Maghrib: '17:54:05',
    Isha: '19:12:47',
  }
  const times = PRAYER_LIST.map((prayer) => ({ ...prayer, time: CALC[prayer.key] }))
  const extras = {
    midnight: '23:59:18',
    lastthird: '02:00:51',
    asrShafi: '15:29:11',
    ishaShafi: '18:50:44',
  }
  return {
    times,
    windows: withWindows(times, '04:50:00'), // kal ka Fajr = Isha ka end
    events: buildDayEvents({ times, extras }),
    extras,
  }
}

const trees = []

function renderPanel(overrides = {}) {
  const fixture = buildFixture()
  let tree
  act(() => {
    tree = ReactTestRenderer.create(
      <AllTimesPanel
        windows={fixture.windows}
        events={fixture.events}
        extras={fixture.extras}
        {...overrides}
      />,
    )
  })
  trees.push(tree)
  return { root: tree.root, tree }
}

// Toggle par Home smooth animation maangta hai — native path test mein
// (isDisableAnimations) no-op hai, sirf ye dekhna hai ke config call hui.
const layoutSpy = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {})

beforeEach(async () => {
  computePrayerTimes.mockClear()
  layoutSpy.mockClear()
  await AsyncStorage.clear() // pichle test ka cached mahina na aa jaye
  Object.assign(TIMINGS, TIMINGS_COPY)
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('/v1/calendar/')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(monthlyPayload()) })
    }
    // elevation/weather: reject — 0 elevation se bhi waqt nikalta hai
    return Promise.reject(new Error('offline: ' + target))
  })
})

afterEach(() => {
  setActiveLang('en')
  trees.splice(0).forEach((tree) => {
    try {
      act(() => tree.unmount())
    } catch (e) {
      // Environment band ho chuka ho to unmount ki chhoti galti test na roke.
    }
  })
})

/* ------------------------------------------------------------------ */
/* Service: Shafi school ka waqt extras mein                          */
/* ------------------------------------------------------------------ */

test('getPrayerDay: Shafi Asr (saya 1×) aur Isha (12°) extras mein, table Hanafi', async () => {
  const day = await getPrayerDay(new Date(), SERVICE_LOCATION)

  // dono schoolon ka hisaab hua — ek hi suraj, do sawaal
  expect(computePrayerTimes).toHaveBeenCalledWith(expect.objectContaining({ asrFactor: 1 }))
  expect(computePrayerTimes).toHaveBeenCalledWith(expect.objectContaining({ ishaAngle: 12 }))

  // main table waise bhi: Hanafi Asr + Karachi 18° Isha
  const asr = day.times.find((item) => item.key === 'Asr')
  const isha = day.times.find((item) => item.key === 'Isha')
  expect(asr.time).toBe('16:13:06')
  expect(isha.time).toBe('19:12:47')

  // Shafi dono maamlon mein pehle (Asr ki chhoti saya, Isha ka halka angle)
  expect(day.extras.asrShafi).toBe('15:29:11')
  expect(day.extras.ishaShafi).toBe('18:50:44')
})

test('local hisaab timetable se match na ho to Shafi waqt nahi dikhte (null)', async () => {
  TIMINGS.Asr = '10:00 (PKT)' // 6 ghante door — withinMinutes kabul nahi karega

  const day = await getPrayerDay(new Date(), SERVICE_LOCATION)

  expect(day.extras.asrShafi).toBeNull()
  expect(day.extras.ishaShafi).toBeNull()
  // table ka waqt fallback rehta hai, kam-zyada nahi
  const asr = day.times.find((item) => item.key === 'Asr')
  expect(asr.time).toBe('10:00')
})

/* ------------------------------------------------------------------ */
/* Service: poora din ek sorted list                                   */
/* ------------------------------------------------------------------ */

test('buildAllTimesList: sab waqt ek sorted list — duplicate events nahi, raat wrap', () => {
  const fixture = buildFixture()
  const rows = buildAllTimesList({
    windows: fixture.windows,
    events: fixture.events,
    extras: fixture.extras,
  })

  // talu (Sunrise row), zawal (guraiz row) aur duhaSughra (Ishraq se merge)
  // — list mein alag entry nahi bante
  expect(rows.filter((row) => row.kind === 'event').map((row) => row.item.key)).toEqual([
    'ishraq',
    'duhaKubra',
    'midnight',
    'lastthird',
  ])
  const ishraq = rows.find((row) => row.kind === 'event' && row.item.key === 'ishraq')
  const duha = fixture.events.find((event) => event.key === 'duhaSughra')
  expect(ishraq.end).toBe(duha.end) // Ishraq chalta hai Duha-e-Sughra tak

  // din Fajr se khulta hai, raat wrap karke aakhir mein: 23:59 → 02:00 → (agle Fajr)
  const ids = rows.map((row) => row.id)
  expect(ids.indexOf('event-midnight')).toBeLessThan(ids.indexOf('event-lastthird'))
  expect(ids[ids.length - 1]).toBe('event-lastthird')
  expect(rows[0].item.key).toBe('Fajr')

  // guraiz ke khitte bhi apni waqt-jagah par hain
  expect(ids).toEqual(
    expect.arrayContaining(['makruh-dawn', 'makruh-sunrise', 'makruh-zawal', 'makruh-asr']),
  )

  // trust fail → school row banti hi nahi (galat waqt dikhane se behtar)
  const noTrust = buildAllTimesList({
    windows: fixture.windows,
    events: fixture.events,
    extras: { ...fixture.extras, asrShafi: null, ishaShafi: null },
  })
  expect(noTrust.filter((row) => row.kind === 'school')).toHaveLength(0)
})

/* ------------------------------------------------------------------ */
/* Panel: table ke hi style ki sorted rows                             */
/* ------------------------------------------------------------------ */

test('panel prayer-table wali rows use karta hai — koi modal, koi boxed block nahi', () => {
  const { root, tree } = renderPanel()

  // modal wala backdrop/title ab kahin nahi
  expect(styled(root, 'backgroundColor', 'rgba(4, 26, 19, 0.72)')).toHaveLength(0)
  expect(root.findAllByType(Modal)).toHaveLength(0)
  expect(texts(root)).not.toContain('All prayer times')

  // rows ab table ki hain: flat hairline rows (paddingVertical 11) — 16 waqt
  const rows = styled(root, 'paddingVertical', 11)
  expect(rows).toHaveLength(6 + 2 + 4 + 4) // prayers + school + events + guraiz
  rows.forEach((row) => {
    expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row')
  })

  // purana boxed cardDeep style aur group headings chale gaye
  expect(styled(root, 'backgroundColor', colors.cardDeep)).toHaveLength(0)
  expect(texts(root)).not.toContain('Shafi & Hanafi')
  expect(texts(root)).not.toContain('Makruh (guraiz) times')

  // smooth: koi laal "danger" khat nahi, koi alert icon nahi — sab rows
  // prayer-table ke hi muted rang/outline ki hain (guraiz = calm clock)
  expect(styled(root, 'color', colors.danger)).toHaveLength(0)
  expect(root.findAll((node) => node.props && node.props.color === colors.danger)).toHaveLength(0)
  expect(root.findAll((node) => node.props && node.props.name === 'alert-circle-outline')).toHaveLength(0) // prettier-ignore
  expect(root.findAll((node) => node.props && node.props.name === 'clock-outline').length).toBeGreaterThan(0) // prettier-ignore

  expect(tree.toJSON()).not.toBeNull()
})

test('panel poora din waqt ke order mein dikhata hai — Fajr se Afzal waqt tak', () => {
  const { root } = renderPanel()
  const all = texts(root)

  // har row ke cells: naam, sub, STARTS, ENDS — poore row ka ek substring
  const joined = all.join(' ')
  expect(joined).toContain('Fajr Dawn 4:45:34 AM 6:04:22 AM')
  expect(joined).toContain('Makruh Fajr → sunrise (nafl) 4:45:34 AM 6:04:22 AM')
  expect(joined).toContain('Sunrise Sun rises 6:04:22 AM 11:59:27 AM')
  expect(joined).toContain('Makruh Sunrise → +20 min 6:04:22 AM 6:24:22 AM')
  expect(joined).toContain('Ishraq 2 rak’ah nafl 6:24:22 AM 9:02:22 AM')
  expect(joined).toContain('Duha-e-Kubra 4 rak’ah 9:02:22 AM 11:49:27 AM')
  expect(joined).toContain('Makruh Zawal → Dhuhr 11:49:27 AM 11:59:27 AM')
  expect(joined).toContain('Dhuhr Noon 11:59:27 AM 4:13:06 PM')
  expect(joined).toContain('Asr Shafi 3:29:11 PM 5:54:05 PM')
  expect(joined).toContain('Asr Hanafi 4:13:06 PM 5:54:05 PM')
  expect(joined).toContain('Makruh Asr → Maghrib (nafl) 4:13:06 PM 5:54:05 PM')
  expect(joined).toContain('Maghrib Sunset 5:54:05 PM 7:12:47 PM')
  expect(joined).toContain('Isha Shafi 6:50:44 PM 4:50:00 AM')
  expect(joined).toContain('Isha Hanafi 7:12:47 PM 4:50:00 AM')
  expect(joined).toContain('Nisf al-Layl Half the night 11:59:18 PM —')
  expect(joined).toContain('Afzal time of night Tahajjud time 2:00:51 AM —')

  // source note: kahan se aaye ye faisle (list ke aakhir mein)
  expect(all[all.length - 1]).toBe(
    'Shafi timings follow Dawat-e-Islami tables · rulings from Hanafi books',
  )
})

test('sorted method: har waqt apni jagah — guraiz beech mein, raat lastthird par khulti hai', () => {
  const { root } = renderPanel()
  const all = texts(root)

  const sequence = [
    'Fajr',
    'Fajr → sunrise (nafl)', // Fajr ke turant baad guraiz
    'Sunrise',
    'Sunrise → +20 min', // suraj ke 20 minute
    'Ishraq', // uske baad Ishraq
    'Duha-e-Kubra',
    'Zawal → Dhuhr',
    'Dhuhr',
    'Asr', // pehle Shafi (3:29)
    'Asr → Maghrib (nafl)',
    'Maghrib',
    'Isha', // pehle Shafi (6:50)
    'Nisf al-Layl',
    'Afzal time of night', // 02:00 — midnight ke baad, list ke aakhir mein
  ]

  let previous = -1
  sequence.forEach((text) => {
    const at = all.indexOf(text)
    expect(at).toBeGreaterThan(previous)
    previous = at
  })
})

test('Shafi waqt na ho (trust fail) to school rows chhup jaati hain, guraiz rehta hai', () => {
  const fixture = buildFixture()
  const { root } = renderPanel({
    extras: { ...fixture.extras, asrShafi: null, ishaShafi: null },
  })
  const joined = texts(root).join(' ')

  expect(styled(root, 'paddingVertical', 11)).toHaveLength(14) // 2 school rows kam
  expect(joined).not.toMatch(/Shafi \d/) // school ki line hi nahi bani
  expect(joined).toContain('Asr Hanafi 4:13:06 PM 5:54:05 PM') // table wali row phir bhi
  expect(joined).toContain('Makruh Zawal → Dhuhr 11:49:27 AM 11:59:27 AM') // guraiz ko farq nahi padta
})

test('chaar zubanon mein keys maujood hain (rom English inherit karta hai)', () => {
  const keys = [
    'home.table.all',
    'home.table.five',
    'all.row.makruh',
    'all.shafi',
    'all.hanafi',
    'all.makruh.dawn',
    'all.makruh.sunrise',
    'all.makruh.zawal',
    'all.makruh.asr',
    'all.times.ishraq',
    'all.times.duhaKubra',
    'all.times.midnight',
    'all.times.lastthird',
    'all.note',
  ]
  ;['en', 'ur', 'hi', 'rom'].forEach((lang) => {
    keys.forEach((key) => {
      expect(translate(lang, key)).toBeTruthy()
      expect(translate(lang, key)).not.toBe(key)
    })
  })
})

/* ------------------------------------------------------------------ */
/* Home: "All times" action table ko sorted view se badalta hai       */
/* ------------------------------------------------------------------ */

/** Mount Home, settle karwa do, root de do — hamesha unmount hota hai. */
async function withHome(run) {
  const Home = require('../src/Screens/Frontend/index.jsx').default

  let renderer
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Home
        location={{
          type: 'manual',
          latitude: 31.27,
          longitude: 72.31,
          label: 'Jhang, Punjab, Pakistan',
        }}
        onOpenSettings={jest.fn()}
      />,
    )
    await flush()
    await flush()
    await flush()
    await flush()
  })

  try {
    return await run(renderer.root)
  } finally {
    await act(async () => {
      renderer.unmount()
    })
  }
}

test('Home: "All times" poora din kholta hai, "Show five prayers" paanch + sunrise wapas', async () => {
  await withHome(async (root) => {
    // shuru mein: table (paanch namazein + sunrise) aur poori list band
    const closed = texts(root).join(' ')
    ;['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((name) => {
      expect(closed).toContain(name)
    })
    expect(closed).toContain('STARTS')
    expect(closed).not.toContain('Fajr → sunrise (nafl)') // panel band
    expect(root.findAllByType(Modal)).toHaveLength(0) // koi modal nahi

    // "All times" → poora din table ki rows se replace, animation ke saath
    pressText(root, 'All times')
    expect(layoutSpy).toHaveBeenCalledWith(LayoutAnimation.Presets.easeInEaseOut)
    const open = texts(root).join(' ')
    expect(open).toContain('STARTS') // head zinda hai
    expect(open).toContain('Fajr Dawn 4:45:34 AM 6:04:22 AM') // table ki row bhi list mein
    expect(open).toContain('Fajr → sunrise (nafl)') // guraiz sorted, chhoti sub
    expect(open).toContain('Asr Shafi 3:29:11 PM 5:54:05 PM') // service ka extras yahan tak
    expect(open).toContain('Makruh Zawal → Dhuhr 11:49:27 AM 11:59:27 AM')
    expect(open).toContain('Afzal time of night') // raat ka aakhri waqt bhi
    expect(root.findAllByType(Modal)).toHaveLength(0)
    expect(texts(root)).toContain('Show five prayers') // action ka naya naam

    // "Show five prayers" → paanch namazein + sunrise wapas
    pressText(root, 'Show five prayers')
    expect(layoutSpy).toHaveBeenCalledTimes(2)
    const again = texts(root).join(' ')
    expect(again).not.toContain('Fajr → sunrise (nafl)') // list band
    ;['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((name) => {
      expect(again).toContain(name)
    })
    expect(again).toContain('STARTS')
    expect(texts(root)).toContain('All times')
  })
})

/* ------------------------------------------------------------------ */
/* Past dimming — Fajr-anchored epoch, SAB rows par ek hi rule        */
/* ------------------------------------------------------------------ */

test('15:00: guraiz/Ishraq/Duha/Dhuhr faint, future rows bright, START kabhi blur nahi', () => {
  const { root } = renderPanel({ currentKey: 'Asr', now: new Date(2026, 9, 5, 15, 0, 0) })

  // jo waqt chal chuka — ab faint (naam hi nahi, guraiz + events bhi)
  expect(nameColor(root, 'Fajr')).toBe(colors.textFaint)
  expect(nameColor(root, 'Makruh', 0)).toBe(colors.textFaint) // Fajr → sunrise
  expect(nameColor(root, 'Makruh', 1)).toBe(colors.textFaint) // sunrise → +20
  expect(nameColor(root, 'Makruh', 2)).toBe(colors.textFaint) // zawal
  expect(nameColor(root, 'Ishraq')).toBe(colors.textFaint)
  expect(nameColor(root, 'Duha-e-Kubra')).toBe(colors.textFaint)
  expect(nameColor(root, 'Dhuhr')).toBe(colors.textFaint)

  // Sunrise kabhi dim nahi (isPrayer false — table bhi aisa hi karta hai)
  expect(nameColor(root, 'Sunrise')).toBe(colors.text)
  // current + aane wale waqt bright — khaas kar raat ke rows
  expect(nameColor(root, 'Asr')).toBe(colors.text) // current
  expect(nameColor(root, 'Makruh', 3)).toBe(colors.text) // after Asr — abhi baaki
  expect(nameColor(root, 'Maghrib')).toBe(colors.text)
  expect(nameColor(root, 'Isha')).toBe(colors.text)
  expect(nameColor(root, 'Nisf al-Layl')).toBe(colors.text) // aaj raat 23:59
  expect(nameColor(root, 'Afzal time of night')).toBe(colors.text) // aaj raat → kal 02:00

  // START waqt hamesha bright, END faint — table ki bilkul wahi rhythm
  expect(cellColor(root, '4:45:34 AM')).toBe(colors.text) // Fajr ka START
  expect(cellColor(root, '6:04:22 AM', 0)).toBe(colors.textFaint) // Fajr ka END
})

test('[00:00, Fajr): din shuru nahi hua — kuch past nahi (ya now null)', () => {
  const early = renderPanel({ now: new Date(2026, 9, 5, 2, 30, 0) })
  expect(nameColor(early.root, 'Fajr')).toBe(colors.text)
  expect(nameColor(early.root, 'Makruh', 0)).toBe(colors.text)
  expect(nameColor(early.root, 'Ishraq')).toBe(colors.text)
  expect(nameColor(early.root, 'Afzal time of night')).toBe(colors.text)

  // now = null (countdown load nahi hua) — dimming bilkul band
  const { root } = renderPanel()
  expect(nameColor(root, 'Fajr')).toBe(colors.text)
  expect(nameColor(root, 'Makruh', 0)).toBe(colors.text)
})
