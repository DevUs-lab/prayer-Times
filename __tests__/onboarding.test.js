/**
 * First-run flow the user asked for:
 *   1. "Choose your language" (English · اردو · हिन्दी · Roman Urdu)
 *   2. "Set your location" (auto-detect or manual search, with a skip)
 *   3. Home — and every later open goes straight there.
 *
 * Renders the real app shell inside the LanguageProvider, with a cleared
 * AsyncStorage, so this is the same path a fresh install takes.
 */
import React from 'react'
import ReactTestRenderer from 'react-test-renderer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Text } from 'react-native'

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
  await flush()
  await flush()
  await flush()
  await flush()
}

/** Mount the whole shell (provider + screens), let storage settle. */
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
    const value = Array.isArray(children) ? children.join(' ') : String(children)
    parts.push(value)
  })
  return parts.join(' | ')
}

/** First pressable whose subtree contains `label` (RN's Pressable is memoised). */
function buttonByText(renderer, label) {
  return renderer.root
    .findAll((node) => node.props && typeof node.props.onPress === 'function')
    .find((node) =>
      node
        .findAllByType(Text)
        .some((child) => String(child.props.children || '').includes(label)),
    )
}

async function press(renderer, label) {
  const button = buttonByText(renderer, label)
  expect(button).toBeTruthy()
  await ReactTestRenderer.act(async () => {
    button.props.onPress()
    await settle()
  })
}

beforeEach(async () => {
  await AsyncStorage.clear()
})

test('first open: language → location → Home; later opens go straight to Home', async () => {
  // ---- step 1: language -------------------------------------------------
  let app = await mountApp()
  const opening = textOf(app)

  expect(opening).toContain('Choose your language')
  expect(opening).toContain('English')
  expect(opening).toContain('اردو') // Urdu in native script
  expect(opening).toContain('हिन्दी') // Hindi in native script
  expect(opening).toContain('Roman Urdu')

  await press(app, 'اردو') // tap the Urdu card — applies instantly

  // ---- step 2: location -------------------------------------------------
  expect(textOf(app)).toContain('اپنی جگہ مقرر کریں') // title, now in Urdu
  expect(await AsyncStorage.getItem('@pt/lang')).toBe('ur')

  const locationText = textOf(app)
  expect(locationText).toContain('خود تلاش کریں (GPS)') // auto-detect
  expect(locationText).toContain('میرا شہر تلاش کریں') // manual search
  expect(locationText).toContain('ابھی کے لیے چھوڑیں') // skip (never a dead end)

  // ---- done: Home with its tab bar (no location → the prompt) -----------
  await press(app, 'ابھی کے لیے چھوڑیں')
  expect(await AsyncStorage.getItem('@pt/onboarded')).toBe('1')

  const homeText = textOf(app)
  expect(homeText).not.toContain('Choose your language')
  expect(homeText).toContain('پہلے سیٹنگز میں جگہ مقرر کریں') // LocationPrompt, Urdu
  expect(homeText).toContain('گھر') // tab bar, Urdu

  await unmount(app)

  // ---- second open: straight to Home, language kept ---------------------
  app = await mountApp()
  const reopened = textOf(app)
  expect(reopened).not.toContain('Choose your language')
  expect(reopened).not.toContain('Set your location')
  expect(reopened).toContain('پہلے سیٹنگز میں جگہ مقرر کریں')
  await unmount(app)
})

test('choosing English keeps the app in English and persists the choice', async () => {
  const app = await mountApp()
  await press(app, 'English')

  // English chosen → the location step appears in English too
  expect(textOf(app)).toContain('Set your location')
  expect(await AsyncStorage.getItem('@pt/lang')).toBe('en')

  await press(app, 'Skip for now')
  expect(textOf(app)).toContain('Set your location in Settings first')
  expect(textOf(app)).toContain('Home') // English tab labels

  await unmount(app)
})
