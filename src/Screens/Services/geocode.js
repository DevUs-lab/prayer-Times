import { getJson } from './http'
import { getUserLocation } from './location'
import { t } from '../../i18n/strings'

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Unique, non-empty parts joined with ", " — duplicates are dropped, so
 * "Jhang, Jhang District, Jhang District, Punjab" never happens.
 */
function buildLabel(parts) {
  const seen = []
  for (const part of parts) {
    const text = String(part || '').trim()
    if (!text) continue
    if (seen.some((existing) => existing.toLowerCase() === text.toLowerCase())) continue
    seen.push(text)
  }
  return seen.join(', ')
}

function dedupePlaces(places) {
  const seen = new Set()
  return places.filter((place) => {
    const key = `${place.label.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* ------------------------------------------------------------------ */
/* Search (live suggestions for the location box)                      */
/* ------------------------------------------------------------------ */

const PHOTON_URL = 'https://photon.komoot.io/api/'
const OPEN_METEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/**
 * Places matching a typed query, e.g. "Jhang" ->
 *   [{ name: 'Jhang', label: 'Jhang, Jhang District, Punjab, Pakistan', ... }]
 *
 * Photon (OpenStreetMap) first — it knows districts and tehsils and answers in
 * English with no API key. Open-Meteo is the fallback if Photon is down.
 */
export async function searchPlaces(query) {
  const text = String(query || '').trim()
  if (text.length < 2) return []

  const photonPlaces = await photonSearch(text)
  const places = photonPlaces && photonPlaces.length > 0 ? photonPlaces : await openMeteoSearch(text)

  places.sort((a, b) => (a.rank || 0) - (b.rank || 0))
  return dedupePlaces(places)
}

async function photonSearch(text) {
  try {
    const json = await getJson(`${PHOTON_URL}?q=${encodeURIComponent(text)}&limit=8&lang=en`)
    const features = (json && json.features) || []
    return features.map(photonPlace).filter(Boolean)
  } catch (e) {
    return []
  }
}

function photonPlace(feature) {
  const props = feature && feature.properties
  const coordinates = (feature && feature.geometry && feature.geometry.coordinates) || []
  const longitude = coordinates[0]
  const latitude = coordinates[1]

  if (!props || typeof latitude !== 'number' || typeof longitude !== 'number' || !props.name) {
    return null
  }

  // Real settlements first — stations/POIs of the same name rank after them.
  const rank = props.osm_key === 'place' ? 0 : 1

  return {
    type: 'manual',
    rank,
    name: props.name,
    country: props.country,
    latitude,
    longitude,
    label: buildLabel([props.name, props.city, props.county, props.state, props.country]),
    secondary: buildLabel([props.city, props.county, props.state, props.country]),
  }
}

async function openMeteoSearch(text) {
  try {
    const json = await getJson(`${OPEN_METEO_URL}?count=8&language=en&format=json&name=${encodeURIComponent(text)}`)
    const results = (json && json.results) || []
    return results.map(openMeteoPlace).filter(Boolean)
  } catch (e) {
    return []
  }
}

function openMeteoPlace(result) {
  if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
    return null
  }

  return {
    type: 'manual',
    rank: 0,
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
    label: buildLabel([result.name, result.admin2, result.admin1, result.country]),
    secondary: buildLabel([result.admin2, result.admin1, result.country]),
  }
}

/**
 * Legacy entry point: a stored city (+ optional country) -> coordinates.
 * Still used for old saves that were stored as text only.
 */
export async function geocodeCity(city, country) {
  const places = await searchPlaces(city)
  if (places.length === 0) {
    throw new Error(t('err.geocode'))
  }

  const wanted = String(country || '').trim().toLowerCase()
  const match =
    (wanted && places.find((place) => String(place.country || '').toLowerCase() === wanted)) ||
    places[0]

  return match
}

/* ------------------------------------------------------------------ */
/* Reverse lookup (GPS coordinates -> readable place)                  */
/* ------------------------------------------------------------------ */

/** Best-effort place name for GPS coordinates (no API key needed). */
export async function reverseGeocode(latitude, longitude) {
  const url =
    'https://api.bigdatacloud.net/data/reverse-geocode-client' +
    `?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`

  const json = await getJson(url)

  return {
    // e.g. "Alabad, Jhang, Punjab, Pakistan" — locality, city, province, country
    label: buildLabel([
      json.locality,
      json.city,
      json.principalSubdivision,
      json.countryName,
    ]),
    city: json.city || json.locality,
    country: json.countryName,
  }
}

/**
 * Older saves may hold only {city, country} — resolve them to coordinates.
 * Returns null when nothing usable can be produced.
 */
export async function normalizeLocation(saved) {
  if (!saved) return null

  if (typeof saved.latitude === 'number' && typeof saved.longitude === 'number') {
    return saved
  }

  if (saved.type === 'manual' && saved.city) {
    try {
      return await geocodeCity(saved.city, saved.country)
    } catch (e) {
      return null
    }
  }

  return null
}

/* ------------------------------------------------------------------ */
/* Auto detection                                                      */
/* ------------------------------------------------------------------ */

/**
 * Last-resort auto detection: approximate city from the device's public IP.
 * Free, no API key (https://ipwho.is).
 */
export async function detectLocationByIp() {
  const json = await getJson('https://ipwho.is/')

  if (!json || json.success === false || typeof json.latitude !== 'number') {
    throw new Error(t('err.ipDetect'))
  }

  return {
    type: 'ip',
    latitude: json.latitude,
    longitude: json.longitude,
    label: buildLabel([json.city, json.country]),
    city: json.city,
    country: json.country,
  }
}

/**
 * Auto-detect the user's location: precise GPS first, city-level IP lookup
 * if the permission is refused or GPS is unavailable.
 */
export async function detectLocationAutomatically() {
  try {
    const { latitude, longitude } = await getUserLocation()

    try {
      const place = await reverseGeocode(latitude, longitude)
      return {
        type: 'gps',
        latitude,
        longitude,
        label: place.label,
        city: place.city,
        country: place.country,
      }
    } catch (e) {
      // Reverse geocoding is optional — coordinates are enough.
      return { type: 'gps', latitude, longitude }
    }
  } catch (e) {
    return await detectLocationByIp()
  }
}

export function locationLabel(location) {
  if (!location) return t('set.loc.unset')
  if (location.label) return location.label
  const named = [location.city, location.country].filter(Boolean).join(', ')
  if (named) return named
  return `${Number(location.latitude).toFixed(2)}, ${Number(location.longitude).toFixed(2)}`
}
