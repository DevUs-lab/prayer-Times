/**
 * Auto-detect ab sirf GPS hai — approximate (IP) location poori tarah khatam.
 * GPS/permission fail ho to service `{ issue }` lautati hai, aur screen app ke
 * emerald/gold theme wala modal dikhati hai (system Alert nahi) jo seedha
 * sahi settings page kholti hai — aur wapas aate hi khud dobara detect.
 */
import { AppState, Linking, Platform, StyleSheet } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import { LocationIssueModal } from '../src/Components/ui'
import { colors, radius } from '../src/Components/theme'
import { detectLocationAutomatically } from '../src/Screens/Services/geocode'
import { getUserLocation } from '../src/Screens/Services/location'

// getUserLocation mock hota hai (native GPS chalna nahi chahiye), lekin
// openLocationSettings asli rahe — wahi Linking.sendIntent/openSettings
// call karta hai.
jest.mock('../src/Screens/Services/location', () => ({
  ...jest.requireActual('../src/Screens/Services/location'),
  getUserLocation: jest.fn(),
}))

const ORIGINAL_OS = Platform.OS
let appStateListener = null // change-handler jo modal ne lagaya
const trees = []

function mockFetch(reverse) {
  global.fetch = jest.fn((url) => {
    const target = String(url)
    if (target.includes('bigdatacloud.net')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(reverse) })
    }
    return Promise.reject(new Error('unexpected url: ' + target))
  })
}

const reversePayload = {
  locality: 'Alabad',
  city: 'Jhang',
  principalSubdivision: 'Punjab',
  countryName: 'Pakistan',
}

// Dono spies file mein EK hi baar bante hain (restoreAllMocks is setup mein
// Linking/AppState ko wapas nahi la pata — calls jamte reh jate the).
// Har test shuru mein mockClear() se ginti zero.
let sendIntentSpy
let openSettingsSpy

beforeAll(() => {
  sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined)
  openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'change') appStateListener = handler
    return { remove: jest.fn() }
  })
})

beforeEach(() => {
  Platform.OS = 'android'
  getUserLocation.mockReset()
  mockFetch(reversePayload)
  appStateListener = null
  sendIntentSpy.mockClear()
  openSettingsSpy.mockClear()
})

afterEach(() => {
  Platform.OS = ORIGINAL_OS
  trees.splice(0).forEach((tree) => {
    try {
      act(() => tree.unmount())
    } catch (e) {
      // Environment ab tak band — unmount ki chhoti galti test nahi rokni.
    }
  })
})

/* ------------------------------------------------------------------ */
/* Service: GPS hi, aur issue screen ko jaata hai                       */
/* ------------------------------------------------------------------ */

test('GPS band (code 2) → { issue: "gps" }, koi IP fallback nahi', async () => {
  getUserLocation.mockRejectedValue({ code: 2, message: 'No location provider available.' })

  const result = await detectLocationAutomatically()

  expect(result).toEqual({ issue: 'gps' })
  expect(global.fetch).not.toHaveBeenCalled()
  expect(Linking.sendIntent).not.toHaveBeenCalled()
})

test('permission denied (code 1) → { issue: "permission" }', async () => {
  getUserLocation.mockRejectedValue({ code: 1, message: 'Location permission was not granted.' })

  const result = await detectLocationAutomatically()

  expect(result).toEqual({ issue: 'permission' })
})

test('GPS chalu → asli jagah (reverse geocoding ke saath)', async () => {
  getUserLocation.mockResolvedValue({ latitude: 31.27, longitude: 72.31 })

  const result = await detectLocationAutomatically()

  expect(result.type).toBe('gps')
  expect(result.city).toBe('Jhang')
  expect(result.issue).toBeUndefined()
})

test('bina code wali galti bhi GPS issue hi hai (modal wahi dikhega)', async () => {
  getUserLocation.mockRejectedValue(new Error('boom'))

  const result = await detectLocationAutomatically()

  expect(result).toEqual({ issue: 'gps' })
  expect(global.fetch).not.toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* Modal: app ka themed dialog, system Alert nahi                       */
/* ------------------------------------------------------------------ */

function texts(root) {
  return root
    .findAll((node) => typeof node.props.children === 'string')
    .map((node) => node.props.children)
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

function styled(root, prop, value) {
  // Sirf host nodes (View/Text) — composite (Pressable/Modal) apna raw
  // style prop bhi rakhta hai, warna ek hi rang 2-3 baar milta hai.
  return root.findAll((node) => {
    if (typeof node.type !== 'string') return false
    const style = StyleSheet.flatten(node.props.style) || {}
    return style[prop] === value
  })
}

function renderModal(issue, onClose, onRetry) {
  let tree
  act(() => {
    tree = renderer.create(
      <LocationIssueModal issue={issue} onClose={onClose} onRetry={onRetry} />,
    )
  })
  trees.push(tree)
  return tree.root
}

/** App wapas foreground mein aayi (Settings se lauta). */
function goForeground() {
  act(() => {
    if (appStateListener) appStateListener('active')
  })
}

test('modal emerald/gold theme use karta hai (Calendar sheet ki tarah)', () => {
  const root = renderModal('gps', jest.fn())

  // backdrop: Calendar sheet wala hi gehra sabz overlay
  expect(styled(root, 'backgroundColor', 'rgba(4, 26, 19, 0.72)')).toHaveLength(1)

  // dialog: emerald card + gold border + bade corners
  const dialog = styled(root, 'backgroundColor', colors.card)
  expect(dialog).toHaveLength(1)
  const dialogStyle = StyleSheet.flatten(dialog[0].props.style)
  expect(dialogStyle.borderColor).toBe(colors.border)
  expect(dialogStyle.borderRadius).toBe(radius.l)

  // heading gold mein
  const title = root.find((node) => node.props.children === 'Location not available')
  expect(StyleSheet.flatten(title.props.style).color).toBe(colors.gold)

  const labels = texts(root)
  expect(labels).toContain('Location not available')
  expect(labels).toContain('Open GPS settings')
  expect(labels).toContain('Close')
  // Approximate (IP) wala button khatam ho chuka hai.
  expect(labels.join(' ')).not.toMatch(/approximate/i)
})

test('"Open GPS settings" sahi page kholti hai, wapas aane par khud dobara detect', () => {
  const onClose = jest.fn()
  const onRetry = jest.fn()
  const root = renderModal('gps', onClose, onRetry)

  pressText(root, 'Open GPS settings')

  expect(Linking.sendIntent).toHaveBeenCalledWith('android.settings.LOCATION_SOURCE_SETTINGS')
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(onRetry).not.toHaveBeenCalled() // abhi to settings khul rahi hain

  goForeground()
  expect(onRetry).toHaveBeenCalledTimes(1)

  goForeground() // dobara foreground aane par dobara nahi
  expect(onRetry).toHaveBeenCalledTimes(1)
})

test('permission issue par "Open app settings" app ka page kholti hai', () => {
  const root = renderModal('permission', jest.fn(), jest.fn())

  pressText(root, 'Open app settings')

  // APPLICATION_DETAILS_SETTINGS intent ko package chahiye (wo nahi dene par
  // ya kuch nahi khulta ya sirf apps ki list) — isliye seedha openSettings.
  expect(Linking.openSettings).toHaveBeenCalled()
  expect(Linking.sendIntent).not.toHaveBeenCalled()
})

test('iOS par koi bhi issue ho, app ka page Linking.openSettings se hi khulta hai', () => {
  Platform.OS = 'ios'
  const root = renderModal('gps', jest.fn(), jest.fn())

  pressText(root, 'Open GPS settings')

  expect(Linking.openSettings).toHaveBeenCalled()
  expect(Linking.sendIntent).not.toHaveBeenCalled() // iOS par intent nahi
})

test('"Close" band karta hai — kuch khulta nahi, wapas aane par bhi kuch nahi', () => {
  const onClose = jest.fn()
  const onRetry = jest.fn()
  const root = renderModal('gps', onClose, onRetry)

  pressText(root, 'Close')

  expect(onClose).toHaveBeenCalledTimes(1)
  expect(Linking.sendIntent).not.toHaveBeenCalled()
  expect(Linking.openSettings).not.toHaveBeenCalled()

  goForeground()
  expect(onRetry).not.toHaveBeenCalled() // manual jagah badli na jaye
})

test('issue na ho to modal khali hai (visible=false)', () => {
  let tree
  act(() => {
    tree = renderer.create(<LocationIssueModal issue={null} onClose={jest.fn()} />)
  })
  trees.push(tree)
  expect(tree.toJSON()).toBeNull()
})
