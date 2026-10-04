/**
 * Language pack: dictionaries, fallbacks, interpolation, and the per-language
 * name helpers (prayers, day events, Hijri months, weather labels).
 *
 * English is the default everywhere the suite runs, so `setActiveLang`
 * switches are always restored in afterEach.
 */
import {
  captionName,
  displaySub,
  displayName,
  getActiveLang,
  intlLocale,
  isRtl,
  LANGS,
  setActiveLang,
  t,
  translate,
} from '../src/i18n/strings'
import { hijriMonthDisplay, hijriMonthName, HIJRI_MONTHS } from '../src/Screens/Services/prayerTimes'
import { weatherInfo } from '../src/Screens/Services/weather'

afterEach(() => {
  setActiveLang('en')
})

describe('translate / t', () => {
  test('offers exactly the four languages the intro shows', () => {
    expect(LANGS.map((entry) => entry.id)).toEqual(['en', 'ur', 'hi', 'rom'])
    expect(LANGS.find((entry) => entry.id === 'ur').native).toBe('اردو')
    expect(LANGS.find((entry) => entry.id === 'hi').native).toBe('हिन्दी')
  })

  test('reads every language for the same key', () => {
    expect(translate('en', 'home.now')).toBe('NOW')
    expect(translate('ur', 'home.now')).toBe('ابھی')
    expect(translate('hi', 'home.now')).toBe('अभी')
    // Roman Urdu keeps the app's legacy copy — for this key that is English.
    expect(translate('rom', 'home.now')).toBe('NOW')
  })

  test('Roman Urdu inherits English for keys it does not override', () => {
    expect(translate('rom', 'tab.home')).toBe(translate('en', 'tab.home'))
    expect(translate('rom', 'caption.endsIn')).toBe('{{name}} ka waqt khatam hone mein')
  })

  test('interpolates {{params}}', () => {
    expect(translate('en', 'home.elevation', { ft: 1338 })).toBe('Elevation 1338 ft')
    expect(translate('ur', 'set.detected', { label: 'Jhang' })).toContain('Jhang')
  })

  test('falls back to English, then to the key itself', () => {
    expect(translate('en', 'tab.home')).toBe('Home')
    expect(translate('en', 'no.such.key')).toBe('no.such.key')
    expect(translate('kl', 'home.now')).toBe('NOW') // unknown language → English
  })

  test('t() follows setActiveLang and rejects unknown ids', () => {
    expect(t('home.now')).toBe('NOW')
    setActiveLang('ur')
    expect(getActiveLang()).toBe('ur')
    expect(t('home.now')).toBe('ابھی')
    setActiveLang('nope')
    expect(getActiveLang()).toBe('en')
  })

  test('only Urdu is right-to-left; locales map per language', () => {
    expect(isRtl('ur')).toBe(true)
    expect(isRtl('hi')).toBe(false)
    expect(intlLocale('ur')).toBe('ur-PK')
    expect(intlLocale('hi')).toBe('hi-IN')
    expect(intlLocale('rom')).toBe('en-GB')
  })
})

describe('prayer and event names', () => {
  const dhuhr = { key: 'Dhuhr', label: 'Dhuhr', urdu: 'Zuhr', isPrayer: true }
  const talu = { key: 'talu', label: 'Talu-e-Aftab', urdu: 'طلوع آفتاب', isPrayer: false }

  test('prayer names per language (en/rom keep the Latin label)', () => {
    expect(displayName(dhuhr, 'en')).toBe('Dhuhr')
    expect(displayName(dhuhr, 'rom')).toBe('Dhuhr')
    expect(displayName(dhuhr, 'ur')).toBe('ظہر')
    expect(displayName(dhuhr, 'hi')).toBe('ज़ुहर')
  })

  test('the sublabel under a prayer follows the language', () => {
    expect(displaySub(dhuhr, 'en')).toBe('Noon')
    expect(displaySub(dhuhr, 'rom')).toBe('Zuhr') // legacy Roman-Urdu gloss
    expect(displaySub(dhuhr, 'ur')).toBe('دوپہر')
    expect(displaySub({ key: 'Sunrise', label: 'Sunrise', urdu: 'Suraj charhta hai' }, 'en')).toBe(
      'Sun rises',
    )
  })

  test('day events show Arabic second — except Urdu, where it shows Latin', () => {
    expect(displayName(talu, 'en')).toBe('Talu-e-Aftab')
    expect(displayName(talu, 'ur')).toBe('طلوع آفتاب')
    expect(displayName(talu, 'hi')).toBe('तलु-ए-आफ़्ताब')
    expect(displaySub(talu, 'en')).toBe('طلوع آفتاب')
    expect(displaySub(talu, 'ur')).toBe('Talu-e-Aftab')
  })

  test('the countdown name: legacy Roman sublabel vs the plain name', () => {
    expect(captionName(dhuhr, 'rom')).toBe('Zuhr')
    expect(captionName(dhuhr, 'en')).toBe('Dhuhr')
    expect(captionName(dhuhr, 'ur')).toBe('ظہر')
    expect(captionName(talu, 'en')).toBe('Talu-e-Aftab')
  })

  test('objects without a known key fall back to their label', () => {
    expect(displayName({ label: 'Fajr' }, 'ur')).toBe('Fajr')
    expect(displaySub({ urdu: 'Fajr', label: 'Fajr' }, 'en')).toBe('Fajr')
  })
})

describe('Hijri month names', () => {
  test('per language, including Hindi', () => {
    expect(hijriMonthName(9, 'en')).toBe('Ramadan')
    expect(hijriMonthName(9, 'rom')).toBe('Ramadan')
    expect(hijriMonthName(9, 'ur')).toBe('رَمَضَان')
    expect(hijriMonthName(9, 'hi')).toBe('रमज़ान')
    expect(hijriMonthName(99, 'en')).toBe('Month 99')
    expect(HIJRI_MONTHS.every((month) => Boolean(month.hi))).toBe(true)
  })

  test('API payloads ({number, en, ar}) render in every language', () => {
    const month = { number: 4, en: "Rabi' al-Thani", ar: 'رَبِيع ٱلثَّانِي' }
    expect(hijriMonthDisplay(month, 'en')).toBe("Rabi' al-Thani")
    expect(hijriMonthDisplay(month, 'ur')).toBe('رَبِيع ٱلثَّانِي')
    expect(hijriMonthDisplay(month, 'hi')).toBe('रबीउस सानी')
    expect(hijriMonthDisplay({ number: 4, en: 'X' }, 'ur')).toBe('X') // ar missing → en
    expect(hijriMonthDisplay(null, 'en')).toBe('')
  })
})

describe('weather labels', () => {
  test('WMO codes translate, unknown codes stay graceful', () => {
    expect(weatherInfo(0).label).toBe('Clear sky')
    expect(weatherInfo(999999).label).toBe('Weather unavailable')

    setActiveLang('ur')
    expect(weatherInfo(0).label).toBe('صاف آسمان')
    expect(weatherInfo(63).label).toBe('بارش')

    setActiveLang('hi')
    expect(weatherInfo(63).label).toBe('बारिश')

    // Icons never depend on the language.
    expect(weatherInfo(63).icon).toBe('weather-rainy')
  })
})
