/**
 * Settings screen: one search box with live suggestions.
 * Type "Jhang" -> Photon answers -> a list of distinct places appears ->
 * tapping one saves the location and calls onSaved().
 */
import React from 'react'
import ReactTestRenderer, { act } from 'react-test-renderer'
import { TextInput } from 'react-native'

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react')
  return {
    SafeAreaProvider: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    SafeAreaView: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 24, left: 0, right: 0, bottom: 16 }),
  }
})

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
  ],
}

const saved = []

beforeEach(() => {
  saved.length = 0
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('photon.komoot.io')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(photonJhang) })
    }
    if (target.includes('async-storage') || target.startsWith('mock-storage:')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
  })
})

async function renderSettings() {
  const SettingsScreen = require('../src/Screens/Frontend/Settings/index.jsx').default
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  AsyncStorage.setItem = jest.fn((key, value) => {
    saved.push([key, value])
    return Promise.resolve()
  })

  let renderer
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SettingsScreen
        location={{ type: 'manual', latitude: 31.27, longitude: 72.31, label: 'Jhang, Pakistan' }}
        onSaved={jest.fn()}
      />,
    )
  })
  return renderer
}

afterEach(() => {
  jest.useRealTimers()
})

test('typing a city shows distinct place suggestions, tapping one saves it', async () => {
  jest.useFakeTimers()
  const renderer = await renderSettings()

  const inputs = renderer.root.findAllByType(TextInput)
  expect(inputs).toHaveLength(1) // one single location box

  await act(async () => {
    inputs[0].props.onChangeText('Jhang')
  })
  await act(async () => {
    jest.advanceTimersByTime(400) // debounce
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  const rendered = JSON.stringify(renderer.toJSON())
  expect(rendered).toContain('Jhang District, Punjab, Pakistan')
  expect(rendered).toContain('Attock District, Punjab, Pakistan')

  const titles = renderer.root.findAll(
    (node) => node.type === 'Text' && node.props.style && node.props.style.fontSize === 15,
  )
  expect(titles.length).toBeGreaterThanOrEqual(2)

  // Tap the first suggestion -> location saved
  const touchables = renderer.root.findAllByProps({ activeOpacity: 0.7 })
  expect(touchables.length).toBeGreaterThanOrEqual(2)

  await act(async () => {
    await touchables[0].props.onPress()
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  expect(saved.length).toBe(1)
  const stored = JSON.parse(saved[0][1])
  expect(stored.label).toBe('Jhang, Jhang District, Punjab, Pakistan')
  expect(stored.latitude).toBeCloseTo(31.2728805, 5)
  expect(stored.type).toBe('manual')
})

test('short queries never hit the network', async () => {
  jest.useFakeTimers()
  const renderer = await renderSettings()
  const input = renderer.root.findAllByType(TextInput)[0]

  await act(async () => {
    input.props.onChangeText('J')
  })
  await act(async () => {
    jest.advanceTimersByTime(1000)
  })

  expect(global.fetch).not.toHaveBeenCalled()
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Jhang District')
})
