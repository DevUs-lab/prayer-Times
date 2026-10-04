import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { DEFAULT_LANG, getActiveLang, setActiveLang, t, translate } from './strings'

export { LANGS, isRtl, intlLocale } from './strings'
export { t, translate, getActiveLang, setActiveLang }
export {
  captionName,
  displaySub,
  displayName,
  EVENT_NAMES,
  PRAYER_NAMES,
  PRAYER_SUBS,
} from './strings'

const LANG_KEY = '@pt/lang'

/**
 * `{ lang, chosen, ready, t, setLang }` for every screen.
 *   lang    — active language id (always a valid id)
 *   chosen  — false until the user picks a language (first run)
 *   ready   — false until the saved language has been read
 * The default value is deliberately usable (English, chosen, ready) so
 * isolated components — and the test suite — work without a provider.
 */
const LangContext = createContext({
  lang: DEFAULT_LANG,
  chosen: true,
  ready: true,
  t: (key, params) => translate(DEFAULT_LANG, key, params),
  setLang: () => {},
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG)
  const [chosen, setChosen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(LANG_KEY)
      .then((stored) => {
        if (!alive) return
        if (stored) {
          setActiveLang(stored)
          setLangState(getActiveLang())
          setChosen(true)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const setLang = useCallback((next) => {
    setActiveLang(next)
    setLangState(getActiveLang())
    setChosen(true)
    AsyncStorage.setItem(LANG_KEY, getActiveLang()).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({ lang, chosen, ready, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, chosen, ready, setLang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

/**
 * Urdu is right-to-left: keep the layout left-to-right (the chosen design)
 * but tell long Urdu text how to shape itself.
 */
export function rtlStyle(lang) {
  return lang === 'ur' ? { writingDirection: 'rtl' } : null
}
