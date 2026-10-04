/**
 * Location search + labels: the Settings box must show detailed suggestions
 * ("Jhang, Jhang District, Punjab, Pakistan") instead of a bare "Jhang,
 * Pakistan", and GPS reverse geocoding must include district/province too.
 */
import { reverseGeocode, searchPlaces } from '../src/Screens/Services/geocode'

const photonJhang = {
  features: [
    {
      geometry: { coordinates: [72.3103071, 31.2728805] },
      properties: {
        osm_key: 'place',
        name: 'Jhang',
        county: 'Jhang District',
        state: 'Punjab',
        country: 'Pakistan',
      },
    },
    {
      geometry: { coordinates: [72.6963493, 33.6748125] },
      properties: {
        osm_key: 'place',
        name: 'Jhang',
        county: 'Attock District',
        state: 'Punjab',
        country: 'Pakistan',
      },
    },
    // A POI sharing the name — must rank *after* the real settlements.
    {
      geometry: { coordinates: [72.3155, 31.2689] },
      properties: {
        osm_key: 'railway',
        name: 'Jhang Sadr',
        city: 'Jhang',
        county: 'Jhang District',
        state: 'Punjab',
        country: 'Pakistan',
      },
    },
  ],
}

const openMeteoJhang = {
  results: [
    {
      name: 'Jhang',
      admin1: 'Punjab',
      admin2: 'Attock District',
      country: 'Pakistan',
      latitude: 33.67483,
      longitude: 72.69696,
    },
  ],
}

const bigDataCloud = {
  locality: 'Alabad',
  city: 'Jhang',
  principalSubdivision: 'Punjab',
  countryName: 'Pakistan',
}

function mockFetch({ photon, openMeteo, reverse }) {
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('photon.komoot.io')) {
      if (photon instanceof Error) return Promise.reject(photon)
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(photon) })
    }
    if (target.includes('geocoding-api.open-meteo.com')) {
      if (openMeteo instanceof Error) return Promise.reject(openMeteo)
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(openMeteo) })
    }
    if (target.includes('bigdatacloud.net')) {
      if (reverse instanceof Error) return Promise.reject(reverse)
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(reverse) })
    }
    return Promise.reject(new Error('unexpected url: ' + target))
  })
}

beforeEach(() => {
  mockFetch({ photon: photonJhang, openMeteo: openMeteoJhang, reverse: bigDataCloud })
})

test('search returns detailed suggestions (name + district + province + country)', async () => {
  const places = await searchPlaces('Jhang')

  expect(places).toHaveLength(3)
  expect(places[0].name).toBe('Jhang')
  expect(places[0].label).toBe('Jhang, Jhang District, Punjab, Pakistan')
  expect(places[0].secondary).toBe('Jhang District, Punjab, Pakistan')
  expect(places[0].latitude).toBeCloseTo(31.2728805, 5)
  expect(places[0].longitude).toBeCloseTo(72.3103071, 5)
  expect(places[0].type).toBe('manual')

  // Same name, different district -> must stay distinguishable
  expect(places[1].label).toBe('Jhang, Attock District, Punjab, Pakistan')
  expect(places[1].label).not.toBe(places[0].label)
})

test('settlements rank before POIs with the same name', async () => {
  const places = await searchPlaces('Jhang')
  expect(places[2].name).toBe('Jhang Sadr')
  expect(places[2].label).toBe('Jhang Sadr, Jhang, Jhang District, Punjab, Pakistan')
})

test('falls back to Open-Meteo when Photon is down', async () => {
  mockFetch({ photon: new Error('network down'), openMeteo: openMeteoJhang })

  const places = await searchPlaces('Jhang')

  expect(places).toHaveLength(1)
  expect(places[0].label).toBe('Jhang, Attock District, Punjab, Pakistan')
  expect(places[0].latitude).toBeCloseTo(33.67483, 5)
})

test('duplicate results are dropped, very short queries skipped', async () => {
  mockFetch({
    photon: { features: [...photonJhang.features, photonJhang.features[0]] },
    openMeteo: openMeteoJhang,
  })

  const places = await searchPlaces('Jhang')
  const labels = places.map((place) => `${place.label}|${place.latitude}`)
  expect(new Set(labels).size).toBe(labels.length)

  expect(await searchPlaces('J')).toEqual([])
  expect(await searchPlaces('   ')).toEqual([])
})

test('reverse geocoding keeps locality, city and province', async () => {
  const place = await reverseGeocode(31.2689, 72.3155)
  expect(place.label).toBe('Alabad, Jhang, Punjab, Pakistan')
  expect(place.city).toBe('Jhang')
  expect(place.country).toBe('Pakistan')
})

test('duplicate label parts are not repeated', async () => {
  mockFetch({
    photon: photonJhang,
    openMeteo: openMeteoJhang,
    reverse: {
      locality: 'Jhang',
      city: 'Jhang',
      principalSubdivision: 'Punjab',
      countryName: 'Pakistan',
    },
  })

  const place = await reverseGeocode(31.27, 72.31)
  expect(place.label).toBe('Jhang, Punjab, Pakistan')
})
