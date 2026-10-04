import AsyncStorage from '@react-native-async-storage/async-storage'
import { getJson } from './http'
import { addDays, atTimeOn, minutesFromMidnight, pad2, shiftMinutes, toDmy } from '../../utils/date'
import { getElevation } from './elevation'
import { computePrayerTimes, withinMinutes } from './solarTimes'
import { captionName, t } from '../../i18n/strings'

/** The rows shown on the home screen. Sunrise is displayed but is not a prayer. */
export const PRAYER_LIST = [
  { key: 'Fajr', label: 'Fajr', urdu: 'Fajr', icon: 'weather-night', isPrayer: true },
  {
    key: 'Sunrise',
    label: 'Sunrise',
    urdu: 'Suraj charhta hai',
    icon: 'weather-sunset-up',
    isPrayer: false,
  },
  { key: 'Dhuhr', label: 'Dhuhr', urdu: 'Zuhr', icon: 'weather-sunny', isPrayer: true },
  {
    key: 'Asr',
    label: 'Asr',
    urdu: 'Asr (Hanafi)',
    icon: 'weather-partly-cloudy',
    isPrayer: true,
  },
  {
    key: 'Maghrib',
    label: 'Maghrib',
    urdu: 'Maghrib',
    icon: 'weather-sunset-down',
    isPrayer: true,
  },
  { key: 'Isha', label: 'Isha', urdu: 'Isha (Hanafi)', icon: 'moon-waning-crescent', isPrayer: true },
]

/**
 * Fixed calculation settings (no method picker on purpose):
 *
 * - Method 1 = University of Islamic Sciences, Karachi — the standard used by
 *   virtually every prayer app in Pakistan (Fajr 18°, Isha 18°). It matches
 *   mosque/app timings here far better than the Muslim World League method,
 *   whose Isha (17°) is ~4 minutes early in Pakistan.
 * - Asr is always the Hanafi opinion (school = 1: shadow = 2× object).
 */
export const DEFAULT_METHOD = 1
export const ASR_SCHOOL = 1

/** Numbered Hijri months with English, Arabic and Hindi names. */
export const HIJRI_MONTHS = [
  { number: 1, en: 'Muharram', ar: 'مُحَرَّم', hi: 'मुहर्रम' },
  { number: 2, en: 'Safar', ar: 'صَفَر', hi: 'सफ़र' },
  { number: 3, en: "Rabi' al-Awwal", ar: 'رَبِيع ٱلْأَوَّل', hi: 'रबीउल अव्वल' },
  { number: 4, en: "Rabi' al-Thani", ar: 'رَبِيع ٱلثَّانِي', hi: 'रबीउस सानी' },
  { number: 5, en: 'Jumada al-Ula', ar: 'جُمَادَىٰ ٱلْأُولَىٰ', hi: 'जमादिउल अव्वल' },
  { number: 6, en: 'Jumada al-Thani', ar: 'جُمَادَىٰ ٱلْآخِرَة', hi: 'जमादिउस सानी' },
  { number: 7, en: 'Rajab', ar: 'رَجَب', hi: 'रजब' },
  { number: 8, en: "Sha'ban", ar: 'شَعْبَان', hi: 'शाबान' },
  { number: 9, en: 'Ramadan', ar: 'رَمَضَان', hi: 'रमज़ान' },
  { number: 10, en: 'Shawwal', ar: 'شَوَّال', hi: 'शव्वाल' },
  { number: 11, en: "Dhul-Qi'dah", ar: 'ذُو ٱلْقَعْدَة', hi: 'ज़िल्क़अद' },
  { number: 12, en: 'Dhul-Hijjah', ar: 'ذُو ٱلْحِجَّة', hi: 'ज़िल्हिज्जा' },
]

/** Month name in the active (or given) language: ur → Arabic, hi → Devanagari. */
export function hijriMonthName(number, lang) {
  const month = HIJRI_MONTHS.find((m) => m.number === Number(number))
  const language = lang || undefined
  if (month) {
    if (language === 'ur') return month.ar
    if (language === 'hi') return month.hi
    return month.en
  }
  return t('cal.monthFallback', { n: number })
}

/**
 * Aladhan payloads carry { number, en, ar } — enough for every language
 * (hi looks the name up in HIJRI_MONTHS).
 */
export function hijriMonthDisplay(month, lang) {
  if (!month) return ''
  const language = lang || undefined
  if (language === 'ur') return month.ar || month.en || ''
  if (language === 'hi') {
    const found = HIJRI_MONTHS.find((m) => m.number === Number(month.number))
    return (found && found.hi) || month.en || ''
  }
  return month.en || ''
}

const TIMETABLE_PREFIX = '@pt/tt/'
const HIJRI_MONTH_PREFIX = '@pt/hm/'
const GTOH_PREFIX = '@pt/gtoh/'
const SYNC_META_PREFIX = '@pt/meta/'

/* ------------------------------------------------------------------ */
/* Monthly prayer timetable (one network call per month, then cached) */
/* ------------------------------------------------------------------ */

function locationKey(latitude, longitude) {
  return `${Number(latitude).toFixed(2)}/${Number(longitude).toFixed(2)}`
}

function timetableKey(latitude, longitude, date, method, school) {
  return `${TIMETABLE_PREFIX}${locationKey(latitude, longitude)}/${date.getFullYear()}-${pad2(
    date.getMonth() + 1,
  )}/${method}-${school}`
}

function monthIndexFromKey(key) {
  // key looks like @pt/tt/24.86/67.00/2026-10/3-1
  const match = /(\d{4})-(\d{2})(?:\/[\d-]+)?$/.exec(key)
  return match ? Number(match[1]) * 12 + Number(match[2]) : 0
}

function yearFromKey(key) {
  const match = /(\d{4})-\d{2}/.exec(key) // @pt/tt/31.50/74.30/2026-10/1-1
  return match ? Number(match[1]) : 0
}

/**
 * Cache ki jagah mehdood hai, isliye saaf-suthri policy:
 *
 *   • apni jagah  → poora saal (+ agla saal Nov/Dec mein) rakho. Yahi "ek
 *     refresh = saal bhar offline" ka matlab hai;
 *   • doosri jagah → sirf aaj ke qareeb ka mahina (shehar badalne par bhi
 *     aaj ke times offline mil jayein);
 *   • purane saal  → hata do (saal badalte hi apne aap).
 *
 * Sync-meta (`@pt/meta/`) par bhi wahi saal/jagah wala qanoon lagta hai,
 * warna doosri jagah ka meta "sab synced" dikha kar dobara sync rok deta.
 */
async function pruneStaleCaches(currentKey) {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const lastSlash = currentKey.lastIndexOf('/')
    const monthSlash = currentKey.lastIndexOf('/', lastSlash - 1)
    const locationPrefix = currentKey.slice(0, monthSlash + 1) // '@pt/tt/31.50/74.30/'
    const locationId = locationPrefix.slice(TIMETABLE_PREFIX.length, -1) // '31.50/74.30'
    const currentMonth = monthIndexFromKey(currentKey)
    const thisYear = new Date().getFullYear()

    const stale = keys.filter((key) => {
      if (key.startsWith(TIMETABLE_PREFIX)) {
        if (key === currentKey) return false
        if (yearFromKey(key) < thisYear) return true // guzra hua saal
        if (key.startsWith(locationPrefix)) return false // apni jagah: poora saal
        return Math.abs(monthIndexFromKey(key) - currentMonth) > 1 // doosri jagah: qareeb ka
      }

      if (key.startsWith(SYNC_META_PREFIX)) {
        const match = /\/(\d{4})\//.exec(key) // @pt/meta/31.50/74.30/2026/1-1
        const year = match ? Number(match[1]) : 0
        return year < thisYear || !key.startsWith(`${SYNC_META_PREFIX}${locationId}/`)
      }

      return false
    })

    if (stale.length > 0) {
      // removeItem (multiRemove nahi) — dono jagah, real device aur jest mock, chalte hain
      await Promise.all(stale.map((key) => AsyncStorage.removeItem(key)))
    }
  } catch (e) {
    // pruning is best-effort
  }
}

function isValidCoordinate(value, limit) {
  if (value === null || value === undefined || value === '') return false
  const n = Number(value)
  return Number.isFinite(n) && Math.abs(n) <= limit
}
const inflightMonths = new Map()

/**
 * Ek mahine ka timetable — pehle cache, warna ek hi download.
 * `force: true` cache ignore karke dobara leta hai (pull-to-refresh).
 * Do callers ek saath aayein (aaj + kal ka mahina) to sirf ek request jaati hai.
 */
export async function getMonthTimetable({
  latitude,
  longitude,
  date,
  method = DEFAULT_METHOD,
  school = ASR_SCHOOL,
  force = false,
}) {
  if (!isValidCoordinate(latitude, 90) || !isValidCoordinate(longitude, 180)) {
    throw new Error(t('err.invalidLocation'))
  }

  const key = timetableKey(latitude, longitude, date, method, school)

  if (!force) {
    try {
      const cached = await AsyncStorage.getItem(key)
      if (cached) return JSON.parse(cached)
    } catch (e) {
      // ignore corrupt cache and refetch
    }
  }

  const pending = inflightMonths.get(key)
  if (pending) return pending // aaj + kal → ek hi request

  const request = downloadMonth({ latitude, longitude, date, method, school, key })
  inflightMonths.set(key, request)
  try {
    return await request
  } finally {
    inflightMonths.delete(key)
  }
}

async function downloadMonth({ latitude, longitude, date, method, school, key }) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const url =
    `https://api.aladhan.com/v1/calendar/${year}/${month}` +
    `?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`

  let json
  try {
    json = await getJson(url)
  } catch (error) {
    // Server/timeout errors pass through untouched; a real network failure
    // gets the one message the offline screen shows (message in the user's
    // language, logic decided by `code`, never by parsing text).
    if (error && (error.code === 'http' || error.code === 'timeout')) throw error
    const offlineError = new Error(t('err.offlineFirst'))
    offlineError.code = 'network'
    throw offlineError
  }

  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new Error(t('err.times'))
  }

  try {
    await AsyncStorage.setItem(key, JSON.stringify(json.data))
    await pruneStaleCaches(key)
  } catch (e) {
    // caching is best-effort
  }

  return json.data
}

/* ------------------------------------------------------------------ */
/* Poora saal offline rakhna: syncYear / syncIfNeeded                   */
/* ------------------------------------------------------------------ */

const RESYNC_AFTER_MS = 30 * 24 * 60 * 60 * 1000 // 30 din baad dobara
const SYNC_CONCURRENCY = 3 // ek waqt mein 3 mahine download hon

function syncMetaKey(latitude, longitude, year, method, school) {
  return `${SYNC_META_PREFIX}${locationKey(latitude, longitude)}/${year}/${method}-${school}`
}

/**
 * Ek saal ke 12 mahine phone mein utaar deta hai (sirf missing = nahi,
 * `refreshAll: true` = sab dobara).
 *
 * Ek mahina fail ho to baqi karte hain — aur meta ("poora saal done" ki
 * nishani) sirf tab likhta hai jab 12on safal hon, taake agla open jo bacha
 * woh khud bhar de. Zyada fail hone par (matlab network hi nahi) baqi chhod
 * dete hain — 12 bar bar-bar same error ka wait bekar hai.
 */
export async function syncYear({
  latitude,
  longitude,
  year,
  method = DEFAULT_METHOD,
  school = ASR_SCHOOL,
  refreshAll = false,
}) {
  let next = 0
  let synced = 0
  let failed = 0
  let offline = 0

  const worker = async () => {
    // Network hi nahi hai to 3 mahine ke baad chhod dein — 12 bar bar-bar
    // same error ka wait bekar hai. Server error par saal poora koshish kare.
    while (next < 12 && offline < 3) {
      const month = next
      next += 1
      try {
        await getMonthTimetable({
          latitude,
          longitude,
          date: new Date(year, month, 15),
          method,
          school,
          force: refreshAll,
        })
        synced += 1
      } catch (e) {
        failed += 1
        if (e && e.code === 'network') offline += 1
      }
    }
  }

  await Promise.all(Array.from({ length: SYNC_CONCURRENCY }, () => worker()))

  if (synced === 12) {
    try {
      await AsyncStorage.setItem(
        syncMetaKey(latitude, longitude, year, method, school),
        JSON.stringify({ syncedAt: Date.now() }),
      )
    } catch (e) {
      // meta sirf yaad-dihani ke liye hai
    }
  }

  return { synced, failed }
}

/**
 * App khulne (ya pull-to-refresh) par chalayen.
 *
 *   • mahine missing hain (nayi jagah / naya saal) → poora saal bhar deta hai
 *   • data 30 din purana hai                        → sab dobara download
 *   • `force: true` (pull-to-refresh)               → hamesha sab dobara
 *   • sab fresh hai                                  → kuch nahi karta
 *
 * Internet na ho to error phenkta hai; bulane wala usay pakre (ya chupke
 * se ignore kare) — data cache mein pehle se pada rehta hai.
 */
export async function syncIfNeeded({
  latitude,
  longitude,
  method = DEFAULT_METHOD,
  school = ASR_SCHOOL,
  force = false,
}) {
  const now = new Date()
  const years = [now.getFullYear()]
  if (now.getMonth() >= 10) years.push(now.getFullYear() + 1) // Nov/Dec: agla saal bhi

  const summary = { synced: 0, failed: 0 }
  let attempted = 0

  for (const year of years) {
    let meta = null
    try {
      const raw = await AsyncStorage.getItem(syncMetaKey(latitude, longitude, year, method, school))
      meta = raw ? JSON.parse(raw) : null
    } catch (e) {
      meta = null
    }

    const isOld = !meta || Date.now() - meta.syncedAt > RESYNC_AFTER_MS
    if (force || isOld) {
      attempted += 12
      const result = await syncYear({
        latitude,
        longitude,
        year,
        method,
        school,
        refreshAll: force || Boolean(meta),
      })
      summary.synced += result.synced
      summary.failed += result.failed
    }
  }

  if (attempted > 0 && summary.synced === 0) {
    const offlineError = new Error(t('err.offlineSaved'))
    offlineError.code = 'network'
    throw offlineError
  }

  return summary
}

function entryForDay(monthData, date) {
  const day = date.getDate()
  return monthData.find((item) => Number(item.date?.gregorian?.day) === day) || null
}

function rawTime(entry, prayerKey) {
  const value = entry?.timings?.[prayerKey]
  const match = /(\d{1,2}:\d{2}(?::\d{2})?)/.exec(String(value == null ? '' : value))
  return match ? match[1] : null
}

/**
 * The day's times, calculated locally so they carry seconds (4:45:32) and use
 * an elevation-corrected horizon (sunrise/sunset ~2 min truer at altitude).
 *
 * Aladhan stays involved: its Dhuhr pins the UTC offset, and its minutes are
 * the fallback — a calculated time is only adopted when it lands within 30
 * minutes of the timetable, which is far more slack than any real difference
 * but nowhere near the hours a bad timezone or coordinate would produce.
 */
async function localTimes(date, location, referenceDhuhr) {
  try {
    const elevation = await getElevation(location?.latitude, location?.longitude)
    return computePrayerTimes({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      latitude: Number(location?.latitude),
      longitude: Number(location?.longitude),
      elevation,
      referenceDhuhr,
    })
  } catch (e) {
    return null // keep Aladhan's minutes
  }
}

/**
 * Full info for one date: prayer times, Hijri date and timezone.
 * Uses the monthly timetable, so this is a single cached call for the whole month.
 */
export async function getPrayerDay(date, location, method = DEFAULT_METHOD) {
  const monthData = await getMonthTimetable({
    latitude: location.latitude,
    longitude: location.longitude,
    date,
    method,
    school: ASR_SCHOOL,
  })

  const entry = entryForDay(monthData, date)
  if (!entry) throw new Error(t('err.noEntry'))

  const raw = {
    Fajr: rawTime(entry, 'Fajr'),
    Sunrise: rawTime(entry, 'Sunrise'),
    Dhuhr: rawTime(entry, 'Dhuhr'),
    Asr: rawTime(entry, 'Asr'),
    Maghrib: rawTime(entry, 'Maghrib'),
    Isha: rawTime(entry, 'Isha'),
    Midnight: rawTime(entry, 'Midnight'),
    Lastthird: rawTime(entry, 'Lastthird'),
  }
  const calculated = await localTimes(date, location, raw.Dhuhr)

  const timeFor = (key) => {
    const ours = calculated && calculated[key]
    if (!raw[key]) return ours || null
    return ours && withinMinutes(ours, raw[key]) ? ours : raw[key]
  }

  return {
    entry,
    hijri: entry.date.hijri,
    gregorian: entry.date.gregorian,
    timezone: entry.meta?.timezone,
    times: PRAYER_LIST.map((prayer) => ({ ...prayer, time: timeFor(prayer.key) })),
    // Non-prayer markers (the night after this date) — Nisf al-Layl, aakhri third.
    extras: {
      midnight: timeFor('Midnight'),
      lastthird: timeFor('Lastthird'),
    },
  }
}

/** Pick the next prayer from today's list (falls back to tomorrow's Fajr). */
export function computeNextPrayer(times, tomorrowFajr, now) {
  const prayers = times.filter((item) => item.isPrayer && item.time)
  let previous = null

  for (const prayer of prayers) {
    const at = new Date(now)
    const [hours, minutes, seconds] = prayer.time.split(':').map(Number)
    at.setHours(hours, minutes, seconds || 0, 0)

    if (at.getTime() > now.getTime()) {
      const span = previous ? at.getTime() - previous.at.getTime() : 0
      const elapsed = previous ? now.getTime() - previous.at.getTime() : 0
      return {
        next: { ...prayer, at },
        previous,
        progress: span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 0,
      }
    }

    previous = { ...prayer, at }
  }

  return { next: tomorrowFajr, previous, progress: 0 }
}

/**
 * Every prayer runs until the next entry starts — Fajr ends at sunrise,
 * Dhuhr at Asr, Asr at Maghrib, Maghrib at Isha and Isha at tomorrow's Fajr.
 */
export function withWindows(times, tomorrowFajrTime) {
  return times.map((item, index) => {
    const next = times[index + 1]
    const end = next ? next.time : tomorrowFajrTime || null
    return { ...item, end }
  })
}

/* ------------------------------------------------------------------ */
/* Non-prayer events of the day                                        */
/* ------------------------------------------------------------------ */

function minutesBetween(from, to) {
  const start = minutesFromMidnight(from)
  const end = minutesFromMidnight(to)
  if (start == null || end == null) return 0
  return end >= start ? end - start : end + 1440 - start
}

/**
 * Everything worth showing between prayers — the same list other Pakistani
 * apps put in their "next" section:
 *
 *   Talu-e-Aftab (sunrise) · Ishraq · Duha-e-Sughra · Duha-e-Kubra ·
 *   Zawal (Makrooh) · Nisf al-Layl (midnight) · Aakhri third
 *
 * Conventions (kept in one place so they are easy to tune):
 *   Ishraq           = sunrise + 20 min
 *   Duha-e-Sughra    = [sunrise + 20 min, ¼ of daylight]
 *   Duha-e-Kubra     = [¼ of daylight, Dhuhr − 10 min]
 *   Zawal (Makrooh)  = [Dhuhr − 10 min, Dhuhr] — nafl se guraiz
 *   Nisf al-Layl / last third come straight from the timetable.
 */
export function buildDayEvents(day) {
  const times = (day && day.times) || []
  const get = (key) => {
    const item = times.find((entry) => entry.key === key)
    return item && item.time ? item.time : null
  }

  const sunrise = get('Sunrise')
  const dhuhr = get('Dhuhr')
  const maghrib = get('Maghrib')
  const extras = (day && day.extras) || {}
  const events = []

  if (sunrise) {
    events.push({
      key: 'talu',
      label: 'Talu-e-Aftab',
      urdu: 'طلوع آفتاب',
      hint: 'Suraj nikalta hai — Fajr ka waqt khatam',
      time: sunrise,
      icon: 'weather-sunset-up',
      kind: 'point',
    })
  }

  const daylight = sunrise && maghrib ? minutesBetween(sunrise, maghrib) : 0

  if (sunrise && daylight > 60) {
    events.push({
      key: 'ishraq',
      label: 'Ishraq',
      urdu: 'اشراق',
      hint: '2 rak’ah — suraj charrhne ke 20 min baad',
      time: shiftMinutes(sunrise, 20),
      icon: 'weather-sunny',
      kind: 'point',
    })
    events.push({
      key: 'duhaSughra',
      label: 'Duha-e-Sughra',
      urdu: 'ضحیٰ سغراٰ',
      hint: '2 rak’ah ka waqt',
      time: shiftMinutes(sunrise, 20),
      end: shiftMinutes(sunrise, Math.round(daylight / 4)),
      icon: 'weather-sunny',
      kind: 'window',
    })
  }

  if (sunrise && dhuhr && daylight > 60) {
    events.push({
      key: 'duhaKubra',
      label: 'Duha-e-Kubra',
      urdu: 'ضحیٰ کبریٰ',
      hint: '4 rak’ah ka waqt',
      time: shiftMinutes(sunrise, Math.round(daylight / 4)),
      end: shiftMinutes(dhuhr, -10),
      icon: 'weather-partly-cloudy',
      kind: 'window',
    })
    events.push({
      key: 'zawal',
      label: 'Zawal (Makrooh)',
      urdu: 'زوال',
      hint: 'Is waqt nafl na parhein',
      time: shiftMinutes(dhuhr, -10),
      end: dhuhr,
      icon: 'alert-circle-outline',
      kind: 'window',
    })
  }

  if (extras.midnight) {
    events.push({
      key: 'midnight',
      label: 'Nisf al-Layl',
      urdu: 'نصف اللیل',
      hint: 'Aadhi raat — 2 rak’ah',
      time: extras.midnight,
      icon: 'weather-night',
      kind: 'point',
    })
  }

  if (extras.lastthird) {
    events.push({
      key: 'lastthird',
      label: 'Aakhri third',
      urdu: 'تیسرا حصہ',
      hint: 'Baqi raat ka behtareen waqt',
      time: extras.lastthird,
      icon: 'sleep',
      kind: 'point',
    })
  }

  events.sort((a, b) => minutesFromMidnight(a.time) - minutesFromMidnight(b.time))
  return events
}

/**
 * Everything the Home "next" card needs, from ONE merged timeline of prayers
 * + day events (so after Fajr the next entry is Talu-e-Aftab, then Ishraq,
 * Duha, zawal… instead of jumping straight to Dhuhr):
 *
 *   current    entry whose window contains `now`
 *   target     where the countdown stops = the end of the current segment;
 *              for a running prayer that is exactly when its waqt ends
 *              ("Zuhr ka waqt khatam hone mein" → Asr)
 *   next       alias of `target` (what the NEXT row displays)
 *   caption    the sentence under the row, or null for a generic countdown
 *   nextPrayer first prayer still ahead (highlight in the table)
 *
 * Entries that start on the same instant are merged (Ishraq = start of
 * Duha-e-Sughra; Talu-e-Aftab = the table's Sunrise row).
 */
export function computeNextItem(windows, events, tomorrowFajrTime, now) {
  const timeline = buildTimeline(windows, events, tomorrowFajrTime, now)

  let current = null
  let upcoming = null
  for (const entry of timeline) {
    if (entry.at.getTime() <= now.getTime()) current = entry
    else {
      upcoming = entry
      break
    }
  }

  let target = upcoming

  // The countdown runs to the end of the current segment, not merely to the
  // next entry — so Isha counts down to tomorrow's Fajr, and a prayer's
  // countdown always matches its row in the table.
  if (current && current.end) {
    let endAt = atTimeOn(now, current.end)
    while (endAt.getTime() <= now.getTime()) endAt = addDays(endAt, 1)
    const atEnd = timeline.find((entry) => entry.at.getTime() === endAt.getTime())
    if (atEnd) target = atEnd
  }

  // The name inside the countdown sentence follows the active language:
  // "Zuhr ka waqt khatam hone mein" (rom), "Dhuhr ends in" (en), etc.
  const name = current ? captionName(current) : ''
  // `target` always closes `current`'s segment, so this sentence is exact.
  const caption = current && target ? t('caption.endsIn', { name }) : null

  const remaining = target ? Math.max(0, target.at.getTime() - now.getTime()) : 0
  const progress =
    current && target && target.at.getTime() > current.at.getTime()
      ? (now.getTime() - current.at.getTime()) / (target.at.getTime() - current.at.getTime())
      : 0

  const tomorrowFajr = tomorrowFajrTime
    ? {
      key: 'Fajr',
      label: 'Fajr',
      urdu: 'Fajr',
      icon: 'weather-night',
      isPrayer: true,
      time: tomorrowFajrTime,
      at: atTimeOn(addDays(now, 1), tomorrowFajrTime),
    }
    : null

  return {
    current,
    target,
    next: target,
    caption,
    nextPrayer: computeNextPrayer(windows, tomorrowFajr, now).next,
    remaining,
    progress: Math.min(1, Math.max(0, progress)),
  }
}

/** Prayers + day events, each stamped with the Date it happens (sorted). */
function buildTimeline(windows, events, tomorrowFajrTime, now) {
  const entries = []

  const push = (item, at) => {
    if (!item || !item.time || !at) return
    const existing = entries.find((entry) => entry.at.getTime() === at.getTime())
    if (existing) {
      // Carry the window of the merged entry (Ishraq = Duha-e-Sughra's start).
      // A window row (Sunrise…) must not donate its end — that would swallow
      // the morning events between sunrise and Dhuhr.
      if (!existing.end && item.end && item.kind) existing.end = item.end
      return
    }
    entries.push({ ...item, at })
  }

  // Events first, so at 6:06 the card reads "Talu-e-Aftab", not "Sunrise".
  // Each event is stamped for yesterday, today and tomorrow: yesterday's copy
  // is what is running at 1 a.m. (Nisf al-Layl → aakhri third), today's can be
  // "current" all evening, and tomorrow's keeps tonight's markers reachable.
  for (const event of events || []) {
    for (const day of [-1, 0, 1]) {
      push({ ...event, isPrayer: false }, atTimeOn(addDays(now, day), event.time))
    }
  }

  for (const item of windows || []) push(item, atTimeOn(now, item.time))

  if (tomorrowFajrTime) {
    push(
      {
        key: 'Fajr',
        label: 'Fajr',
        urdu: 'Fajr',
        icon: 'weather-night',
        isPrayer: true,
        time: tomorrowFajrTime,
      },
      atTimeOn(addDays(now, 1), tomorrowFajrTime),
    )
  }

  return entries.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/* ------------------------------------------------------------------ */
/* Hijri calendar                                                      */
/* ------------------------------------------------------------------ */

export async function getHijriMonthDays(hijriMonth, hijriYear) {
  const key = `${HIJRI_MONTH_PREFIX}${hijriYear}-${pad2(hijriMonth)}`

  try {
    const cached = await AsyncStorage.getItem(key)
    if (cached) {
      const days = normalizeHijriDays(JSON.parse(cached))
      if (days.length > 0) return days
    }
  } catch (e) {
    // ignore corrupt cache and refetch
  }

  const json = await getJson(
    `https://api.aladhan.com/v1/hToGCalendar/${Number(hijriMonth)}/${Number(hijriYear)}`,
  )
  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new Error(t('err.hijriFetch'))
  }

  const days = normalizeHijriDays(json.data)
  if (days.length === 0) throw new Error(t('err.hijriEmpty'))

  try {
    await AsyncStorage.setItem(key, JSON.stringify(json.data))
  } catch (e) {
    // caching is best-effort
  }

  return days
}

/**
 * hToGCalendar returns days as { hijri, gregorian }, while the prayer-time
 * calendar wraps them as { date: { hijri, gregorian } }. Normalise both so a
 * response-shape change can never crash the calendar screen again.
 */
function normalizeHijriDays(rawDays) {
  if (!Array.isArray(rawDays)) return []

  return rawDays
    .map((item) => {
      const hijri = item?.hijri || item?.date?.hijri
      const gregorian = item?.gregorian || item?.date?.gregorian
      if (!hijri || !gregorian) return null
      return { hijri, gregorian }
    })
    .filter(Boolean)
}

export async function getHijriForDate(date) {
  const key = `${GTOH_PREFIX}${toDmy(date)}`

  try {
    const cached = await AsyncStorage.getItem(key)
    if (cached) {
      const hijri = normalizeHijriDate(JSON.parse(cached))
      if (hijri) return hijri
    }
  } catch (e) {
    // ignore corrupt cache and refetch
  }

  const json = await getJson(`https://api.aladhan.com/v1/gToH/${toDmy(date)}`)
  const hijri = normalizeHijriDate(json && json.data)
  if (!hijri) throw new Error(t('err.hijriDate'))

  try {
    await AsyncStorage.setItem(key, JSON.stringify(hijri))
  } catch (e) {
    // caching is best-effort
  }

  return hijri
}

/**
 * gToH answers with { hijri, gregorian } — callers only want the Hijri half.
 * Older caches stored the wrapper, so both shapes are accepted here.
 */
function normalizeHijriDate(payload) {
  const hijri = payload?.hijri || payload
  if (!hijri || !hijri.month || !hijri.day || !hijri.year) return null
  return hijri
}

