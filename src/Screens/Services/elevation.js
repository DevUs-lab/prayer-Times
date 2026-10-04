import AsyncStorage from '@react-native-async-storage/async-storage'
import { getJson } from './http'

const PREFIX = '@pt/elevation/'

// Aaj aur kal dono ek saath mangte hain — doosri call ko rok kar ek hi
// request par bhej do (jaise prayerTimes ka inflightMonths).
const inflight = new Map()

async function lookupElevation(key, lat, lng) {
  try {
    // 4 second: unchai ka jawab chhota hai aur ek dafa save ho jati hai. 15
    // second ka default timeout yahan kamzor internet par Home ko latakta
    // chhod deta — fail ho to 0 (standard horizon) istemal ho jata hai.
    const json = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        '&current=temperature_2m&timezone=auto',
      4000,
    )
    const value = Number(json.elevation)
    if (!Number.isFinite(value)) return 0

    try {
      await AsyncStorage.setItem(key, String(value))
    } catch (e) {
      // caching is best-effort
    }
    return value
  } catch (e) {
    return 0
  }
}

/**
 * Metres above sea level for a coordinate (Open-Meteo), cached permanently —
 * terrain does not move, so this is one network call per location ever.
 *
 * The prayer-time maths needs it: sunrise/sunset use an elevation-corrected
 * horizon (0.833° + 0.0347·√metres), so a city 161 m up sees the sun ~2
 * minutes before a sea-level one — the difference between a flat-horizon
 * 6:06 and the 6:04:22 Pakistani apps show for Jhang.
 *
 * Returns 0 when unknown, which means "standard horizon".
 */
export async function getElevation(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 0

  const key = `${PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`

  try {
    const cached = await AsyncStorage.getItem(key)
    if (cached != null) {
      const value = Number(cached)
      if (Number.isFinite(value)) return value
    }
  } catch (e) {
    // unreadable cache — fall through to a fresh lookup
  }

  const pending = inflight.get(key)
  if (pending) return pending // aaj + kal → ek hi request

  const request = lookupElevation(key, lat, lng)
  inflight.set(key, request)
  try {
    return await request
  } finally {
    inflight.delete(key)
  }
}
