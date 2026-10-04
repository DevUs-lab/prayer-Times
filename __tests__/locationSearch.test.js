/**
 * Keyboard ke saath do bug:
 *   1. `keyboardDidShow` par `event.end.height` crash karta tha ("cannot
 *      read property 'height' of undefined") → keyboardHeight hamesha 0
 *      rehta tha aur content keyboard ke peeche chhapa rehta tha.
 *   2. suggestions ki lambi list khud scroll nahi hoti thi — user ko
 *      keyboard minimize karke niche jhankna parta tha.
 */
import React from 'react'
import ReactTestRenderer, { act } from 'react-test-renderer'
import { Keyboard, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native'

import { LanguageProvider } from '../src/i18n'
import { LocationStep } from '../src/Screens/Onboarding'
import PlaceSearch from '../src/Components/PlaceSearch'
import { searchPlaces } from '../src/Screens/Services/geocode'
import { spacing } from '../src/Components/theme'

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

jest.mock('../src/Screens/Services/geocode', () => ({
  ...jest.requireActual('../src/Screens/Services/geocode'),
  searchPlaces: jest.fn(),
}))

const flush = () => new Promise((resolve) => setImmediate(resolve))
const settle = async () => {
  await flush()
  await flush()
  await flush()
}

const keyboardHandlers = {}
const trees = []

// EK hi spy poori file mein — handler mount ke time register ho sake.
beforeAll(() => {
  jest.spyOn(Keyboard, 'addListener').mockImplementation((type, handler) => {
    keyboardHandlers[type] = handler
    return {
      remove: () => {
        delete keyboardHandlers[type]
      },
    }
  })
})

beforeEach(() => {
  Object.keys(keyboardHandlers).forEach((key) => delete keyboardHandlers[key])
  searchPlaces.mockReset()
})

afterEach(() => {
  trees.splice(0).forEach((tree) => {
    try {
      act(() => tree.unmount())
    } catch (e) {
      // environment band hone ke baad unmount — test nahi rokna
    }
  })
})

async function mount(element) {
  let tree
  await act(async () => {
    tree = ReactTestRenderer.create(element)
    await settle()
  })
  trees.push(tree)
  return tree
}

function mountStep() {
  return mount(
    <LanguageProvider>
      <LocationStep onDone={jest.fn()} onSkip={jest.fn()} />
    </LanguageProvider>,
  )
}

function bottomPadding(tree) {
  const scroller = tree.root.findByType(ScrollView)
  return StyleSheet.flatten(scroller.props.contentContainerStyle).paddingBottom
}

test('keyboardDidShow → paddingBottom keyboard ke barabar (endCoordinates se)', async () => {
  const tree = await mountStep()
  expect(keyboardHandlers.keyboardDidShow).toBeDefined()
  expect(bottomPadding(tree)).toBe(spacing.xxl)

  act(() => keyboardHandlers.keyboardDidShow({ endCoordinates: { height: 300 } }))
  expect(bottomPadding(tree)).toBe(spacing.xxl + 300)

  act(() => keyboardHandlers.keyboardDidHide())
  expect(bottomPadding(tree)).toBe(spacing.xxl)
})

test('bina endCoordinates wala event crash nahi karta (purana `event.end` bug)', async () => {
  const tree = await mountStep()

  // Yehi tha jo "cannot read property 'height' of undefined" deta tha.
  expect(() => act(() => keyboardHandlers.keyboardDidShow({}))).not.toThrow()
  expect(bottomPadding(tree)).toBe(spacing.xxl) // 0 keyboard, NaN nahi

  expect(() => act(() => keyboardHandlers.keyboardDidShow(undefined))).not.toThrow()
  expect(bottomPadding(tree)).toBe(spacing.xxl)
})

test('suggestions lambi ho to list khud scroll hoti hai — keyboard khula rahe', async () => {
  searchPlaces.mockResolvedValue(
    Array.from({ length: 6 }, (_, i) => ({
      name: `City ${i + 1}`,
      secondary: 'Punjab, Pakistan',
      latitude: 31.27 + i / 100,
      longitude: 72.31,
      label: `City ${i + 1}, Punjab, Pakistan`,
    })),
  )

  const tree = await mount(
    <LanguageProvider>
      <PlaceSearch onChoose={jest.fn()} />
    </LanguageProvider>,
  )

  const input = tree.root.findAllByType(TextInput)[0]
  await act(async () => {
    input.props.onChangeText('City')
  })
  await act(async () => {
    input.props.onSubmitEditing()
  })
  await act(async () => {
    await settle()
  })

  const scrolls = tree.root.findAllByType(ScrollView)
  expect(scrolls).toHaveLength(1) // sirf suggestion list scroll karti hai
  const list = scrolls[0]

  expect(StyleSheet.flatten(list.props.style).maxHeight).toBe(spacing.xxl * 10) // ~4 rows
  expect(list.props.keyboardShouldPersistTaps).toBe('handled') // tap = choose, keyboard na gire
  expect(list.props.nestedScrollEnabled).toBe(true)

  // saari 6 suggestions isi scroll ke andar — scroll karke aakhri tak pahunch
  expect(list.findAllByType(TouchableOpacity)).toHaveLength(6)
  expect(JSON.stringify(tree.toJSON())).toContain('City 6')
})
